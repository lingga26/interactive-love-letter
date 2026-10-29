# BUILD GUIDE — Website Maaf & Kado Ulang Tahun (Vercel)

Panduan teknis untuk [PRD.md](./PRD.md). Bisa dibaca manual atau diberikan ke AI coding agent (Claude Code, dll.).

**Stack:** HTML/CSS/JS statis + Vercel Functions (Node.js) + Upstash Redis. Semua di Vercel, tanpa server lain.

---

## 1. Struktur Proyek

```
for-you/
├── app.html                 # halaman pacar (diakses lewat /g/{token})
├── admin.html               # halaman admin (diakses lewat /admin/{key})
├── vercel.json
├── package.json
├── css/style.css
├── js/
│   ├── gift.js              # alur, animasi kado, musik, surat, galeri
│   ├── tracking.js          # kartu resi + timeline
│   ├── chat.js              # chat sisi pacar
│   └── admin.js             # chat sisi admin
├── img/                     # foto (nama file diacak, mis. a8f3k2.jpg)
├── audio/                   # lagu.mp3
├── lib/
│   ├── redis.js             # koneksi + rate limit
│   ├── auth.js              # cek token & admin key
│   └── content.js           # surat, foto, lagu, resi, timeline (SERVER ONLY)
└── api/
    ├── content.js           # GET  konten non-rahasia (butuh token)
    ├── track.js             # POST cek resi & kembalikan timeline
    ├── messages.js          # GET/POST chat sisi pacar
    └── admin/
        ├── messages.js      # GET/POST/DELETE chat sisi admin
        └── status.js        # GET waktu terakhir dibuka
```

> Folder `lib/` sengaja di luar `api/` supaya tidak menjadi endpoint publik.

## 2. Setup

```bash
mkdir for-you && cd for-you
npm init -y
npm i @upstash/redis
```

`package.json` tambahkan:
```json
{ "type": "module" }
```

Buat token acak (jalankan dua kali: satu untuk `GIFT_TOKEN`, satu untuk `ADMIN_KEY`):
```bash
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
```

## 3. `vercel.json`

```json
{
  "rewrites": [
    { "source": "/g/:token", "destination": "/app.html" },
    { "source": "/admin/:key", "destination": "/admin.html" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Robots-Tag", "value": "noindex, nofollow" },
        { "key": "Referrer-Policy", "value": "no-referrer" }
      ]
    }
  ]
}
```

Karena token ada di path (`/g/abc123`), **semua aset memakai path absolut**: `/css/style.css`, `/js/gift.js`, `/img/...`. Jangan pakai path relatif.

## 4. Library Server

### `lib/redis.js`
```js
import { Redis } from "@upstash/redis";

// Membaca env otomatis dari integrasi Upstash di Vercel
export const redis = Redis.fromEnv();

export async function rateLimit(req, name, max, windowSec) {
  const ip = (req.headers["x-forwarded-for"] || "x").split(",")[0].trim();
  const key = `rl:${name}:${ip}`;
  const n = await redis.incr(key);
  if (n === 1) await redis.expire(key, windowSec);
  return n <= max;
}
```

### `lib/auth.js`
```js
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
```

### `lib/content.js` (semua isi pribadi ada di sini)
```js
export const CONTENT = {
  herName: "Nama Dia",
  fromName: "Lingga",
  song: { title: "Judul Lagu", artist: "Artis", file: "/audio/lagu.mp3" },
  letter: [
    "Paragraf 1 ...",
    "Paragraf 2 ...",
    "Paragraf 3 ...",
  ],
  photos: [
    { src: "/img/a8f3k2.jpg", caption: "Hari itu ..." },
    { src: "/img/q7m1zd.jpg", caption: "Aku suka ini ..." },
  ],
  closing: "Selamat ulang tahun. Aku sayang kamu.",
  // true = nomor resi tampil di kartu. false = dia harus mengetik sendiri nomor yang kamu beri.
  showResi: true,
};

// ===== TEKA-TEKI RESI (tidak pernah dikirim utuh ke browser) =====
export const RESI = "KADO-1029-LNGA";   // ganti sesuai keinginanmu

export const STEPS = [
  { status: "Paket diterima dari pengirim", note: "Dikemas dengan sayang.", time: "Hari ini, 08:00" },
  { status: "Dalam perjalanan ke kota tujuan", note: "Petunjuk 1: ...", time: "Hari ini, 10:30" },
  {
    status: "Tertahan di pusat sortir",
    question: "Pertanyaan teka-teki: ...?",   // tahap bergembok (opsional)
    answer: "jawaban",
    note: "Petunjuk 2: ...",
    time: "Hari ini, 13:15",
  },
  { status: "Paket tiba!", note: "Hadiahmu: ...", time: "Hari ini, 15:00", final: true },
];
```

## 5. API Functions

### `api/content.js`
```js
import { redis } from "../lib/redis.js";
import { checkToken } from "../lib/auth.js";
import { CONTENT, RESI } from "../lib/content.js";

export default async function handler(req, res) {
  if (!checkToken(req)) return res.status(404).json({ error: "not found" });
  await redis.set("meta:last_opened", Date.now());

  const { showResi, ...rest } = CONTENT;
  res.setHeader("Cache-Control", "no-store");
  res.json({ ...rest, showResi, resi: showResi ? RESI : null });
}
```

### `api/track.js`
```js
import { rateLimit } from "../lib/redis.js";
import { checkToken } from "../lib/auth.js";
import { RESI, STEPS } from "../lib/content.js";

const norm = (s) => String(s ?? "").trim().toLowerCase().replace(/\s+/g, " ");

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  if (!checkToken(req)) return res.status(404).json({ error: "not found" });
  if (!(await rateLimit(req, "track", 20, 60)))
    return res.status(429).json({ error: "Terlalu banyak percobaan, coba lagi sebentar." });

  const code = String(req.body?.code ?? "").trim().toUpperCase();
  const answers = req.body?.answers ?? {};
  if (code !== RESI.toUpperCase())
    return res.status(404).json({ error: "Resi tidak ditemukan." });

  const out = [];
  for (let i = 0; i < STEPS.length; i++) {
    const s = STEPS[i];
    if (s.answer && norm(answers[i]) !== norm(s.answer)) {
      // tahap terkunci: tampilkan status + pertanyaan, sembunyikan petunjuk
      out.push({ i, status: s.status, time: s.time, locked: true, question: s.question });
      return res.json({ steps: out });
    }
    out.push({ i, status: s.status, note: s.note, time: s.time, final: !!s.final });
  }
  res.json({ steps: out });
}
```

### `api/messages.js` (chat sisi pacar)
```js
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
    if (!(await rateLimit(req, "msg", 20, 60)))
      return res.status(429).json({ error: "pelan-pelan ya" });
    const body = String(req.body?.body ?? "").trim().slice(0, 500);
    if (!body) return res.status(400).json({ error: "kosong" });

    const id = await redis.incr("chat:seq");
    await redis.rpush(KEY, { id, sender: "her", body, ts: Date.now() });
    await redis.ltrim(KEY, -200, -1);
    await redis.expire(KEY, TTL_SEC);
    return res.status(201).json({ ok: true });
  }

  res.status(405).end();
}
```

### `api/admin/messages.js`
```js
import { redis } from "../../lib/redis.js";
import { checkAdmin } from "../../lib/auth.js";

const KEY = "chat:messages";
const TTL_SEC = 60 * 60 * 24 * 3;

export default async function handler(req, res) {
  if (!checkAdmin(req)) return res.status(404).json({ error: "not found" });
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "GET") return res.json((await redis.lrange(KEY, 0, -1)) ?? []);

  if (req.method === "POST") {
    const body = String(req.body?.body ?? "").trim().slice(0, 500);
    if (!body) return res.status(400).json({ error: "kosong" });
    const id = await redis.incr("chat:seq");
    await redis.rpush(KEY, { id, sender: "me", body, ts: Date.now() });
    await redis.ltrim(KEY, -200, -1);
    await redis.expire(KEY, TTL_SEC);
    return res.status(201).json({ ok: true });
  }

  if (req.method === "DELETE") { await redis.del(KEY); return res.json({ ok: true }); }
  res.status(405).end();
}
```

### `api/admin/status.js`
```js
import { redis } from "../../lib/redis.js";
import { checkAdmin } from "../../lib/auth.js";

export default async function handler(req, res) {
  if (!checkAdmin(req)) return res.status(404).json({ error: "not found" });
  res.json({ lastOpened: await redis.get("meta:last_opened") });
}
```

## 6. Frontend

### 6.1 Alur section (`app.html`)

Satu `<section>` per tahap, hanya satu aktif:

`#gate` → `#opening` → `#resi` → `#tracking` → `#letter` → `#gallery` → `#closing` (+ chat)

```html
<meta name="robots" content="noindex,nofollow">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="/css/style.css">
<audio id="bgm" loop preload="auto"></audio>
<button id="btn-track" hidden>📦 Lacak Paket</button>
<script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js"></script>
<script type="module" src="/js/gift.js"></script>
```

### 6.2 Util bersama + inisialisasi (`js/gift.js`)

```js
export const TOKEN = location.pathname.split("/")[2] || "";
export const api = (path, opts = {}) =>
  fetch(path, { ...opts, headers: { "x-gift-token": TOKEN, "Content-Type": "application/json", ...(opts.headers || {}) } });
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const show = (id) => {
  document.querySelectorAll("main > section").forEach((s) => (s.hidden = s.id !== id));
};

let CONTENT;
async function init() {
  const res = await api("/api/content");
  if (!res.ok) { document.body.innerHTML = "<p class='gone'>Link tidak ditemukan.</p>"; return; }
  CONTENT = await res.json();
  document.getElementById("bgm").src = CONTENT.song.file;
  // isi nama, judul lagu, dll. ke DOM di sini
  show("gate");
}
init();
```

### 6.3 Animasi kado + musik

Musik **harus** dimulai di dalam handler tap.

```js
const box = document.getElementById("giftbox");
box.addEventListener("click", async () => {
  try { await document.getElementById("bgm").play(); } catch {}
  show("opening");
  box.classList.add("shake");
  await sleep(900);  box.classList.add("open");
  await sleep(300);  confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
  await sleep(2000);
  document.getElementById("btn-track").hidden = false;
  showResiCard(CONTENT);   // lihat 6.4
}, { once: true });
```

```css
.shake { animation: shake .8s ease-in-out; }
@keyframes shake {
  0%,100% { transform: rotate(0); } 20% { transform: rotate(-6deg); }
  40% { transform: rotate(6deg); }  60% { transform: rotate(-4deg); } 80% { transform: rotate(4deg); }
}
.lid { transition: transform .9s cubic-bezier(.2,.8,.2,1); transform-origin: left bottom; }
.open .lid { transform: translateY(-60px) rotate(-25deg); opacity: 0; }
@media (prefers-reduced-motion: reduce) { * { animation: none !important; transition-duration: .01s !important; } }
```

### 6.4 Kartu resi + Lacak Paket (`js/tracking.js`)

```js
import { api, sleep, show } from "./gift.js";

const answers = {};          // jawaban teka-teki yang sudah benar { indexTahap: "jawaban" }
let currentCode = "";

export function showResiCard(c) {
  show("resi");
  const input = document.getElementById("resi-input");
  const label = document.getElementById("resi-label");
  if (c.showResi) { label.textContent = c.resi; input.value = c.resi; }   // mode terlihat
  else { label.textContent = "Masukkan nomor resi"; input.value = ""; }   // mode tersembunyi
  document.getElementById("resi-go").onclick = () => track(input.value);
  document.getElementById("resi-skip").onclick = () => show("letter");    // lanjut baca surat
}

async function track(code) {
  currentCode = code.trim();
  const res = await api("/api/track", { method: "POST", body: JSON.stringify({ code: currentCode, answers }) });
  const data = await res.json();
  if (!res.ok) { document.getElementById("resi-error").textContent = data.error; return; }
  show("tracking");
  await renderSteps(data.steps);
}

async function renderSteps(steps) {
  const list = document.getElementById("timeline");
  list.textContent = "";
  for (const s of steps) {
    const li = document.createElement("li");
    const status = document.createElement("strong"); status.textContent = s.status;
    const time = document.createElement("small");    time.textContent = s.time || "";
    li.append(status, time);

    if (s.locked) {
      const q = document.createElement("p");  q.textContent = s.question;
      const inp = document.createElement("input");
      const btn = document.createElement("button"); btn.textContent = "Buka";
      btn.onclick = async () => { answers[s.i] = inp.value; await track(currentCode); };
      li.append(q, inp, btn);
    } else {
      const note = document.createElement("p"); note.textContent = s.note;
      li.append(note);
      if (s.final) li.classList.add("final");
    }
    list.append(li);
    await sleep(1500);   // muncul satu per satu seperti pelacakan sungguhan
  }
  document.getElementById("track-next").hidden = false;   // tombol "Lanjut ke suratku"
}
```

Catatan: jawaban salah pada tahap terkunci cukup membuat tahap itu tetap terkunci (server mengembalikan hasil yang sama); tambahkan pesan "belum tepat, coba lagi" bila jawaban yang dikirim tidak kosong.

`#btn-track` di pojok layar memanggil `show("resi")` agar ia bisa kembali ke teka-teki kapan saja.

### 6.5 Surat (efek mengetik)

```js
async function typeLetter(el, paragraphs, speed = 28) {
  for (const p of paragraphs) {
    const node = document.createElement("p"); el.appendChild(node);
    for (const ch of p) { node.textContent += ch; await sleep(speed); }
    await sleep(500);
  }
}
```
Sediakan tombol **Lewati** yang langsung menampilkan seluruh teks.

### 6.6 Galeri
- `display:flex; overflow-x:auto; scroll-snap-type:x mandatory;` dan `scroll-snap-align:center` pada tiap foto.
- `loading="lazy"`, gaya polaroid (border putih, rotasi kecil), lebar maks 1200px, kualitas 75–80%.

### 6.7 Chat pacar (`js/chat.js`)

```js
import { api } from "./gift.js";
const list = document.getElementById("chat-list");
let lastId = 0, timer;

async function poll() {
  if (document.visibilityState !== "visible") return;
  const res = await api("/api/messages");
  if (!res.ok) return;
  for (const m of (await res.json()).filter((m) => m.id > lastId)) {
    const div = document.createElement("div");
    div.className = "bubble " + (m.sender === "her" ? "mine" : "theirs");
    div.textContent = m.body;                 // aman dari XSS, jangan pakai innerHTML
    list.appendChild(div);
    lastId = m.id;
  }
  list.scrollTop = list.scrollHeight;
}
timer = setInterval(poll, 5000); poll();
document.addEventListener("visibilitychange", poll);

document.getElementById("chat-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = e.target.elements.body;
  if (!input.value.trim()) return;
  await api("/api/messages", { method: "POST", body: JSON.stringify({ body: input.value }) });
  input.value = ""; poll();
});
```

### 6.8 Halaman admin (`admin.html` + `js/admin.js`)
Sama seperti chat, dengan perbedaan:
- `KEY = location.pathname.split("/")[2]`, header `x-admin-key` menggantikan `x-gift-token`.
- Endpoint `/api/admin/messages` (GET/POST/DELETE) dan `/api/admin/status`.
- Sisi bubble dibalik (`me` di kanan), plus tombol **Hapus semua chat** dan teks "Terakhir dibuka: …".
- Simpan URL admin sebagai bookmark di HP, jangan dibagikan.

## 7. Deploy ke Vercel (Gratis)

1. Buat repo GitHub **private**, push seluruh proyek. (Alternatif: `npm i -g vercel` lalu jalankan `vercel` di folder proyek.)
2. Di vercel.com: **Add New → Project → Import** repo tersebut. Framework: *Other*, tanpa build command.
3. Tambahkan Redis: buka tab **Storage / Marketplace** di proyek, pilih **Upstash Redis**, buat database gratis, lalu hubungkan ke proyek. Variabel koneksi terisi otomatis.
4. **Settings → Environment Variables**, tambahkan:
   - `GIFT_TOKEN` = token acak dari langkah setup
   - `ADMIN_KEY` = kunci admin acak
   - `GIFT_EXPIRES_AT` = mis. `2026-11-30`
5. **Redeploy** agar variabel terbaca.
6. Uji di HP: `https://namaproject.vercel.app/g/{GIFT_TOKEN}` dan `https://namaproject.vercel.app/admin/{ADMIN_KEY}`.
7. Pilih nama proyek yang tidak mudah ditebak (mis. `for-you-8f3k`), lalu kirim link hanya lewat chat pribadi.

Untuk mengganti token (misal link sudah bocor): ubah `GIFT_TOKEN` di dashboard, redeploy, lalu kirim link baru.

Uji lokal (opsional): `npm i -g vercel`, `vercel link`, `vercel env pull .env.local`, lalu `vercel dev`.

## 8. Checklist Pengujian

- [ ] Android Chrome: gate → animasi → lagu bunyi → kartu resi tampil
- [ ] iPhone Safari: lagu bunyi setelah tap, layout tidak patah
- [ ] Layar 360px dan layar besar
- [ ] Resi benar membuka timeline satu per satu; resi salah menampilkan pesan gagal
- [ ] Tahap bergembok: jawaban salah tetap terkunci, jawaban benar lanjut
- [ ] Tab Network & *view source* sebelum resi benar: tidak ada petunjuk atau jawaban
- [ ] Mode resi tersembunyi: nomor tidak muncul di kartu
- [ ] Chat dua arah ≤ 5 detik; pesan hilang setelah TTL
- [ ] Input `<script>alert(1)</script>` tampil sebagai teks biasa
- [ ] Token salah atau kedaluwarsa: hanya "Link tidak ditemukan"
- [ ] `prefers-reduced-motion` mematikan animasi berat
- [ ] Cek dashboard Upstash: penggunaan perintah wajar setelah beberapa menit polling

## 9. Prompt Siap Pakai untuk AI Coding Agent

```
Bangun website sesuai PRD.md dan BUILD_GUIDE.md di folder ini.
Stack: HTML/CSS/JS statis + Vercel Functions (Node.js, ESM) + Upstash Redis. Tanpa framework.
Kerjakan bertahap sesuai bagian 1–7 BUILD_GUIDE.md.
Gunakan placeholder di lib/content.js untuk surat, foto, lagu, resi, dan timeline.
Syarat: mobile-first, semua aset path absolut, chat aman XSS (textContent),
petunjuk teka-teki hanya dari API, token & admin key lewat environment variable, noindex.
Setelah tiap tahap, jelaskan cara mengujinya.
```

## 10. Tips Isi Teka-teki & Surat

- Buat 3–5 tahap timeline; tiap petunjuk satu kalimat, dan tahap akhir yang paling hangat.
- Teka-teki terkunci cukup 1–2 saja, dengan jawaban yang hanya kamu berdua tahu (kenangan, tempat, tanggal).
- Siapkan jalur bantuan lewat chat kalau ia buntu.
- Surat: mulai dengan pengakuan jelas tanpa kata "tapi", sebut dampaknya pada perasaannya, beri satu atau dua komitmen konkret, lalu akhiri dengan ucapan ulang tahun dan ajakan bicara langsung.
