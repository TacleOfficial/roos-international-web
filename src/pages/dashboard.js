// src/pages/dashboard.js
(function () {
    const root = document.querySelector('[data-page="dashboard"]');
    // root is optional; guard works regardless
    const { $, $all } = window.Roos.dom || { $: () => null, $all: () => [] };
  
    function setText(el, value) {
      if (!el) return;
      el.textContent = value == null ? "" : String(value);
    }
  
    async function init() {
      // 1) Protect this page
      const user = await window.Roos.guards.requireAuth();
      if (!user) return;
  
      // 2) Optional: bind user data to elements you design
      // Add these in Webflow if you want:
      // - [data-auth="email"]
      // - [data-auth="uid"]
      setText($('[data-auth="email"]', root || document), user.email);
      setText($('[data-auth="uid"]', root || document), user.uid);
  
      // 3) Logout button hook
      // Add a button with: data-auth-action="logout"
      const logoutBtn = document.querySelector('[data-auth-action="logout"]');
      if (logoutBtn) {
        logoutBtn.addEventListener("click", async (e) => {
          e.preventDefault();
          try {
            await window.Roos.auth.logout();
            window.location.assign("/login");
          } catch (err) {
            console.error("Logout failed:", err);
          }
        });
      }
    }
  
    // Wait until guards.js exists (loaded globally) + firebase ready
    function boot() {
      if (!window.Roos?.guards?.requireAuth) return;
      init();
    }
  
    if (window.Roos?.firebase?._initialized) boot();
    else window.addEventListener("roos:firebase-ready", boot, { once: true });
  })();
  