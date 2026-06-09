import type { SupabaseClient } from "@supabase/supabase-js";
import type { HorariosLaborales } from "@/lib/types";
import { chileDateKey } from "@/lib/attendance/today";

const dayKeys = [
  "domingo",
  "lunes",
  "martes",
  "miercoles",
  "jueves",
  "viernes",
  "sabado",
];

interface CompanyRow {
  id: string;
  nombre_empresa: string;
  hora_entrada: string | null;
  horarios_laborales: HorariosLaborales | null;
  late_notification_minutes?: number | null;
}

interface EmployeeRow {
  id: string;
  nombre: string;
  email: string;
  empresa_id: string;
}

interface AttendanceRow {
  empleado_id: string;
  fecha_hora: string;
}

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function chileTimeMinutes(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  return hour * 60 + minute;
}

function getSchedule(company: CompanyRow, dateKey: string) {
  const date = new Date(`${dateKey}T12:00:00.000Z`);
  const dayKey = dayKeys[date.getUTCDay()];
  const fallbackEntrada = company.hora_entrada || "09:00";
  const schedule = company.horarios_laborales?.[dayKey];

  if (schedule) {
    return schedule;
  }

  return {
    activo: dayKey !== "sabado" && dayKey !== "domingo",
    entrada: fallbackEntrada,
    salida: "18:00",
  };
}

function entryTimestampForChileDate(dateKey: string, entrada: string) {
  return `${dateKey}T${entrada}:00-04:00`;
}

export async function generateLateAttendanceNotifications({
  supabase,
  empresaId,
  now = new Date(),
}: {
  supabase: SupabaseClient;
  empresaId?: string;
  now?: Date;
}) {
  const todayKey = chileDateKey(now);
  const nowMinutes = chileTimeMinutes(now);
  const since = new Date(now.getTime() - 36 * 60 * 60 * 1000).toISOString();

  let companiesQuery = supabase
    .from("companies")
    .select("id, nombre_empresa, hora_entrada, horarios_laborales, late_notification_minutes");

  if (empresaId) {
    companiesQuery = companiesQuery.eq("id", empresaId);
  }

  const { data: companies, error: companiesError } = await companiesQuery;
  if (companiesError) throw companiesError;

  let created = 0;
  let checked = 0;

  for (const company of ((companies ?? []) as CompanyRow[])) {
    const schedule = getSchedule(company, todayKey);
    if (!schedule.activo) continue;

    const notificationMinutes = company.late_notification_minutes ?? 10;
    const entradaMinutes = timeToMinutes(schedule.entrada);
    const thresholdMinutes = entradaMinutes + notificationMinutes;
    if (nowMinutes < thresholdMinutes) continue;

    const [{ data: employees, error: employeesError }, { data: records, error: recordsError }] =
      await Promise.all([
        supabase
          .from("employees")
          .select("id, nombre, email, empresa_id")
          .eq("empresa_id", company.id)
          .eq("activo", true)
          .is("eliminado_at", null)
          .neq("role", "admin"),
        supabase
          .from("attendance")
          .select("empleado_id, fecha_hora")
          .eq("empresa_id", company.id)
          .neq("estado_registro", "anulado")
          .in("tipo_registro", ["entrada", "entrada_laboral"])
          .gte("fecha_hora", since)
          .order("fecha_hora", { ascending: true }),
      ]);

    if (employeesError) throw employeesError;
    if (recordsError) throw recordsError;

    const todayEntries = new Map<string, AttendanceRow>();
    for (const record of ((records ?? []) as AttendanceRow[])) {
      if (chileDateKey(record.fecha_hora) !== todayKey) continue;
      if (!todayEntries.has(record.empleado_id)) {
        todayEntries.set(record.empleado_id, record);
      }
    }

    for (const employee of ((employees ?? []) as EmployeeRow[])) {
      checked += 1;
      const firstEntry = todayEntries.get(employee.id);
      const entryMinutes = firstEntry ? chileTimeMinutes(new Date(firstEntry.fecha_hora)) : null;
      const isLate = entryMinutes === null || entryMinutes > thresholdMinutes;
      if (!isLate) continue;

      const minutesLate = Math.max(0, (entryMinutes ?? nowMinutes) - entradaMinutes);
      const entryText = firstEntry
        ? `marco entrada a las ${minutesToTime(entryMinutes ?? entradaMinutes)}`
        : "aun no registra entrada";
      const message = `${employee.nombre} lleva ${minutesLate} min de atraso: ${entryText}. Horario esperado ${schedule.entrada}.`;

      const { error: upsertError } = await supabase
        .from("attendance_notifications")
        .upsert(
          {
            empresa_id: company.id,
            empleado_id: employee.id,
            type: "late_entry",
            notification_date: todayKey,
            scheduled_at: entryTimestampForChileDate(todayKey, schedule.entrada),
            actual_entry_at: firstEntry?.fecha_hora ?? null,
            minutes_late: minutesLate,
            message,
            metadata: {
              company_name: company.nombre_empresa,
              expected_entry: schedule.entrada,
              threshold_minutes: notificationMinutes,
            },
          },
          { onConflict: "empresa_id,empleado_id,type,notification_date" }
        );

      if (upsertError) throw upsertError;
      created += 1;
    }
  }

  return {
    checked,
    created,
    date: todayKey,
  };
}
