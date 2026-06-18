import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildAttendanceSummary } from "@/lib/reports/attendanceSummary";

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

    const { data: employee, error: empError } = await supabase
      .from("employees")
      .select("empresa_id, role")
      .eq("id", user.id)
      .single();

    if (empError || !employee || employee.role !== "admin") {
      return NextResponse.json(
        { error: "No tienes permisos para esta acción" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const fecha_inicio = searchParams.get("fecha_inicio");
    const fecha_fin = searchParams.get("fecha_fin");

    if (!fecha_inicio || !fecha_fin) {
      return NextResponse.json(
        { error: "fecha_inicio y fecha_fin son requeridos" },
        { status: 400 }
      );
    }

    // Get company settings
    const { data: company } = await supabase
      .from("companies")
      .select("hora_entrada, hora_salida, horarios_laborales")
      .eq("id", employee.empresa_id)
      .single();

    // Get all attendance records
    const { data: records } = await supabase
      .from("attendance")
      .select("empleado_id, tipo_registro, fecha_hora, duracion_colacion_minutos")
      .eq("empresa_id", employee.empresa_id)
      .neq("estado_registro", "anulado")
      .gte("fecha_hora", fecha_inicio)
      .lte("fecha_hora", fecha_fin)
      .order("fecha_hora", { ascending: true });

    // Get all active employees
    const { data: employees } = await supabase
      .from("employees")
      .select("id, nombre, email")
      .eq("empresa_id", employee.empresa_id)
      .eq("activo", true)
      .neq("role", "admin");

    const [{ data: holidays }, { data: absences }] = await Promise.all([
      supabase
        .from("company_holidays")
        .select("fecha")
        .eq("empresa_id", employee.empresa_id)
        .gte("fecha", fecha_inicio)
        .lte("fecha", fecha_fin),
      supabase
        .from("employee_absences")
        .select("empleado_id, fecha_inicio, fecha_fin, tipo")
        .eq("empresa_id", employee.empresa_id)
        .is("deleted_at", null)
        .lte("fecha_inicio", fecha_fin)
        .gte("fecha_fin", fecha_inicio),
    ]);

    const result = buildAttendanceSummary({
      employees: employees || [],
      records: records || [],
      company,
      fechaInicio: fecha_inicio,
      fechaFin: fecha_fin,
      holidays: (holidays || []).map((holiday) => holiday.fecha),
      absences: absences || [],
    });

    return NextResponse.json({ data: result });
  } catch (err) {
    console.error("GET /api/attendance/summary error:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
