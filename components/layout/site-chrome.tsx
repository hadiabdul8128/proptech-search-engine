import Link from "next/link";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="text-lg font-semibold tracking-tight text-slate-900">
          AI Home Search
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          <Link href="/search" className="text-slate-600 hover:text-slate-900">
            Search
          </Link>
          <Link href="/cities/austin-tx" className="hidden text-slate-600 hover:text-slate-900 sm:inline">
            Cities
          </Link>
          <Button asChild size="sm" variant="outline">
            <Link href="/dashboard/leads">Agent Dashboard</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-slate-50">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-8 text-sm text-slate-500 sm:px-6">
        <p>AI Home Search — semantic property matching for modern buyers.</p>
        <p>Demo platform with mock listings across 8 U.S. cities.</p>
      </div>
    </footer>
  );
}
