import { getUser, getEmployee, createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminReportsClient from "@/components/admin/AdminReportsClient";

interface Employee {
  id: string;
  nombre: string;
  email: string;
}

async function getEmployees(empresa_id: string): Promise<Employee[]> {
  const supabase = await createClient();
  const { data: employees } = await supabase
    .from("employees")
    .select("id, nombre, email")
    .eq("empresa_id", empresa_id)
    .order("nombre");
  return employees ?? [];
}

export default async function ReportsPage() {
  const { user } = await getUser();
  if (!user) redirect("/login");

  const { employee } = await getEmployee(user.id);
  if (!employee) redirect("/login");

  const initialEmpleados = await getEmployees(employee.empresa_id);

  return <AdminReportsClient initialEmpleados={initialEmpleados} />;
}
