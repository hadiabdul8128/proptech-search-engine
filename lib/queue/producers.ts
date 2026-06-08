import { Queue } from "bullmq";
import { defaultJobOptions, getQueueConnection } from "@/lib/queue/connection";
import {
  JOBS,
  QUEUES,
  type EmbedOneJobData,
  type InvalidateSearchCacheJobData,
  type LeadPostCreateJobData,
  type ReindexAllJobData,
} from "@/lib/queue/names";

let propertyEmbedQueue: Queue | null = null;
let leadProcessQueue: Queue | null = null;
let maintenanceQueue: Queue | null = null;

function getPropertyEmbedQueue() {
  if (!propertyEmbedQueue) {
    propertyEmbedQueue = new Queue(QUEUES.PROPERTY_EMBED, {
      connection: getQueueConnection(),
      defaultJobOptions,
    });
  }
  return propertyEmbedQueue;
}

function getLeadProcessQueue() {
  if (!leadProcessQueue) {
    leadProcessQueue = new Queue(QUEUES.LEAD_PROCESS, {
      connection: getQueueConnection(),
      defaultJobOptions,
    });
  }
  return leadProcessQueue;
}

function getMaintenanceQueue() {
  if (!maintenanceQueue) {
    maintenanceQueue = new Queue(QUEUES.MAINTENANCE, {
      connection: getQueueConnection(),
      defaultJobOptions,
    });
  }
  return maintenanceQueue;
}

export async function enqueueEmbedProperty(propertyId: string) {
  const queue = getPropertyEmbedQueue();
  const job = await queue.add(JOBS.EMBED_ONE, { propertyId } satisfies EmbedOneJobData, {
    jobId: `embed-one:${propertyId}`,
  });
  return job.id;
}

export async function enqueueReindexAll(propertyId?: string) {
  const queue = getPropertyEmbedQueue();
  const job = await queue.add(
    JOBS.REINDEX_ALL,
    { propertyId } satisfies ReindexAllJobData,
    { jobId: propertyId ? `reindex-all:${propertyId}` : `reindex-all:${Date.now()}` }
  );
  return job.id;
}

export async function enqueueLeadPostCreate(leadId: string) {
  const queue = getLeadProcessQueue();
  const job = await queue.add(
    JOBS.LEAD_POST_CREATE,
    { leadId } satisfies LeadPostCreateJobData,
    { jobId: `lead-post-create:${leadId}` }
  );
  return job.id;
}

export async function enqueueInvalidateSearchCache(reason?: string) {
  const queue = getMaintenanceQueue();
  const job = await queue.add(
    JOBS.INVALIDATE_SEARCH_CACHE,
    { reason } satisfies InvalidateSearchCacheJobData,
    { jobId: `invalidate-search-cache:${Date.now()}` }
  );
  return job.id;
}

export async function closeQueues(): Promise<void> {
  await Promise.all([
    propertyEmbedQueue?.close(),
    leadProcessQueue?.close(),
    maintenanceQueue?.close(),
  ]);
  propertyEmbedQueue = null;
  leadProcessQueue = null;
  maintenanceQueue = null;
}
