import { showResiCard } from "./tracking.js";
import { initChat } from "./chat.js";

export const TOKEN = location.pathname.split("/")[2] || "";
export const api = (path, opts = {}) =>
  fetch(path, {
    ...opts,
    headers: {
      "x-gift-token": TOKEN,
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
  });

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const show = (id) => {
  document.querySelectorAll("main > section").forEach((s) => {
    s.hidden = s.id !== id;
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
};

let CONTENT = null;
let letterStarted = false;
let skipLetterFlag = false;

async function init() {
  const res = await api("/api/content");
  if (!res.ok) {
    document.body.innerHTML = "<p class='gone'>Link tidak ditemukan.</p>";
    return;
  }
  CONTENT = await res.json();

  // Isi data ke DOM
  document.getElementById("her-name").textContent = CONTENT.herName;
  document.getElementById("from-name").textContent = CONTENT.fromName;
  document.getElementById("to-name").textContent = CONTENT.herName;
  document.getElementById("closing-text").textContent = CONTENT.closing;

  // Setup pemutar musik
  const bgm = document.getElementById("bgm");
  bgm.src = CONTENT.song.file;
  document.getElementById("song-title").textContent = CONTENT.song.title;
  document.getElementById("song-artist").textContent = CONTENT.song.artist;

  const btnMusic = document.getElementById("btn-music");
  btnMusic.addEventListener("click", async () => {
    if (bgm.paused) {
      try {
        await bgm.play();
        btnMusic.textContent = "⏸️";
      } catch {}
    } else {
      bgm.pause();
      btnMusic.textContent = "▶️";
    }
  });

  // Tombol mengambang Lacak Paket
  document.getElementById("btn-track").addEventListener("click", () => {
    showResiCard(CONTENT);
  });

  // Setup Galeri & Lightbox
  renderGallery(CONTENT.photos || []);

  // Setup navigasi antar halaman
  document.getElementById("letter-next").addEventListener("click", () => show("gallery"));
  document.getElementById("gallery-next").addEventListener("click", () => show("closing"));
  document.getElementById("gallery-back").addEventListener("click", () => openLetterSection());
  document.getElementById("closing-to-letter").addEventListener("click", () => openLetterSection());
  document.getElementById("closing-to-gallery").addEventListener("click", () => show("gallery"));

  // Setup animasi buka kado
  setupGiftBox();

  // Inisialisasi chat
  initChat();

  show("gate");
}

function setupGiftBox() {
  const box = document.getElementById("giftbox");
  const animBox = document.getElementById("giftbox-anim");
  const bgm = document.getElementById("bgm");
  const btnMusic = document.getElementById("btn-music");
  let opened = false;

  const finishOpening = () => {
    if (opened) return;
    opened = true;
    document.getElementById("btn-track").hidden = false;
    document.getElementById("music-bar").hidden = false;
    showResiCard(CONTENT);
  };

  document.getElementById("opening-skip").addEventListener("click", finishOpening);

  box.addEventListener(
    "click",
    async () => {
      try {
        await bgm.play();
        btnMusic.textContent = "⏸️";
      } catch {
        btnMusic.textContent = "▶️";
      }

      show("opening");
      animBox.classList.add("shake");
      await sleep(900);
      animBox.classList.add("open");
      await sleep(300);
      if (typeof window.confetti === "function") {
        window.confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
      }
      await sleep(2000);
      finishOpening();
    },
    { once: true }
  );
}

export async function openLetterSection() {
  show("letter");
  if (letterStarted) return;
  letterStarted = true;

  const el = document.getElementById("letter-body");
  const btnSkip = document.getElementById("letter-skip");
  const btnNext = document.getElementById("letter-next");
  const paragraphs = CONTENT.letter || [];

  btnSkip.onclick = () => {
    skipLetterFlag = true;
    el.textContent = "";
    for (const p of paragraphs) {
      const node = document.createElement("p");
      node.textContent = p;
      el.appendChild(node);
    }
    btnSkip.hidden = true;
    btnNext.hidden = false;
  };

  await typeLetter(el, paragraphs, 28);
  btnSkip.hidden = true;
  btnNext.hidden = false;
}

async function typeLetter(el, paragraphs, speed = 28) {
  for (const p of paragraphs) {
    if (skipLetterFlag) return;
    const node = document.createElement("p");
    el.appendChild(node);
    for (const ch of p) {
      if (skipLetterFlag) return;
      node.textContent += ch;
      await sleep(speed);
    }
    await sleep(500);
  }
}

function renderGallery(photos) {
  const track = document.getElementById("gallery-track");
  const lightbox = document.getElementById("lightbox");
  const lbImg = document.getElementById("lightbox-img");
  const lbCap = document.getElementById("lightbox-caption");

  track.textContent = "";
  for (const item of photos) {
    const fig = document.createElement("figure");
    fig.className = "polaroid";

    const img = document.createElement("img");
    img.src = item.src;
    img.alt = item.caption || "Foto kenangan";
    img.loading = "lazy";

    const cap = document.createElement("figcaption");
    cap.textContent = item.caption || "";

    fig.append(img, cap);
    fig.addEventListener("click", () => {
      lbImg.src = item.src;
      lbCap.textContent = item.caption || "";
      lightbox.hidden = false;
    });
    track.appendChild(fig);
  }

  const closeLb = () => {
    lightbox.hidden = true;
  };
  document.getElementById("lightbox-close").addEventListener("click", closeLb);
  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) closeLb();
  });
}

init();
