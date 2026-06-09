import { NextResponse } from "next/server";
import { z } from "zod";
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

  if (!hasPermission(role, "manage_agents")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: agents, error } = await supabase
    .from("agents")
    .select("*")
    .eq("organization_id", organizationId)
    .order("name");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ agents });
}

const agentSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  territories: z.array(z.string()).default([]),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { user, role, organizationId } = await requireAgentUser();

  if (!user || !role || !organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(role, "manage_agents")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const data = agentSchema.parse(body);

  const { data: agent, error } = await supabase
    .from("agents")
    .upsert(
      {
        organization_id: organizationId,
        name: data.name,
        email: data.email,
        phone: data.phone ?? null,
        territories: data.territories,
        is_active: true,
      },
      { onConflict: "email" }
    )
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await logAuditEvent({
    organizationId,
    actorUserId: user.id,
    actorRole: role,
    action: "agent.created",
    objectType: "agent",
    objectId: agent.id,
    metadata: { email: agent.email, territories: agent.territories ?? [] },
  });

  return NextResponse.json({ agent });
}
