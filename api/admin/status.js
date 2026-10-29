import { redis } from "../../lib/redis.js";
import { checkAdmin } from "../../lib/auth.js";

export default async function handler(req, res) {
  if (!checkAdmin(req)) return res.status(404).json({ error: "not found" });
  res.setHeader("Cache-Control", "no-store");
  res.json({ lastOpened: await redis.get("meta:last_opened") });
}
