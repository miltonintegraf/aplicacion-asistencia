import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
    if (!body.fecha || !body.nombre) {
      return NextResponse.json(
        { error: "Fecha y nombre son requeridos" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("company_holidays")
      .upsert(
        {
          empresa_id: currentEmployee.empresa_id,
          fecha: body.fecha,
          nombre: body.nombre,
          tipo: body.tipo || "feriado",
        },
        { onConflict: "empresa_id,fecha" }
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Error al guardar feriado: " + error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error("POST /api/holidays error:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
