import { createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createServiceClient();

  // Verify super_admin role
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

  // Get global stats
  const { count: totalEmpresas } = await supabase
    .from("companies")
    .select("*", { count: "exact", head: true });

  const { count: empresasEnTrial } = await supabase
    .from("companies")
    .select("*", { count: "exact", head: true })
    .eq("estado_suscripcion", "trial");

  const { count: empresasActivas } = await supabase
    .from("companies")
    .select("*", { count: "exact", head: true })
    .eq("estado_suscripcion", "active");

  const { count: empresasExpiradas } = await supabase
    .from("companies")
    .select("*", { count: "exact", head: true })
    .eq("estado_suscripcion", "expired");

  const { count: totalEmpleados } = await supabase
    .from("employees")
    .select("*", { count: "exact", head: true })
    .neq("role", "super_admin");

  return NextResponse.json({
    data: {
      totalEmpresas: totalEmpresas ?? 0,
      empresasEnTrial: empresasEnTrial ?? 0,
      empresasActivas: empresasActivas ?? 0,
      empresasExpiradas: empresasExpiradas ?? 0,
      totalEmpleados: totalEmpleados ?? 0,
    },
  });
}
