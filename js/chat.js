import { api } from "./gift.js";

let lastId = 0;

export function initChat() {
  const list = document.getElementById("chat-list");
  const form = document.getElementById("chat-form");
  const errEl = document.getElementById("chat-error");

  async function poll() {
    if (document.visibilityState !== "visible") return;
    try {
      const res = await api("/api/messages");
      if (!res.ok) return;
      const messages = await res.json();
      const newMsgs = messages.filter((m) => m.id > lastId);

      if (messages.length > 0) {
        const emptyHint = list.querySelector(".chat-empty");
        if (emptyHint) emptyHint.remove();
      }

      for (const m of newMsgs) {
        const div = document.createElement("div");
        div.className = "bubble " + (m.sender === "her" ? "mine" : "theirs");
        div.textContent = m.body; // Aman dari XSS (textContent)
        list.appendChild(div);
        lastId = m.id;
      }
      if (newMsgs.length > 0) {
        list.scrollTop = list.scrollHeight;
      }
    } catch {}
  }

  setInterval(poll, 5000);
  poll();
  document.addEventListener("visibilitychange", poll);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errEl.textContent = "";
    const input = e.target.elements.body;
    const text = input.value.trim();
    if (!text) return;

    const res = await api("/api/messages", {
      method: "POST",
      body: JSON.stringify({ body: text }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      errEl.textContent = data.error || "Gagal mengirim pesan.";
      return;
    }

    input.value = "";
    await poll();
  });
}
