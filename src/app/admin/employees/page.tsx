import { getUser, getEmployee, createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminEmployeesClient from "@/components/admin/AdminEmployeesClient";
import type { Employee } from "@/lib/types";

async function getEmployees(empresa_id: string): Promise<Employee[]> {
  const supabase = await createClient();
  const { data: employees } = await supabase
    .from("employees")
    .select("*")
    .eq("empresa_id", empresa_id)
    .order("fecha_creacion", { ascending: false });
  return employees ?? [];
}

export default async function EmployeesPage() {
  const { user } = await getUser();
  if (!user) redirect("/login");

  const { employee } = await getEmployee(user.id);
  if (!employee) redirect("/login");

  const initialEmployees = await getEmployees(employee.empresa_id);

  return <AdminEmployeesClient initialEmployees={initialEmployees} />;
}
