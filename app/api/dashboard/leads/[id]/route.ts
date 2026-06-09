import { NextResponse } from "next/server";
import { z } from "zod";
import { logAuditEvent } from "@/lib/audit/log";
import { hasPermission } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { requireAgentUser } from "@/lib/auth/session";

const updateSchema = z.object({
  status: z.enum(["new", "contacted", "closed"]).optional(),
  assignedAgentId: z.string().uuid().optional(),
  notes: z.string().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { user, role, organizationId } = await requireAgentUser();

  if (!user || !role || !organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(role, "manage_leads") && !hasPermission(role, "view_assigned_leads")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const data = updateSchema.parse(body);

  const updatePayload = {
    status: data.status,
    assigned_agent_id: hasPermission(role, "manage_leads") ? data.assignedAgentId : undefined,
    notes: data.notes,
  };

  let query = supabase
    .from("leads")
    .update(updatePayload)
    .eq("organization_id", organizationId)
    .eq("id", id)
    .select("*");

  if (role === "agent") {
    const { data: agent } = await supabase
      .from("agents")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("user_id", user.id)
      .maybeSingle();

    query = query.eq("assigned_agent_id", agent?.id ?? "00000000-0000-0000-0000-000000000000");
  }

  const { data: lead, error } = await query.single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await logAuditEvent({
    organizationId,
    actorUserId: user.id,
    actorRole: role,
    action: "lead.status_updated",
    objectType: "lead",
    objectId: lead.id,
    metadata: {
      status: data.status ?? null,
      assignedAgentId: data.assignedAgentId ?? null,
      notesUpdated: typeof data.notes === "string",
    },
  });

  return NextResponse.json({ lead });
}
