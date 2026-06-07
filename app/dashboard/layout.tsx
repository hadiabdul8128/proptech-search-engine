import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAgentUser } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, role } = await requireAgentUser();

  if (!user || !role) {
    redirect("/login");
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Agent dashboard</h1>
          <p className="text-sm text-slate-500">Signed in as {user.email}</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/leads">Leads</Link>
          </Button>
          {role === "admin" && (
            <Button asChild variant="outline">
              <Link href="/dashboard/agents">Agents</Link>
            </Button>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}
