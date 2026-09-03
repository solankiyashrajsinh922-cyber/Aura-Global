import { db } from "./firebaseConfig.js";
import {
  collection, getDocs, doc, updateDoc, deleteDoc, onSnapshot,
  query, orderBy, limit
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

// ============================================
// LOGIN
// ============================================
const loginScreen = document.getElementById("loginScreen");
const adminShell = document.getElementById("adminShell");
const loginForm = document.getElementById("loginForm");
const loginBtn = document.getElementById("loginBtn");
const loginError = document.getElementById("loginError");

let isAdmin = false; // stays in memory only for this session (page load)

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
      adminShell.style.display = "flex";
      initDashboard();
    } else {
      loginError.textContent = "Galat token. Dubara try karo.";
      loginError.style.display = "block";
      loginBtn.disabled = false;
      loginBtn.textContent = "Log In";
    }
  } catch (err) {
    loginError.textContent = "Connection error. Dubara try karo.";
    loginError.style.display = "block";
    loginBtn.disabled = false;
    loginBtn.textContent = "Log In";
  }
});

document.getElementById("logoutBtn").addEventListener("click", () => {
  isAdmin = false;
  adminShell.style.display = "none";
  loginScreen.style.display = "flex";
  document.getElementById("adminToken").value = "";
  loginBtn.disabled = false;
  loginBtn.textContent = "Log In";
});

// ============================================
// NAVIGATION (tab switching)
// ============================================
document.querySelectorAll(".nav-item").forEach(item => {
  item.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
    document.querySelectorAll(".page-section").forEach(p => p.classList.remove("active"));
    item.classList.add("active");
    document.getElementById("page-" + item.dataset.page).classList.add("active");
  });
});

// ============================================
// HELPERS
// ============================================
function formatDate(timestamp) {
  if (!timestamp || !timestamp.toDate) return "—";
  return timestamp.toDate().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatTime(timestamp) {
  if (!timestamp || !timestamp.toDate) return "";
  return timestamp.toDate().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

// ============================================
// DASHBOARD INIT (called after successful login)
// ============================================
let initialized = false;

function initDashboard() {
  if (initialized) return;
  initialized = true;
  loadUsers();
  loadGroups();
  loadChat();
}

// ============================================
// USERS TAB
// ============================================
function loadUsers() {
  const usersRef = collection(db, "users");

  onSnapshot(usersRef, (snapshot) => {
    const usersList = document.getElementById("usersList");
    let total = 0, active = 0, banned = 0;
    let rowsHtml = "";

    if (snapshot.empty) {
      usersList.innerHTML = '<div class="empty-state">Abhi tak koi users nahi hain.</div>';
    } else {
      snapshot.forEach(docSnap => {
        const u = docSnap.data();
        const uid = docSnap.id;
        total++;
        const status = u.status || "active";
        if (status === "active") active++;
        if (status === "banned") banned++;

        const banBtnLabel = status === "banned" ? "Unban" : "Ban";
        const banBtnClass = status === "banned" ? "restore" : "ban";
        const muteBtnLabel = status === "muted" ? "Unmute" : "Mute";
        const muteBtnClass = status === "muted" ? "restore" : "mute";

        rowsHtml += `
          <div class="table-row">
            <div class="user-name">${escapeHtml(u.username || "—")}</div>
            <div class="user-email">${escapeHtml(u.email || "—")}</div>
            <div><span class="badge ${status}">${status}</span></div>
            <div>${formatDate(u.createdAt)}</div>
            <div class="row-actions">
              <button class="action-btn ${banBtnClass}" data-uid="${uid}" data-action="toggleBan">${banBtnLabel}</button>
              <button class="action-btn ${muteBtnClass}" data-uid="${uid}" data-action="toggleMute">${muteBtnLabel}</button>
            </div>
          </div>`;
      });
      usersList.innerHTML = rowsHtml;
    }

    document.getElementById("statTotal").textContent = total;
    document.getElementById("statActive").textContent = active;
    document.getElementById("statBanned").textContent = banned;

    // Attach action listeners
    usersList.querySelectorAll("button[data-action]").forEach(btn => {
      btn.addEventListener("click", () => handleUserAction(btn.dataset.uid, btn.dataset.action));
    });
  });
}

async function handleUserAction(uid, action) {
  const userRef = doc(db, "users", uid);
  const usersSnap = await getDocs(collection(db, "users"));
  let currentStatus = "active";
  usersSnap.forEach(d => { if (d.id === uid) currentStatus = d.data().status || "active"; });

  if (action === "toggleBan") {
    const newStatus = currentStatus === "banned" ? "active" : "banned";
    await updateDoc(userRef, { status: newStatus });
  } else if (action === "toggleMute") {
    const newStatus = currentStatus === "muted" ? "active" : "muted";
    await updateDoc(userRef, { status: newStatus });
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ============================================
// GROUPS TAB
// ============================================
async function loadGroups() {
  const groupsList = document.getElementById("groupsList");
  const groupsRef = collection(db, "groups");

  onSnapshot(groupsRef, (snapshot) => {
    document.getElementById("statGroups").textContent = snapshot.size;

    if (snapshot.empty) {
      groupsList.innerHTML = '<div class="empty-state">Abhi tak koi groups nahi bane.</div>';
      return;
    }

    let rowsHtml = "";
    snapshot.forEach(docSnap => {
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

    groupsList.querySelectorAll("button[data-gid]").forEach(btn => {
      btn.addEventListener("click", async () => {
        if (confirm("Ye group delete karna hai? Ye undo nahi ho sakta.")) {
          await deleteDoc(doc(db, "groups", btn.dataset.gid));
        }
      });
    });
  });
}

// ============================================
// GLOBAL CHAT MONITOR TAB
// ============================================
function loadChat() {
  const chatList = document.getElementById("chatList");
  const chatQuery = query(collection(db, "globalChat"), orderBy("timestamp", "desc"), limit(100));

  onSnapshot(chatQuery, (snapshot) => {
    if (snapshot.empty) {
      chatList.innerHTML = '<div class="empty-state">Abhi tak koi messages nahi hain.</div>';
      return;
    }

    let html = "";
    snapshot.forEach(docSnap => {
      const m = docSnap.data();
      const mid = docSnap.id;
      html += `
        <div class="chat-msg">
          <div>
            <div class="chat-msg-sender">${escapeHtml(m.senderUsername || "Unknown")}</div>
            <div class="chat-msg-text">${escapeHtml(m.message || "")}</div>
            <div class="chat-msg-time">${formatTime(m.timestamp)}</div>
          </div>
          <button class="action-btn delete" data-mid="${mid}">Delete</button>
        </div>`;
    });
    chatList.innerHTML = html;

    chatList.querySelectorAll("button[data-mid]").forEach(btn => {
      btn.addEventListener("click", async () => {
        await deleteDoc(doc(db, "globalChat", btn.dataset.mid));
      });
    });
  });
}

