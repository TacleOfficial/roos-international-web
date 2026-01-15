// src/auth/auth.client.js
(function () {
    window.Roos = window.Roos || {};
    window.Roos.auth = window.Roos.auth || {};
  
    function requireFirebase() {
      const fb = window.Roos.firebase;
      if (!fb || !fb.auth || !fb.authMod) throw new Error("Firebase not ready");
      return fb;
    }

    async function sendPasswordReset(email) {
      const fb = requireFirebase();
      const { sendPasswordResetEmail } = fb.authMod;
      await sendPasswordResetEmail(fb.auth, email);
      return true;
    }
    
  
    async function register(email, password) {
      const fb = requireFirebase();
      const { createUserWithEmailAndPassword } = fb.authMod;
      const cred = await createUserWithEmailAndPassword(fb.auth, email, password);
      return cred.user;
    }
  
    async function login(email, password) {
      const fb = requireFirebase();
      const { signInWithEmailAndPassword } = fb.authMod;
      const cred = await signInWithEmailAndPassword(fb.auth, email, password);
      return cred.user;
    }
  
    async function logout() {
      const fb = requireFirebase();
      const { signOut } = fb.authMod;
      await signOut(fb.auth);
    }
  
    function onAuthStateChanged(cb) {
      const fb = requireFirebase();
      const { onAuthStateChanged } = fb.authMod;
      return onAuthStateChanged(fb.auth, cb);
    }
  
    function redirectTo(url) {
      window.location.assign(url);
    }
  
    window.Roos.auth = { register, login, logout, onAuthStateChanged, redirectTo, sendPasswordReset };
  })();
  