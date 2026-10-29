import { Redis } from "@upstash/redis";

// Membaca env otomatis dari integrasi Upstash di Vercel (UPSTASH_REDIS_REST_URL & UPSTASH_REDIS_REST_TOKEN)
export const redis = Redis.fromEnv();

export async function rateLimit(req, name, max, windowSec) {
  const ip = (req.headers["x-forwarded-for"] || "x").split(",")[0].trim();
  const key = `rl:${name}:${ip}`;
  const n = await redis.incr(key);
  if (n === 1) await redis.expire(key, windowSec);
  return n <= max;
}
