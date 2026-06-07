"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const CITIES = [
  { slug: "", label: "All cities" },
  { slug: "austin-tx", label: "Austin, TX" },
  { slug: "denver-co", label: "Denver, CO" },
  { slug: "seattle-wa", label: "Seattle, WA" },
  { slug: "miami-fl", label: "Miami, FL" },
  { slug: "nashville-tn", label: "Nashville, TN" },
  { slug: "phoenix-az", label: "Phoenix, AZ" },
  { slug: "portland-or", label: "Portland, OR" },
  { slug: "raleigh-nc", label: "Raleigh, NC" },
];

export function SearchFilters() {
  const router = useRouter();
  const params = useSearchParams();

  const q = params.get("q") ?? "";
  const city = params.get("city") ?? "";
  const maxPrice = params.get("maxPrice") ?? "";
  const minBeds = params.get("minBeds") ?? "";

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const next = new URLSearchParams();
    const query = String(formData.get("q") ?? "").trim();
    const nextCity = String(formData.get("city") ?? "");
    const nextMaxPrice = String(formData.get("maxPrice") ?? "");
    const nextMinBeds = String(formData.get("minBeds") ?? "");

    if (query) next.set("q", query);
    if (nextCity) next.set("city", nextCity);
    if (nextMaxPrice) next.set("maxPrice", nextMaxPrice);
    if (nextMinBeds) next.set("minBeds", nextMinBeds);

    router.push(`/search?${next.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
      <div>
        <Label htmlFor="q">Search</Label>
        <Input id="q" name="q" defaultValue={q} placeholder="Describe your home..." />
      </div>
      <div>
        <Label htmlFor="city">City</Label>
        <select
          id="city"
          name="city"
          defaultValue={city}
          className="mt-1 flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
        >
          {CITIES.map((item) => (
            <option key={item.slug || "all"} value={item.slug}>
              {item.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="maxPrice">Max price</Label>
        <Input id="maxPrice" name="maxPrice" type="number" defaultValue={maxPrice} placeholder="750000" />
      </div>
      <div>
        <Label htmlFor="minBeds">Min beds</Label>
        <Input id="minBeds" name="minBeds" type="number" defaultValue={minBeds} placeholder="3" />
      </div>
      <Button type="submit" className="w-full">
        Apply filters
      </Button>
    </form>
  );
}
