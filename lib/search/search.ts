import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildEmbedCacheKey,
  buildSearchCacheKey,
  getCachedJson,
  getEmbedCacheTtl,
  getSearchCacheTtl,
  setCachedJson,
} from "@/lib/redis/cache";
import { embedText } from "@/lib/search/embed";
import { parseSearchQuery } from "@/lib/search/parse-query";
import { getDefaultOrganization } from "@/lib/tenant/context";
import type { SearchResult } from "@/lib/types";

type CachedSearchPayload = {
  results: SearchResult[];
  parsed: ReturnType<typeof parseSearchQuery>;
};

export type SearchResponse = CachedSearchPayload & {
  cache: "HIT" | "MISS";
};

function computeFilterScore(
  property: {
    price: number;
    beds: number;
    features: string[];
    description: string;
  },
  parsed: ReturnType<typeof parseSearchQuery>
): number {
  let score = 0;
  let checks = 0;

  if (parsed.maxPrice !== null) {
    checks++;
    if (property.price <= parsed.maxPrice) score += 1;
  }

  if (parsed.minPrice !== null) {
    checks++;
    if (property.price >= parsed.minPrice) score += 1;
  }

  if (parsed.minBeds !== null) {
    checks++;
    if (property.beds >= parsed.minBeds) score += 1;
  }

  if (parsed.keywords.length > 0) {
    checks++;
    const haystack = [property.description, ...property.features].join(" ").toLowerCase();
    const hits = parsed.keywords.filter((k) => haystack.includes(k)).length;
    score += hits / parsed.keywords.length;
  }

  return checks === 0 ? 1 : score / checks;
}

async function getEmbeddingForQuery(organizationId: string, query: string): Promise<number[]> {
  const normalized = query.trim().toLowerCase() || "family home with backyard";
  const embedKey = buildEmbedCacheKey(organizationId, normalized);

  const cachedEmbedding = await getCachedJson<number[]>(embedKey);
  if (cachedEmbedding) {
    return cachedEmbedding;
  }

  const embedding = await embedText(normalized);
  await setCachedJson(embedKey, embedding, getEmbedCacheTtl());
  return embedding;
}

export async function searchProperties(
  query: string,
  options?: {
    organizationId?: string;
    citySlug?: string | null;
    maxPrice?: number | null;
    minPrice?: number | null;
    minBeds?: number | null;
    limit?: number;
  }
): Promise<SearchResponse> {
  const organizationId = options?.organizationId ?? (await getDefaultOrganization()).organizationId;
  const parsed = parseSearchQuery(query);
  const citySlug = options?.citySlug ?? parsed.citySlug;
  const maxPrice = options?.maxPrice ?? parsed.maxPrice;
  const minPrice = options?.minPrice ?? parsed.minPrice;
  const minBeds = options?.minBeds ?? parsed.minBeds;
  const limit = options?.limit ?? 24;

  const normalizedParsed = { ...parsed, citySlug, maxPrice, minPrice, minBeds };
  const searchKey = buildSearchCacheKey({
    organizationId,
    query: query.trim().toLowerCase() || "family home with backyard",
    citySlug,
    maxPrice,
    minPrice,
    minBeds,
    limit,
  });

  const cachedSearch = await getCachedJson<CachedSearchPayload>(searchKey);
  if (cachedSearch) {
    return { ...cachedSearch, cache: "HIT" };
  }

  const supabase = createAdminClient();
  const embedding = await getEmbeddingForQuery(organizationId, query);

  const { data, error } = await supabase.rpc("match_properties", {
    query_embedding: embedding,
    match_count: limit,
    filter_city_slug: citySlug,
    filter_max_price: maxPrice,
    filter_min_price: minPrice,
    filter_min_beds: minBeds,
    filter_organization_id: organizationId,
  });

  if (error) {
    throw new Error(error.message);
  }

  const results: SearchResult[] = (data ?? []).map(
    (row: {
      id: string;
      organization_id: string;
      city_id: string;
      address: string;
      price: number;
      beds: number;
      baths: number;
      sqft: number;
      description: string;
      features: string[];
      image_url: string;
      status: string;
      similarity: number;
      city_slug: string;
      city_name: string;
      city_state: string;
    }) => {
      const semanticScore = row.similarity ?? 0;
      const filterScore = computeFilterScore(
        {
          price: row.price,
          beds: row.beds,
          features: row.features ?? [],
          description: row.description,
        },
        normalizedParsed
      );
      const matchScore = semanticScore * 0.7 + filterScore * 0.3;

      return {
        id: row.id,
        organization_id: row.organization_id,
        city_id: row.city_id,
        address: row.address,
        price: row.price,
        beds: row.beds,
        baths: row.baths,
        sqft: row.sqft,
        description: row.description,
        features: row.features ?? [],
        image_url: row.image_url,
        status: row.status,
        match_score: matchScore,
        semantic_score: semanticScore,
        filter_score: filterScore,
        cities: {
          id: row.city_id,
          organization_id: organizationId,
          slug: row.city_slug,
          name: row.city_name,
          state: row.city_state,
          seo_title: "",
          seo_description: "",
          intro_md: "",
          hero_image: null,
        },
      };
    }
  );

  results.sort((a, b) => b.match_score - a.match_score);

  const payload: CachedSearchPayload = {
    results,
    parsed: normalizedParsed,
  };

  await setCachedJson(searchKey, payload, getSearchCacheTtl());

  return { ...payload, cache: "MISS" };
}
