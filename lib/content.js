// ===== SEMUA ISI PRIBADI ADA DI SINI (HANYA DI SERVER) =====
export const CONTENT = {
  herName: "Sayang",
  fromName: "Lingga",
  song: {
    title: "Lagu Kesukaanmu",
    artist: "Artis Favorit",
    file: "/audio/lagu.mp3",
  },
  letter: [
    "Hai kamu. Terima kasih ya sudah mau meluangkan waktu buat buka halaman kecil ini.",
    "Aku mau minta maaf dengan tulus atas kesalahanku kemarin. Aku sadar sikapku bikin kamu kecewa, sedih, dan capek sendiri. Nggak ada alasan atau pembelaan buat itu—aku yang salah karena kurang peka dan kurang mendengarkan perasaanmu.",
    "Ke depannya, aku janji buat lebih menjaga komunikasiku, nggak mengulangi hal yang sama, dan lebih menghargai setiap waktu serta perasaan kamu.",
    "Dan di hari spesialmu ini... Selamat ulang tahun ya! Semoga hal-hal baik, kebahagiaan, dan ketenangan selalu menyertai langkahmu. Kalau kamu sudah siap dan senggang, kita ngobrol langsung ya."
  ],
  photos: [
    { src: "/img/a8f3k2.svg", caption: "Salah satu momen favoritku bareng kamu ✨" },
    { src: "/img/q7m1zd.svg", caption: "Senyum kamu di hari itu manis banget" },
    { src: "/img/p9x4v1.svg", caption: "Tempat yang selalu bikin kangen kalau diingat" },
    { src: "/img/m3n8b5.svg", caption: "Terima kasih sudah selalu sabar selama ini 🤍" }
  ],
  closing: "Selamat ulang tahun. Aku sayang kamu, hari ini dan seterusnya.",
  // true = nomor resi tampil di kartu & otomatis terisi.
  // false = dia harus mengetik sendiri nomor resi yang kamu berikan.
  showResi: true,
};

// ===== TEKA-TEKI RESI (tidak pernah dikirim utuh ke browser sebelum dijawab) =====
export const RESI = "KADO-1029-LNGA"; // ganti sesuai keinginanmu

export const STEPS = [
  {
    status: "Paket diterima dari pengirim",
    note: "Dikemas dengan penuh rasa sayang dan permohonan maaf yang tulus.",
    time: "Hari ini, 08:00"
  },
  {
    status: "Dalam perjalanan ke hati tujuan",
    note: "Petunjuk 1: Coba ingat-ingat tempat pertama kali kita jalan bareng.",
    time: "Hari ini, 10:30"
  },
  {
    status: "Tertahan di pusat sortir kenangan",
    question: "Teka-teki keamanan kurir: Apa makanan/minuman favorit yang paling sering kita pesan kalau lagi bareng?",
    answer: "kopi", // ganti dengan jawaban yang hanya kalian berdua tahu (huruf kecil/besar tidak masalah)
    note: "Petunjuk 2: Jawabanmu benar! Paket sekarang meluncur ke lokasi rahasia di dekatmu.",
    time: "Hari ini, 13:15"
  },
  {
    status: "Paket telah tiba!",
    note: "Hadiahmu sudah siap! Coba cek di dalam tas / meja kamarmu (atau balas chat di bawah untuk klaim hadiahnya langsung dariku) 🎁",
    time: "Hari ini, 15:00",
    final: true
  }
];
