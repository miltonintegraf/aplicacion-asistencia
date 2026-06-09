import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { UpdateEmployeePayload } from "@/lib/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Verify admin
    const { data: currentEmployee, error: empError } = await supabase
      .from("employees")
      .select("empresa_id, role")
      .eq("id", user.id)
      .single();

    if (empError || !currentEmployee || currentEmployee.role !== "admin") {
      return NextResponse.json(
        { error: "No tienes permisos para esta acción" },
        { status: 403 }
      );
    }

    // Verify target employee belongs to same company
    const { data: targetEmployee, error: targetError } = await supabase
      .from("employees")
      .select("empresa_id, eliminado_at")
      .eq("id", id)
      .is("eliminado_at", null)
      .single();

    if (
      targetError ||
      !targetEmployee ||
      targetEmployee.empresa_id !== currentEmployee.empresa_id
    ) {
      return NextResponse.json(
        { error: "Empleado no encontrado" },
        { status: 404 }
      );
    }

    const body: UpdateEmployeePayload = await request.json();

    // Only allow updating certain fields
    const updateData: Partial<UpdateEmployeePayload> = {};
    if (body.nombre !== undefined) updateData.nombre = body.nombre;
    if (body.email !== undefined) updateData.email = body.email;
    if (body.activo !== undefined) updateData.activo = body.activo;
    if (body.rut !== undefined) updateData.rut = body.rut;
    if (body.cargo !== undefined) updateData.cargo = body.cargo;
    if (body.modalidad !== undefined) updateData.modalidad = body.modalidad;
    if (body.dias_presenciales !== undefined) updateData.dias_presenciales = body.dias_presenciales;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No hay datos para actualizar" },
        { status: 400 }
      );
    }

    const { data: updated, error: updateError } = await supabase
      .from("employees")
      .update(updateData)
      .eq("id", id)
      .eq("empresa_id", currentEmployee.empresa_id)
      .select("id, nombre, email, rut, cargo, activo, role, modalidad, dias_presenciales, fecha_creacion, eliminado_at")
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: "Error al actualizar empleado: " + updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: updated });
  } catch (err) {
    console.error("PATCH /api/employees/[id] error:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Verify admin
    const { data: currentEmployee, error: empError } = await supabase
      .from("employees")
      .select("empresa_id, role")
      .eq("id", user.id)
      .single();

    if (empError || !currentEmployee || currentEmployee.role !== "admin") {
      return NextResponse.json(
        { error: "No tienes permisos para esta acción" },
        { status: 403 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      confirm_name?: string;
    };

    // Prevent self-delete
    if (id === user.id) {
      return NextResponse.json(
        { error: "No puedes eliminar tu propia cuenta" },
        { status: 400 }
      );
    }

    const { data: targetEmployee, error: targetError } = await supabase
      .from("employees")
      .select("id, empresa_id, nombre, eliminado_at")
      .eq("id", id)
      .eq("empresa_id", currentEmployee.empresa_id)
      .is("eliminado_at", null)
      .single();

    if (targetError || !targetEmployee) {
      return NextResponse.json(
        { error: "Empleado no encontrado" },
        { status: 404 }
      );
    }

    if ((body.confirm_name ?? "").trim() !== targetEmployee.nombre) {
      return NextResponse.json(
        { error: "Para confirmar, escribe exactamente el nombre del empleado" },
        { status: 400 }
      );
    }

    // Safe delete: hide from employee management and disable access, keeping attendance history.
    const { data: deleted, error: deleteError } = await supabase
      .from("employees")
      .update({ activo: false, eliminado_at: new Date().toISOString() })
      .eq("id", id)
      .eq("empresa_id", currentEmployee.empresa_id)
      .select("id, nombre, activo, eliminado_at")
      .single();

    if (deleteError) {
      return NextResponse.json(
        { error: "Error al eliminar empleado: " + deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: deleted,
      message: "Empleado eliminado correctamente",
    });
  } catch (err) {
    console.error("DELETE /api/employees/[id] error:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
