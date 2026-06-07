export type ParsedQuery = {
  raw: string;
  citySlug: string | null;
  maxPrice: number | null;
  minPrice: number | null;
  minBeds: number | null;
  keywords: string[];
};

const CITY_ALIASES: Record<string, string> = {
  austin: "austin-tx",
  denver: "denver-co",
  seattle: "seattle-wa",
  miami: "miami-fl",
  nashville: "nashville-tn",
  phoenix: "phoenix-az",
  portland: "portland-or",
  raleigh: "raleigh-nc",
};

function parsePriceToken(token: string): number | null {
  const normalized = token.toLowerCase().replace(/,/g, "");
  const match = normalized.match(/\$?(\d+(?:\.\d+)?)\s*(k|m)?/);
  if (!match) return null;

  let value = parseFloat(match[1]);
  if (match[2] === "k") value *= 1000;
  if (match[2] === "m") value *= 1_000_000;
  return Math.round(value);
}

export function parseSearchQuery(query: string): ParsedQuery {
  const raw = query.trim();
  const lower = raw.toLowerCase();

  let citySlug: string | null = null;
  for (const [alias, slug] of Object.entries(CITY_ALIASES)) {
    if (lower.includes(alias)) {
      citySlug = slug;
      break;
    }
  }

  let maxPrice: number | null = null;
  let minPrice: number | null = null;

  const underMatch = lower.match(/(?:under|below|max|less than)\s+\$?([\d,.]+k?)/);
  if (underMatch) {
    maxPrice = parsePriceToken(underMatch[1]);
  }

  const overMatch = lower.match(/(?:over|above|min|more than)\s+\$?([\d,.]+k?)/);
  if (overMatch) {
    minPrice = parsePriceToken(overMatch[1]);
  }

  let minBeds: number | null = null;
  const bedsMatch = lower.match(/(\d+)\s*(?:bed|bedroom|br)/);
  if (bedsMatch) {
    minBeds = parseInt(bedsMatch[1], 10);
  }

  const keywords = lower
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(
      (word) =>
        word.length > 2 &&
        !["the", "and", "for", "with", "under", "over", "near", "home"].includes(
          word
        )
    );

  return { raw, citySlug, maxPrice, minPrice, minBeds, keywords };
}

export function buildEmbeddingText(property: {
  description: string;
  features: string[];
  address: string;
  price: number;
  beds: number;
  baths: number;
  cityName?: string;
  state?: string;
}): string {
  const priceBand =
    property.price < 400_000
      ? "affordable starter"
      : property.price < 700_000
        ? "mid-range family"
        : property.price < 1_000_000
          ? "premium upscale"
          : "luxury estate";

  return [
    property.description,
    `Features: ${property.features.join(", ")}`,
    `${property.beds} bedrooms, ${property.baths} bathrooms`,
    property.address,
    property.cityName && property.state
      ? `${property.cityName}, ${property.state}`
      : null,
    priceBand,
  ]
    .filter(Boolean)
    .join(". ");
}
