// src/core/guards.js
(function () {
    window.Roos = window.Roos || {};
    window.Roos.guards = window.Roos.guards || {};
  
    const LOGIN_URL = "/login";
    const DASHBOARD_URL = "/dashboard";
  
    function waitForFirebaseReady() {
      return new Promise((resolve) => {
        if (window.Roos?.firebase?._initialized) return resolve();
        window.addEventListener("roos:firebase-ready", resolve, { once: true });
        // If firebase fails, we still resolve so pages don't hang forever.
        window.addEventListener("roos:firebase-error", resolve, { once: true });
      });
    }
  
    async function requireAuth() {
      await waitForFirebaseReady();
  
      // If firebase isn't available, fail closed: send to login.
      if (!window.Roos?.auth?.onAuthStateChanged) {
        window.location.assign(LOGIN_URL);
        return;
      }
  
      // Use a one-time auth state check
      return new Promise((resolve) => {
        const unsub = window.Roos.auth.onAuthStateChanged((user) => {
          try { unsub && unsub(); } catch (_) {}
          if (!user) window.location.assign(LOGIN_URL);
          resolve(user || null);
        });
      });
    }
  
    async function redirectIfAuthed() {
      await waitForFirebaseReady();
  
      if (!window.Roos?.auth?.onAuthStateChanged) return;
  
      return new Promise((resolve) => {
        const unsub = window.Roos.auth.onAuthStateChanged((user) => {
          try { unsub && unsub(); } catch (_) {}
          if (user) window.location.assign(DASHBOARD_URL);
          resolve(user || null);
        });
      });
    }
  
    window.Roos.guards = { requireAuth, redirectIfAuthed };
  })();
  