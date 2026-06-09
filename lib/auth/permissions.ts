import type { OrganizationRole } from "@/lib/types";

export type Permission =
  | "manage_users"
  | "manage_agents"
  | "manage_listings"
  | "manage_leads"
  | "view_assigned_leads"
  | "view_all_leads"
  | "view_analytics"
  | "read_only";

const ROLE_PERMISSIONS: Record<OrganizationRole, Permission[]> = {
  admin: [
    "manage_users",
    "manage_agents",
    "manage_listings",
    "manage_leads",
    "view_assigned_leads",
    "view_all_leads",
    "view_analytics",
    "read_only",
  ],
  agent: ["view_assigned_leads", "read_only"],
  analyst: ["view_analytics", "read_only"],
  viewer: ["read_only"],
};

export function hasPermission(role: OrganizationRole | null | undefined, permission: Permission) {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function requirePermission(role: OrganizationRole | null | undefined, permission: Permission) {
  if (!hasPermission(role, permission)) {
    throw new Error("Forbidden");
  }
}
