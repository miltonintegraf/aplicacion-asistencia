import { getUser, getEmployee, createClient } from "@/lib/supabase/server";
import { StatsCard } from "@/components/admin/StatsCard";
import { redirect } from "next/navigation";

export default async function AdminDashboardPage() {
  // These are cached — zero network cost if layout already called them
  const { user } = await getUser();
  if (!user) redirect("/login");

  const { employee } = await getEmployee(user.id);
  if (!employee) redirect("/login");

  const empresa_id = employee.empresa_id;

  // Today's date range
  const today = new Date();
  const todayStart = new Date(today.setHours(0, 0, 0, 0)).toISOString();
  const todayEnd = new Date(today.setHours(23, 59, 59, 999)).toISOString();

  const supabase = await createClient();

  // Run all 4 independent queries in parallel
  const [
    { count: totalEmpleados },
    { data: entradas },
    { data: registrosHoy },
    { data: company },
  ] = await Promise.all([
    supabase
      .from("employees")
      .select("*", { count: "exact", head: true })
      .eq("empresa_id", empresa_id)
      .eq("activo", true)
      .neq("role", "admin"),

    supabase
      .from("attendance")
      .select("empleado_id")
      .eq("empresa_id", empresa_id)
      .in("tipo_registro", ["entrada", "entrada_laboral"])
      .gte("fecha_hora", todayStart)
      .lte("fecha_hora", todayEnd),

    supabase
      .from("attendance")
      .select(
        `
        id,
        tipo_registro,
        fecha_hora,
        distancia_empresa_metros,
        valido,
        employees (nombre, email)
      `
      )
      .eq("empresa_id", empresa_id)
      .gte("fecha_hora", todayStart)
      .lte("fecha_hora", todayEnd)
      .order("fecha_hora", { ascending: false }),

    supabase
      .from("companies")
      .select("nombre_empresa")
      .eq("id", empresa_id)
      .single(),
  ]);

  const presentesHoy = new Set(entradas?.map((e) => e.empleado_id)).size;
  const ausentesHoy = Math.max(0, (totalEmpleados ?? 0) - presentesHoy);

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
          Bienvenido, {employee.nombre}
        </h1>
        <p className="text-gray-500 mt-1 capitalize">{dateStr}</p>
        {company && (
          <p className="text-sm text-blue-600 font-medium mt-1">
            {company.nombre_empresa}
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <StatsCard
          label="Total empleados"
          value={totalEmpleados ?? 0}
          color="blue"
          icon={
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        />
        <StatsCard
          label="Presentes hoy"
          value={presentesHoy}
          color="green"
          icon={
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatsCard
          label="Ausentes hoy"
          value={ausentesHoy}
          color="red"
          icon={
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatsCard
          label="Registros hoy"
          value={registrosHoy?.length ?? 0}
          color="purple"
          icon={
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
        />
      </div>

      {/* Today's attendance table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            Registros de hoy
          </h2>
        </div>
        {registrosHoy && registrosHoy.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Empleado
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Hora
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Distancia
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {registrosHoy.map((record) => {
                  const emp = (record.employees as unknown) as
                    | { nombre: string; email: string }
                    | null;
                  return (
                    <tr key={record.id} className="hover:bg-gray-50/50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">
                          {emp?.nombre ?? "—"}
                        </div>
                        <div className="text-xs text-gray-400">
                          {emp?.email ?? ""}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {(() => {
                          const tipoMap: Record<string, { bg: string; color: string; label: string }> = {
                            entrada: { bg: "bg-green-100", color: "text-green-700", label: "Entrada" },
                            entrada_laboral: { bg: "bg-green-100", color: "text-green-700", label: "Entrada Laboral" },
                            salida: { bg: "bg-orange-100", color: "text-orange-700", label: "Salida" },
                            salida_laboral: { bg: "bg-orange-100", color: "text-orange-700", label: "Salida Laboral" },
                            salida_almuerzo: { bg: "bg-yellow-100", color: "text-yellow-700", label: "Salida Almuerzo" },
                            entrada_almuerzo: { bg: "bg-blue-100", color: "text-blue-700", label: "Regreso Almuerzo" },
                          };
                          const mapping = tipoMap[record.tipo_registro] || { bg: "bg-gray-100", color: "text-gray-700", label: record.tipo_registro };
                          return (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${mapping.bg} ${mapping.color}`}>
                              {mapping.label}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {new Date(record.fecha_hora).toLocaleTimeString(
                          "es-AR",
                          { hour: "2-digit", minute: "2-digit" }
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {record.distancia_empresa_metros != null
                          ? `${Math.round(record.distancia_empresa_metros as unknown as number)} m`
                          : "—"}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            record.valido
                              ? "bg-green-50 text-green-600"
                              : "bg-red-50 text-red-600"
                          }`}
                        >
                          {record.valido ? "Válido" : "Inválido"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-12 text-center">
            <svg
              className="w-12 h-12 text-gray-300 mx-auto mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <p className="text-gray-400">No hay registros de asistencia hoy</p>
          </div>
        )}
      </div>
    </div>
  );
}
