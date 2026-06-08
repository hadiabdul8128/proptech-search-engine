import { Worker } from "bullmq";
import { config } from "dotenv";
import { join } from "path";
import { embedPropertyById, listPropertyIds } from "@/lib/jobs/embed-property";
import { processLeadPostCreate } from "@/lib/jobs/process-lead";
import { invalidateSearchCache } from "@/lib/redis/cache";
import { pingRedis, disconnectRedis } from "@/lib/redis/client";
import { getQueueConnection } from "@/lib/queue/connection";
import {
  JOBS,
  QUEUES,
  type EmbedOneJobData,
  type InvalidateSearchCacheJobData,
  type LeadPostCreateJobData,
  type ReindexAllJobData,
} from "@/lib/queue/names";
import { enqueueEmbedProperty } from "@/lib/queue/producers";
import { startHealthServer, stopHealthServer } from "@/services/worker/health";

config({ path: join(process.cwd(), ".env.local") });
config({ path: join(process.cwd(), ".env") });

const workers: Worker[] = [];

async function startWorkers() {
  const connected = await pingRedis();
  if (!connected) {
    throw new Error("Unable to connect to Redis. Set REDIS_URL and ensure Redis is running.");
  }

  const connection = getQueueConnection();

  workers.push(
    new Worker(
      QUEUES.PROPERTY_EMBED,
      async (job) => {
        const startedAt = Date.now();

        if (job.name === JOBS.EMBED_ONE) {
          const data = job.data as EmbedOneJobData;
          await embedPropertyById(data.propertyId);
          await invalidateSearchCache();
          console.info("[worker] embed-one completed", {
            propertyId: data.propertyId,
            durationMs: Date.now() - startedAt,
          });
          return;
        }

        if (job.name === JOBS.REINDEX_ALL) {
          const data = job.data as ReindexAllJobData;
          const propertyIds = await listPropertyIds(data.propertyId);
          const jobIds = await Promise.all(propertyIds.map((id) => enqueueEmbedProperty(id)));
          console.info("[worker] reindex-all enqueued", {
            count: jobIds.length,
            durationMs: Date.now() - startedAt,
          });
          return { enqueued: jobIds.length, jobIds };
        }

        throw new Error(`Unknown job name: ${job.name}`);
      },
      { connection }
    )
  );

  workers.push(
    new Worker(
      QUEUES.LEAD_PROCESS,
      async (job) => {
        const startedAt = Date.now();

        if (job.name === JOBS.LEAD_POST_CREATE) {
          const data = job.data as LeadPostCreateJobData;
          await processLeadPostCreate(data.leadId);
          console.info("[worker] lead post-create completed", {
            leadId: data.leadId,
            durationMs: Date.now() - startedAt,
          });
          return;
        }

        throw new Error(`Unknown job name: ${job.name}`);
      },
      { connection }
    )
  );

  workers.push(
    new Worker(
      QUEUES.MAINTENANCE,
      async (job) => {
        const startedAt = Date.now();

        if (job.name === JOBS.INVALIDATE_SEARCH_CACHE) {
          const data = job.data as InvalidateSearchCacheJobData;
          const deleted = await invalidateSearchCache();
          console.info("[worker] invalidate-search-cache completed", {
            reason: data.reason ?? "unspecified",
            deleted,
            durationMs: Date.now() - startedAt,
          });
          return { deleted };
        }

        throw new Error(`Unknown job name: ${job.name}`);
      },
      { connection }
    )
  );

  for (const worker of workers) {
    worker.on("failed", (job, error) => {
      console.error("[worker] job failed", {
        queue: job?.queueName,
        name: job?.name,
        id: job?.id,
        error: error.message,
      });
    });
  }

  startHealthServer();
  console.info("[worker] BullMQ workers started", {
    queues: [QUEUES.PROPERTY_EMBED, QUEUES.LEAD_PROCESS, QUEUES.MAINTENANCE],
  });
}

async function shutdown(signal: string) {
  console.info(`[worker] shutting down (${signal})`);
  await stopHealthServer();
  await Promise.all(workers.map((worker) => worker.close()));
  await disconnectRedis();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

startWorkers().catch((error) => {
  console.error("[worker] failed to start", error);
  process.exit(1);
});
