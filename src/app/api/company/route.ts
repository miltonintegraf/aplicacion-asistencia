import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { UpdateCompanyPayload } from "@/lib/types";

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
      .select("empresa_id, role")
      .eq("id", user.id)
      .single();

    if (empError || !employee) {
      return NextResponse.json(
        { error: "Perfil no encontrado" },
        { status: 404 }
      );
    }

    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("*")
      .eq("id", employee.empresa_id)
      .single();

    if (companyError || !company) {
      return NextResponse.json(
        { error: "Empresa no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: company });
  } catch (err) {
    console.error("GET /api/company error:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
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

    const body: UpdateCompanyPayload = await request.json();

    const updateData: Partial<UpdateCompanyPayload> = {};
    if (body.nombre_empresa !== undefined)
      updateData.nombre_empresa = body.nombre_empresa;
    if (body.direccion !== undefined) updateData.direccion = body.direccion;
    if (body.latitud !== undefined) updateData.latitud = body.latitud;
    if (body.longitud !== undefined) updateData.longitud = body.longitud;
    if (body.radio_permitido_metros !== undefined)
      updateData.radio_permitido_metros = body.radio_permitido_metros;
    if (body.foto_requerida !== undefined)
      updateData.foto_requerida = body.foto_requerida;
    if (body.firma_requerida !== undefined)
      updateData.firma_requerida = body.firma_requerida;
    if (body.hora_entrada !== undefined)
      updateData.hora_entrada = body.hora_entrada;
    if (body.hora_salida !== undefined)
      updateData.hora_salida = body.hora_salida;
    if (body.tolerancia_minutos !== undefined)
      updateData.tolerancia_minutos = body.tolerancia_minutos;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No hay datos para actualizar" },
        { status: 400 }
      );
    }

    const { data: updated, error: updateError } = await supabase
      .from("companies")
      .update(updateData)
      .eq("id", employee.empresa_id)
      .select("*")
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: "Error al actualizar empresa: " + updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: updated,
      message: "Empresa actualizada correctamente",
    });
  } catch (err) {
    console.error("PATCH /api/company error:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
