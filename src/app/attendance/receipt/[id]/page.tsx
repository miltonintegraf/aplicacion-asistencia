import { redirect } from "next/navigation";
import Link from "next/link";
import { createServiceClient, getEmployee, getUser } from "@/lib/supabase/server";
import { attendanceStatusLabel, attendanceTypeLabel } from "@/lib/attendance/labels";
import { PrintReceiptButton } from "@/components/attendance/PrintReceiptButton";

interface ReceiptPageProps {
  params: Promise<{ id: string }>;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("es-CL", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "America/Santiago",
  });
}

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined) return "-";
  return String(Math.round(value));
}

function NotFoundReceipt() {
  return (
    <main className="min-h-screen bg-gray-100 px-4 py-8">
      <div className="mx-auto max-w-xl rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-xl font-bold text-gray-900">Comprobante no disponible</h1>
        <p className="mt-2 text-sm text-gray-500">
          No encontramos este registro o no tienes permisos para verlo.
        </p>
        <Link
          href="/admin/traceability"
          className="mt-5 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Volver a trazabilidad
        </Link>
      </div>
    </main>
  );
}

export default async function AttendanceReceiptPage({ params }: ReceiptPageProps) {
  const { id } = await params;
  const { user } = await getUser();
  if (!user) redirect("/login");

  const { employee: currentEmployee } = await getEmployee(user.id);
  if (!currentEmployee) redirect("/login");

  const supabase = await createServiceClient();
  const { data: record, error } = await supabase
    .from("attendance")
    .select(
      `
      id,
      empresa_id,
      empleado_id,
      tipo_registro,
      fecha_hora,
      created_at,
      latitud,
      longitud,
      distancia_empresa_metros,
      valido,
      estado_registro,
      duracion_colacion_minutos,
      correction_reason,
      corrected_at,
      correction_count,
      record_hash,
      companies (
        nombre_empresa,
        rut_empresa,
        razon_social,
        direccion
      ),
      employees (
        nombre,
        email,
        rut,
        cargo
      )
    `
    )
    .eq("id", id)
    .single();

  if (error || !record) return <NotFoundReceipt />;

  const canView =
    currentEmployee.role === "admin"
      ? currentEmployee.empresa_id === record.empresa_id
      : user.id === record.empleado_id;

  if (!canView) return <NotFoundReceipt />;

  const company = record.companies as {
    nombre_empresa?: string | null;
    rut_empresa?: string | null;
    razon_social?: string | null;
    direccion?: string | null;
  } | null;

  const employee = record.employees as {
    nombre?: string | null;
    email?: string | null;
    rut?: string | null;
    cargo?: string | null;
  } | null;

  const backHref =
    currentEmployee.role === "admin" ? "/admin/attendance" : "/employee/dashboard";

  return (
    <main className="min-h-screen bg-gray-100 px-4 py-8 print:bg-white">
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 flex items-center justify-between gap-3 print:hidden">
          <Link
            href={backHref}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Volver
          </Link>
          <PrintReceiptButton />
        </div>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm print:border-0 print:shadow-none">
          <div className="border-b border-gray-200 pb-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
              Comprobante de marcaje
            </p>
            <h1 className="mt-2 text-2xl font-bold text-gray-900">
              {attendanceTypeLabel(record.tipo_registro)}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Folio interno: <span className="font-mono">{record.id}</span>
            </p>
          </div>

          <div className="grid gap-5 border-b border-gray-100 py-5 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase text-gray-400">Empresa</p>
              <p className="mt-1 font-semibold text-gray-900">
                {company?.razon_social || company?.nombre_empresa || "-"}
              </p>
              <p className="text-sm text-gray-500">RUT: {company?.rut_empresa || "-"}</p>
              <p className="text-sm text-gray-500">{company?.direccion || ""}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-gray-400">Trabajador</p>
              <p className="mt-1 font-semibold text-gray-900">{employee?.nombre || "-"}</p>
              <p className="text-sm text-gray-500">RUT: {employee?.rut || "-"}</p>
              <p className="text-sm text-gray-500">{employee?.cargo || employee?.email || ""}</p>
            </div>
          </div>

          <div className="grid gap-4 py-5 sm:grid-cols-2">
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase text-gray-400">Fecha y hora</p>
              <p className="mt-1 text-sm font-semibold text-gray-900">
                {formatDateTime(record.fecha_hora)}
              </p>
            </div>
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase text-gray-400">Estado</p>
              <p className="mt-1 text-sm font-semibold text-gray-900">
                {attendanceStatusLabel(record.estado_registro)}
              </p>
            </div>
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase text-gray-400">Ubicación</p>
              <p className="mt-1 text-sm text-gray-900">
                Lat: {record.latitud ?? "-"} / Lng: {record.longitud ?? "-"}
              </p>
              <p className="text-sm text-gray-500">
                Distancia empresa: {formatNumber(record.distancia_empresa_metros)} m
              </p>
            </div>
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase text-gray-400">Validación</p>
              <p className={`mt-1 text-sm font-semibold ${record.valido ? "text-green-700" : "text-red-700"}`}>
                {record.valido ? "Registro válido" : "Registro inválido"}
              </p>
              {record.duracion_colacion_minutos ? (
                <p className="text-sm text-gray-500">
                  Colación: {record.duracion_colacion_minutos} minutos
                </p>
              ) : null}
            </div>
          </div>

          {(record.correction_count || record.correction_reason) && (
            <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs font-semibold uppercase text-amber-700">Correcciones</p>
              <p className="mt-1 text-sm text-amber-900">
                Cambios registrados: {record.correction_count ?? 0}
              </p>
              {record.correction_reason ? (
                <p className="text-sm text-amber-900">Motivo: {record.correction_reason}</p>
              ) : null}
              {record.corrected_at ? (
                <p className="text-sm text-amber-900">
                  Última corrección: {formatDateTime(record.corrected_at)}
                </p>
              ) : null}
            </div>
          )}

          <div className="rounded-xl border border-gray-200 p-4">
            <p className="text-xs font-semibold uppercase text-gray-400">Huella de integridad</p>
            <p className="mt-2 break-all font-mono text-xs text-gray-700">
              {record.record_hash || "Sin hash registrado"}
            </p>
          </div>

          <p className="mt-5 text-xs text-gray-400">
            Este comprobante refleja la información registrada en el sistema al momento de su emisión.
            Las correcciones posteriores quedan disponibles en la trazabilidad del sistema.
          </p>
        </section>
      </div>
    </main>
  );
}
