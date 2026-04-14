import { getUser, getEmployee, createServiceClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SuperAdminCompaniesClient from "@/components/super-admin/SuperAdminCompaniesClient";

interface CompanyData {
  id: string;
  nombre_empresa: string;
  estado_suscripcion: "trial" | "active" | "expired" | "cancelled";
  fecha_inicio_trial: string;
  dias_trial: number;
  empleados_count: number;
  dias_restantes: number;
}

async function getCompanies() {
  const supabase = await createServiceClient();

  const { data: companies, error } = await supabase
    .from("companies")
    .select(`
      id,
      nombre_empresa,
      estado_suscripcion,
      fecha_inicio_trial,
      dias_trial,
      employees(id)
    `)
    .order("fecha_creacion", { ascending: false });

  if (error) {
    console.error("Error fetching companies:", error.message);
    return [];
  }

  return (companies || []).map((company) => {
    const dias_restantes =
      company.estado_suscripcion !== "trial"
        ? 0
        : Math.max(
            0,
            company.dias_trial -
              Math.floor((new Date().getTime() - new Date(company.fecha_inicio_trial).getTime()) / (1000 * 60 * 60 * 24))
          );

    return {
      id: company.id,
      nombre_empresa: company.nombre_empresa,
      estado_suscripcion: company.estado_suscripcion,
      fecha_inicio_trial: company.fecha_inicio_trial,
      dias_trial: company.dias_trial,
      empleados_count: (company.employees as any[])?.length ?? 0,
      dias_restantes,
    };
  });
}

export default async function SuperAdminCompaniesPage() {
  const { user } = await getUser();
  if (!user) redirect("/login");

  const { employee } = await getEmployee(user.id);
  if (employee?.role !== "super_admin") redirect("/login");

  const initialCompanies = await getCompanies();

  return <SuperAdminCompaniesClient initialCompanies={initialCompanies} />;
}
