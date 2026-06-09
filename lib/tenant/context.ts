import { createAdminClient } from "@/lib/supabase/admin";

export const DEFAULT_ORGANIZATION_SLUG = "nestify";

export type OrganizationContext = {
  organizationId: string;
  organizationSlug: string;
  organizationName: string;
};

export async function getOrganizationBySlug(
  slug = DEFAULT_ORGANIZATION_SLUG
): Promise<OrganizationContext> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("organizations")
    .select("id, slug, name")
    .eq("slug", slug)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? `Organization not found: ${slug}`);
  }

  return {
    organizationId: data.id,
    organizationSlug: data.slug,
    organizationName: data.name,
  };
}

export async function getDefaultOrganization() {
  return getOrganizationBySlug(DEFAULT_ORGANIZATION_SLUG);
}
