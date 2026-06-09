import { createAdminClient } from "@/lib/supabase/admin";

type AssignLeadInput = {
  organizationId: string;
  propertyId?: string | null;
  citySlug?: string | null;
};

export async function assignLeadAgent(
  input: AssignLeadInput
): Promise<string | null> {
  const supabase = createAdminClient();

  let citySlug = input.citySlug ?? null;

  if (input.propertyId) {
    const { data: property } = await supabase
      .from("properties")
      .select("city_id, cities(slug)")
      .eq("organization_id", input.organizationId)
      .eq("id", input.propertyId)
      .single();

    const cities = property?.cities as { slug: string } | { slug: string }[] | null;
    if (cities && !Array.isArray(cities)) {
      citySlug = cities.slug;
    } else if (Array.isArray(cities) && cities[0]) {
      citySlug = cities[0].slug;
    }
  }

  const { data: agents } = await supabase
    .from("agents")
    .select("id, territories, is_active")
    .eq("organization_id", input.organizationId)
    .eq("is_active", true);

  if (!agents || agents.length === 0) {
    return null;
  }

  if (citySlug) {
    const territoryMatch = agents.find((agent) =>
      (agent.territories ?? []).includes(citySlug!)
    );
    if (territoryMatch) return territoryMatch.id;
  }

  const { count } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", input.organizationId);

  const index = (count ?? 0) % agents.length;
  return agents[index]?.id ?? agents[0].id;
}
