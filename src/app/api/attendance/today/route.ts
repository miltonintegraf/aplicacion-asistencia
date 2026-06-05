import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTodayAttendanceRecords } from "@/lib/attendance/today";

export async function GET() {
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
      .select("empresa_id, activo")
      .eq("id", user.id)
      .single();

    if (empError || !employee) {
      return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 });
    }

    if (!employee.activo) {
      return NextResponse.json({ error: "Cuenta desactivada" }, { status: 403 });
    }

    const { data: records, error } = await supabase
      .from("attendance")
      .select("id, tipo_registro, fecha_hora, duracion_colacion_minutos")
      .eq("empresa_id", employee.empresa_id)
      .eq("empleado_id", user.id)
      .neq("estado_registro", "anulado")
      .order("fecha_hora", { ascending: false })
      .limit(20);

    if (error) {
      return NextResponse.json(
        { error: "Error al obtener marcaciones: " + error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: getTodayAttendanceRecords(records ?? []) });
  } catch (err) {
    console.error("GET /api/attendance/today error:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
