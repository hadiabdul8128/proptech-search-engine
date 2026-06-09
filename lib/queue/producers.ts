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

export async function enqueueEmbedProperty(input: {
  organizationId: string;
  propertyId: string;
  requestedBy?: string;
}) {
  const queue = getPropertyEmbedQueue();
  const job = await queue.add(JOBS.EMBED_ONE, {
    organizationId: input.organizationId,
    jobType: JOBS.EMBED_ONE,
    resourceId: input.propertyId,
    requestedBy: input.requestedBy,
    propertyId: input.propertyId,
  } satisfies EmbedOneJobData, {
    jobId: `org:${input.organizationId}:embed-one:${input.propertyId}`,
  });
  return job.id;
}

export async function enqueueReindexAll(input: {
  organizationId: string;
  propertyId?: string;
  requestedBy?: string;
}) {
  const queue = getPropertyEmbedQueue();
  const job = await queue.add(
    JOBS.REINDEX_ALL,
    {
      organizationId: input.organizationId,
      jobType: JOBS.REINDEX_ALL,
      resourceId: input.propertyId,
      requestedBy: input.requestedBy,
      propertyId: input.propertyId,
    } satisfies ReindexAllJobData,
    {
      jobId: input.propertyId
        ? `org:${input.organizationId}:reindex-all:${input.propertyId}`
        : `org:${input.organizationId}:reindex-all:${Date.now()}`,
    }
  );
  return job.id;
}

export async function enqueueLeadPostCreate(input: {
  organizationId: string;
  leadId: string;
  requestedBy?: string;
}) {
  const queue = getLeadProcessQueue();
  const job = await queue.add(
    JOBS.LEAD_POST_CREATE,
    {
      organizationId: input.organizationId,
      jobType: JOBS.LEAD_POST_CREATE,
      resourceId: input.leadId,
      requestedBy: input.requestedBy,
      leadId: input.leadId,
    } satisfies LeadPostCreateJobData,
    { jobId: `org:${input.organizationId}:lead-post-create:${input.leadId}` }
  );
  return job.id;
}

export async function enqueueInvalidateSearchCache(input: {
  organizationId: string;
  reason?: string;
  requestedBy?: string;
}) {
  const queue = getMaintenanceQueue();
  const job = await queue.add(
    JOBS.INVALIDATE_SEARCH_CACHE,
    {
      organizationId: input.organizationId,
      jobType: JOBS.INVALIDATE_SEARCH_CACHE,
      requestedBy: input.requestedBy,
      reason: input.reason,
    } satisfies InvalidateSearchCacheJobData,
    { jobId: `org:${input.organizationId}:invalidate-search-cache:${Date.now()}` }
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
