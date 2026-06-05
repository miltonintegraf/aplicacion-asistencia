export interface HorarioLaboralDia {
  activo: boolean;
  entrada: string;
  salida: string;
}

export type HorariosLaborales = Record<string, HorarioLaboralDia>;

export interface Company {
  id: string;
  nombre_empresa: string;
  direccion: string | null;
  latitud: number | null;
  longitud: number | null;
  radio_permitido_metros: number;
  foto_requerida: boolean;
  firma_requerida: boolean;
  hora_entrada: string | null;
  hora_salida: string | null;
  horarios_laborales: HorariosLaborales | null;
  tolerancia_minutos: number;
  estado_suscripcion: "trial" | "active" | "expired" | "cancelled";
  fecha_inicio_trial: string;
  dias_trial: number;
  fecha_creacion: string;
}

export interface Employee {
  id: string;
  empresa_id: string;
  nombre: string;
  email: string;
  password_hash?: string | null;
  activo: boolean;
  role: "admin" | "employee" | "super_admin";
  modalidad: "presencial" | "remoto" | "hibrido";
  dias_presenciales: number[];
  fecha_creacion: string;
  eliminado_at?: string | null;
}

export type TipoRegistro =
  | "entrada_laboral"
  | "salida_almuerzo"
  | "entrada_almuerzo"
  | "salida_laboral"
  | "entrada"   // legacy
  | "salida";   // legacy

export interface AttendanceRecord {
  id: string;
  empresa_id: string;
  empleado_id: string;
  tipo_registro: TipoRegistro;
  fecha_hora: string;
  created_at?: string;
  created_by?: string | null;
  latitud: number | null;
  longitud: number | null;
  distancia_empresa_metros: number | null;
  valido: boolean;
  estado_registro?: "vigente" | "corregido" | "anulado";
  foto_url: string | null;
  firma_url: string | null;
  duracion_colacion_minutos?: number | null;
  correction_reason?: string | null;
  corrected_by?: string | null;
  corrected_at?: string | null;
  correction_count?: number;
  request_ip?: string | null;
  user_agent?: string | null;
  client_metadata?: Record<string, unknown>;
  record_hash?: string | null;
  // joined fields
  employees?: {
    nombre: string;
    email: string;
  };
}

export interface AttendanceStats {
  total_empleados: number;
  presentes_hoy: number;
  ausentes_hoy: number;
  tardanzas: number;
}

export interface User {
  id: string;
  email: string;
  role: "admin" | "employee" | "super_admin";
  nombre: string;
  empresa_id: string;
}

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}

export interface AttendanceFilter {
  empleado_id?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  empresa_id?: string;
  page?: number;
  limit?: number;
}

export interface CreateEmployeePayload {
  nombre: string;
  email: string;
  password: string;
  role?: "admin" | "employee" | "super_admin";
  modalidad?: "presencial" | "remoto" | "hibrido";
  dias_presenciales?: number[];
}

export interface UpdateEmployeePayload {
  nombre?: string;
  email?: string;
  activo?: boolean;
  modalidad?: "presencial" | "remoto" | "hibrido";
  dias_presenciales?: number[];
}

export interface CreateAttendancePayload {
  empleado_id: string;
  tipo_registro: TipoRegistro;
  latitud: number;
  longitud: number;
  foto_base64?: string;
  firma_base64?: string;
  duracion_colacion_minutos?: number;
}

export interface UpdateCompanyPayload {
  nombre_empresa?: string;
  direccion?: string;
  latitud?: number;
  longitud?: number;
  radio_permitido_metros?: number;
  foto_requerida?: boolean;
  firma_requerida?: boolean;
  hora_entrada?: string;
  hora_salida?: string;
  horarios_laborales?: HorariosLaborales;
  tolerancia_minutos?: number;
}
