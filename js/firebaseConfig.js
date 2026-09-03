import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBeJ6J1Uw35YlUCvewLaBtJ68gkgbW9nEs",
  authDomain: "aura-global-b867c.firebaseapp.com",
  projectId: "aura-global-b867c",
  storageBucket: "aura-global-b867c.firebasestorage.app",
  messagingSenderId: "215897550707",
  appId: "1:215897550707:web:db339954fad86224555f06",
  measurementId: "G-0PYV8W8BZQ"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };