import type { TipoRegistro } from "@/lib/types";

export function attendanceTypeLabel(type: string) {
  const labels: Record<string, string> = {
    entrada: "Entrada laboral",
    salida: "Salida laboral",
    entrada_laboral: "Entrada laboral",
    salida_almuerzo: "Salida almuerzo",
    entrada_almuerzo: "Regreso almuerzo",
    salida_laboral: "Salida laboral",
  };

  return labels[type] ?? type;
}

export function attendanceStatusLabel(status?: string | null) {
  const labels: Record<string, string> = {
    vigente: "Vigente",
    corregido: "Corregido",
    anulado: "Anulado",
  };

  return labels[status ?? "vigente"] ?? "Vigente";
}

export function normalizeAttendanceType(type: TipoRegistro) {
  if (type === "entrada") return "entrada_laboral";
  if (type === "salida") return "salida_laboral";
  return type;
}
