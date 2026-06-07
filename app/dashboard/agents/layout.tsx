import { redirect } from "next/navigation";
import { requireAgentUser } from "@/lib/auth/session";

export default async function AgentsSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { role } = await requireAgentUser();

  if (role !== "admin") {
    redirect("/dashboard/leads");
  }

  return children;
}
