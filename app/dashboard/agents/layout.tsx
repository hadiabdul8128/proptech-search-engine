import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/auth/permissions";
import { requireAgentUser } from "@/lib/auth/session";

export default async function AgentsSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { role } = await requireAgentUser();

  if (!hasPermission(role, "manage_agents")) {
    redirect("/dashboard/leads");
  }

  return children;
}
