// src/api/api.client.js
(function () {
  window.Roos = window.Roos || {};
  window.Roos.api = window.Roos.api || {};

  // TODO: replace with your deployed function URL
  const BASE_URL = "https://us-central1-roos-international-2026.cloudfunctions.net/api";

  async function getIdToken() {
    const fb = window.Roos?.firebase;
    const auth = fb?.auth;
    if (!auth) throw new Error("firebase auth not ready");

    const user = auth.currentUser;
    if (!user) throw new Error("not_authenticated");

    // Force refresh false (cached token usually fine)
    return await user.getIdToken(false);
  }

  async function request(path, { method = "GET", body } = {}) {
    const token = await getIdToken();
    const res = await fetch(BASE_URL + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data?.error || "api_error");
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  window.Roos.api = { request };
})();
