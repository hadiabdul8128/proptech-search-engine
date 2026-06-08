export const QUEUES = {
  PROPERTY_EMBED: "property-embed",
  LEAD_PROCESS: "lead-process",
  MAINTENANCE: "maintenance",
} as const;

export const JOBS = {
  EMBED_ONE: "embed-one",
  REINDEX_ALL: "reindex-all",
  LEAD_POST_CREATE: "post-create",
  INVALIDATE_SEARCH_CACHE: "invalidate-search-cache",
} as const;

export type EmbedOneJobData = {
  propertyId: string;
};

export type ReindexAllJobData = {
  propertyId?: string;
};

export type LeadPostCreateJobData = {
  leadId: string;
};

export type InvalidateSearchCacheJobData = {
  reason?: string;
};
