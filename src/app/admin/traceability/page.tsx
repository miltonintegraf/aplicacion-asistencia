import { createClient, getEmployee, getUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

interface AuditLog {
  id: string;
  attendance_id: string | null;
  empresa_id: string | null;
  empleado_id: string | null;
  actor_id: string | null;
  action: "created" | "updated";
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  request_ip: string | null;
  user_agent: string | null;
  created_at: string;
}

interface EmployeeLite {
  id: string;
  nombre: string;
  email: string;
}

const actionMap = {
  created: {
    label: "Marcación creada",
    className: "bg-green-100 text-green-700",
  },
  updated: {
    label: "Marcación modificada",
    className: "bg-amber-100 text-amber-700",
  },
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getRecordType(log: AuditLog) {
  const data = log.new_data ?? log.old_data ?? {};
  return typeof data.tipo_registro === "string" ? data.tipo_registro : "—";
}

function getCorrectionSummary(log: AuditLog) {
  const data = log.new_data ?? {};
  const estado = typeof data.estado_registro === "string" ? data.estado_registro : "";
  const reason = typeof data.correction_reason === "string" ? data.correction_reason : "";

  if (!estado && !reason) return "";

  return [estado ? `Estado: ${estado}` : "", reason ? `Motivo: ${reason}` : ""]
    .filter(Boolean)
    .join(" · ");
}

function getRecordHash(log: AuditLog) {
  const data = log.new_data ?? log.old_data ?? {};
  return typeof data.record_hash === "string" ? data.record_hash : null;
}

function getDeviceLabel(userAgent: string | null) {
  if (!userAgent) return "—";
  if (/Mobile|Android|iPhone/i.test(userAgent)) return "Celular";
  if (/Tablet|iPad/i.test(userAgent)) return "Tablet";
  return "Computador";
}

export default async function AdminTraceabilityPage() {
  const { user } = await getUser();
  if (!user) redirect("/login");

  const { employee: currentEmployee } = await getEmployee(user.id);
  if (!currentEmployee || currentEmployee.role !== "admin") redirect("/login");

  const supabase = await createClient();

  const { data: logs, error } = await supabase
    .from("attendance_audit_logs")
    .select("id, attendance_id, empresa_id, empleado_id, actor_id, action, old_data, new_data, request_ip, user_agent, created_at")
    .eq("empresa_id", currentEmployee.empresa_id)
    .order("created_at", { ascending: false })
    .limit(100);

  const auditLogs = (logs ?? []) as AuditLog[];
  const employeeIds = Array.from(
    new Set(auditLogs.flatMap((log) => [log.empleado_id, log.actor_id]).filter(Boolean))
  ) as string[];

  const { data: employees } = employeeIds.length
    ? await supabase.from("employees").select("id, nombre, email").in("id", employeeIds)
    : { data: [] as EmployeeLite[] };

  const employeeById = new Map((employees ?? []).map((employee: EmployeeLite) => [employee.id, employee]));

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Trazabilidad</h1>
        <p className="text-gray-500 mt-1">
          Historial técnico de creación y cambios en las marcaciones.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm text-gray-500">Eventos registrados</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{auditLogs.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm text-gray-500">Marcaciones creadas</p>
          <p className="mt-2 text-2xl font-bold text-green-600">
            {auditLogs.filter((log) => log.action === "created").length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm text-gray-500">Cambios posteriores</p>
          <p className="mt-2 text-2xl font-bold text-amber-600">
            {auditLogs.filter((log) => log.action === "updated").length}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Últimos movimientos</h2>
        </div>

        {error ? (
          <div className="px-6 py-12 text-center">
            <p className="font-medium text-gray-900">Trazabilidad pendiente de activar</p>
            <p className="mt-2 text-sm text-gray-500">
              Ejecuta la migración 005 en Supabase para crear el historial de marcaciones.
            </p>
          </div>
        ) : auditLogs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Acción</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Trabajador</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Realizado por</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Detalle</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Huella</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {auditLogs.map((log) => {
                  const employee = log.empleado_id ? employeeById.get(log.empleado_id) : null;
                  const actor = log.actor_id ? employeeById.get(log.actor_id) : null;
                  const hash = getRecordHash(log);
                  const action = actionMap[log.action];

                  return (
                    <tr key={log.id} className="hover:bg-gray-50/50">
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">{formatDate(log.created_at)}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${action.className}`}>
                          {action.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">{employee?.nombre ?? "—"}</p>
                        <p className="text-xs text-gray-500">{employee?.email ?? ""}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">{actor?.nombre ?? "Sistema"}</p>
                        <p className="text-xs text-gray-500">{actor?.email ?? ""}</p>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        <p>{getRecordType(log)}</p>
                        {getCorrectionSummary(log) && (
                          <p className="mt-1 max-w-md text-xs text-gray-500">{getCorrectionSummary(log)}</p>
                        )}
                        <p className="mt-1 text-xs text-gray-400">
                          {getDeviceLabel(log.user_agent)} · IP {log.request_ip ?? "—"}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        {hash ? (
                          <span className="font-mono text-xs text-gray-500" title={hash}>
                            {hash.slice(0, 14)}...
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-12 text-center text-gray-500">
            Todavía no hay movimientos de trazabilidad.
          </div>
        )}
      </div>
    </div>
  );
}
