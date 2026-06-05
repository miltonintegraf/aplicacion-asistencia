import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { logSuperAdminAction } from "@/lib/super-admin/audit";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: actor } = await supabase
    .from("employees")
    .select("role")
    .eq("id", user.id)
    .single();

  if (actor?.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { admin_id, password } = body;

  if (!admin_id || !password) {
    return NextResponse.json(
      { error: "admin_id y password son requeridos" },
      { status: 400 }
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "La contraseña temporal debe tener al menos 8 caracteres" },
      { status: 400 }
    );
  }

  const serviceSupabase = await createServiceClient();

  const { data: targetAdmin, error: targetError } = await serviceSupabase
    .from("employees")
    .select("id, email, nombre, role, empresa_id, companies(nombre_empresa)")
    .eq("id", admin_id)
    .single();

  if (targetError || !targetAdmin || targetAdmin.role !== "admin") {
    return NextResponse.json(
      { error: "Administrador no encontrado" },
      { status: 404 }
    );
  }

  const { error: updateError } = await serviceSupabase.auth.admin.updateUserById(
    admin_id,
    { password }
  );

  if (updateError) {
    return NextResponse.json(
      { error: "Error al actualizar contraseña: " + updateError.message },
      { status: 500 }
    );
  }

  await logSuperAdminAction(serviceSupabase, {
    actorId: user.id,
    action: "reset_admin_password",
    targetType: "employee",
    targetId: admin_id,
    metadata: {
      email: targetAdmin.email,
      nombre: targetAdmin.nombre,
      empresa_id: targetAdmin.empresa_id,
    },
  });

  return NextResponse.json({
    message: "Contraseña actualizada correctamente",
    data: {
      id: targetAdmin.id,
      email: targetAdmin.email,
      nombre: targetAdmin.nombre,
    },
  });
}
