import { redis, rateLimit } from "../lib/redis.js";
import { checkToken } from "../lib/auth.js";

const KEY = "chat:messages";
const TTL_SEC = 60 * 60 * 24 * 3; // 3 hari

export default async function handler(req, res) {
  if (!checkToken(req)) return res.status(404).json({ error: "not found" });
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "GET") {
    const cutoff = Date.now() - TTL_SEC * 1000;
    const all = (await redis.lrange(KEY, 0, -1)) ?? [];
    return res.json(all.filter((m) => m.ts > cutoff));
  }

  if (req.method === "POST") {
    if (!(await rateLimit(req, "msg", 20, 60))) {
      return res.status(429).json({ error: "Pelan-pelan ya kirim pesannya." });
    }
    const body = String(req.body?.body ?? "").trim().slice(0, 500);
    if (!body) return res.status(400).json({ error: "Pesan tidak boleh kosong." });

    const id = await redis.incr("chat:seq");
    await redis.rpush(KEY, { id, sender: "her", body, ts: Date.now() });
    await redis.ltrim(KEY, -200, -1);
    await redis.expire(KEY, TTL_SEC);
    return res.status(201).json({ ok: true });
  }

  res.status(405).end();
}
