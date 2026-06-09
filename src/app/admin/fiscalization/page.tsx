import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient, getEmployee, getUser } from "@/lib/supabase/server";
import { attendanceStatusLabel, attendanceTypeLabel } from "@/lib/attendance/labels";

interface FiscalizationSearchParams {
  fecha_inicio?: string;
  fecha_fin?: string;
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Santiago",
  });
}

export default async function AdminFiscalizationPage({
  searchParams,
}: {
  searchParams: Promise<FiscalizationSearchParams>;
}) {
  const params = await searchParams;
  const { user } = await getUser();
  if (!user) redirect("/login");

  const { employee } = await getEmployee(user.id);
  if (!employee || employee.role !== "admin") redirect("/login");

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const fechaInicio = params.fecha_inicio || dateKey(monthStart);
  const fechaFin = params.fecha_fin || dateKey(now);
  const exportParams = new URLSearchParams({
    fecha_inicio: fechaInicio,
    fecha_fin: fechaFin,
  });
  const auditExportParams = new URLSearchParams({
    fecha_inicio: fechaInicio,
    fecha_fin: fechaFin,
  });

  const supabase = await createClient();
  const [
    { data: company },
    { count: totalRecords },
    { count: correctedRecords },
    { count: voidedRecords },
    { data: latestRecords },
  ] = await Promise.all([
    supabase
      .from("companies")
      .select("nombre_empresa, rut_empresa, razon_social, representante_legal, direccion")
      .eq("id", employee.empresa_id)
      .single(),
    supabase
      .from("attendance")
      .select("id", { count: "exact", head: true })
      .eq("empresa_id", employee.empresa_id)
      .gte("fecha_hora", fechaInicio)
      .lte("fecha_hora", `${fechaFin}T23:59:59.999Z`),
    supabase
      .from("attendance")
      .select("id", { count: "exact", head: true })
      .eq("empresa_id", employee.empresa_id)
      .eq("estado_registro", "corregido")
      .gte("fecha_hora", fechaInicio)
      .lte("fecha_hora", `${fechaFin}T23:59:59.999Z`),
    supabase
      .from("attendance")
      .select("id", { count: "exact", head: true })
      .eq("empresa_id", employee.empresa_id)
      .eq("estado_registro", "anulado")
      .gte("fecha_hora", fechaInicio)
      .lte("fecha_hora", `${fechaFin}T23:59:59.999Z`),
    supabase
      .from("attendance")
      .select(
        `
        id,
        tipo_registro,
        fecha_hora,
        estado_registro,
        record_hash,
        correction_count,
        employees (
          nombre,
          email
        )
      `
      )
      .eq("empresa_id", employee.empresa_id)
      .gte("fecha_hora", fechaInicio)
      .lte("fecha_hora", `${fechaFin}T23:59:59.999Z`)
      .order("fecha_hora", { ascending: false })
      .limit(20),
  ]);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Fiscalización</h1>
        <p className="text-gray-500 mt-1">
          Acceso rápido a reportes, comprobantes y trazabilidad para revisión externa
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6 mb-6">
        <section className="bg-white rounded-xl border border-gray-200 shadow-md shadow-gray-200/70 p-6">
          <h2 className="text-base font-semibold text-gray-900 pb-3 border-b border-gray-100">
            Datos legales
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 text-sm">
            <div>
              <p className="text-xs font-semibold uppercase text-gray-400">Empresa</p>
              <p className="font-semibold text-gray-900">{company?.nombre_empresa ?? "-"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-gray-400">Razón social</p>
              <p className="font-semibold text-gray-900">{company?.razon_social ?? "-"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-gray-400">RUT empresa</p>
              <p className="font-semibold text-gray-900">{company?.rut_empresa ?? "-"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-gray-400">Representante legal</p>
              <p className="font-semibold text-gray-900">{company?.representante_legal ?? "-"}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs font-semibold uppercase text-gray-400">Dirección</p>
              <p className="font-semibold text-gray-900">{company?.direccion ?? "-"}</p>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-gray-200 shadow-md shadow-gray-200/70 p-6">
          <h2 className="text-base font-semibold text-gray-900 pb-3 border-b border-gray-100">
            Rango fiscalizable
          </h2>
          <form method="GET" action="/admin/fiscalization" className="space-y-3 mt-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                Desde
              </label>
              <input
                type="date"
                name="fecha_inicio"
                defaultValue={fechaInicio}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                Hasta
              </label>
              <input
                type="date"
                name="fecha_fin"
                defaultValue={fechaFin}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800"
            >
              Aplicar rango
            </button>
            <Link
              href={`/api/attendance/export-legal?${exportParams.toString()}`}
              className="flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Descargar fiscalización
            </Link>
            <Link
              href={`/api/attendance/audit-export?${auditExportParams.toString()}`}
              className="flex w-full items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Descargar trazabilidad
            </Link>
          </form>
        </section>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-md shadow-gray-200/70 p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase">Registros</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{totalRecords ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-md shadow-gray-200/70 p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase">Corregidos</p>
          <p className="mt-2 text-2xl font-bold text-amber-700">{correctedRecords ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-md shadow-gray-200/70 p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase">Anulados</p>
          <p className="mt-2 text-2xl font-bold text-red-700">{voidedRecords ?? 0}</p>
        </div>
      </div>

      <section className="bg-white rounded-xl border border-gray-200 shadow-md shadow-gray-200/70 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Últimos registros del período</h2>
            <p className="text-sm text-gray-500">Cada registro tiene comprobante imprimible y huella de integridad.</p>
          </div>
          <Link href="/admin/traceability" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
            Ver trazabilidad
          </Link>
        </div>

        {!latestRecords || latestRecords.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            No hay registros en el rango seleccionado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">Trabajador</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">Marca</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">Hash</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">Comprobante</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {latestRecords.map((record) => {
                  const recordEmployee = record.employees as { nombre?: string; email?: string } | null;
                  return (
                    <tr key={record.id} className="hover:bg-gray-50/50">
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">{recordEmployee?.nombre ?? "-"}</p>
                        <p className="text-xs text-gray-400">{recordEmployee?.email ?? ""}</p>
                      </td>
                      <td className="px-6 py-4 text-gray-700">
                        {attendanceTypeLabel(record.tipo_registro)}
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {formatDateTime(record.fecha_hora)}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex rounded bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">
                          {attendanceStatusLabel(record.estado_registro)}
                        </span>
                        {record.correction_count ? (
                          <p className="mt-1 text-xs text-gray-400">
                            {record.correction_count} cambio{record.correction_count === 1 ? "" : "s"}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs text-gray-500" title={record.record_hash ?? ""}>
                          {record.record_hash ? `${record.record_hash.slice(0, 12)}...` : "-"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/attendance/receipt/${record.id}`}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-700 underline underline-offset-2"
                        >
                          Abrir
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
