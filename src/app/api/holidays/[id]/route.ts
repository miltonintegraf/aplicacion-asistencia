import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function DELETE(_request: Request, { params }: RouteParams) {
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

    const { data: currentEmployee } = await supabase
      .from("employees")
      .select("empresa_id, role")
      .eq("id", user.id)
      .single();

    if (!currentEmployee || currentEmployee.role !== "admin") {
      return NextResponse.json({ error: "No tienes permisos" }, { status: 403 });
    }

    const { error } = await supabase
      .from("company_holidays")
      .delete()
      .eq("id", id)
      .eq("empresa_id", currentEmployee.empresa_id);

    if (error) {
      return NextResponse.json(
        { error: "Error al eliminar feriado: " + error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Feriado eliminado" });
  } catch (err) {
    console.error("DELETE /api/holidays/[id] error:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
