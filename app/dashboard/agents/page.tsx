"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Agent } from "@/lib/types";

const CITY_OPTIONS = [
  "austin-tx",
  "denver-co",
  "seattle-wa",
  "miami-fl",
  "nashville-tn",
  "phoenix-az",
  "portland-or",
  "raleigh-nc",
];

export default function DashboardAgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [territories, setTerritories] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  async function loadAgents() {
    const response = await fetch("/api/dashboard/agents");
    const body = await response.json();
    if (response.ok) setAgents(body.agents ?? []);
  }

  useEffect(() => {
    loadAgents();
  }, []);

  async function createAgent(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);

    const response = await fetch("/api/dashboard/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, phone, territories }),
    });

    const body = await response.json();
    if (!response.ok) {
      setMessage(body.error ?? "Failed to create agent");
      return;
    }

    setName("");
    setEmail("");
    setPhone("");
    setTerritories([]);
    setMessage("Agent saved.");
    loadAgents();
  }

  function toggleTerritory(slug: string) {
    setTerritories((current) =>
      current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug]
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <form onSubmit={createAgent} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold">Add agent</h2>
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div>
          <Label>Territories</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {CITY_OPTIONS.map((slug) => (
              <button
                key={slug}
                type="button"
                onClick={() => toggleTerritory(slug)}
                className={`rounded-full border px-3 py-1 text-xs ${
                  territories.includes(slug)
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-600"
                }`}
              >
                {slug}
              </button>
            ))}
          </div>
        </div>
        {message && <p className="text-sm text-slate-600">{message}</p>}
        <Button type="submit">Save agent</Button>
      </form>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">Active agents</h2>
        <div className="space-y-4">
          {agents.map((agent) => (
            <div key={agent.id} className="rounded-lg border border-slate-100 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{agent.name}</p>
                <Badge>{agent.is_active ? "active" : "inactive"}</Badge>
              </div>
              <p className="text-sm text-slate-500">{agent.email}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {agent.territories.map((slug) => (
                  <Badge key={slug}>{slug}</Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
