"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const EXAMPLES = [
  "family home near parks under $750k",
  "modern kitchen with backyard in Austin",
  "condo with water view under 900k",
  "4 bedroom home office near top schools",
];

type SearchBarProps = {
  defaultQuery?: string;
  size?: "default" | "large";
};

export function SearchBar({ defaultQuery = "", size = "default" }: SearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState(defaultQuery);

  function submit(nextQuery = query) {
    const trimmed = nextQuery.trim();
    if (!trimmed) return;
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <div className="space-y-4">
      <form
        className="flex flex-col gap-3 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Describe your ideal home in plain English..."
          className={size === "large" ? "h-14 text-base" : undefined}
        />
        <Button type="submit" size={size === "large" ? "lg" : "default"} className="sm:min-w-32">
          <Search className="h-4 w-4" />
          Search
        </Button>
      </form>
      <div className="flex flex-wrap gap-2">
        {EXAMPLES.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => {
              setQuery(example);
              submit(example);
            }}
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 hover:border-slate-300 hover:text-slate-900"
          >
            {example}
          </button>
        ))}
      </div>
    </div>
  );
}
