import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { data: currentEmployee, error: employeeError } = await supabase
      .from("employees")
      .select("empresa_id, role")
      .eq("id", user.id)
      .single();

    if (employeeError || !currentEmployee || currentEmployee.role !== "admin") {
      return NextResponse.json(
        { error: "No tienes permisos para actualizar notificaciones" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const status = body.status === "read" ? "read" : "pending";

    const { data, error } = await supabase
      .from("attendance_notifications")
      .update({
        status,
        read_at: status === "read" ? new Date().toISOString() : null,
      })
      .eq("id", id)
      .eq("empresa_id", currentEmployee.empresa_id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Error al actualizar notificacion: " + error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error("PATCH /api/notifications/[id] error:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
