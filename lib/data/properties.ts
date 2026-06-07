import { createAdminClient } from "@/lib/supabase/admin";
import type { City, Property } from "@/lib/types";

export async function getCities(): Promise<City[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("cities").select("*").order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getCityBySlug(slug: string): Promise<City | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("cities").select("*").eq("slug", slug).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function getPropertyById(id: string): Promise<(Property & { cities: City }) | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("properties")
    .select("*, cities(*)")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return {
    ...data,
    features: (data.features as string[]) ?? [],
    cities: data.cities as City,
  };
}

export async function getPropertiesByCity(cityId: string, limit = 12): Promise<Property[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("properties")
    .select("*, cities(*)")
    .eq("city_id", cityId)
    .eq("status", "active")
    .order("price", { ascending: true })
    .limit(limit);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    ...row,
    features: (row.features as string[]) ?? [],
    cities: row.cities as City,
  }));
}

export async function getSimilarProperties(
  propertyId: string,
  cityId: string,
  limit = 4
): Promise<Property[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("properties")
    .select("*, cities(*)")
    .eq("city_id", cityId)
    .neq("id", propertyId)
    .eq("status", "active")
    .limit(limit);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    ...row,
    features: (row.features as string[]) ?? [],
    cities: row.cities as City,
  }));
}
