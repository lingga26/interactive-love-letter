import { redis } from "../lib/redis.js";
import { checkToken } from "../lib/auth.js";
import { CONTENT, RESI } from "../lib/content.js";

export default async function handler(req, res) {
  if (!checkToken(req)) return res.status(404).json({ error: "not found" });
  try {
    await redis.set("meta:last_opened", Date.now());
  } catch {
    // Tetap jalan walau Redis belum terhubung saat tes awal
  }

  const { showResi, ...rest } = CONTENT;
  res.setHeader("Cache-Control", "no-store");
  res.json({ ...rest, showResi, resi: showResi ? RESI : null });
}
