import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { attendanceStatusLabel, attendanceTypeLabel } from "@/lib/attendance/labels";
import * as XLSX from "xlsx";

interface AuditLogRow {
  id: string;
  attendance_id: string | null;
  empleado_id: string | null;
  actor_id: string | null;
  action: "created" | "updated";
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  request_ip: string | null;
  user_agent: string | null;
  created_at: string;
}

interface EmployeeRow {
  id: string;
  nombre: string;
  email: string;
  rut?: string | null;
}

function formatDate(value?: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "America/Santiago",
  });
}

function formatChangedFields(log: AuditLogRow) {
  if (log.action !== "updated" || !log.old_data || !log.new_data) return "";

  const fields: Record<string, string> = {
    tipo_registro: "Tipo de marca",
    fecha_hora: "Fecha y hora",
    estado_registro: "Estado",
    duracion_colacion_minutos: "Colación",
    valido: "Validez",
    correction_reason: "Motivo",
  };

  return Object.entries(fields)
    .filter(([key]) => JSON.stringify(log.old_data?.[key]) !== JSON.stringify(log.new_data?.[key]))
    .map(([key, label]) => {
      const oldValue = key === "tipo_registro"
        ? attendanceTypeLabel(String(log.old_data?.[key] ?? ""))
        : key === "estado_registro"
        ? attendanceStatusLabel(String(log.old_data?.[key] ?? ""))
        : String(log.old_data?.[key] ?? "");
      const newValue = key === "tipo_registro"
        ? attendanceTypeLabel(String(log.new_data?.[key] ?? ""))
        : key === "estado_registro"
        ? attendanceStatusLabel(String(log.new_data?.[key] ?? ""))
        : String(log.new_data?.[key] ?? "");

      return `${label}: ${oldValue || "-"} -> ${newValue || "-"}`;
    })
    .join(" | ");
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
      .select("empresa_id, role")
      .eq("id", user.id)
      .single();

    if (empError || !currentEmployee || currentEmployee.role !== "admin") {
      return NextResponse.json(
        { error: "No tienes permisos para exportar trazabilidad" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const empleadoId = searchParams.get("empleado_id");
    const action = searchParams.get("action");
    const fechaInicio = searchParams.get("fecha_inicio");
    const fechaFin = searchParams.get("fecha_fin");

    let query = supabase
      .from("attendance_audit_logs")
      .select("id, attendance_id, empleado_id, actor_id, action, old_data, new_data, request_ip, user_agent, created_at")
      .eq("empresa_id", currentEmployee.empresa_id)
      .order("created_at", { ascending: false })
      .limit(1000);

    if (empleadoId) query = query.eq("empleado_id", empleadoId);
    if (action === "created" || action === "updated") query = query.eq("action", action);
    if (fechaInicio) query = query.gte("created_at", fechaInicio);
    if (fechaFin) query = query.lte("created_at", `${fechaFin}T23:59:59.999Z`);

    const { data: logs, error: logsError } = await query;
    if (logsError) {
      return NextResponse.json(
        { error: "Error al obtener trazabilidad: " + logsError.message },
        { status: 500 }
      );
    }

    const auditLogs = (logs ?? []) as AuditLogRow[];
    const employeeIds = Array.from(
      new Set(auditLogs.flatMap((log) => [log.empleado_id, log.actor_id]).filter(Boolean))
    ) as string[];

    const { data: employees } = employeeIds.length
      ? await supabase.from("employees").select("id, nombre, email, rut").in("id", employeeIds)
      : { data: [] as EmployeeRow[] };

    const employeeById = new Map((employees ?? []).map((employee: EmployeeRow) => [employee.id, employee]));

    const rows = auditLogs.map((log) => {
      const employee = log.empleado_id ? employeeById.get(log.empleado_id) : null;
      const actor = log.actor_id ? employeeById.get(log.actor_id) : null;
      const data = log.new_data ?? log.old_data ?? {};

      return {
        Fecha: formatDate(log.created_at),
        Accion: log.action === "created" ? "Marcacion creada" : "Marcacion modificada",
        Trabajador: employee?.nombre ?? "",
        "RUT trabajador": employee?.rut ?? "",
        Email: employee?.email ?? "",
        "Realizado por": actor?.nombre ?? "Sistema",
        "Tipo marca": typeof data.tipo_registro === "string" ? attendanceTypeLabel(data.tipo_registro) : "",
        "Fecha marca": typeof data.fecha_hora === "string" ? formatDate(data.fecha_hora) : "",
        Estado: typeof data.estado_registro === "string" ? attendanceStatusLabel(data.estado_registro) : "Vigente",
        Cambios: formatChangedFields(log),
        Motivo: typeof data.correction_reason === "string" ? data.correction_reason : "",
        IP: log.request_ip ?? "",
        Dispositivo: log.user_agent ?? "",
        Hash: typeof data.record_hash === "string" ? data.record_hash : "",
        "ID marcacion": log.attendance_id ?? "",
        "ID evento": log.id,
      };
    });

    const wb = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet(rows);
    sheet["!cols"] = [
      { wch: 20 },
      { wch: 24 },
      { wch: 26 },
      { wch: 16 },
      { wch: 30 },
      { wch: 26 },
      { wch: 20 },
      { wch: 20 },
      { wch: 14 },
      { wch: 60 },
      { wch: 50 },
      { wch: 16 },
      { wch: 45 },
      { wch: 70 },
      { wch: 38 },
      { wch: 38 },
    ];

    XLSX.utils.book_append_sheet(wb, sheet, "Trazabilidad");
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="trazabilidad_asistencia_${fechaInicio ?? "inicio"}_${fechaFin ?? "hoy"}.xlsx"`,
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch (err) {
    console.error("GET /api/attendance/audit-export error:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
