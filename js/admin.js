const KEY = location.pathname.split("/")[2] || "";
const adminApi = (path, opts = {}) =>
  fetch(path, {
    ...opts,
    headers: {
      "x-admin-key": KEY,
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
  });

const list = document.getElementById("admin-chat-list");
const lastOpenedEl = document.getElementById("last-opened");
let lastId = 0;

async function checkStatus() {
  const res = await adminApi("/api/admin/status");
  if (!res.ok) {
    document.body.innerHTML = "<p class='gone'>Link tidak ditemukan.</p>";
    return false;
  }
  const data = await res.json();
  if (data.lastOpened) {
    const dt = new Date(Number(data.lastOpened));
    lastOpenedEl.textContent = dt.toLocaleString("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } else {
    lastOpenedEl.textContent = "Belum pernah dibuka";
  }
  return true;
}

async function poll() {
  if (document.visibilityState !== "visible") return;
  const res = await adminApi("/api/admin/messages");
  if (!res.ok) return;
  const all = await res.json();

  if (all.length === 0) {
    list.innerHTML = "<p class='chat-empty'>Belum ada pesan masuk.</p>";
    lastId = 0;
    return;
  }

  const emptyHint = list.querySelector(".chat-empty");
  if (emptyHint) emptyHint.remove();

  const newMsgs = all.filter((m) => m.id > lastId);
  for (const m of newMsgs) {
    const div = document.createElement("div");
    div.className = "bubble " + (m.sender === "me" ? "mine" : "theirs");
    div.textContent = m.body; // Aman dari XSS
    list.appendChild(div);
    lastId = m.id;
  }
  if (newMsgs.length > 0) {
    list.scrollTop = list.scrollHeight;
  }
}

async function initAdmin() {
  const ok = await checkStatus();
  if (!ok) return;

  await poll();
  setInterval(() => {
    if (document.visibilityState === "visible") {
      poll();
      checkStatus();
    }
  }, 5000);

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      poll();
      checkStatus();
    }
  });

  document.getElementById("admin-chat-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = e.target.elements.body;
    if (!input.value.trim()) return;
    await adminApi("/api/admin/messages", {
      method: "POST",
      body: JSON.stringify({ body: input.value }),
    });
    input.value = "";
    await poll();
  });

  document.getElementById("btn-clear").addEventListener("click", async () => {
    if (!confirm("Hapus semua pesan obrolan?")) return;
    await adminApi("/api/admin/messages", { method: "DELETE" });
    list.innerHTML = "<p class='chat-empty'>Belum ada pesan masuk.</p>";
    lastId = 0;
  });
}

initAdmin();
