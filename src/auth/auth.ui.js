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
    // src/auth/auth.ui.js (replace friendlyAuthError)
    function friendlyAuthError(err, context) {
      const code = (err && err.code) || "";
      const msg = (err && err.message) || "";

      // context can be: "login" | "register" | "reset"
      // (optional; helps us tailor the messaging)

      // LOGIN-SPECIFIC
      if (code === "auth/user-not-found") return "Account does not exist. Try again or create an account.";
      if (code === "auth/wrong-password") return "Password is not correct. Try again.";
      if (code === "auth/invalid-credential") return "Email or password is incorrect. Try again."; // newer SDKs
      if (code === "auth/too-many-requests") return "Too many attempts. Please wait a moment and try again.";

      // REGISTER-SPECIFIC
      if (code === "auth/email-already-in-use") return "An account with that email already exists. Try signing in instead.";
      if (code === "auth/weak-password") return "Password is too weak. Use at least 6 characters (more is better).";

      // SHARED / INPUT
      if (code === "auth/invalid-email") return "Please enter a valid email address.";
      if (code === "auth/missing-password") return "Please enter a password.";
      if (code === "auth/network-request-failed") return "Network error. Check your connection and try again.";

      // RESET PASSWORD
      if (context === "reset" && code === "auth/user-not-found") {
        // Privacy-friendly option would be generic; but you asked for specific messaging.
        return "No account found with that email. Try again or create an account.";
      }

      // Fallback
      if (msg && msg.toLowerCase().includes("blocked")) return "This action is blocked. Please contact support.";
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
  