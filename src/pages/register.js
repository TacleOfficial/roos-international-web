// src/pages/register.js
(function () {
    const DASHBOARD_URL = "/dashboard";
    const root = document.querySelector('[data-auth-root="register"]');
    if (!root) return;
  
    const { setAuthState, friendlyAuthError } = window.Roos.ui;
  
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
        window.Roos.auth.redirectTo(DASHBOARD_URL);
      } catch (err) {
        setAuthState(root, "error", friendlyAuthError(err));
      }
    }
  
    // Wait for Firebase to be ready before wiring handlers
    function init() {
      setAuthState(root, "idle");
      const btn = root.querySelector('[data-auth-action="register"]');
      if (btn) btn.addEventListener("click", (e) => { e.preventDefault(); handleRegister(); });
    }
  
    if (window.Roos?.firebase?._initialized) init();
    else window.addEventListener("roos:firebase-ready", init, { once: true });
  })();
  