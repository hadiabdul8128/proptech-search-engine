import Redis from "ioredis";

let redis: Redis | null = null;

export function getRedisUrl(): string | undefined {
  return process.env.REDIS_URL;
}

export function getRedis(): Redis | null {
  const url = getRedisUrl();
  if (!url) return null;

  if (!redis) {
    redis = new Redis(url, {
      maxRetriesPerRequest: null,
    });
  }

  return redis;
}

export async function pingRedis(): Promise<boolean> {
  const client = getRedis();
  if (!client) return false;

  try {
    const result = await client.ping();
    return result === "PONG";
  } catch {
    return false;
  }
}

export async function disconnectRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}
