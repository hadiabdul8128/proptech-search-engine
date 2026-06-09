import { NextResponse } from "next/server";
import { z } from "zod";
import { logAuditEvent } from "@/lib/audit/log";
import { searchProperties } from "@/lib/search/search";
import { getDefaultOrganization } from "@/lib/tenant/context";

const searchSchema = z.object({
  q: z.string().optional(),
  city: z.string().optional(),
  maxPrice: z.coerce.number().optional(),
  minPrice: z.coerce.number().optional(),
  minBeds: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = searchSchema.parse(Object.fromEntries(searchParams.entries()));
    const { organizationId } = await getDefaultOrganization();

    const { results, parsed: queryMeta, cache } = await searchProperties(parsed.q ?? "", {
      organizationId,
      citySlug: parsed.city || null,
      maxPrice: parsed.maxPrice ?? null,
      minPrice: parsed.minPrice ?? null,
      minBeds: parsed.minBeds ?? null,
      limit: parsed.limit ?? 24,
    });

    await logAuditEvent({
      organizationId,
      action: cache === "HIT" ? "search.served_cache_hit" : "search.served_cache_miss",
      objectType: "search",
      metadata: { query: parsed.q ?? "", city: parsed.city ?? null, resultCount: results.length },
    });

    return NextResponse.json(
      { results, parsed: queryMeta },
      { headers: { "X-Cache": cache } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Search failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
