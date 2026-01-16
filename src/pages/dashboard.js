// src/pages/dashboard.js
(function () {
  const root = document.querySelector('[data-page="dashboard"]');
  const { $, $all } = window.Roos.dom || { $: () => null, $all: () => [] };

  function setText(el, value) {
    if (!el) return;
    el.textContent = value == null ? "" : String(value);
  }

  async function init() {
    // 1) Protect this page
    const user = await window.Roos.guards.requireAuth();
    if (!user) return;

    // 2) Call backend (server-verified identity/roles)
    // Place it HERE: after auth, before UI binding
    let me = null;
    try {
      if (!window.Roos?.api?.request) {
        console.warn("Roos.api.request not found. Did you load api.client.js globally?");
      } else {
        me = await window.Roos.api.request("/me");
        // optional debug:
        // console.log("ME:", me);
      }
    } catch (err) {
      console.error("Failed to load /me:", err);
      // Optional: show a UI message if you have an element for it
      // setText($('[data-dashboard-msg="error"]', root || document), "Unable to load account details.");
    }

    // 3) Bind user data (client auth)
    setText($('[data-auth="email"]', root || document), user.email);
    setText($('[data-auth="uid"]', root || document), user.uid);

    // 4) Bind server-verified data if available
    // Add these optional elements in Webflow:
    // - [data-auth="roles"]
    // - [data-auth="serverEmail"]
    if (me) {
      setText($('[data-auth="serverEmail"]', root || document), me.email);
      setText($('[data-auth="roles"]', root || document), Array.isArray(me.roles) ? me.roles.join(", ") : "");
    }

    // 5) Logout button hook
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
