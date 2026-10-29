# PRD — Website Maaf & Kado Ulang Tahun (Versi Vercel)

**Nama proyek:** `for-you` (bebas diganti)
**Versi:** 2.0 (menggantikan versi Laravel)
**Pemilik:** Lingga
**Pengguna:** Pacar (penerima tunggal) dan Lingga (admin/pengirim)
**Hosting:** Vercel Hobby (domain gratis `*.vercel.app`), tanpa server lain

---

## 1. Ringkasan

Website satu halaman yang personal. Pacar membuka link rahasia, disambut kado animasi, lalu setelah kado terbuka muncul **kartu resi pengiriman hadiah** sebagai teka-teki. Ia bisa "melacak paket" untuk membuka petunjuk satu per satu, kemudian membaca surat permintaan maaf, melihat galeri foto, mendengarkan lagu kesukaannya, dan mengobrol lewat chat sementara dengan Lingga.

## 2. Tujuan

1. Menyampaikan permintaan maaf yang tulus dengan cara yang berkesan.
2. Menjadi kado ulang tahun yang menyenangkan, bukan tegang, lewat animasi dan teka-teki resi.
3. Memberi jalur komunikasi langsung dan ringan selama website dibuka.
4. Berjalan sepenuhnya di Vercel gratis, tanpa biaya dan tanpa server sendiri.

**Indikator berhasil:** ia membuka sampai akhir, memecahkan teka-teki resi, dan membalas lewat chat.

## 3. Prinsip Desain

- **Emosional, bukan ramai.** Animasi halus dan tidak berlebihan.
- **Mobile-first.** Hampir pasti dibuka lewat HP.
- **Privat.** Link berisi token acak, tidak terindeks Google, dan konten teks tidak ada di HTML statis.
- **Tulus.** Isi surat ditulis sendiri oleh Lingga.

## 4. Alur Pengguna

```
Buka link → Gate ("Ada sesuatu untukmu") → Tap kado
  → Animasi kado terbuka (+ lagu mulai)
  → Kartu RESI muncul
  → [Lacak Paket] → timeline petunjuk (bisa berisi teka-teki)
  → Surat maaf → Galeri foto → Pesan penutup + Chat
```

Tombol "📦 Lacak Paket" tetap tersedia di pojok halaman setelah kado dibuka, jadi ia bisa kembali ke timeline kapan saja.

## 5. Fitur

### F1 — Gate
- Teks sambutan, nama panggilan, dan kado yang bisa di-tap.
- Tap ini **wajib ada** karena browser memblokir lagu otomatis; tap sekaligus memulai musik.
- Bila token salah atau link kedaluwarsa, tampil layar "Link tidak ditemukan" tanpa konten apa pun.

### F2 — Animasi Kado
- Kado bergoyang → pita terlepas → tutup terbuka → konfeti.
- Durasi 3–5 detik, ada tombol Lewati.
- Menghormati `prefers-reduced-motion`.

### F3 — Kartu Resi (teka-teki)
- Setelah kado terbuka, muncul kartu bergaya resi kurir: nomor resi, nama pengirim, nama penerima, status awal "Paket sedang dikirim".
- **Nomor resi** diisi Lingga sendiri (contoh format: `KADO-1029-LNGA`).
- Dua mode, dipilih lewat konfigurasi:
  - **Terlihat:** nomor resi tampil di kartu dan terisi otomatis di kotak lacak.
  - **Tersembunyi:** kartu hanya menulis "Masukkan nomor resi", dan nomornya baru diberikan Lingga nanti (lewat chat atau bersama hadiah fisik).
- Tombol **Lacak Paket** membuka F4.

### F4 — Lacak Paket (timeline petunjuk)
- Kotak input nomor resi, lalu timeline pengiriman palsu yang terbuka satu per satu dengan jeda ±1,5 detik.
- Tiap tahap punya: status, keterangan/petunjuk, dan waktu (boleh karangan).
- **Tahap bergembok (opsional):** tahap tertentu menampilkan pertanyaan kecil. Tahap berikutnya hanya terbuka bila jawabannya benar.
- **Tahap akhir** membuka hadiah sebenarnya: teks, petunjuk lokasi, atau kejutan lain.
- Seluruh petunjuk dan jawaban disimpan **di server (Vercel Function)**, bukan di HTML, sehingga tidak bisa diintip lewat *view source*.
- Salah memasukkan resi menampilkan "Resi tidak ditemukan"; percobaan dibatasi (rate limit).

### F5 — Surat Permintaan Maaf
- Teks muncul bertahap (efek mengetik atau fade per paragraf), 3–6 paragraf.
- Struktur saran: mengakui kesalahan → minta maaf tanpa pembelaan → komitmen konkret → ucapan ulang tahun.
- Tombol Lewati tersedia.

### F6 — Galeri Foto
- 6–15 foto, tampil sebagai carousel swipe bergaya polaroid, dengan caption pendek.
- Foto dikompres (±300 KB per foto), lazy loading, tap untuk memperbesar.
- Nama file foto diacak agar tidak bisa ditebak.

### F7 — Pemutar Lagu
- Lagu kesukaannya mulai setelah tap kado.
- Kontrol play/pause serta tampilan judul dan artis.
- Sumber: file MP3 sendiri di folder `audio/`, atau embed Spotify/YouTube.

### F8 — Chat Sementara
- Kotak chat di bagian bawah, tanpa login.
- Pesan disimpan di Redis dengan masa berlaku otomatis (default 3 hari) dan bisa dihapus manual oleh admin.
- Pembaruan lewat polling 4–5 detik; polling berhenti saat tab tidak aktif.
- Maksimal 500 karakter per pesan, dengan rate limit.

### F9 — Halaman Admin
- URL rahasia terpisah, dilindungi `ADMIN_KEY`.
- Membaca dan membalas chat.
- Melihat waktu terakhir link dibuka.
- Tombol "Hapus semua chat".

## 6. Arsitektur (Vercel saja)

| Bagian | Teknologi |
|---|---|
| Frontend | HTML/CSS/JS statis (tanpa build step) |
| Backend | Vercel Functions (Node.js) di folder `api/` |
| Penyimpanan | Upstash Redis dari Vercel Marketplace (free tier) |
| Rahasia | Environment Variables di dashboard Vercel |
| Routing | `vercel.json` (rewrite `/g/:token` dan `/admin/:key`) |
| Domain | `namaproject.vercel.app` |

Catatan: Vercel tidak mendukung PHP/Laravel secara native dan filesystem-nya tidak permanen, jadi data chat wajib disimpan di Redis, bukan file/SQLite.

## 7. Model Data (Redis)

| Key | Tipe | Isi |
|---|---|---|
| `chat:messages` | list | objek `{id, sender: "her"\|"me", body, ts}` |
| `chat:seq` | counter | pembuat `id` pesan |
| `meta:last_opened` | string | waktu terakhir link dibuka |
| `rl:*` | counter + TTL | rate limit per IP |

Konten (surat, caption, info lagu, nomor resi, timeline, jawaban teka-teki) disimpan di file `lib/content.js` yang hanya dipakai server.

## 8. Kebutuhan Non-Fungsional

| Aspek | Target |
|---|---|
| Kecepatan | Interaktif < 3 detik di 4G |
| Perangkat | Android Chrome, iOS Safari (utama), desktop (sekunder) |
| Privasi | Token acak ≥ 32 karakter, header `X-Robots-Tag: noindex`, tanpa analytics pihak ketiga |
| Keamanan | Sanitasi chat (`textContent`), perbandingan rahasia timing-safe, rate limit |
| Akses | Tombol besar, kontras cukup, dukung `prefers-reduced-motion` |
| Masa aktif | Link kedaluwarsa otomatis lewat `GIFT_EXPIRES_AT` |
| Biaya | Rp0 selama masih dalam batas free tier |

## 9. Konten yang Perlu Disiapkan Lingga

- [ ] Nama panggilan pacar dan nama pengirim
- [ ] Teks surat permintaan maaf
- [ ] 6–15 foto + caption
- [ ] Judul, artis, dan file MP3 lagu kesukaannya
- [ ] **Nomor resi** dan mode tampil (terlihat / tersembunyi)
- [ ] **Isi timeline resi:** 3–6 tahap (status, petunjuk, waktu), serta pertanyaan dan jawaban untuk tahap bergembok
- [ ] **Hadiah akhir:** fisik (petunjuk lokasi/orang) atau digital
- [ ] Pesan penutup dan ucapan ulang tahun
- [ ] Tanggal kedaluwarsa link

## 10. Kriteria Penerimaan

1. Link `/g/{token}` di HP menampilkan gate tanpa error.
2. Tap kado memicu animasi, lagu bunyi, dan kartu resi muncul.
3. Resi benar menampilkan timeline satu per satu; resi salah menampilkan pesan gagal.
4. Tahap bergembok hanya terbuka dengan jawaban benar.
5. Petunjuk tidak muncul di *view source* maupun di tab Network sebelum resi benar.
6. Pesan chat dua arah muncul dalam ≤ 5 detik.
7. Pesan hilang otomatis setelah masa berlaku.
8. Token salah atau link kedaluwarsa: tidak ada konten yang bocor.
9. Halaman tidak terindeks mesin pencari.

## 11. Risiko & Mitigasi

| Risiko | Mitigasi |
|---|---|
| Lagu tidak otomatis bunyi | Mulai dari tap kado |
| Kuota free tier Redis habis karena polling | Polling hanya saat tab aktif, interval naik bila sepi, cek kuota di dashboard |
| Link bocor | Token panjang, kedaluwarsa, bisa ganti `GIFT_TOKEN` lalu redeploy |
| Teka-teki terlalu sulit, ia frustrasi | Beri petunjuk jelas, sediakan jalur bantuan lewat chat |
| Foto berat | Kompres dan lazy loading |
| Terasa menggantikan percakapan nyata | Akhiri surat dengan ajakan bicara langsung |

## 12. Rencana Pengerjaan

| Tahap | Isi | Estimasi |
|---|---|---|
| 1 | Setup repo + Vercel, gate, animasi kado | 0,5–1 hari |
| 2 | Kartu resi + Lacak Paket (API + timeline) | 1 hari |
| 3 | Surat, galeri, pemutar lagu | 0,5–1 hari |
| 4 | Chat + halaman admin (Redis) | 1 hari |
| 5 | Poles, uji di HP, deploy | 0,5 hari |

## 13. Di Luar Lingkup (v1)

Login/akun, notifikasi push, kirim gambar atau suara di chat, banyak penerima, domain kustom berbayar.

## 14. Catatan

Website ini pembuka, bukan pengganti. Permintaan maaf paling kuat bila disertai tindakan nyata dan percakapan langsung.
