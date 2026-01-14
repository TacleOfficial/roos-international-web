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
    function friendlyAuthError(err) {
      const code = (err && err.code) || "";
      if (code.includes("auth/invalid-email")) return "Please enter a valid email.";
      if (code.includes("auth/wrong-password")) return "Incorrect password.";
      if (code.includes("auth/user-not-found")) return "No account found with that email.";
      if (code.includes("auth/email-already-in-use")) return "That email is already registered.";
      if (code.includes("auth/weak-password")) return "Password is too weak.";
      return "Something went wrong. Please try again.";
    }
  
    window.Roos.ui = { setAuthState, friendlyAuthError };
  })();
  