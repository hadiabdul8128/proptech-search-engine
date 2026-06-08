import { NextResponse } from "next/server";
import { z } from "zod";
import { searchProperties } from "@/lib/search/search";

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

    const { results, parsed: queryMeta, cache } = await searchProperties(parsed.q ?? "", {
      citySlug: parsed.city || null,
      maxPrice: parsed.maxPrice ?? null,
      minPrice: parsed.minPrice ?? null,
      minBeds: parsed.minBeds ?? null,
      limit: parsed.limit ?? 24,
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
