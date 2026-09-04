import { db } from "./firebaseConfig.js";
import {
  collection, getDocs, doc, updateDoc, deleteDoc, onSnapshot,
  query, orderBy, limit, getDoc
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

// Login
const loginScreen = document.getElementById("loginScreen");
const adminShell = document.getElementById("adminShell");
const loginForm = document.getElementById("loginForm");
const loginBtn = document.getElementById("loginBtn");
const loginError = document.getElementById("loginError");

let isAdmin = false;

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const token = document.getElementById("adminToken").value.trim();

  loginBtn.disabled = true;
  loginBtn.textContent = "Checking...";
  loginError.style.display = "none";

  try {
    const res = await fetch("/api/adminLogin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token })
    });
    const result = await res.json();

    if (result.success) {
      isAdmin = true;
      loginScreen.style.display = "none";
      adminShell.classList.add("active");
      initDashboard();
    } else {
      loginError.textContent = "Wrong token. Try again.";
      loginError.style.display = "block";
      loginBtn.disabled = false;
      loginBtn.textContent = "Log In";
    }
  } catch (err) {
    loginError.textContent = "Connection error. Try again.";
    loginError.style.display = "block";
    loginBtn.disabled = false;
    loginBtn.textContent = "Log In";
  }
});

document.getElementById("logoutBtn").addEventListener("click", () => {
  isAdmin = false;
  adminShell.classList.remove("active");
  loginScreen.style.display = "flex";
  document.getElementById("adminToken").value = "";
  loginBtn.disabled = false;
  loginBtn.textContent = "Log In";
});

// Navigation
document.querySelectorAll(".nav-item").forEach((item) => {
  item.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach((n) => n.classList.remove("active"));
    document.querySelectorAll(".page-section").forEach((p) => p.classList.remove("active"));
    item.classList.add("active");
    document.getElementById("page-" + item.dataset.page).classList.add("active");
  });
});

// Helpers
function formatDate(timestamp) {
  if (!timestamp || !timestamp.toDate) return "—";
  return timestamp.toDate().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatTime(timestamp) {
  if (!timestamp || !timestamp.toDate) return "";
  return timestamp.toDate().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function escapeHtml(str) {
  if (!str) return "—";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// Dashboard Init
let initialized = false;
let allUsersSnapshot = [];
let userSearchQuery = "";

function initDashboard() {
  if (initialized) return;
  initialized = true;

  const searchInput = document.getElementById("userSearchInput");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      userSearchQuery = e.target.value.toLowerCase();
      renderUsersList();
    });
  }

  loadUsers();
  loadGroups();
  loadChat();
  loadBackups(); // NEW
}

// Users Tab
function loadUsers() {
  onSnapshot(collection(db, "users"), (snapshot) => {
    allUsersSnapshot = snapshot.docs;
    let total = 0, active = 0, banned = 0, muted = 0;

    snapshot.forEach((docSnap) => {
      const status = docSnap.data().status || "active";
      total++;
      if (status === "active") active++;
      if (status === "banned") banned++;
      if (status === "muted") muted++;
    });

    document.getElementById("statTotal").textContent = total;
    document.getElementById("statActive").textContent = active;
    document.getElementById("statBanned").textContent = banned;
    document.getElementById("statMuted") && (document.getElementById("statMuted").textContent = muted);

    renderUsersList();

    document.getElementById("usersList").querySelectorAll("button[data-action]").forEach((btn) => {
      btn.addEventListener("click", () => handleUserAction(btn.dataset.uid, btn.dataset.action));
    });
  });
}

function renderUsersList() {
  const usersList = document.getElementById("usersList");
  if (!usersList) return;

  if (allUsersSnapshot.length === 0) {
    usersList.innerHTML = '<div class="empty-state">No users registered yet.</div>';
    return;
  }

  const filtered = userSearchQuery
    ? allUsersSnapshot.filter(d => {
        const u = d.data();
        return (u.username && u.username.toLowerCase().includes(userSearchQuery)) ||
               (u.email && u.email.toLowerCase().includes(userSearchQuery));
      })
    : allUsersSnapshot;

  if (filtered.length === 0) {
    usersList.innerHTML = '<div class="empty-state">No users match your search.</div>';
    return;
  }

  let rowsHtml = "";
  filtered.forEach((docSnap) => {
    const u = docSnap.data();
    const uid = docSnap.id;
    const status = u.status || "active";
    const banLabel = status === "banned" ? "Unban" : "Ban";
    const banClass = status === "banned" ? "restore" : "ban";
    const muteLabel = status === "muted" ? "Unmute" : "Mute";
    const muteClass = status === "muted" ? "restore" : "mute";

    rowsHtml += `
      <div class="table-row">
        <div class="user-name">${escapeHtml(u.username || "—")}</div>
        <div class="user-email">${escapeHtml(u.email || "—")}</div>
        <div><span class="badge ${status}">${status}</span></div>
        <div>${formatDate(u.createdAt)}</div>
        <div class="row-actions">
          <button class="action-btn ${banClass}" data-uid="${uid}" data-action="toggleBan">${banLabel}</button>
          <button class="action-btn ${muteClass}" data-uid="${uid}" data-action="toggleMute">${muteLabel}</button>
        </div>
      </div>`;
  });
  usersList.innerHTML = rowsHtml;

  usersList.querySelectorAll("button[data-action]").forEach((btn) => {
    btn.addEventListener("click", () => handleUserAction(btn.dataset.uid, btn.dataset.action));
  });
}

async function handleUserAction(uid, action) {
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) {
    showToast("User not found", "error");
    return;
  }
  const currentStatus = snap.data().status || "active";

  const newStatus = action === "toggleBan"
    ? (currentStatus === "banned" ? "active" : "banned")
    : (currentStatus === "muted" ? "active" : "muted");

  await updateDoc(userRef, { status: newStatus });
  showToast(`User ${newStatus}`, "success");
}

function showToast(message, type = "info") {
  let toast = document.getElementById("auraToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "auraToast";
    toast.className = "aura-toast";
    document.body.appendChild(toast);
  }
  toast.className = `aura-toast ${type} show`;
  toast.textContent = message;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove("show"), 2400);
}

function showConfirm(message) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "confirm-overlay";
    overlay.innerHTML = `
      <div class="confirm-card">
        <div class="confirm-msg">${escapeHtml(message)}</div>
        <div class="confirm-actions">
          <button class="confirm-btn cancel">Cancel</button>
          <button class="confirm-btn ok">Confirm</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector(".cancel").onclick = () => { overlay.remove(); resolve(false); };
    overlay.querySelector(".ok").onclick = () => { overlay.remove(); resolve(true); };
  });
}

// Groups Tab
function loadGroups() {
  onSnapshot(collection(db, "groups"), (snapshot) => {
    const groupsList = document.getElementById("groupsList");
    document.getElementById("statGroups").textContent = snapshot.size;

    if (snapshot.empty) {
      groupsList.innerHTML = '<div class="empty-state">No groups created yet.</div>';
      return;
    }

    let rowsHtml = "";
    snapshot.forEach((docSnap) => {
      const g = docSnap.data();
      const gid = docSnap.id;
      const memberCount = (g.members || []).length;

      rowsHtml += `
        <div class="table-row">
          <div class="user-name">${escapeHtml(g.name || "Unnamed group")}</div>
          <div class="user-email">${escapeHtml(g.createdBy || "—")}</div>
          <div>${memberCount}</div>
          <div>${formatDate(g.createdAt)}</div>
          <div class="row-actions">
            <button class="action-btn delete" data-gid="${gid}">Delete</button>
          </div>
        </div>`;
    });
    groupsList.innerHTML = rowsHtml;

    groupsList.querySelectorAll("button[data-gid]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const confirmed = await showConfirm("Delete this group and all its messages? Cannot be undone.");
        if (!confirmed) return;
        const msgsSnap = await getDocs(collection(db, "groups", btn.dataset.gid, "messages"));
        const batchDeletes = msgsSnap.docs.map(m => deleteDoc(doc(db, "groups", btn.dataset.gid, "messages", m.id)));
        await Promise.all(batchDeletes);
        await deleteDoc(doc(db, "groups", btn.dataset.gid));
        showToast("Group deleted", "success");
      });
    });
  });
}

// Chat Monitor Tab
function loadChat() {
  const chatList = document.getElementById("chatList");
  const recentList = document.getElementById("recentChatList");
  const chatQuery = query(collection(db, "globalChat"), orderBy("timestamp", "desc"), limit(100));

  onSnapshot(chatQuery, (snapshot) => {
    if (snapshot.empty) {
      if (chatList) chatList.innerHTML = '<div class="empty-state">No messages yet.</div>';
      if (recentList) recentList.innerHTML = '<div class="empty-state">No messages yet.</div>';
      return;
    }

    let html = "";
    let recentHtml = "";
    let i = 0;
    snapshot.forEach((docSnap) => {
      const m = docSnap.data();
      const mid = docSnap.id;
      html += `
        <div class="chat-msg">
          <div>
            <div class="chat-msg-sender">${escapeHtml(m.senderUsername)}</div>
            <div class="chat-msg-text">${escapeHtml(m.message)}</div>
            <div class="chat-msg-time">${formatTime(m.timestamp)}</div>
          </div>
          <button class="action-btn delete" data-mid="${mid}">Delete</button>
        </div>`;

      if (i < 5) {
        recentHtml += `
          <div class="table-row">
            <div class="user-name">${escapeHtml(m.senderUsername || "—")}</div>
            <div>${escapeHtml(m.message || "—")}</div>
            <div style="color:var(--text-dim);font-size:12px;">${formatTime(m.timestamp)}</div>
          </div>`;
        i++;
      }
    });
    if (chatList) chatList.innerHTML = html;
    if (recentList) recentList.innerHTML = recentHtml;

    if (chatList) {
      chatList.querySelectorAll("button[data-mid]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const confirmed = await showConfirm("Delete this message?");
          if (!confirmed) return;
          await deleteDoc(doc(db, "globalChat", btn.dataset.mid));
          showToast("Message deleted", "success");
        });
      });
    }
  });
}

// ---------- BACKUPS TAB ----------
function loadBackups() {
  const backupsList = document.getElementById("backupsList");
  if (!backupsList) return;

  db.collection("users").get().then((usersSnap) => {
    let allBackups = [];
    let pending = usersSnap.size;
    if (pending === 0) {
      backupsList.innerHTML = '<div class="empty-state">No backups found.</div>';
      return;
    }
    usersSnap.forEach((userDoc) => {
      const uid = userDoc.id;
      const username = userDoc.data().username || uid;
      db.collection("users").doc(uid).collection("backups")
        .orderBy("createdAt", "desc")
        .get()
        .then((backupSnap) => {
          backupSnap.forEach((doc) => {
            const data = doc.data();
            allBackups.push({
              userId: uid,
              username: username,
              url: data.url,
              size: data.size || 0,
              createdAt: data.createdAt ? data.createdAt.toDate() : null,
              id: doc.id
            });
          });
          pending--;
          if (pending === 0) {
            renderBackups(allBackups);
          }
        })
        .catch(() => {
          pending--;
          if (pending === 0) renderBackups(allBackups);
        });
    });
  }).catch((err) => {
    backupsList.innerHTML = '<div class="empty-state">Error loading backups.</div>';
  });
}

function renderBackups(backups) {
  const backupsList = document.getElementById("backupsList");
  if (!backupsList) return;
  if (backups.length === 0) {
    backupsList.innerHTML = '<div class="empty-state">No backups uploaded yet.</div>';
    return;
  }
  let html = '';
  backups.forEach((b) => {
    const sizeKB = (b.size / 1024).toFixed(1) + ' KB';
    const date = b.createdAt ? b.createdAt.toLocaleDateString('en-IN') : '—';
    html += `
      <div class="table-row">
        <div class="user-name">${escapeHtml(b.username)}</div>
        <div><a href="${b.url}" target="_blank" class="backup-link">${escapeHtml(b.id)}</a></div>
        <div>${sizeKB}</div>
        <div>${date}</div>
        <div class="row-actions">
          <a href="${b.url}" target="_blank" class="action-btn restore">Download</a>
        </div>
      </div>
    `;
  });
  backupsList.innerHTML = html;
}
