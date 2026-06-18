import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const validTypes = ["permiso", "licencia", "vacaciones", "dia_administrativo", "otro"];

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { data: currentEmployee } = await supabase
      .from("employees")
      .select("empresa_id, role")
      .eq("id", user.id)
      .single();

    if (!currentEmployee || currentEmployee.role !== "admin") {
      return NextResponse.json({ error: "No tienes permisos" }, { status: 403 });
    }

    const body = await request.json();
    const tipo = String(body.tipo || "");

    if (!body.empleado_id || !body.fecha_inicio || !body.fecha_fin || !body.motivo) {
      return NextResponse.json(
        { error: "Trabajador, fechas y motivo son requeridos" },
        { status: 400 }
      );
    }

    if (!validTypes.includes(tipo)) {
      return NextResponse.json({ error: "Tipo de ausencia inválido" }, { status: 400 });
    }

    if (body.fecha_fin < body.fecha_inicio) {
      return NextResponse.json(
        { error: "La fecha fin no puede ser anterior a la fecha inicio" },
        { status: 400 }
      );
    }

    const { data: employee } = await supabase
      .from("employees")
      .select("id")
      .eq("id", body.empleado_id)
      .eq("empresa_id", currentEmployee.empresa_id)
      .single();

    if (!employee) {
      return NextResponse.json({ error: "Trabajador no encontrado" }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("employee_absences")
      .insert({
        empresa_id: currentEmployee.empresa_id,
        empleado_id: body.empleado_id,
        fecha_inicio: body.fecha_inicio,
        fecha_fin: body.fecha_fin,
        tipo,
        motivo: body.motivo,
        paid: body.paid ?? true,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Error al guardar ausencia: " + error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error("POST /api/absences error:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
