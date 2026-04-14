import { getUser, getEmployee, createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminSettingsClient from "@/components/admin/AdminSettingsClient";
import type { Company } from "@/lib/types";

async function getCompany(empresa_id: string): Promise<Company | null> {
  const supabase = await createClient();
  const { data: company } = await supabase
    .from("companies")
    .select("*")
    .eq("id", empresa_id)
    .single();
  return company as Company | null;
}

export default async function SettingsPage() {
  const { user } = await getUser();
  if (!user) redirect("/login");

  const { employee } = await getEmployee(user.id);
  if (!employee) redirect("/login");

  const initialCompany = await getCompany(employee.empresa_id);

  return <AdminSettingsClient initialCompany={initialCompany} />;
}
