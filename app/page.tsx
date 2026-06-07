import Link from "next/link";
import { SearchBar } from "@/components/search/search-bar";
import { PropertyCard } from "@/components/search/property-card";
import { getCities, getPropertiesByCity } from "@/lib/data/properties";
import { Button } from "@/components/ui/button";

import type { City, Property } from "@/lib/types";

export default async function HomePage() {
  let featured: Property[] = [];
  let cities: City[] = [];

  try {
    cities = await getCities();
    if (cities[0]) {
      featured = await getPropertiesByCity(cities[0].id, 3);
    }
  } catch {
    // Database not configured yet — page still renders search UI.
  }

  return (
    <div>
      <section className="border-b border-slate-200 bg-gradient-to-b from-white to-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
              AI-powered real estate
            </p>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
              Describe the home you want. We&apos;ll find the match.
            </h1>
            <p className="mt-4 text-lg text-slate-600">
              Semantic search across lifestyle, layout, neighborhood, and budget — not just filters.
            </p>
          </div>
          <div className="mx-auto mt-10 max-w-3xl">
            <SearchBar size="large" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Explore cities</h2>
            <p className="text-slate-600">SEO landing pages for top markets.</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cities.map((city) => (
            <Link
              key={city.slug}
              href={`/cities/${city.slug}`}
              className="rounded-xl border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:shadow-sm"
            >
              <p className="text-lg font-semibold">{city.name}</p>
              <p className="text-sm text-slate-500">{city.state}</p>
            </Link>
          ))}
        </div>
      </section>

      {featured.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
          <div className="mb-6 flex items-end justify-between gap-4">
            <h2 className="text-2xl font-semibold text-slate-900">Featured listings</h2>
            <Button asChild variant="outline">
              <Link href="/search?q=family%20home">View all</Link>
            </Button>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
