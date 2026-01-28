// src/config/firebase.js
(function () {
    window.Roos = window.Roos || {};
    window.Roos.firebase = window.Roos.firebase || {};
  
    // Prevent double-init
    if (window.Roos.firebase._initialized) return;
  
    // Load Firebase modules via CDN (modular SDK)
    // We keep these imports inside dynamic import so it works from a plain <script>.
    Promise.all([
      import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js"),
      import("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js"),
      import("https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js"),
    ])
      .then(([appMod, authMod, fsMod, stMod]) => {
        const { initializeApp, getApps } = appMod;
        const { getAuth, setPersistence, browserLocalPersistence } = authMod;
        const { getFirestore } = fsMod;
        const { getStorage } = stMod;
  
        // TODO: replace with your Firebase web config (safe to be public)
        const firebaseConfig = {
          apiKey: "AIzaSyAk2WSfWDBp_q-ZVeSPM65s54nMFaO2njA",
          authDomain: "roos-international-2026.firebaseapp.com",
          projectId: "roos-international-2026",
          storageBucket: "roos-international-2026.firebasestorage.app",
          messagingSenderId: "1008243111132",
          appId: "1:1008243111132:web:009d2d4b8f6ee03a30b019",
          measurementId: "G-925BJQ3YQB"
        };
  
        const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const db = getFirestore(app);
        const storage = getStorage(app);
  
        // Persist session across tabs/reloads
        setPersistence(auth, browserLocalPersistence).catch(() => {});
  
        window.Roos.firebase.app = app;
        window.Roos.firebase.auth = auth;
        window.Roos.firebase.db = db;
        window.Roos.firebase.storage = storage;

        // expose modules so other scripts don’t need to re-import
        window.Roos.firebase.authMod = authMod;
        window.Roos.firebase.firestoreMod = fsMod;
        window.Roos.firebase.storageMod = stMod;
  
        window.Roos.firebase._initialized = true;
        window.dispatchEvent(new CustomEvent("roos:firebase-ready"));
        console.log("[Roos] Firebase ready ✅");

      })
      .catch((err) => {
        console.error("Firebase init error:", err);
        window.dispatchEvent(new CustomEvent("roos:firebase-error", { detail: err }));
      });
  })();
  