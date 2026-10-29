import { rateLimit } from "../lib/redis.js";
import { checkToken } from "../lib/auth.js";
import { RESI, STEPS } from "../lib/content.js";

const norm = (s) => String(s ?? "").trim().toLowerCase().replace(/\s+/g, " ");

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  if (!checkToken(req)) return res.status(404).json({ error: "not found" });

  try {
    if (!(await rateLimit(req, "track", 20, 60))) {
      return res.status(429).json({ error: "Terlalu banyak percobaan, coba lagi sebentar." });
    }
  } catch {
    // Fallback jika Redis belum aktif saat pengujian lokal
  }

  const code = String(req.body?.code ?? "").trim().toUpperCase();
  const answers = req.body?.answers ?? {};
  if (code !== RESI.toUpperCase()) {
    return res.status(404).json({ error: "Resi tidak ditemukan. Pastikan nomor resi sudah benar." });
  }

  const out = [];
  for (let i = 0; i < STEPS.length; i++) {
    const s = STEPS[i];
    if (s.answer && norm(answers[i]) !== norm(s.answer)) {
      const attempted = answers[i] !== undefined && String(answers[i]).trim() !== "";
      out.push({
        i,
        status: s.status,
        time: s.time,
        locked: true,
        question: s.question,
        wrongAttempt: attempted,
      });
      return res.json({ steps: out });
    }
    out.push({ i, status: s.status, note: s.note, time: s.time, final: !!s.final });
  }
  res.json({ steps: out });
}
