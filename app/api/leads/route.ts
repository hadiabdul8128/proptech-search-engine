import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { enqueueLeadPostCreate } from "@/lib/queue/producers";
import { isLeadRateLimited } from "@/lib/redis/rate-limit";
import { assignLeadAgent } from "@/lib/routing/assign-lead";

const leadSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  message: z.string().min(4),
  propertyId: z.string().uuid().optional(),
  citySlug: z.string().optional(),
  source: z.string().default("website"),
});

const fallbackRateLimit = new Map<string, { count: number; resetAt: number }>();

function isFallbackRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = fallbackRateLimit.get(ip);

  if (!entry || entry.resetAt < now) {
    fallbackRateLimit.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }

  entry.count += 1;
  return entry.count > 10;
}

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
    const limited = process.env.REDIS_URL
      ? await isLeadRateLimited(ip)
      : isFallbackRateLimited(ip);

    if (limited) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }

    const body = await request.json();
    const data = leadSchema.parse(body);
    const assignedAgentId = await assignLeadAgent({
      propertyId: data.propertyId,
      citySlug: data.citySlug,
    });

    const supabase = createAdminClient();
    const { data: lead, error } = await supabase
      .from("leads")
      .insert({
        name: data.name,
        email: data.email,
        phone: data.phone ?? null,
        message: data.message,
        property_id: data.propertyId ?? null,
        city_slug: data.citySlug ?? null,
        assigned_agent_id: assignedAgentId,
        source: data.source,
        status: "new",
      })
      .select("id, assigned_agent_id")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    let queuedJobId: string | undefined;
    if (process.env.REDIS_URL) {
      queuedJobId = await enqueueLeadPostCreate(lead.id);
    }

    return NextResponse.json({ ok: true, lead, queuedJobId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create lead";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
