import type { HorariosLaborales } from "@/lib/types";

export interface AttendanceSummaryEmployee {
  id: string;
  nombre: string;
  email: string;
}

export interface AttendanceSummaryRecord {
  empleado_id: string;
  tipo_registro: string;
  fecha_hora: string;
  duracion_colacion_minutos?: number | null;
}

export interface AttendanceSummaryCompany {
  hora_entrada: string | null;
  hora_salida: string | null;
  horarios_laborales: HorariosLaborales | null;
}

export interface EmployeeHoursSummary {
  id: string;
  nombre: string;
  email: string;
  dias_programados: number;
  dias_trabajados: number;
  total_entradas: number;
  total_salidas: number;
  horas_estimadas: number;
  horas_trabajadas: number;
  horas_extra: number;
  horas_debe: number;
  diferencia_horas: number;
  estado: "extra" | "debe" | "completo";
}

const dayKeys = [
  "domingo",
  "lunes",
  "martes",
  "miercoles",
  "jueves",
  "viernes",
  "sabado",
];

function timeToMinutes(time: string | null | undefined, fallback: string) {
  const [hours, minutes] = (time || fallback).split(":").map(Number);
  return hours * 60 + minutes;
}

function roundHours(value: number) {
  return Math.round(value * 100) / 100;
}

function getDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getRecordDateKey(fechaHora: string) {
  return fechaHora.slice(0, 10);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function getScheduleForDate(company: AttendanceSummaryCompany | null, date: Date) {
  const fallbackEntrada = company?.hora_entrada || "09:00";
  const fallbackSalida = company?.hora_salida || "18:00";
  const key = dayKeys[date.getUTCDay()];
  const schedule = company?.horarios_laborales?.[key];

  if (schedule) {
    return schedule;
  }

  return {
    activo: key !== "sabado" && key !== "domingo",
    entrada: fallbackEntrada,
    salida: fallbackSalida,
  };
}

function expectedHoursForSchedule(schedule: { entrada: string; salida: string }) {
  const entrada = timeToMinutes(schedule.entrada, "09:00");
  const salida = timeToMinutes(schedule.salida, "18:00");
  return Math.max(0, (salida - entrada) / 60);
}

function buildExpectedHoursByEmployee(
  employees: AttendanceSummaryEmployee[],
  company: AttendanceSummaryCompany | null,
  fechaInicio: string,
  fechaFin: string
) {
  const expected: Record<string, { diasProgramados: number; horasEstimadas: number }> = {};

  for (const employee of employees) {
    expected[employee.id] = { diasProgramados: 0, horasEstimadas: 0 };
  }

  let cursor = new Date(`${fechaInicio}T00:00:00.000Z`);
  const end = new Date(`${fechaFin}T00:00:00.000Z`);

  while (cursor <= end) {
    const schedule = getScheduleForDate(company, cursor);
    if (schedule.activo) {
      const dayHours = expectedHoursForSchedule(schedule);
      for (const employee of employees) {
        expected[employee.id].diasProgramados += 1;
        expected[employee.id].horasEstimadas += dayHours;
      }
    }
    cursor = addDays(cursor, 1);
  }

  return expected;
}

function calculateDayWorkedHours(records: AttendanceSummaryRecord[]) {
  const sorted = records
    .slice()
    .sort((a, b) => new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime());

  const entrada = sorted.find((record) =>
    ["entrada", "entrada_laboral"].includes(record.tipo_registro)
  );
  const salida = sorted
    .slice()
    .reverse()
    .find((record) => ["salida", "salida_laboral"].includes(record.tipo_registro));

  if (!entrada || !salida) {
    return 0;
  }

  let worked =
    (new Date(salida.fecha_hora).getTime() - new Date(entrada.fecha_hora).getTime()) /
    (1000 * 60 * 60);

  const salidaAlmuerzo = sorted.find((record) => record.tipo_registro === "salida_almuerzo");
  const entradaAlmuerzo = sorted.find((record) => record.tipo_registro === "entrada_almuerzo");

  if (salidaAlmuerzo && entradaAlmuerzo) {
    worked -=
      (new Date(entradaAlmuerzo.fecha_hora).getTime() -
        new Date(salidaAlmuerzo.fecha_hora).getTime()) /
      (1000 * 60 * 60);
  } else if (salida.duracion_colacion_minutos) {
    worked -= salida.duracion_colacion_minutos / 60;
  }

  return Math.max(0, worked);
}

export function buildAttendanceSummary({
  employees,
  records,
  company,
  fechaInicio,
  fechaFin,
}: {
  employees: AttendanceSummaryEmployee[];
  records: AttendanceSummaryRecord[];
  company: AttendanceSummaryCompany | null;
  fechaInicio: string;
  fechaFin: string;
}): EmployeeHoursSummary[] {
  const expected = buildExpectedHoursByEmployee(employees, company, fechaInicio, fechaFin);
  const recordsByEmployeeDay: Record<string, Record<string, AttendanceSummaryRecord[]>> = {};
  const counts: Record<string, { entradas: number; salidas: number }> = {};

  for (const employee of employees) {
    recordsByEmployeeDay[employee.id] = {};
    counts[employee.id] = { entradas: 0, salidas: 0 };
  }

  for (const record of records) {
    if (!recordsByEmployeeDay[record.empleado_id]) {
      recordsByEmployeeDay[record.empleado_id] = {};
      counts[record.empleado_id] = { entradas: 0, salidas: 0 };
    }

    if (["entrada", "entrada_laboral"].includes(record.tipo_registro)) {
      counts[record.empleado_id].entradas += 1;
    }

    if (["salida", "salida_laboral"].includes(record.tipo_registro)) {
      counts[record.empleado_id].salidas += 1;
    }

    const dateKey = getRecordDateKey(record.fecha_hora);
    recordsByEmployeeDay[record.empleado_id][dateKey] ||= [];
    recordsByEmployeeDay[record.empleado_id][dateKey].push(record);
  }

  return employees.map((employee) => {
    const dayRecords = recordsByEmployeeDay[employee.id] || {};
    const workedDayKeys = Object.keys(dayRecords).filter(
      (dateKey) => calculateDayWorkedHours(dayRecords[dateKey]) > 0
    );
    const horasTrabajadas = workedDayKeys.reduce(
      (total, dateKey) => total + calculateDayWorkedHours(dayRecords[dateKey]),
      0
    );
    const horasEstimadas = expected[employee.id]?.horasEstimadas ?? 0;
    const diferencia = roundHours(horasTrabajadas - horasEstimadas);
    const horasExtra = Math.max(0, diferencia);
    const horasDebe = Math.max(0, -diferencia);

    return {
      id: employee.id,
      nombre: employee.nombre,
      email: employee.email,
      dias_programados: expected[employee.id]?.diasProgramados ?? 0,
      dias_trabajados: workedDayKeys.length,
      total_entradas: counts[employee.id]?.entradas ?? 0,
      total_salidas: counts[employee.id]?.salidas ?? 0,
      horas_estimadas: roundHours(horasEstimadas),
      horas_trabajadas: roundHours(horasTrabajadas),
      horas_extra: roundHours(horasExtra),
      horas_debe: roundHours(horasDebe),
      diferencia_horas: diferencia,
      estado: diferencia > 0 ? "extra" : diferencia < 0 ? "debe" : "completo",
    };
  });
}
