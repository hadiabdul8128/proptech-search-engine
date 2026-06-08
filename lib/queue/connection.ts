import type { ConnectionOptions } from "bullmq";
import { getRedisUrl } from "@/lib/redis/client";

export function getQueueConnection(): ConnectionOptions {
  const url = getRedisUrl();
  if (!url) {
    throw new Error("REDIS_URL is not configured");
  }

  return { url };
}

export const defaultJobOptions = {
  attempts: 5,
  backoff: {
    type: "exponential" as const,
    delay: 2000,
  },
  removeOnComplete: 1000,
  removeOnFail: 5000,
};
