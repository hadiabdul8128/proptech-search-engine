import { Suspense } from "react";
import { SearchBar } from "@/components/search/search-bar";
import { SearchFilters } from "@/components/search/search-filters";
import { PropertyCard } from "@/components/search/property-card";
import { searchProperties } from "@/lib/search/search";

type SearchPageProps = {
  searchParams: Promise<{
    q?: string;
    city?: string;
    maxPrice?: string;
    minPrice?: string;
    minBeds?: string;
  }>;
};

async function SearchResults({
  query,
  city,
  maxPrice,
  minPrice,
  minBeds,
}: {
  query: string;
  city?: string;
  maxPrice?: string;
  minPrice?: string;
  minBeds?: string;
}) {
  let searchData: Awaited<ReturnType<typeof searchProperties>>;

  try {
    searchData = await searchProperties(query || "family home", {
      citySlug: city || null,
      maxPrice: maxPrice ? Number(maxPrice) : null,
      minPrice: minPrice ? Number(minPrice) : null,
      minBeds: minBeds ? Number(minBeds) : null,
    });
  } catch (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-800">
        <p className="font-medium">Search unavailable</p>
        <p className="mt-2 text-sm">
          {error instanceof Error ? error.message : "Configure Supabase and run the seed script."}
        </p>
      </div>
    );
  }

  if (searchData.results.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <p className="font-medium text-slate-900">No matches found</p>
        <p className="mt-2 text-sm text-slate-500">Try broadening your search or removing filters.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {searchData.results.map((property) => (
        <PropertyCard key={property.id} property={property} showMatch />
      ))}
    </div>
  );
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = params.q ?? "";

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-8 space-y-4">
        <h1 className="text-3xl font-semibold text-slate-900">Search homes</h1>
        <SearchBar defaultQuery={query} />
      </div>

      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        <Suspense fallback={<div className="h-64 rounded-xl bg-slate-100" />}>
          <SearchFilters />
        </Suspense>
        <Suspense fallback={<div className="h-96 rounded-xl bg-slate-100" />}>
          <SearchResults
            query={query}
            city={params.city}
            maxPrice={params.maxPrice}
            minPrice={params.minPrice}
            minBeds={params.minBeds}
          />
        </Suspense>
      </div>
    </div>
  );
}
