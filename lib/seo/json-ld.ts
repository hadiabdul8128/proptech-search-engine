import type { City, Property } from "@/lib/types";

export function cityJsonLd(city: City, properties: Property[], siteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Homes for sale in ${city.name}, ${city.state}`,
    url: `${siteUrl}/cities/${city.slug}`,
    numberOfItems: properties.length,
    itemListElement: properties.slice(0, 10).map((property, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${siteUrl}/properties/${property.id}`,
      name: property.address,
    })),
  };
}

export function propertyJsonLd(
  property: Property & { cities?: City },
  siteUrl: string
) {
  const city = property.cities;
  return {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: property.address,
    description: property.description,
    url: `${siteUrl}/properties/${property.id}`,
    offers: {
      "@type": "Offer",
      price: property.price,
      priceCurrency: "USD",
    },
    address: {
      "@type": "PostalAddress",
      streetAddress: property.address,
      addressLocality: city?.name,
      addressRegion: city?.state,
      addressCountry: "US",
    },
    numberOfRooms: property.beds,
    floorSize: {
      "@type": "QuantitativeValue",
      value: property.sqft,
      unitCode: "FTK",
    },
  };
}
