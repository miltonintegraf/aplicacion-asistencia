import { getUser, getEmployee, createClient } from "@/lib/supabase/server";
import { StatsCard } from "@/components/admin/StatsCard";
import { redirect } from "next/navigation";

export default async function SuperAdminDashboardPage() {
  // These are cached — zero network cost if layout already called them
  const { user } = await getUser();
  if (!user) redirect("/login");

  const { employee } = await getEmployee(user.id);
  if (!employee || employee.role !== "super_admin") redirect("/login");

  const supabase = await createClient();

  // Run all 5 independent queries in parallel
  const [
    { count: totalEmpresas },
    { count: empresasEnTrial },
    { count: empresasExpiradas },
    { count: totalEmpleados },
    { data: ultimasEmpresas },
  ] = await Promise.all([
    supabase
      .from("companies")
      .select("*", { count: "exact", head: true }),

    supabase
      .from("companies")
      .select("*", { count: "exact", head: true })
      .eq("estado_suscripcion", "trial"),

    supabase
      .from("companies")
      .select("*", { count: "exact", head: true })
      .eq("estado_suscripcion", "expired"),

    supabase
      .from("employees")
      .select("*", { count: "exact", head: true })
      .neq("role", "super_admin"),

    supabase
      .from("companies")
      .select("id, nombre_empresa, estado_suscripcion, fecha_inicio_trial, dias_trial")
      .order("fecha_creacion", { ascending: false })
      .limit(10),
  ]);

  // Calculate dias restantes for each company
  const empresasConDias = (ultimasEmpresas || []).map((empresa) => {
    if (empresa.estado_suscripcion !== "trial") {
      return { ...empresa, dias_restantes: 0 };
    }
    const inicio = new Date(empresa.fecha_inicio_trial);
    const ahora = new Date();
    const diasUsados = Math.floor((ahora.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
    const diasRestantes = Math.max(0, empresa.dias_trial - diasUsados);
    return { ...empresa, dias_restantes: diasRestantes };
  });

  const now = new Date();
  const dateStr = now.toLocaleDateString("es-AR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Panel SuperAdmin
        </h1>
        <p className="text-gray-500 mt-1 capitalize">{dateStr}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <StatsCard
          label="Total Empresas"
          value={totalEmpresas ?? 0}
          color="indigo"
          icon={
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
            </svg>
          }
        />
        <StatsCard
          label="En Trial"
          value={empresasEnTrial ?? 0}
          color="blue"
          icon={
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatsCard
          label="Trial Expirado"
          value={empresasExpiradas ?? 0}
          color="red"
          icon={
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatsCard
          label="Total Empleados"
          value={totalEmpleados ?? 0}
          color="green"
          icon={
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        />
      </div>

      {/* Latest companies table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            Últimas empresas registradas
          </h2>
        </div>
        {empresasConDias && empresasConDias.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Empresa
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Días Restantes
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {empresasConDias.map((empresa) => {
                  const estadoColor: Record<string, string> = {
                    trial: "bg-blue-100 text-blue-700",
                    active: "bg-green-100 text-green-700",
                    expired: "bg-red-100 text-red-700",
                    cancelled: "bg-gray-100 text-gray-700",
                  };

                  return (
                    <tr key={empresa.id} className="hover:bg-gray-50/50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">
                          {empresa.nombre_empresa}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${estadoColor[empresa.estado_suscripcion]}`}>
                          {empresa.estado_suscripcion.charAt(0).toUpperCase() + empresa.estado_suscripcion.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {empresa.estado_suscripcion === "trial" ? (
                          <span className={empresa.dias_restantes <= 3 ? "font-bold text-red-600" : ""}>
                            {empresa.dias_restantes} días
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <a
                          href={`/super-admin/companies?empresa=${empresa.id}`}
                          className="text-indigo-600 hover:text-indigo-800 font-medium text-sm"
                        >
                          Gestionar →
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-12 text-center text-gray-500">
            No hay empresas registradas aún
          </div>
        )}
      </div>
    </div>
  );
}
