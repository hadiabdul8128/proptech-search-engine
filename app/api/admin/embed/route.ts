import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { embedText } from "@/lib/search/embed";
import { buildEmbeddingText } from "@/lib/search/parse-query";

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const adminToken = process.env.ADMIN_EMBED_TOKEN;

    if (!adminToken || authHeader !== `Bearer ${adminToken}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const propertyId = body.propertyId as string | undefined;

    const supabase = createAdminClient();
    let query = supabase
      .from("properties")
      .select("id, address, price, beds, baths, description, features, cities(name, state)");

    if (propertyId) {
      query = query.eq("id", propertyId);
    }

    const { data: properties, error } = await query;
    if (error) throw new Error(error.message);

    let updated = 0;
    for (const property of properties ?? []) {
      const cities = property.cities as { name: string; state: string } | { name: string; state: string }[] | null;
      const city = Array.isArray(cities) ? cities[0] : cities;
      const text = buildEmbeddingText({
        description: property.description,
        features: (property.features as string[]) ?? [],
        address: property.address,
        price: property.price,
        beds: property.beds,
        baths: Number(property.baths),
        cityName: city?.name,
        state: city?.state,
      });
      const embedding = await embedText(text);

      const { error: updateError } = await supabase
        .from("properties")
        .update({ embedding })
        .eq("id", property.id);

      if (updateError) throw new Error(updateError.message);
      updated += 1;
    }

    return NextResponse.json({ ok: true, updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Embed failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
