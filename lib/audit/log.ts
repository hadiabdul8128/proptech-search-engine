import { createAdminClient } from "@/lib/supabase/admin";
import type { OrganizationRole } from "@/lib/types";

type AuditEvent = {
  organizationId: string;
  actorUserId?: string | null;
  actorRole?: OrganizationRole | string | null;
  action: string;
  objectType: string;
  objectId?: string | null;
  metadata?: Record<string, unknown>;
};

export async function logAuditEvent(event: AuditEvent): Promise<void> {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("audit_logs").insert({
      organization_id: event.organizationId,
      actor_user_id: event.actorUserId ?? null,
      actor_role: event.actorRole ?? null,
      action: event.action,
      object_type: event.objectType,
      object_id: event.objectId ?? null,
      metadata: event.metadata ?? {},
    });

    if (error) {
      console.error("[audit] insert failed", error.message);
    }
  } catch (error) {
    console.error("[audit] insert failed", error);
  }
}
