import { api, sleep, show, openLetterSection } from "./gift.js";

const answers = {}; // { indexTahap: "jawaban" }
let currentCode = "";

export function showResiCard(c) {
  show("resi");
  const input = document.getElementById("resi-input");
  const label = document.getElementById("resi-label");
  const err = document.getElementById("resi-error");
  err.textContent = "";

  if (c.showResi && c.resi) {
    label.textContent = c.resi;
    if (!input.value) input.value = c.resi;
  } else {
    label.textContent = "Masukkan nomor resi";
  }

  document.getElementById("resi-go").onclick = () => track(input.value);
  document.getElementById("resi-skip").onclick = () => openLetterSection();
  document.getElementById("track-back").onclick = () => show("resi");
  document.getElementById("track-next").onclick = () => openLetterSection();
}

async function track(code, skipDelay = false) {
  const err = document.getElementById("resi-error");
  err.textContent = "";
  currentCode = String(code ?? "").trim();

  if (!currentCode) {
    err.textContent = "Masukkan nomor resi terlebih dahulu ya.";
    return;
  }

  const res = await api("/api/track", {
    method: "POST",
    body: JSON.stringify({ code: currentCode, answers }),
  });
  const data = await res.json();

  if (!res.ok) {
    err.textContent = data.error || "Resi tidak ditemukan.";
    return;
  }

  document.getElementById("tracking-code-title").textContent = `Resi: ${currentCode.toUpperCase()}`;
  show("tracking");
  await renderSteps(data.steps, skipDelay);
}

async function renderSteps(steps, skipDelay = false) {
  const list = document.getElementById("timeline");
  list.textContent = "";

  for (let idx = 0; idx < steps.length; idx++) {
    const s = steps[idx];
    const li = document.createElement("li");

    const status = document.createElement("strong");
    status.textContent = s.status;

    const time = document.createElement("small");
    time.textContent = s.time || "";

    li.append(status, time);

    if (s.locked) {
      const box = document.createElement("div");
      box.className = "puzzle-box";

      const q = document.createElement("p");
      q.textContent = s.question;

      const row = document.createElement("div");
      row.className = "puzzle-row";

      const inp = document.createElement("input");
      inp.type = "text";
      inp.placeholder = "Ketik jawabanmu...";
      inp.value = answers[s.i] || "";

      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = "Buka";

      const feedback = document.createElement("div");
      feedback.className = "error-text";
      if (s.wrongAttempt) {
        feedback.textContent = "Belum tepat, coba ingat-ingat lagi ya 😊";
      }

      const submitAnswer = async () => {
        if (!inp.value.trim()) {
          feedback.textContent = "Isi jawabannya dulu ya.";
          return;
        }
        answers[s.i] = inp.value;
        await track(currentCode, true);
      };

      btn.onclick = submitAnswer;
      inp.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          submitAnswer();
        }
      });

      row.append(inp, btn);
      box.append(q, row, feedback);
      li.append(box);
    } else {
      const note = document.createElement("p");
      note.textContent = s.note;
      li.append(note);
      if (s.final) li.classList.add("final");
    }

    list.append(li);
    if (!skipDelay || idx === steps.length - 1) {
      await sleep(1200);
    }
  }

  document.getElementById("track-next").hidden = false;
}
