import { createHash } from "crypto";
import { getRedis } from "@/lib/redis/client";

export function hashKey(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export function getSearchCacheTtl(): number {
  return Number(process.env.SEARCH_CACHE_TTL_SECONDS ?? 600);
}

export function getEmbedCacheTtl(): number {
  return Number(process.env.EMBED_CACHE_TTL_SECONDS ?? 86400);
}

export function buildEmbedCacheKey(organizationId: string, normalizedQuery: string): string {
  return `org:${organizationId}:embed:v1:${hashKey(normalizedQuery.trim().toLowerCase())}`;
}

export function buildSearchCacheKey(payload: {
  organizationId: string;
  query: string;
  citySlug: string | null;
  maxPrice: number | null;
  minPrice: number | null;
  minBeds: number | null;
  limit: number;
}): string {
  const raw = JSON.stringify(payload);
  return `org:${payload.organizationId}:search:v1:${hashKey(raw)}`;
}

export async function getCachedJson<T>(key: string): Promise<T | null> {
  const client = getRedis();
  if (!client) return null;

  try {
    const value = await client.get(key);
    if (!value) return null;
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export async function setCachedJson(
  key: string,
  value: unknown,
  ttlSeconds: number
): Promise<void> {
  const client = getRedis();
  if (!client) return;

  try {
    await client.set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch {
    // Cache write failures should not break requests.
  }
}

export async function invalidateSearchCache(organizationId: string): Promise<number> {
  const client = getRedis();
  if (!client) return 0;

  let deleted = 0;
  let cursor = "0";

  do {
    const [nextCursor, keys] = await client.scan(
      cursor,
      "MATCH",
      `org:${organizationId}:search:v1:*`,
      "COUNT",
      100
    );
    cursor = nextCursor;

    if (keys.length > 0) {
      deleted += await client.del(...keys);
    }
  } while (cursor !== "0");

  return deleted;
}
