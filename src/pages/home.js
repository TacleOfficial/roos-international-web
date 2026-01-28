// src/pages/home.js
(function () {
  const log = (...a) => console.log("[Roos][Home]", ...a);

  function hasStoriesDom() {
    return !!document.querySelector('[data-stories="rail"]');
  }

  function loadScript(relPathFromSrc) {
    return new Promise((resolve, reject) => {
      const ENV = window.Roos?._env || "dev";
      const REF = window.Roos?._ref || "main";
      const CACHE = (ENV === "dev") ? ("?v=" + Date.now()) : "";

      const url =
        "https://cdn.jsdelivr.net/gh/TacleOfficial/roos-international-web@" +
        REF +
        "/src/" +
        relPathFromSrc +
        CACHE;

      const s = document.createElement("script");
      s.src = url;
      s.defer = true;
      s.onload = resolve;
      s.onerror = (e) => reject({ url, e });
      document.head.appendChild(s);
    });
  }

  async function init() {
    // Home is public, so no requireAuth()

    // ✅ Stories (only if section exists)
    if (hasStoriesDom()) {
      try {
        // This is the stories entrypoint you already have (from earlier)
        await loadScript("pages/stories/stories.bootstrap.js");
      } catch (err) {
        console.error("[Roos][Home] Failed to load stories:", err);
      }
    }

    // Future home features go here:
    // if (document.querySelector('[data-hero-anim]')) await loadScript("pages/home/home.hero.js");
    // if (document.querySelector('[data-news]')) await loadScript("pages/home/home.news.js");

    log("Initialized ✅");
  }

  // Wait for global-ready (so Roos._env/_ref are set)
  if (window.Roos?._globalReady) init();
  else window.addEventListener("roos:global-ready", init, { once: true });
})();
