import { redis } from "../../lib/redis.js";
import { checkAdmin } from "../../lib/auth.js";

const KEY = "chat:messages";
const TTL_SEC = 60 * 60 * 24 * 3;

export default async function handler(req, res) {
  if (!checkAdmin(req)) return res.status(404).json({ error: "not found" });
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "GET") {
    const cutoff = Date.now() - TTL_SEC * 1000;
    const all = (await redis.lrange(KEY, 0, -1)) ?? [];
    return res.json(all.filter((m) => m.ts > cutoff));
  }

  if (req.method === "POST") {
    const body = String(req.body?.body ?? "").trim().slice(0, 500);
    if (!body) return res.status(400).json({ error: "kosong" });
    const id = await redis.incr("chat:seq");
    await redis.rpush(KEY, { id, sender: "me", body, ts: Date.now() });
    await redis.ltrim(KEY, -200, -1);
    await redis.expire(KEY, TTL_SEC);
    return res.status(201).json({ ok: true });
  }

  if (req.method === "DELETE") {
    await redis.del(KEY);
    return res.json({ ok: true });
  }

  res.status(405).end();
}
