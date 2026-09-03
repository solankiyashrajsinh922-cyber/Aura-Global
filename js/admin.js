import { db } from "./firebaseConfig.js";
import {
  collection, getDocs, doc, updateDoc, deleteDoc, onSnapshot,
  query, orderBy, limit
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
function initDashboard() {
  if (initialized) return;
  initialized = true;
  loadUsers();
  loadGroups();
  loadChat();
}

// Users Tab
function loadUsers() {
  onSnapshot(collection(db, "users"), (snapshot) => {
    const usersList = document.getElementById("usersList");
    let total = 0, active = 0, banned = 0;
    let rowsHtml = "";

    if (snapshot.empty) {
      usersList.innerHTML = '<div class="empty-state">No users registered yet.</div>';
    } else {
      snapshot.forEach((docSnap) => {
        const u = docSnap.data();
        const uid = docSnap.id;
        total++;
        const status = u.status || "active";
        if (status === "active") active++;
        if (status === "banned") banned++;

        const banLabel = status === "banned" ? "Unban" : "Ban";
        const banClass = status === "banned" ? "restore" : "ban";
        const muteLabel = status === "muted" ? "Unmute" : "Mute";
        const muteClass = status === "muted" ? "restore" : "mute";

        rowsHtml += `
          <div class="table-row">
            <div class="user-name">${escapeHtml(u.username)}</div>
            <div class="user-email">${escapeHtml(u.email)}</div>
            <div><span class="badge ${status}">${status}</span></div>
            <div>${formatDate(u.createdAt)}</div>
            <div class="row-actions">
              <button class="action-btn ${banClass}" data-uid="${uid}" data-action="toggleBan">${banLabel}</button>
              <button class="action-btn ${muteClass}" data-uid="${uid}" data-action="toggleMute">${muteLabel}</button>
            </div>
          </div>`;
      });
      usersList.innerHTML = rowsHtml;
    }

    document.getElementById("statTotal").textContent = total;
    document.getElementById("statActive").textContent = active;
    document.getElementById("statBanned").textContent = banned;

    usersList.querySelectorAll("button[data-action]").forEach((btn) => {
      btn.addEventListener("click", () => handleUserAction(btn.dataset.uid, btn.dataset.action));
    });
  });
}

async function handleUserAction(uid, action) {
  const userRef = doc(db, "users", uid);
  const snap = await getDocs(collection(db, "users"));
  let currentStatus = "active";
  snap.forEach((d) => { if (d.id === uid) currentStatus = d.data().status || "active"; });

  const newStatus = action === "toggleBan"
    ? (currentStatus === "banned" ? "active" : "banned")
    : (currentStatus === "muted" ? "active" : "muted");

  await updateDoc(userRef, { status: newStatus });
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
        if (confirm("Delete this group? Cannot be undone.")) {
          await deleteDoc(doc(db, "groups", btn.dataset.gid));
        }
      });
    });
  });
}

// Chat Monitor Tab
function loadChat() {
  const chatList = document.getElementById("chatList");
  const chatQuery = query(collection(db, "globalChat"), orderBy("timestamp", "desc"), limit(100));

  onSnapshot(chatQuery, (snapshot) => {
    if (snapshot.empty) {
      chatList.innerHTML = '<div class="empty-state">No messages yet.</div>';
      return;
    }

    let html = "";
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
    });
    chatList.innerHTML = html;

    chatList.querySelectorAll("button[data-mid]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await deleteDoc(doc(db, "globalChat", btn.dataset.mid));
      });
    });
  });
}