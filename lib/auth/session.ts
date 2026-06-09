import { createClient } from "@/lib/supabase/server";
import { getDefaultOrganization } from "@/lib/tenant/context";
import type { OrganizationRole } from "@/lib/types";

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getUserRole(userId: string) {
  const membership = await getUserMembership(userId);
  return membership?.role ?? null;
}

export async function getUserMembership(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("organization_members")
    .select("role, organizations(id, slug, name)")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const organization = data?.organizations as
    | { id: string; slug: string; name: string }
    | { id: string; slug: string; name: string }[]
    | null
    | undefined;
  const org = Array.isArray(organization) ? organization[0] : organization;

  if (data?.role && org) {
    return {
      organizationId: org.id,
      organizationSlug: org.slug,
      organizationName: org.name,
      role: data.role as OrganizationRole,
    };
  }

  const { data: legacyRole } = await supabase
    .from("agent_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  if (!legacyRole?.role) return null;

  const defaultOrg = await getDefaultOrganization();
  return {
    ...defaultOrg,
    role: legacyRole.role as OrganizationRole,
  };
}

export async function requireAgentUser() {
  const user = await getCurrentUser();
  if (!user) {
    return {
      user: null,
      role: null,
      organizationId: null,
      organizationSlug: null,
      organizationName: null,
    };
  }

  const membership = await getUserMembership(user.id);
  if (!membership) {
    return {
      user: null,
      role: null,
      organizationId: null,
      organizationSlug: null,
      organizationName: null,
    };
  }

  return { user, ...membership };
}
