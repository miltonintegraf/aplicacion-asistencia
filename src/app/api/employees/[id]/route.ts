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
      .select("empresa_id")
      .eq("id", id)
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
      .select("id, nombre, email, activo, role, modalidad, dias_presenciales, fecha_creacion")
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

    // Prevent self-deactivation
    if (id === user.id) {
      return NextResponse.json(
        { error: "No puedes desactivar tu propia cuenta" },
        { status: 400 }
      );
    }

    // Soft delete: set activo = false
    const { data: deactivated, error: deactivateError } = await supabase
      .from("employees")
      .update({ activo: false })
      .eq("id", id)
      .eq("empresa_id", currentEmployee.empresa_id)
      .select("id, nombre, activo")
      .single();

    if (deactivateError) {
      return NextResponse.json(
        { error: "Error al desactivar empleado: " + deactivateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: deactivated,
      message: "Empleado desactivado correctamente",
    });
  } catch (err) {
    console.error("DELETE /api/employees/[id] error:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
