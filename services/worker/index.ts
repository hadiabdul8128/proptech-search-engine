import { Worker } from "bullmq";
import { config } from "dotenv";
import { join } from "path";
import { logAuditEvent } from "@/lib/audit/log";
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

function requireOrganizationId(data: { organizationId?: string }) {
  if (!data.organizationId) {
    throw new Error("Job is missing organizationId");
  }
  return data.organizationId;
}

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
          const organizationId = requireOrganizationId(data);
          await embedPropertyById(organizationId, data.propertyId);
          await invalidateSearchCache(organizationId);
          await logAuditEvent({
            organizationId,
            actorUserId: data.requestedBy ?? null,
            action: "worker.embedding_generated",
            objectType: "property",
            objectId: data.propertyId,
            metadata: { jobId: job.id },
          });
          console.info("[worker] embed-one completed", {
            organizationId,
            propertyId: data.propertyId,
            durationMs: Date.now() - startedAt,
          });
          return;
        }

        if (job.name === JOBS.REINDEX_ALL) {
          const data = job.data as ReindexAllJobData;
          const organizationId = requireOrganizationId(data);
          const propertyIds = await listPropertyIds(organizationId, data.propertyId);
          const jobIds = await Promise.all(
            propertyIds.map((id) =>
              enqueueEmbedProperty({
                organizationId,
                propertyId: id,
                requestedBy: data.requestedBy,
              })
            )
          );
          console.info("[worker] reindex-all enqueued", {
            organizationId,
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
          const organizationId = requireOrganizationId(data);
          await processLeadPostCreate(organizationId, data.leadId);
          await logAuditEvent({
            organizationId,
            actorUserId: data.requestedBy ?? null,
            action: "worker.lead_processed",
            objectType: "lead",
            objectId: data.leadId,
            metadata: { jobId: job.id },
          });
          console.info("[worker] lead post-create completed", {
            organizationId,
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
          const organizationId = requireOrganizationId(data);
          const deleted = await invalidateSearchCache(organizationId);
          await logAuditEvent({
            organizationId,
            actorUserId: data.requestedBy ?? null,
            action: "worker.cache_invalidated",
            objectType: "cache",
            metadata: { jobId: job.id, reason: data.reason ?? "unspecified", deleted },
          });
          console.info("[worker] invalidate-search-cache completed", {
            organizationId,
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
