import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/auth/permissions";
import { requireAgentUser } from "@/lib/auth/session";

export default async function DashboardPage() {
  const { role } = await requireAgentUser();

  if (hasPermission(role, "view_all_leads") || hasPermission(role, "view_assigned_leads")) {
    redirect("/dashboard/leads");
  }

  if (hasPermission(role, "manage_agents")) {
    redirect("/dashboard/agents");
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-8">
      <h2 className="text-lg font-semibold text-slate-900">Dashboard access granted</h2>
      <p className="mt-2 text-sm text-slate-600">
        Your role is active, but there is not a dedicated dashboard page for this permission set yet.
      </p>
    </div>
  );
}
