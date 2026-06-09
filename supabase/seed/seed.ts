import { config } from "dotenv";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

config({ path: join(process.cwd(), ".env.local") });
config({ path: join(process.cwd(), ".env") });
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { buildEmbeddingText } from "../../lib/search/parse-query";

type CitySeed = {
  slug: string;
  name: string;
  state: string;
  seo_title: string;
  seo_description: string;
  intro_md: string;
  hero_image: string;
};

type PropertySeed = {
  citySlug: string;
  address: string;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  description: string;
  features: string[];
  image_url: string;
};

const STREETS = [
  "Oak Lane",
  "Maple Drive",
  "Cedar Court",
  "Willow Way",
  "Birch Boulevard",
  "Pine Place",
  "Elm Street",
  "Summit Avenue",
  "River Road",
  "Park Circle",
];

const FEATURE_SETS = [
  ["modern kitchen", "open floor plan", "natural light", "hardwood floors"],
  ["fenced backyard", "quiet street", "near parks", "family friendly"],
  ["home office", "fiber internet", "updated HVAC", "two-car garage"],
  ["walkable neighborhood", "coffee shops nearby", "bike friendly", "pet friendly"],
  ["pool", "covered patio", "mountain views", "smart home"],
  ["top-rated schools", "cul-de-sac", "large yard", "storage shed"],
  ["water view", "balcony", "concierge", "gym access"],
  ["solar panels", "drought tolerant landscaping", "desert modern", "guest casita"],
  ["craftsman details", "fireplace", "garden beds", "ADU potential"],
  ["renovated baths", "quartz counters", "primary suite", "walk-in closet"],
];

const DESCRIPTIONS = [
  "Sun-filled home with an inviting layout perfect for entertaining and everyday comfort.",
  "Move-in ready property on a peaceful block with mature trees and room to grow.",
  "Thoughtfully updated residence blending character charm with modern finishes.",
  "Spacious floor plan with flexible living areas and excellent natural light throughout.",
  "Ideal for remote work with a dedicated office nook and strong neighborhood amenities.",
  "Family-oriented home close to trails, playgrounds, and highly rated schools.",
  "Stylish urban retreat with premium finishes and low-maintenance living.",
  "Resort-style outdoor living with space to relax, dine, and host friends.",
  "Energy-efficient upgrades and smart storage make daily life effortless.",
  "Charming curb appeal and a functional layout in a desirable location.",
];

function generateProperties(cities: CitySeed[]): PropertySeed[] {
  const properties: PropertySeed[] = [];

  cities.forEach((city, cityIndex) => {
    for (let i = 0; i < 10; i++) {
      const beds = 2 + (i % 4);
      const baths = beds === 2 ? 2 : beds === 3 ? 2.5 : beds === 4 ? 3 : 3.5;
      const sqft = 1100 + beds * 450 + i * 80;
      const basePrice =
        city.state === "CA"
          ? 850_000
          : city.state === "WA"
            ? 725_000
            : city.state === "FL"
              ? 620_000
              : 480_000;
      const price = basePrice + i * 35_000 + cityIndex * 12_000;
      const street = STREETS[i];
      const number = 1200 + cityIndex * 100 + i * 17;

      properties.push({
        citySlug: city.slug,
        address: `${number} ${street}, ${city.name}, ${city.state}`,
        price,
        beds,
        baths,
        sqft,
        description: `${DESCRIPTIONS[i]} Located in ${city.name}, this ${beds}-bedroom home offers ${FEATURE_SETS[i].slice(0, 2).join(" and ")}.`,
        features: FEATURE_SETS[i],
        image_url: `https://images.unsplash.com/photo-${1564013799919 + i}-ab600027ffc6?w=800&h=600&fit=crop&sig=${cityIndex}-${i}`,
      });
    }
  });

  return properties;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!url || !serviceKey || !openaiKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or OPENAI_API_KEY");
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const openai = new OpenAI({ apiKey: openaiKey });

  console.log("Upserting organizations...");
  const organizations = [
    { slug: "nestify", name: "Nestify" },
    { slug: "compass-demo", name: "Compass Demo" },
    { slug: "nj-realty-group", name: "NJ Realty Group" },
  ];
  const { data: organizationRows, error: organizationError } = await supabase
    .from("organizations")
    .upsert(organizations, { onConflict: "slug" })
    .select("id, slug, name");

  if (organizationError) throw organizationError;

  const nestifyOrg = organizationRows?.find((org) => org.slug === "nestify");
  if (!nestifyOrg) {
    throw new Error("Nestify organization was not created.");
  }

  const citiesPath = join(process.cwd(), "supabase/seed/cities.json");
  const cities: CitySeed[] = JSON.parse(readFileSync(citiesPath, "utf-8"));

  const propertiesPath = join(process.cwd(), "supabase/seed/properties.json");
  const properties: PropertySeed[] = existsSync(propertiesPath)
    ? JSON.parse(readFileSync(propertiesPath, "utf-8"))
    : generateProperties(cities);

  if (!existsSync(propertiesPath)) {
    writeFileSync(propertiesPath, JSON.stringify(properties, null, 2));
  }

  console.log("Upserting cities...");
  const { data: cityRows, error: cityError } = await supabase
    .from("cities")
    .upsert(
      cities.map((city) => ({ ...city, organization_id: nestifyOrg.id })),
      { onConflict: "slug" }
    )
    .select("id, slug, name, state");

  if (cityError) throw cityError;

  const cityMap = new Map(cityRows!.map((city) => [city.slug, city]));

  console.log("Clearing existing properties...");
  await supabase.from("properties").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  console.log("Embedding and inserting properties...");
  const batchSize = 20;
  for (let i = 0; i < properties.length; i += batchSize) {
    const batch = properties.slice(i, i + batchSize);
    const texts = batch.map((property) => {
      const city = cityMap.get(property.citySlug)!;
      return buildEmbeddingText({
        description: property.description,
        features: property.features,
        address: property.address,
        price: property.price,
        beds: property.beds,
        baths: property.baths,
        cityName: city.name,
        state: city.state,
      });
    });

    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: texts,
    });

    const rows = batch.map((property, index) => {
      const city = cityMap.get(property.citySlug)!;
      return {
        city_id: city.id,
        organization_id: nestifyOrg.id,
        address: property.address,
        price: property.price,
        beds: property.beds,
        baths: property.baths,
        sqft: property.sqft,
        description: property.description,
        features: property.features,
        image_url: property.image_url,
        embedding: embeddingResponse.data[index].embedding,
        status: "active",
      };
    });

    const { error } = await supabase.from("properties").insert(rows);
    if (error) throw error;
    console.log(`Inserted ${Math.min(i + batchSize, properties.length)} / ${properties.length}`);
  }

  console.log("Upserting demo agents...");
  const agentRows = [
    {
      organization_id: nestifyOrg.id,
      name: "Jordan Ellis",
      email: "jordan@aihomesearch.demo",
      phone: "512-555-0101",
      territories: ["austin-tx", "nashville-tn"],
      is_active: true,
    },
    {
      organization_id: nestifyOrg.id,
      name: "Morgan Lee",
      email: "morgan@aihomesearch.demo",
      phone: "303-555-0102",
      territories: ["denver-co", "phoenix-az"],
      is_active: true,
    },
    {
      organization_id: nestifyOrg.id,
      name: "Casey Rivera",
      email: "casey@aihomesearch.demo",
      phone: "206-555-0103",
      territories: ["seattle-wa", "portland-or"],
      is_active: true,
    },
    {
      organization_id: nestifyOrg.id,
      name: "Taylor Brooks",
      email: "taylor@aihomesearch.demo",
      phone: "305-555-0104",
      territories: ["miami-fl", "raleigh-nc"],
      is_active: true,
    },
  ];

  const { error: agentError } = await supabase
    .from("agents")
    .upsert(agentRows, { onConflict: "email" });
  if (agentError) throw agentError;

  console.log("Linking demo admin membership if user exists...");
  const { data: adminUsers, error: adminUserError } = await supabase.auth.admin.listUsers();
  if (adminUserError) throw adminUserError;

  const adminUser = adminUsers.users.find((user) => user.email === "hadiabdul8128@gmail.com");
  if (adminUser) {
    const { error: memberError } = await supabase.from("organization_members").upsert(
      {
        organization_id: nestifyOrg.id,
        user_id: adminUser.id,
        role: "admin",
      },
      { onConflict: "organization_id,user_id" }
    );
    if (memberError) throw memberError;
  }

  console.log("Seed complete.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
