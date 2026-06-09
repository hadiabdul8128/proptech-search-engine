"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Lead, LeadStatus } from "@/lib/types";

const STATUSES: LeadStatus[] = ["new", "contacted", "closed"];

export default function DashboardLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filter, setFilter] = useState<LeadStatus | "all">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadLeads() {
    setLoading(true);
    const response = await fetch("/api/dashboard/leads");
    const body = await response.json();
    if (!response.ok) {
      setError(body.error ?? "Failed to load leads");
      setLoading(false);
      return;
    }
    setLeads(body.leads ?? []);
    setError(null);
    setLoading(false);
  }

  useEffect(() => {
    async function loadInitialLeads() {
      setLoading(true);
      const response = await fetch("/api/dashboard/leads");
      const body = await response.json();
      if (!response.ok) {
        setError(body.error ?? "Failed to load leads");
        setLoading(false);
        return;
      }
      setLeads(body.leads ?? []);
      setError(null);
      setLoading(false);
    }

    void loadInitialLeads();
  }, []);

  async function updateStatus(id: string, status: LeadStatus) {
    const response = await fetch(`/api/dashboard/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    if (response.ok) {
      setLeads((current) =>
        current.map((lead) => (lead.id === id ? { ...lead, status } : lead))
      );
    }
  }

  const filtered =
    filter === "all" ? leads : leads.filter((lead) => lead.status === filter);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("all")}
        >
          All
        </Button>
        {STATUSES.map((status) => (
          <Button
            key={status}
            variant={filter === status ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(status)}
          >
            {status}
          </Button>
        ))}
        <Button variant="ghost" size="sm" onClick={loadLeads}>
          Refresh
        </Button>
      </div>

      {loading && <p className="text-sm text-slate-500">Loading leads...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Lead</th>
              <th className="px-4 py-3 font-medium">Property</th>
              <th className="px-4 py-3 font-medium">Agent</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((lead) => (
              <tr key={lead.id} className="border-b border-slate-100 align-top">
                <td className="px-4 py-4">
                  <p className="font-medium text-slate-900">{lead.name}</p>
                  <p className="text-slate-500">{lead.email}</p>
                  <p className="mt-2 text-slate-600">{lead.message}</p>
                  <Badge className="mt-2">{lead.source}</Badge>
                </td>
                <td className="px-4 py-4">
                  {lead.properties ? (
                    <Link href={`/properties/${lead.properties.id}`} className="text-slate-700 hover:underline">
                      {lead.properties.address}
                    </Link>
                  ) : (
                    <span className="text-slate-400">{lead.city_slug ?? "General inquiry"}</span>
                  )}
                </td>
                <td className="px-4 py-4">{lead.agents?.name ?? "Unassigned"}</td>
                <td className="px-4 py-4">
                  <Badge>{lead.status}</Badge>
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-col gap-2">
                    {STATUSES.map((status) => (
                      <Button
                        key={status}
                        size="sm"
                        variant={lead.status === status ? "default" : "outline"}
                        onClick={() => updateStatus(lead.id, status)}
                      >
                        Mark {status}
                      </Button>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                  No leads yet. Submit a form on the public site to test routing.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
