import { redirect } from "next/navigation";
import { createServiceClient, getEmployee, getUser } from "@/lib/supabase/server";

interface AuditLog {
  id: string;
  actor_id: string | null;
  action: string;
  target_type: string;
  target_id: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface Actor {
  id: string;
  nombre: string;
  email: string;
}

const actionLabels: Record<string, string> = {
  reset_admin_password: "Reseteo de contraseña",
  update_company_subscription: "Cambio en empresa",
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

function getMetadataSummary(log: AuditLog) {
  if (log.action === "reset_admin_password") {
    const adminEmail = typeof log.metadata?.admin_email === "string" ? log.metadata.admin_email : "";
    return adminEmail ? `Admin: ${adminEmail}` : "Contraseña temporal asignada";
  }

  if (log.action === "update_company_subscription") {
    const estado = typeof log.metadata?.estado_suscripcion === "string" ? log.metadata.estado_suscripcion : "";
    const diasTrial = typeof log.metadata?.dias_trial === "number" ? log.metadata.dias_trial : null;
    return [estado ? `Estado: ${estado}` : "", diasTrial !== null ? `Trial: ${diasTrial} dias` : ""]
      .filter(Boolean)
      .join(" · ");
  }

  return Object.keys(log.metadata ?? {}).length > 0 ? JSON.stringify(log.metadata) : "Sin detalle adicional";
}

export default async function SuperAdminAuditPage() {
  const { user } = await getUser();
  if (!user) redirect("/login");

  const { employee } = await getEmployee(user.id);
  if (!employee || employee.role !== "super_admin") redirect("/login");

  const supabase = await createServiceClient();

  const { data: logs, error } = await supabase
    .from("super_admin_audit_logs")
    .select("id, actor_id, action, target_type, target_id, metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  const auditLogs = ((logs ?? []) as AuditLog[]);
  const actorIds = Array.from(new Set(auditLogs.map((log) => log.actor_id).filter(Boolean))) as string[];

  const { data: actors } = actorIds.length
    ? await supabase.from("employees").select("id, nombre, email").in("id", actorIds)
    : { data: [] as Actor[] };

  const actorById = new Map((actors ?? []).map((actor: Actor) => [actor.id, actor]));

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Auditoría</h1>
        <p className="text-gray-500 mt-1">
          Acciones importantes realizadas desde el panel SuperAdmin.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Últimos movimientos</h2>
        </div>

        {error ? (
          <div className="px-6 py-12 text-center">
            <p className="font-medium text-gray-900">Auditoría pendiente de activar</p>
            <p className="mt-2 text-sm text-gray-500">
              Ejecuta la migración 004 en Supabase para crear el historial de acciones.
            </p>
          </div>
        ) : auditLogs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Acción</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Usuario</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {auditLogs.map((log) => {
                  const actor = log.actor_id ? actorById.get(log.actor_id) : null;
                  return (
                    <tr key={log.id} className="hover:bg-gray-50/50">
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">{formatDate(log.created_at)}</td>
                      <td className="px-6 py-4">
                        <span className="font-medium text-gray-900">{actionLabels[log.action] ?? log.action}</span>
                        <p className="mt-1 text-xs text-gray-400">{log.target_type}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">{actor?.nombre ?? "SuperAdmin"}</p>
                        <p className="text-xs text-gray-500">{actor?.email ?? employee.email}</p>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{getMetadataSummary(log)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-12 text-center text-gray-500">
            Todavía no hay movimientos registrados.
          </div>
        )}
      </div>
    </div>
  );
}
