import type { SupabaseClient } from "@supabase/supabase-js";

interface AuditPayload {
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown>;
}

export async function logSuperAdminAction(
  supabase: SupabaseClient,
  payload: AuditPayload
) {
  try {
    await supabase.from("super_admin_audit_logs").insert({
      actor_id: payload.actorId,
      action: payload.action,
      target_type: payload.targetType,
      target_id: payload.targetId,
      metadata: payload.metadata ?? {},
    });
  } catch (error) {
    console.warn("Could not write super admin audit log:", error);
  }
}
