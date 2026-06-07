import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { PropertyLeadPanel } from "@/components/leads/property-lead-panel";
import { PropertyCard } from "@/components/search/property-card";
import { Badge } from "@/components/ui/badge";
import { getPropertyById, getSimilarProperties } from "@/lib/data/properties";
import { formatPrice } from "@/lib/format";
import { propertyJsonLd } from "@/lib/seo/json-ld";

type PropertyPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PropertyPageProps): Promise<Metadata> {
  const { id } = await params;
  const property = await getPropertyById(id).catch(() => null);

  if (!property) {
    return { title: "Property not found" };
  }

  return {
    title: `${property.address} | ${formatPrice(property.price)}`,
    description: property.description,
  };
}

export default async function PropertyPage({ params }: PropertyPageProps) {
  const { id } = await params;
  const property = await getPropertyById(id).catch(() => null);

  if (!property) notFound();

  const similar = await getSimilarProperties(property.id, property.city_id).catch(() => []);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(propertyJsonLd(property, siteUrl)),
        }}
      />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[1.4fr_0.8fr]">
          <div className="space-y-6">
            <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-slate-100">
              <Image
                src={property.image_url}
                alt={property.address}
                fill
                className="object-cover"
                priority
              />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-semibold text-slate-900">{formatPrice(property.price)}</h1>
                <Badge>
                  {property.beds} bd · {property.baths} ba · {property.sqft.toLocaleString()} sqft
                </Badge>
              </div>
              <p className="mt-2 text-lg text-slate-600">{property.address}</p>
              <p className="mt-4 text-slate-700">{property.description}</p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-900">Features</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {property.features.map((feature) => (
                  <Badge key={feature}>{feature}</Badge>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
              Map preview placeholder — connect geocoding in a future release.
            </div>

            {similar.length > 0 && (
              <div>
                <h2 className="mb-4 text-xl font-semibold text-slate-900">Similar homes</h2>
                <div className="grid gap-6 sm:grid-cols-2">
                  {similar.map((item) => (
                    <PropertyCard key={item.id} property={item} />
                  ))}
                </div>
              </div>
            )}
          </div>

          <PropertyLeadPanel propertyId={property.id} citySlug={property.cities.slug} />
        </div>
      </div>
    </>
  );
}
