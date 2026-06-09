import { createAdminClient } from "@/lib/supabase/admin";
import { embedText } from "@/lib/search/embed";
import { buildEmbeddingText } from "@/lib/search/parse-query";

export async function embedPropertyById(organizationId: string, propertyId: string): Promise<void> {
  const supabase = createAdminClient();
  const { data: property, error } = await supabase
    .from("properties")
    .select("id, organization_id, address, price, beds, baths, description, features, cities(name, state)")
    .eq("organization_id", organizationId)
    .eq("id", propertyId)
    .single();

  if (error || !property) {
    throw new Error(error?.message ?? `Property not found: ${propertyId}`);
  }

  const cities = property.cities as
    | { name: string; state: string }
    | { name: string; state: string }[]
    | null;
  const city = Array.isArray(cities) ? cities[0] : cities;

  const text = buildEmbeddingText({
    description: property.description,
    features: (property.features as string[]) ?? [],
    address: property.address,
    price: property.price,
    beds: property.beds,
    baths: Number(property.baths),
    cityName: city?.name,
    state: city?.state,
  });

  const embedding = await embedText(text);

  const { error: updateError } = await supabase
    .from("properties")
    .update({ embedding })
    .eq("organization_id", organizationId)
    .eq("id", property.id);

  if (updateError) {
    throw new Error(updateError.message);
  }
}

export async function listPropertyIds(organizationId: string, propertyId?: string): Promise<string[]> {
  const supabase = createAdminClient();
  let query = supabase.from("properties").select("id").eq("organization_id", organizationId);

  if (propertyId) {
    query = query.eq("id", propertyId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => row.id);
}
