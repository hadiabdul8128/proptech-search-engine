import { Queue } from "bullmq";
import { NextResponse } from "next/server";
import { getQueueConnection } from "@/lib/queue/connection";
import { QUEUES } from "@/lib/queue/names";
import { pingRedis } from "@/lib/redis/client";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const adminToken = process.env.ADMIN_EMBED_TOKEN;

  if (!adminToken || authHeader !== `Bearer ${adminToken}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.REDIS_URL) {
    return NextResponse.json({ error: "REDIS_URL is not configured" }, { status: 503 });
  }

  try {
    const connection = getQueueConnection();
    const queueNames = Object.values(QUEUES);
    const stats = await Promise.all(
      queueNames.map(async (name) => {
        const queue = new Queue(name, { connection });
        const counts = await queue.getJobCounts(
          "waiting",
          "active",
          "completed",
          "failed",
          "delayed"
        );
        await queue.close();
        return { name, counts };
      })
    );

    return NextResponse.json({
      redis: await pingRedis(),
      queues: stats,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Queue stats unavailable";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
