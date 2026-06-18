import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { chileDateKey } from "@/lib/attendance/today";
import type { HorariosLaborales } from "@/lib/types";
import * as XLSX from "xlsx";

const dayKeys = [
  "domingo",
  "lunes",
  "martes",
  "miercoles",
  "jueves",
  "viernes",
  "sabado",
];

const typeLabels: Record<string, string> = {
  entrada: "Entrada laboral",
  salida: "Salida laboral",
  entrada_laboral: "Entrada laboral",
  salida_almuerzo: "Salida almuerzo",
  entrada_almuerzo: "Regreso almuerzo",
  salida_laboral: "Salida laboral",
};

interface EmployeeRow {
  id: string;
  nombre: string;
  email: string;
  rut?: string | null;
  cargo?: string | null;
}

interface AttendanceRow {
  id: string;
  empleado_id: string;
  tipo_registro: string;
  fecha_hora: string;
  estado_registro?: string | null;
  duracion_colacion_minutos?: number | null;
  correction_reason?: string | null;
  correction_count?: number | null;
}

interface CompanyRow {
  nombre_empresa: string;
  rut_empresa?: string | null;
  razon_social?: string | null;
  representante_legal?: string | null;
  direccion?: string | null;
  hora_entrada: string | null;
  hora_salida: string | null;
  horarios_laborales: HorariosLaborales | null;
}

interface HolidayRow {
  fecha: string;
  nombre: string;
}

interface AbsenceRow {
  empleado_id: string;
  fecha_inicio: string;
  fecha_fin: string;
  tipo: string;
  motivo: string;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function buildDateList(fechaInicio: string, fechaFin: string) {
  const dates: string[] = [];
  let cursor = new Date(`${fechaInicio}T00:00:00.000Z`);
  const end = new Date(`${fechaFin}T00:00:00.000Z`);

  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor = addDays(cursor, 1);
  }

  return dates;
}

function timeToMinutes(time: string | null | undefined, fallback: string) {
  const [hours, minutes] = (time || fallback).split(":").map(Number);
  return hours * 60 + minutes;
}

function formatTime(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleTimeString("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "America/Santiago",
  });
}

function roundHours(value: number) {
  return Math.round(value * 100) / 100;
}

function getSchedule(company: CompanyRow | null, dateKey: string) {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  const key = dayKeys[date.getUTCDay()];
  const fallbackEntrada = company?.hora_entrada || "09:00";
  const fallbackSalida = company?.hora_salida || "18:00";
  const schedule = company?.horarios_laborales?.[key];

  if (schedule) return schedule;

  return {
    activo: key !== "sabado" && key !== "domingo",
    entrada: fallbackEntrada,
    salida: fallbackSalida,
  };
}

function expectedHours(schedule: { activo: boolean; entrada: string; salida: string }) {
  if (!schedule.activo) return 0;
  return Math.max(0, (timeToMinutes(schedule.salida, "18:00") - timeToMinutes(schedule.entrada, "09:00")) / 60);
}

function normalizeType(type: string) {
  if (type === "entrada") return "entrada_laboral";
  if (type === "salida") return "salida_laboral";
  return type;
}

function getFirst(records: AttendanceRow[], type: string) {
  return records.find((record) => normalizeType(record.tipo_registro) === type);
}

function getLast(records: AttendanceRow[], type: string) {
  return records
    .slice()
    .reverse()
    .find((record) => normalizeType(record.tipo_registro) === type);
}

function workedHours(records: AttendanceRow[]) {
  const activeRecords = records
    .filter((record) => record.estado_registro !== "anulado")
    .sort((a, b) => new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime());

  const entrada = getFirst(activeRecords, "entrada_laboral");
  const salida = getLast(activeRecords, "salida_laboral");
  if (!entrada || !salida) return 0;

  let hours = (new Date(salida.fecha_hora).getTime() - new Date(entrada.fecha_hora).getTime()) / (1000 * 60 * 60);
  const salidaAlmuerzo = getFirst(activeRecords, "salida_almuerzo");
  const entradaAlmuerzo = getFirst(activeRecords, "entrada_almuerzo");

  if (salidaAlmuerzo && entradaAlmuerzo) {
    hours -= (new Date(entradaAlmuerzo.fecha_hora).getTime() - new Date(salidaAlmuerzo.fecha_hora).getTime()) / (1000 * 60 * 60);
  } else if (salidaAlmuerzo?.duracion_colacion_minutos) {
    hours -= salidaAlmuerzo.duracion_colacion_minutos / 60;
  }

  return roundHours(Math.max(0, hours));
}

function dayStatus(records: AttendanceRow[], scheduleActive: boolean) {
  const activeRecords = records.filter((record) => record.estado_registro !== "anulado");
  const hasAny = records.length > 0;
  const hasCorrections = records.some((record) => (record.correction_count ?? 0) > 0 || record.estado_registro === "corregido");
  const hasVoided = records.some((record) => record.estado_registro === "anulado");

  if (hasVoided && activeRecords.length === 0) return "Anulado";
  if (!scheduleActive && !hasAny) return "No programado";
  if (scheduleActive && !hasAny) return "Ausente";

  const entrada = getFirst(activeRecords, "entrada_laboral");
  const salida = getLast(activeRecords, "salida_laboral");
  if (!entrada || !salida) return hasCorrections ? "Incompleto corregido" : "Incompleto";

  return hasCorrections ? "Completo corregido" : "Completo";
}

function findAbsence(absences: AbsenceRow[], employeeId: string, dateKey: string) {
  return absences.find(
    (absence) =>
      absence.empleado_id === employeeId &&
      absence.fecha_inicio <= dateKey &&
      absence.fecha_fin >= dateKey
  );
}

function correctionNotes(records: AttendanceRow[]) {
  const notes = records
    .filter((record) => record.estado_registro === "anulado" || (record.correction_count ?? 0) > 0 || record.correction_reason)
    .map((record) => {
      const type = typeLabels[record.tipo_registro] ?? record.tipo_registro;
      const status = record.estado_registro ? `Estado: ${record.estado_registro}` : "";
      const reason = record.correction_reason ? `Motivo: ${record.correction_reason}` : "";
      return [type, status, reason].filter(Boolean).join(" - ");
    });

  return notes.length > 0 ? notes.join(" | ") : "";
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { data: currentEmployee, error: empError } = await supabase
      .from("employees")
      .select("empresa_id, role, nombre, email")
      .eq("id", user.id)
      .single();

    if (empError || !currentEmployee || currentEmployee.role !== "admin") {
      return NextResponse.json(
        { error: "No tienes permisos para exportar" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const fechaInicio = searchParams.get("fecha_inicio");
    const fechaFin = searchParams.get("fecha_fin");

    if (!fechaInicio || !fechaFin) {
      return NextResponse.json(
        { error: "fecha_inicio y fecha_fin son requeridos" },
        { status: 400 }
      );
    }

    const [{ data: company }, { data: employees }, { data: records }, { data: holidays }, { data: absences }] = await Promise.all([
      supabase
        .from("companies")
        .select("nombre_empresa, rut_empresa, razon_social, representante_legal, direccion, hora_entrada, hora_salida, horarios_laborales")
        .eq("id", currentEmployee.empresa_id)
        .single(),
      supabase
        .from("employees")
        .select("id, nombre, email, rut, cargo")
        .eq("empresa_id", currentEmployee.empresa_id)
        .is("eliminado_at", null)
        .neq("role", "admin")
        .order("nombre", { ascending: true }),
      supabase
        .from("attendance")
        .select("id, empleado_id, tipo_registro, fecha_hora, estado_registro, duracion_colacion_minutos, correction_reason, correction_count")
        .eq("empresa_id", currentEmployee.empresa_id)
        .gte("fecha_hora", fechaInicio)
        .lte("fecha_hora", `${fechaFin}T23:59:59.999Z`)
        .order("fecha_hora", { ascending: true }),
      supabase
        .from("company_holidays")
        .select("fecha, nombre")
        .eq("empresa_id", currentEmployee.empresa_id)
        .gte("fecha", fechaInicio)
        .lte("fecha", fechaFin),
      supabase
        .from("employee_absences")
        .select("empleado_id, fecha_inicio, fecha_fin, tipo, motivo")
        .eq("empresa_id", currentEmployee.empresa_id)
        .is("deleted_at", null)
        .lte("fecha_inicio", fechaFin)
        .gte("fecha_fin", fechaInicio),
    ]);

    const employeeRows = (employees ?? []) as EmployeeRow[];
    const attendanceRows = (records ?? []) as AttendanceRow[];
    const companyRow = company as CompanyRow | null;
    const holidayRows = (holidays ?? []) as HolidayRow[];
    const absenceRows = (absences ?? []) as AbsenceRow[];
    const holidaysByDate = new Map(holidayRows.map((holiday) => [holiday.fecha, holiday]));
    const dates = buildDateList(fechaInicio, fechaFin);

    const recordsByEmployeeDate = new Map<string, AttendanceRow[]>();
    for (const record of attendanceRows) {
      const key = `${record.empleado_id}_${chileDateKey(record.fecha_hora)}`;
      const current = recordsByEmployeeDate.get(key) ?? [];
      current.push(record);
      recordsByEmployeeDate.set(key, current);
    }

    const detailRows = employeeRows.flatMap((employee) =>
      dates.map((dateKey) => {
        const schedule = getSchedule(companyRow, dateKey);
        const dayRecords = (recordsByEmployeeDate.get(`${employee.id}_${dateKey}`) ?? []).sort(
          (a, b) => new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime()
        );
        const activeRecords = dayRecords.filter((record) => record.estado_registro !== "anulado");
        const entrada = getFirst(activeRecords, "entrada_laboral");
        const salidaAlmuerzo = getFirst(activeRecords, "salida_almuerzo");
        const entradaAlmuerzo = getFirst(activeRecords, "entrada_almuerzo");
        const salida = getLast(activeRecords, "salida_laboral");
        const holiday = holidaysByDate.get(dateKey);
        const absence = findAbsence(absenceRows, employee.id, dateKey);
        const expected = holiday || absence ? 0 : expectedHours(schedule);
        const worked = workedHours(dayRecords);
        const diff = roundHours(worked - expected);
        const status = holiday
          ? "Feriado"
          : absence
          ? "Ausencia justificada"
          : dayStatus(dayRecords, schedule.activo);
        const notes = [
          holiday ? `Feriado: ${holiday.nombre}` : "",
          absence ? `Ausencia: ${absence.tipo} - ${absence.motivo}` : "",
          correctionNotes(dayRecords),
        ].filter(Boolean).join(" | ");

        return {
          Empresa: companyRow?.nombre_empresa ?? "",
          "RUT empresa": companyRow?.rut_empresa ?? "",
          "Razon social": companyRow?.razon_social ?? companyRow?.nombre_empresa ?? "",
          "Representante legal": companyRow?.representante_legal ?? "",
          Direccion: companyRow?.direccion ?? "",
          Trabajador: employee.nombre,
          "RUT trabajador": employee.rut ?? "",
          Cargo: employee.cargo ?? "",
          Email: employee.email,
          Fecha: dateKey,
          "Dia programado": schedule.activo && !holiday && !absence ? "Si" : "No",
          "Horario esperado": schedule.activo && !holiday && !absence ? `${schedule.entrada} - ${schedule.salida}` : "-",
          "Entrada laboral": formatTime(entrada?.fecha_hora),
          "Salida almuerzo": formatTime(salidaAlmuerzo?.fecha_hora),
          "Regreso almuerzo": formatTime(entradaAlmuerzo?.fecha_hora),
          "Salida laboral": formatTime(salida?.fecha_hora),
          "Horas esperadas": expected.toFixed(2),
          "Horas trabajadas": worked.toFixed(2),
          "Horas extra": Math.max(0, diff).toFixed(2),
          "Horas debe": Math.max(0, -diff).toFixed(2),
          "Estado del dia": status,
          Observaciones: notes,
        };
      })
    );

    const summaryByEmployee = employeeRows.map((employee) => {
      const rows = detailRows.filter((row) => row.Email === employee.email);
      const expected = rows.reduce((total, row) => total + Number(row["Horas esperadas"]), 0);
      const worked = rows.reduce((total, row) => total + Number(row["Horas trabajadas"]), 0);
      const extra = rows.reduce((total, row) => total + Number(row["Horas extra"]), 0);
      const debt = rows.reduce((total, row) => total + Number(row["Horas debe"]), 0);
      const absences = rows.filter((row) => row["Estado del dia"] === "Ausente").length;
      const incomplete = rows.filter((row) => String(row["Estado del dia"]).includes("Incompleto")).length;

      return {
        Trabajador: employee.nombre,
        "RUT trabajador": employee.rut ?? "",
        Cargo: employee.cargo ?? "",
        Email: employee.email,
        "Periodo desde": fechaInicio,
        "Periodo hasta": fechaFin,
        "Dias ausente": absences,
        "Dias incompletos": incomplete,
        "Horas esperadas": roundHours(expected).toFixed(2),
        "Horas trabajadas": roundHours(worked).toFixed(2),
        "Horas extra": roundHours(extra).toFixed(2),
        "Horas debe": roundHours(debt).toFixed(2),
      };
    });

    const wb = XLSX.utils.book_new();
    const metadataRows = [
      { Campo: "Empresa", Valor: companyRow?.nombre_empresa ?? "" },
      { Campo: "RUT empresa", Valor: companyRow?.rut_empresa ?? "" },
      { Campo: "Razon social", Valor: companyRow?.razon_social ?? companyRow?.nombre_empresa ?? "" },
      { Campo: "Representante legal", Valor: companyRow?.representante_legal ?? "" },
      { Campo: "Direccion", Valor: companyRow?.direccion ?? "" },
      { Campo: "Periodo desde", Valor: fechaInicio },
      { Campo: "Periodo hasta", Valor: fechaFin },
      {
        Campo: "Fecha emision",
        Valor: new Date().toLocaleString("es-CL", { timeZone: "America/Santiago" }),
      },
      {
        Campo: "Generado por",
        Valor: `${currentEmployee.nombre ?? ""} (${currentEmployee.email ?? ""})`,
      },
    ];
    const metadataSheet = XLSX.utils.json_to_sheet(metadataRows);
    const detailSheet = XLSX.utils.json_to_sheet(detailRows);
    const summarySheet = XLSX.utils.json_to_sheet(summaryByEmployee);

    metadataSheet["!cols"] = [{ wch: 24 }, { wch: 45 }];
    detailSheet["!cols"] = [
      { wch: 24 },
      { wch: 16 },
      { wch: 28 },
      { wch: 26 },
      { wch: 30 },
      { wch: 24 },
      { wch: 16 },
      { wch: 20 },
      { wch: 30 },
      { wch: 12 },
      { wch: 14 },
      { wch: 18 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 15 },
      { wch: 16 },
      { wch: 12 },
      { wch: 12 },
      { wch: 20 },
      { wch: 55 },
    ];

    summarySheet["!cols"] = [
      { wch: 24 },
      { wch: 16 },
      { wch: 20 },
      { wch: 30 },
      { wch: 14 },
      { wch: 14 },
      { wch: 12 },
      { wch: 15 },
      { wch: 16 },
      { wch: 16 },
      { wch: 12 },
      { wch: 12 },
    ];

    XLSX.utils.book_append_sheet(wb, metadataSheet, "Datos legales");
    XLSX.utils.book_append_sheet(wb, summarySheet, "Resumen");
    XLSX.utils.book_append_sheet(wb, detailSheet, "Detalle diario");

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="reporte_fiscalizacion_${fechaInicio}_${fechaFin}.xlsx"`,
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch (err) {
    console.error("GET /api/attendance/export-legal error:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
