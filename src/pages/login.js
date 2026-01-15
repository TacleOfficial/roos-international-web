// src/pages/login.js
(function () {
  const DASHBOARD_URL = "/dashboard";
  const root = document.querySelector('[data-auth-root="login"]');
  if (!root) return;

  function waitFor(conditionFn, eventName) {
    return new Promise((resolve) => {
      if (conditionFn()) return resolve();
      const onReady = () => {
        if (conditionFn()) {
          window.removeEventListener(eventName, onReady);
          resolve();
        }
      };
      window.addEventListener(eventName, onReady);
    });
  }

  async function boot() {
    // Wait until global scripts (ui/auth/guards) are ready
    await waitFor(() => window.Roos && window.Roos.ui && window.Roos.auth, "roos:global-ready");
    // Wait until firebase is initialized
    await waitFor(() => window.Roos && window.Roos.firebase && window.Roos.firebase._initialized, "roos:firebase-ready");

    const { setAuthState, friendlyAuthError } = window.Roos.ui;

    function getVal(name) {
      const el = root.querySelector(`[data-auth-input="${name}"]`);
      return el ? String(el.value || "").trim() : "";
    }

    async function handleLogin() {
      try {
        setAuthState(root, "loading");
        const email = getVal("email");
        const password = getVal("password");

        if (!email || !password) {
          setAuthState(root, "error", "Email and password are required.");
          return;
        }

        await window.Roos.auth.login(email, password);
        setAuthState(root, "success", "Welcome back! Redirecting…");
        //window.Roos.auth.redirectTo(DASHBOARD_URL);
        setTimeout(() => window.Roos.auth.redirectTo(DASHBOARD_URL), 550);
      } catch (err) {
        setAuthState(root, "error", friendlyAuthError(err));
      }
    }

    // If already logged in, go to dashboard
    if (window.Roos.guards && window.Roos.guards.redirectIfAuthed) {
      window.Roos.guards.redirectIfAuthed();
    }

    setAuthState(root, "idle");
    const btn = root.querySelector('[data-auth-action="login"]');
    if (btn) btn.addEventListener("click", (e) => { e.preventDefault(); handleLogin(); });
  }

  boot().catch((e) => console.error("login boot failed:", e));
})();
