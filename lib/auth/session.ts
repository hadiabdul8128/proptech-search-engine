import { createClient } from "@/lib/supabase/server";

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getUserRole(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("agent_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  return data?.role ?? null;
}

export async function requireAgentUser() {
  const user = await getCurrentUser();
  if (!user) return { user: null, role: null };

  const role = await getUserRole(user.id);
  if (!role) return { user: null, role: null };

  return { user, role };
}
