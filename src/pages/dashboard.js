// src/pages/dashboard.js
(function () {
  const root = document.querySelector('[data-page="dashboard"]');
  const { $, $all } = window.Roos.dom || { $: () => null, $all: () => [] };

  function setText(el, value) {
    if (!el) return;
    el.textContent = value == null ? "" : String(value);
  }

  // Loads admin-only logic (Option B) only when user is admin/super_admin
  function loadAdminModule(me) {
    window.Roos = window.Roos || {};
    if (window.Roos._adminModuleLoaded) return;
    window.Roos._adminModuleLoaded = true;

    const ref = window.Roos._ref || "main";
    const env = window.Roos._env || "prod";
    const cache = env === "dev" ? ("?v=" + Date.now()) : "";

    const src =
      "https://cdn.jsdelivr.net/gh/TacleOfficial/roos-international-web@" +
      ref +
      "/src/pages/dashboard.admin.js" +
      cache;

    const s = document.createElement("script");
    s.src = src;
    s.defer = true;

    s.onload = function () {
      // dashboard.admin.js should expose: window.Roos.admin.init({ me, root })
      if (window.Roos?.admin?.init) {
        window.Roos.admin.init({ me, root: root || document });
      } else {
        console.warn("dashboard.admin.js loaded but window.Roos.admin.init was not found");
      }
    };

    s.onerror = function (e) {
      console.error("Failed to load dashboard.admin.js:", src, e);
    };

    document.head.appendChild(s);
  }

  async function init() {
    // 1) Protect this page
    const user = await window.Roos.guards.requireAuth();
    if (!user) return;

    // 2) Call backend (server-verified identity/roles)
    let me = null;
    try {
      if (!window.Roos?.api?.request) {
        console.warn("Roos.api.request not found. Did you load api.client.js globally?");
      } else {
        me = await window.Roos.api.request("/me");
      }
    } catch (err) {
      console.error("Failed to load /me:", err);
    }

    // 3) Apply role-based visibility (admin tabs/sections)
    if (me && window.Roos?.ui?.applyRoleVisibility) {
      window.Roos.ui.applyRoleVisibility(me.roles);
    } else if (me && !window.Roos?.ui?.applyRoleVisibility) {
      console.warn("applyRoleVisibility not found. Did you load core/roles.ui.js globally?");
    }

    // 4) Bind user data (client auth)
    setText($('[data-auth="email"]', root || document), user.email);
    setText($('[data-auth="uid"]', root || document), user.uid);

    // 5) Bind server-verified data if available
    const roles = Array.isArray(me?.roles) ? me.roles : [];
    if (me) {
      setText($('[data-auth="serverEmail"]', root || document), me.email);
      setText($('[data-auth="roles"]', root || document), roles.join(", "));
    }

    // ✅ Admin-only module load (Option B)
    const isAdmin = roles.includes("admin") || roles.includes("super_admin");
    if (me && isAdmin) loadAdminModule(me);

    // 6) Logout button hook
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

  function boot() {
    if (!window.Roos?.guards?.requireAuth) return;
    init();
  }

  if (window.Roos?.firebase?._initialized) boot();
  else window.addEventListener("roos:firebase-ready", boot, { once: true });
})();
