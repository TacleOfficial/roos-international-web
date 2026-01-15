// src/pages/register.js
(function () {
    const DASHBOARD_URL = "/dashboard";
    const root = document.querySelector('[data-auth-root="register"]');
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
      // Wait until global scripts (ui/auth) are ready
      await waitFor(() => window.Roos && window.Roos.ui && window.Roos.auth, "roos:global-ready");
      // Wait until firebase is initialized
      await waitFor(() => window.Roos && window.Roos.firebase && window.Roos.firebase._initialized, "roos:firebase-ready");
  
      const { setAuthState, friendlyAuthError, bindBacktoIdle } = window.Roos.ui;
      bindBackToIdle(root);
  
      function getVal(name) {
        const el = root.querySelector(`[data-auth-input="${name}"]`);
        return el ? String(el.value || "").trim() : "";
      }
  
      async function handleRegister() {
        try {
          setAuthState(root, "loading");
          const email = getVal("email");
          const password = getVal("password");
  
          if (!email || !password) {
            setAuthState(root, "error", "Email and password are required.");
            return;
          }
  
          await window.Roos.auth.register(email, password);
          setAuthState(root, "success", "Account created! Redirecting…");
          //window.Roos.auth.redirectTo(DASHBOARD_URL);
          setTimeout(() => window.Roos.auth.redirectTo(DASHBOARD_URL), 550);
        } catch (err) {
          setAuthState(root, "error", friendlyAuthError(err, "register"));
        }
      }
  
      // If already logged in, go to dashboard
      if (window.Roos.guards && window.Roos.guards.redirectIfAuthed) {
        window.Roos.guards.redirectIfAuthed();
      }
  
      setAuthState(root, "idle");
      const btn = root.querySelector('[data-auth-action="register"]');
      if (btn) btn.addEventListener("click", (e) => { e.preventDefault(); handleRegister(); });
    }
  
    boot().catch((e) => console.error("register boot failed:", e));
  })();