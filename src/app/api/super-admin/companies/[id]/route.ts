import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

async function requireSuperAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const { data: employee } = await supabase
    .from("employees")
    .select("role")
    .eq("id", user.id)
    .single();

  if (employee?.role !== "super_admin") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { user };
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireSuperAdmin();
  if (auth.error) return auth.error;

  const { id } = await params;
  const serviceSupabase = await createServiceClient();

  const { data: company, error: companyError } = await serviceSupabase
    .from("companies")
    .select(
      `
      id,
      nombre_empresa,
      direccion,
      latitud,
      longitud,
      radio_permitido_metros,
      foto_requerida,
      firma_requerida,
      hora_entrada,
      hora_salida,
      horarios_laborales,
      tolerancia_minutos,
      estado_suscripcion,
      fecha_inicio_trial,
      dias_trial,
      fecha_creacion
    `
    )
    .eq("id", id)
    .single();

  if (companyError || !company) {
    return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });
  }

  const [{ data: employees }, { data: lastAttendance }] = await Promise.all([
    serviceSupabase
      .from("employees")
      .select("id, nombre, email, role, activo, modalidad, fecha_creacion")
      .eq("empresa_id", id)
      .order("role", { ascending: true })
      .order("nombre", { ascending: true }),
    serviceSupabase
      .from("attendance")
      .select("id, tipo_registro, fecha_hora, valido, employees(nombre, email)")
      .eq("empresa_id", id)
      .order("fecha_hora", { ascending: false })
      .limit(8),
  ]);

  const admins = (employees || []).filter((employee) => employee.role === "admin");
  const workers = (employees || []).filter((employee) => employee.role !== "admin");

  return NextResponse.json({
    data: {
      company,
      admins,
      workers,
      lastAttendance: lastAttendance || [],
    },
  });
}
