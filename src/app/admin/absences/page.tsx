import { redirect } from "next/navigation";
import { createClient, getEmployee, getUser } from "@/lib/supabase/server";
import AdminAbsencesClient from "@/components/admin/AdminAbsencesClient";

export default async function AdminAbsencesPage() {
  const { user } = await getUser();
  if (!user) redirect("/login");

  const { employee } = await getEmployee(user.id);
  if (!employee || employee.role !== "admin") redirect("/login");

  const supabase = await createClient();
  const [{ data: employees }, { data: holidays }, { data: absences }] = await Promise.all([
    supabase
      .from("employees")
      .select("id, nombre, email")
      .eq("empresa_id", employee.empresa_id)
      .eq("activo", true)
      .is("eliminado_at", null)
      .neq("role", "admin")
      .order("nombre", { ascending: true }),
    supabase
      .from("company_holidays")
      .select("id, fecha, nombre, tipo")
      .eq("empresa_id", employee.empresa_id)
      .order("fecha", { ascending: false })
      .limit(100),
    supabase
      .from("employee_absences")
      .select("id, empleado_id, fecha_inicio, fecha_fin, tipo, motivo, employees(nombre, email)")
      .eq("empresa_id", employee.empresa_id)
      .is("deleted_at", null)
      .order("fecha_inicio", { ascending: false })
      .limit(100),
  ]);

  return (
    <AdminAbsencesClient
      employees={employees ?? []}
      holidays={holidays ?? []}
      absences={(absences ?? []) as any}
    />
  );
}
