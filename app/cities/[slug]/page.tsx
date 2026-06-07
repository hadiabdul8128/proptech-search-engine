import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PropertyCard } from "@/components/search/property-card";
import { Button } from "@/components/ui/button";
import { getCities, getCityBySlug, getPropertiesByCity } from "@/lib/data/properties";
import { cityJsonLd } from "@/lib/seo/json-ld";

type CityPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  try {
    const cities = await getCities();
    return cities.map((city) => ({ slug: city.slug }));
  } catch {
    return [
      { slug: "austin-tx" },
      { slug: "denver-co" },
      { slug: "seattle-wa" },
      { slug: "miami-fl" },
      { slug: "nashville-tn" },
      { slug: "phoenix-az" },
      { slug: "portland-or" },
      { slug: "raleigh-nc" },
    ];
  }
}

export async function generateMetadata({ params }: CityPageProps): Promise<Metadata> {
  const { slug } = await params;
  const city = await getCityBySlug(slug).catch(() => null);

  if (!city) return { title: "City not found" };

  return {
    title: city.seo_title,
    description: city.seo_description,
    alternates: {
      canonical: `/cities/${city.slug}`,
    },
  };
}

export default async function CityPage({ params }: CityPageProps) {
  const { slug } = await params;
  const city = await getCityBySlug(slug).catch(() => null);

  if (!city) notFound();

  const properties = await getPropertiesByCity(city.id, 12).catch(() => []);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(cityJsonLd(city, properties, siteUrl)),
        }}
      />
      <div>
        <section className="relative overflow-hidden border-b border-slate-200 bg-slate-900 text-white">
          {city.hero_image && (
            <Image
              src={city.hero_image}
              alt={`${city.name}, ${city.state}`}
              fill
              className="object-cover opacity-40"
              priority
            />
          )}
          <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6">
            <p className="text-sm uppercase tracking-[0.2em] text-slate-300">{city.state}</p>
            <h1 className="mt-2 text-4xl font-semibold sm:text-5xl">Homes for sale in {city.name}</h1>
            <p className="mt-4 max-w-2xl text-lg text-slate-200">{city.intro_md}</p>
            <Button asChild className="mt-8" variant="secondary">
              <Link href={`/search?city=${city.slug}&q=home%20in%20${city.name}`}>
                Search {city.name} listings
              </Link>
            </Button>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-slate-900">Featured listings</h2>
            <p className="text-slate-600">{properties.length} active homes in {city.name}.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {properties.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
