import { getUser, getEmployee, createClient, createServiceClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

interface SearchParams {
  empleado_id?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  tipo_registro?: string;
  page?: string;
}

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  // These are cached — zero network cost if layout already called them
  const { user } = await getUser();
  if (!user) redirect("/login");

  const { employee: currentEmployee } = await getEmployee(user.id);
  if (!currentEmployee) redirect("/login");

  const supabase = await createClient();

  const page = parseInt(params.page ?? "1");
  const limit = 25;
  const offset = (page - 1) * limit;

  // Get employees list for filter
  const { data: empleados } = await supabase
    .from("employees")
    .select("id, nombre")
    .eq("empresa_id", currentEmployee.empresa_id)
    .eq("activo", true)
    .order("nombre");

  // Build query
  let query = supabase
    .from("attendance")
    .select(
      `
      id,
      empleado_id,
      tipo_registro,
      fecha_hora,
      distancia_empresa_metros,
      valido,
      foto_url,
      employees (nombre, email)
    `,
      { count: "exact" }
    )
    .eq("empresa_id", currentEmployee.empresa_id)
    .order("fecha_hora", { ascending: false });

  if (params.empleado_id) {
    query = query.eq("empleado_id", params.empleado_id);
  }
  if (params.fecha_inicio) {
    query = query.gte("fecha_hora", params.fecha_inicio);
  }
  if (params.fecha_fin) {
    query = query.lte(
      "fecha_hora",
      params.fecha_fin + "T23:59:59.999Z"
    );
  }
  if (params.tipo_registro) {
    query = query.eq("tipo_registro", params.tipo_registro);
  }

  const { data: records, count } = await query.range(
    offset,
    offset + limit - 1
  );

  const totalPages = Math.ceil((count ?? 0) / limit);

  // Generate signed URLs for records that have photos (1 hour expiry)
  const signedUrls: Record<string, string> = {};
  const photoPaths = records
    ?.map((r) => r.foto_url)
    .filter((f): f is string => !!f) ?? [];
  if (photoPaths.length > 0) {
    const serviceClient = await createServiceClient();
    const { data: signed } = await serviceClient.storage
      .from("attendance-photos")
      .createSignedUrls(photoPaths, 3600);
    signed?.forEach((item) => {
      if (item.signedUrl && item.path) signedUrls[item.path] = item.signedUrl;
    });
  }

  const buildUrl = (params: Partial<SearchParams & { page: string }>) => {
    const base = new URLSearchParams();
    const merged = {
      empleado_id: params.empleado_id ?? "",
      fecha_inicio: params.fecha_inicio ?? "",
      fecha_fin: params.fecha_fin ?? "",
      tipo_registro: params.tipo_registro ?? "",
      page: "1",
      ...params,
    };
    Object.entries(merged).forEach(([k, v]) => {
      if (v) base.set(k, v);
    });
    return `/admin/attendance?${base.toString()}`;
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Asistencias</h1>
        <p className="text-gray-500 mt-1">
          Historial completo de registros de entrada y salida
        </p>
      </div>

      {/* Filters */}
      <form
        method="GET"
        action="/admin/attendance"
        className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-6"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">
              Empleado
            </label>
            <select
              name="empleado_id"
              defaultValue={params.empleado_id ?? ""}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
            >
              <option value="">Todos</option>
              {empleados?.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">
              Desde
            </label>
            <input
              type="date"
              name="fecha_inicio"
              defaultValue={params.fecha_inicio ?? ""}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">
              Hasta
            </label>
            <input
              type="date"
              name="fecha_fin"
              defaultValue={params.fecha_fin ?? ""}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">
              Tipo
            </label>
            <select
              name="tipo_registro"
              defaultValue={params.tipo_registro ?? ""}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
            >
              <option value="">Todos</option>
              <option value="entrada_laboral">Entrada Laboral</option>
              <option value="salida_almuerzo">Salida Almuerzo</option>
              <option value="entrada_almuerzo">Regreso Almuerzo</option>
              <option value="salida_laboral">Salida Laboral</option>
              <option value="entrada">Entrada (Legacy)</option>
              <option value="salida">Salida (Legacy)</option>
            </select>
          </div>

          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-3 py-2 rounded-lg transition-colors"
            >
              Filtrar
            </button>
            <Link
              href="/admin/attendance"
              className="px-3 py-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 text-sm font-medium transition-colors"
            >
              Limpiar
            </Link>
          </div>
        </div>
      </form>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <span className="text-sm text-gray-500">
            {count ?? 0} registros encontrados
          </span>
        </div>

        {records && records.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Empleado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Hora
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Distancia
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Foto
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {records.map((record) => {
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
                          {new Date(record.fecha_hora).toLocaleDateString(
                            "es-AR"
                          )}
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
                        <td className="px-6 py-4">
                          {record.foto_url && signedUrls[record.foto_url] ? (
                            <a
                              href={signedUrls[record.foto_url]}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <img
                                src={signedUrls[record.foto_url]}
                                alt="Foto asistencia"
                                className="w-10 h-10 rounded-lg object-cover border border-gray-200 hover:scale-150 transition-transform cursor-zoom-in"
                              />
                            </a>
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Página {page} de {totalPages}
                </p>
                <div className="flex gap-2">
                  {page > 1 && (
                    <Link
                      href={buildUrl({ page: String(page - 1) })}
                      className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Anterior
                    </Link>
                  )}
                  {page < totalPages && (
                    <Link
                      href={buildUrl({ page: String(page + 1) })}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Siguiente
                    </Link>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16">
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
            <p className="text-gray-400">
              No se encontraron registros con los filtros seleccionados
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
