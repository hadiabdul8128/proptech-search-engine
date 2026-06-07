"use client";

import { useState } from "react";
import { LeadForm } from "@/components/leads/lead-form";
import { Button } from "@/components/ui/button";

const SOURCES = [
  { id: "schedule-tour", label: "Schedule tour" },
  { id: "ask-question", label: "Ask a question" },
  { id: "pre-qualified", label: "Get pre-qualified" },
];

type PropertyLeadPanelProps = {
  propertyId: string;
  citySlug: string;
};

export function PropertyLeadPanel({ propertyId, citySlug }: PropertyLeadPanelProps) {
  const [source, setSource] = useState(SOURCES[0].id);
  const active = SOURCES.find((item) => item.id === source) ?? SOURCES[0];

  return (
    <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
      <div className="flex flex-wrap gap-2">
        {SOURCES.map((item) => (
          <Button
            key={item.id}
            type="button"
            size="sm"
            variant={source === item.id ? "default" : "outline"}
            onClick={() => setSource(item.id)}
          >
            {item.label}
          </Button>
        ))}
      </div>
      <LeadForm
        propertyId={propertyId}
        citySlug={citySlug}
        source={active.id}
        title={active.label}
      />
    </div>
  );
}
