// ============================================
// AURA GLOBAL - Firebase Configuration
// ============================================
// Ye file Firebase se connect karti hai.
// Isko har HTML page me <script type="module"> ke through import karna hai.

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBeJ6J1Uw35YlUCvewLaBtJ68gkgbW9nEs",
  authDomain: "aura-global-b867c.firebaseapp.com",
  projectId: "aura-global-b867c",
  storageBucket: "aura-global-b867c.firebasestorage.app",
  messagingSenderId: "215897550707",
  appId: "1:215897550707:web:db339954fad86224555f06",
  measurementId: "G-0PYV8W8BZQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services jo humein chahiye (Auth + Firestore)
const auth = getAuth(app);
const db = getFirestore(app);

// Export karo taaki doosri files (login.js, chat.js, etc) inhe use kar sakein
export { app, auth, db };
