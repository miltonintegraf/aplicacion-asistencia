export interface TodayAttendanceRecord {
  id?: string;
  tipo_registro: string;
  fecha_hora: string;
  duracion_colacion_minutos?: number | null;
}

export function chileDateKey(value: Date | string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

export function getTodayAttendanceRecords<T extends TodayAttendanceRecord>(records: T[]) {
  const todayKey = chileDateKey(new Date());
  return records
    .filter((record) => chileDateKey(record.fecha_hora) === todayKey)
    .sort((a, b) => new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime());
}
