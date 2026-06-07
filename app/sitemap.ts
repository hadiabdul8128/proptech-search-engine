import type { MetadataRoute } from "next";
import { getCities } from "@/lib/data/properties";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteUrl, lastModified: new Date() },
    { url: `${siteUrl}/search`, lastModified: new Date() },
  ];

  try {
    const cities = await getCities();
    return [
      ...staticRoutes,
      ...cities.map((city) => ({
        url: `${siteUrl}/cities/${city.slug}`,
        lastModified: new Date(),
      })),
    ];
  } catch {
    return staticRoutes;
  }
}
