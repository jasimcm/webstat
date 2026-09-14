import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Optional per-IP rate limit for the ingestion endpoint. Upstash env vars are optional —
 * without them this is a no-op so the tracker works out of the box on a fresh deploy.
 */
let ratelimit: Ratelimit | null = null;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  ratelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(60, "1 m"),
    prefix: "webstat:track",
  });
}

/** Returns true if the request should be allowed through. */
export async function checkRateLimit(ip: string): Promise<boolean> {
  if (!ratelimit) return true;
  const { success } = await ratelimit.limit(ip);
  return success;
}
