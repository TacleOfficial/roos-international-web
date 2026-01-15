// src/auth/auth.ui.js
(function () {
    window.Roos = window.Roos || {};
    window.Roos.ui = window.Roos.ui || {};
    const { $, $all } = window.Roos.dom;
  
    function setVisible(el, visible) {
      if (!el) return;
      el.style.display = visible ? "" : "none";
    }
  
    // Generic state toggler:
    // - [data-auth-state="idle|loading|success|error"]
    // - [data-auth-msg="success|error"] (text container)
    function setAuthState(root, state, message) {
      const states = $all("[data-auth-state]", root);
      states.forEach((el) => setVisible(el, el.getAttribute("data-auth-state") === state));
  
      if (state === "success") {
        const msg = root.querySelector('[data-auth-msg="success"]');
        if (msg && typeof message === "string") msg.textContent = message;
      }
      if (state === "error") {
        const msg = root.querySelector('[data-auth-msg="error"]');
        if (msg && typeof message === "string") msg.textContent = message;
      }
    }
  
    // Map Firebase errors to friendly messages (keep simple for now)
    function friendlyAuthError(err, context) {
      const code = (err && err.code) || "";
      const message = (err && err.message) || "";
    
      // Normalize a few variants (some environments differ)
      const normalized = String(code).toLowerCase();
    
      // ---- LOGIN ----
      if (context === "login") {
        // Newer common codes
        if (normalized.includes("auth/invalid-credential")) return "Email or password is incorrect. Try again.";
        if (normalized.includes("auth/invalid-login-credentials")) return "Email or password is incorrect. Try again.";
    
        // Older / classic codes
        if (normalized.includes("auth/user-not-found")) return "Account does not exist. Try again or create an account.";
        if (normalized.includes("auth/wrong-password")) return "Password is not correct. Try again.";
    
        if (normalized.includes("auth/user-disabled")) return "This account has been disabled. Contact support.";
        if (normalized.includes("auth/too-many-requests")) return "Too many attempts. Please wait a moment and try again.";
      }
    
      // ---- REGISTER ----
      if (context === "register") {
        if (normalized.includes("auth/email-already-in-use")) return "An account with that email already exists. Try signing in instead.";
        if (normalized.includes("auth/weak-password")) return "Password is too weak. Use at least 6 characters (more is better).";
        if (normalized.includes("auth/operation-not-allowed")) return "Email/password sign-up is disabled. Contact support.";
      }
    
      // ---- RESET PASSWORD ----
      if (context === "reset") {
        if (normalized.includes("auth/user-not-found")) return "No account found with that email. Try again or create an account.";
        if (normalized.includes("auth/too-many-requests")) return "Too many requests. Please wait and try again.";
      }
    
      // ---- SHARED ----
      if (normalized.includes("auth/invalid-email")) return "Please enter a valid email address.";
      if (normalized.includes("auth/missing-email")) return "Please enter your email address.";
      if (normalized.includes("auth/missing-password")) return "Please enter a password.";
      if (normalized.includes("auth/network-request-failed")) return "Network error. Check your connection and try again.";
    
      // If Firebase gives a message but no mapped code, still keep user-friendly
      if (message && message.toLowerCase().includes("password")) return "Password is not correct. Try again.";
    
      return "Something went wrong. Please try again.";
    }
    

    function bindBackToIdle(root) {
      if (!root) return;
      const btns = root.querySelectorAll('[data-auth-action="back-to-idle"]');
      btns.forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          setAuthState(root, "idle");
        });
      });
    }
    
  
    window.Roos.ui = { setAuthState, friendlyAuthError, bindBackToIdle };
  })();
  