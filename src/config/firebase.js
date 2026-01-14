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
    ])
      .then(([appMod, authMod]) => {
        const { initializeApp, getApps } = appMod;
        const { getAuth, setPersistence, browserLocalPersistence } = authMod;
  
        // TODO: replace with your Firebase web config (safe to be public)
        const firebaseConfig = {
          apiKey: "YOUR_API_KEY",
          authDomain: "YOUR_PROJECT.firebaseapp.com",
          projectId: "YOUR_PROJECT_ID",
          appId: "YOUR_APP_ID",
        };
  
        const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
        const auth = getAuth(app);
  
        // Persist session across tabs/reloads
        setPersistence(auth, browserLocalPersistence).catch(() => {});
  
        window.Roos.firebase.app = app;
        window.Roos.firebase.auth = auth;
        window.Roos.firebase.authMod = authMod;
  
        window.Roos.firebase._initialized = true;
        window.dispatchEvent(new CustomEvent("roos:firebase-ready"));
      })
      .catch((err) => {
        console.error("Firebase init error:", err);
        window.dispatchEvent(new CustomEvent("roos:firebase-error", { detail: err }));
      });
  })();
  