import { NextResponse } from "next/server";
import { listPropertyIds } from "@/lib/jobs/embed-property";
import { enqueueEmbedProperty, enqueueReindexAll } from "@/lib/queue/producers";
import { getDefaultOrganization } from "@/lib/tenant/context";

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const adminToken = process.env.ADMIN_EMBED_TOKEN;

    if (!adminToken || authHeader !== `Bearer ${adminToken}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.REDIS_URL) {
      return NextResponse.json(
        { error: "REDIS_URL is not configured. Start Redis and the worker service." },
        { status: 503 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const propertyId = body.propertyId as string | undefined;
    const { organizationId } = await getDefaultOrganization();

    if (propertyId) {
      const jobId = await enqueueEmbedProperty({ organizationId, propertyId });
      return NextResponse.json({ ok: true, enqueued: 1, jobIds: [jobId] });
    }

    const propertyIds = await listPropertyIds(organizationId);
    const jobId = await enqueueReindexAll({ organizationId });
    return NextResponse.json({
      ok: true,
      enqueued: propertyIds.length,
      jobIds: [jobId],
      mode: "reindex-all",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Embed enqueue failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
