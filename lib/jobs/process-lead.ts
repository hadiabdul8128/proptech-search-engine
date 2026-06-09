import { createAdminClient } from "@/lib/supabase/admin";

export async function processLeadPostCreate(organizationId: string, leadId: string): Promise<void> {
  const supabase = createAdminClient();
  const { data: lead, error } = await supabase
    .from("leads")
    .select("id, organization_id, name, email, assigned_agent_id, agents(name, email)")
    .eq("organization_id", organizationId)
    .eq("id", leadId)
    .single();

  if (error || !lead) {
    throw new Error(error?.message ?? `Lead not found: ${leadId}`);
  }

  const agents = lead.agents as
    | { name: string; email: string }
    | { name: string; email: string }[]
    | null;
  const agent = Array.isArray(agents) ? agents[0] : agents;

  console.info("[lead-process] New lead queued for follow-up", {
    leadId: lead.id,
    leadName: lead.name,
    leadEmail: lead.email,
    assignedAgent: agent?.name ?? "unassigned",
    assignedAgentEmail: agent?.email ?? null,
  });
}
