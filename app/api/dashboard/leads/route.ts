import { NextResponse } from "next/server";
import { logAuditEvent } from "@/lib/audit/log";
import { hasPermission } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { requireAgentUser } from "@/lib/auth/session";

export async function GET() {
  const supabase = await createClient();
  const { user, role, organizationId } = await requireAgentUser();

  if (!user || !role || !organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (
    !hasPermission(role, "view_all_leads") &&
    !hasPermission(role, "view_assigned_leads")
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let query = supabase
    .from("leads")
    .select("*, properties(*), agents(*)")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (role === "agent") {
    const { data: agent } = await supabase
      .from("agents")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("user_id", user.id)
      .maybeSingle();

    query = query.eq("assigned_agent_id", agent?.id ?? "00000000-0000-0000-0000-000000000000");
  }

  const { data: leads, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAuditEvent({
    organizationId,
    actorUserId: user.id,
    actorRole: role,
    action: "lead.viewed",
    objectType: "lead",
    metadata: { count: leads?.length ?? 0, scope: role === "agent" ? "assigned" : "organization" },
  });

  return NextResponse.json({ leads });
}
