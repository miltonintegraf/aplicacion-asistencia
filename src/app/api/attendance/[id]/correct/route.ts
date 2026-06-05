import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

type CorrectionAction = "correct" | "void";

const validTypes = [
  "entrada_laboral",
  "salida_almuerzo",
  "entrada_almuerzo",
  "salida_laboral",
  "entrada",
  "salida",
];

function getRequestIp(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]?.trim() ?? null;
  return request.headers.get("x-real-ip") ?? null;
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

    const body = (await request.json()) as {
      action?: CorrectionAction;
      tipo_registro?: string;
      fecha_hora?: string;
      duracion_colacion_minutos?: number | null;
      reason?: string;
    };

    const action = body.action;
    const reason = body.reason?.trim() ?? "";

    if (action !== "correct" && action !== "void") {
      return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
    }

    if (reason.length < 10) {
      return NextResponse.json(
        { error: "Debes indicar un motivo de al menos 10 caracteres" },
        { status: 400 }
      );
    }

    const { data: currentRecord, error: recordError } = await supabase
      .from("attendance")
      .select("id, empresa_id, empleado_id, tipo_registro, fecha_hora, estado_registro, duracion_colacion_minutos")
      .eq("id", id)
      .eq("empresa_id", currentEmployee.empresa_id)
      .single();

    if (recordError || !currentRecord) {
      return NextResponse.json(
        { error: "Marcación no encontrada" },
        { status: 404 }
      );
    }

    if (currentRecord.estado_registro === "anulado") {
      return NextResponse.json(
        { error: "Esta marcación ya está anulada" },
        { status: 422 }
      );
    }

    const updateData: Record<string, unknown> = {
      correction_reason: reason,
      corrected_by: user.id,
      corrected_at: new Date().toISOString(),
      request_ip: getRequestIp(request),
      user_agent: request.headers.get("user-agent"),
    };

    if (action === "void") {
      updateData.estado_registro = "anulado";
      updateData.valido = false;
    } else {
      if (!body.tipo_registro || !validTypes.includes(body.tipo_registro)) {
        return NextResponse.json(
          { error: "Tipo de registro inválido" },
          { status: 400 }
        );
      }

      if (!body.fecha_hora || Number.isNaN(new Date(body.fecha_hora).getTime())) {
        return NextResponse.json(
          { error: "Fecha y hora inválidas" },
          { status: 400 }
        );
      }

      updateData.tipo_registro = body.tipo_registro;
      updateData.fecha_hora = new Date(body.fecha_hora).toISOString();
      updateData.estado_registro = "corregido";
      updateData.duracion_colacion_minutos =
        body.tipo_registro === "salida_almuerzo"
          ? body.duracion_colacion_minutos ?? currentRecord.duracion_colacion_minutos ?? null
          : null;
    }

    const { data: updated, error: updateError } = await supabase
      .from("attendance")
      .update(updateData)
      .eq("id", id)
      .eq("empresa_id", currentEmployee.empresa_id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: "Error al guardar corrección: " + updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: updated,
      message:
        action === "void"
          ? "Marcación anulada correctamente"
          : "Marcación corregida correctamente",
    });
  } catch (err) {
    console.error("PATCH /api/attendance/[id]/correct error:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
