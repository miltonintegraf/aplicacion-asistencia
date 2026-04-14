import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: employee } = await supabase
    .from("employees")
    .select("role")
    .eq("id", user.id)
    .single();

  if (employee?.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const estado = request.nextUrl.searchParams.get("estado");
  const serviceSupabase = await createServiceClient();

  let query = serviceSupabase.from("companies").select(`
      id,
      nombre_empresa,
      estado_suscripcion,
      fecha_inicio_trial,
      dias_trial,
      employees(id)
    `);

  if (estado) {
    query = query.eq("estado_suscripcion", estado);
  }

  const { data: companies, error } = await query.order("fecha_creacion", {
    ascending: false,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const companiesWithCount = companies?.map((company) => ({
    id: company.id,
    nombre_empresa: company.nombre_empresa,
    estado_suscripcion: company.estado_suscripcion,
    fecha_inicio_trial: company.fecha_inicio_trial,
    dias_trial: company.dias_trial,
    empleados_count: (company.employees as any[])?.length ?? 0,
  })) || [];

  return NextResponse.json({ data: companiesWithCount });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: employee } = await supabase
    .from("employees")
    .select("role")
    .eq("id", user.id)
    .single();

  if (employee?.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { id, estado_suscripcion, dias_trial } = body;

  if (!id) {
    return NextResponse.json({ error: "ID is required" }, { status: 400 });
  }

  const updateData: Record<string, any> = {};
  if (estado_suscripcion) updateData.estado_suscripcion = estado_suscripcion;
  if (dias_trial !== undefined) updateData.dias_trial = dias_trial;

  const serviceSupabase = await createServiceClient();
  const { error } = await serviceSupabase
    .from("companies")
    .update(updateData)
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ message: "Empresa actualizada" });
}
