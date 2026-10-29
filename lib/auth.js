import { timingSafeEqual } from "node:crypto";

function safeEqual(a, b) {
  const A = Buffer.from(String(a ?? ""));
  const B = Buffer.from(String(b ?? ""));
  return A.length === B.length && A.length > 0 && timingSafeEqual(A, B);
}

export function checkToken(req) {
  if (!safeEqual(req.headers["x-gift-token"], process.env.GIFT_TOKEN)) return false;
  const exp = process.env.GIFT_EXPIRES_AT;
  if (exp && Date.now() > new Date(exp).getTime()) return false;
  return true;
}

export function checkAdmin(req) {
  return safeEqual(req.headers["x-admin-key"], process.env.ADMIN_KEY);
}
