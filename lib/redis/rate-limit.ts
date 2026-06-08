import { getRedis } from "@/lib/redis/client";

const LEAD_RATE_LIMIT = 10;
const LEAD_RATE_WINDOW_SECONDS = 60;

export async function isLeadRateLimited(ip: string): Promise<boolean> {
  const client = getRedis();
  if (!client) return false;

  const key = `ratelimit:lead:${ip}`;

  try {
    const count = await client.incr(key);
    if (count === 1) {
      await client.expire(key, LEAD_RATE_WINDOW_SECONDS);
    }
    return count > LEAD_RATE_LIMIT;
  } catch {
    return false;
  }
}
