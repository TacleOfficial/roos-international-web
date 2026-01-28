// src/pages/stories/stories.bootstrap.js
(function () {
  const log = (...a) => console.log("[Roos][Stories][Boot]", ...a);

  function hasDom() {
    return !!document.querySelector('[data-stories="rail"]');
  }

  function loadFromStories(path) {
    return new Promise((resolve, reject) => {
      const ENV = window.Roos?._env || "dev";
      const REF = window.Roos?._ref || "main";
      const CACHE = (ENV === "dev") ? ("?v=" + Date.now()) : "";

      const url =
        "https://cdn.jsdelivr.net/gh/TacleOfficial/roos-international-web@" +
        REF +
        "/src/pages/stories/" +
        path +
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
    if (!hasDom()) return;

    window.Roos = window.Roos || {};
    if (window.Roos._storiesLoaded) return;
    window.Roos._storiesLoaded = true;

    try {
      await loadFromStories("stories.data.firebase.js");
      await loadFromStories("stories.ui.rail.js");
      await loadFromStories("stories.viewer.lightbox.js");

      if (!window.Roos?.stories?.init) {
        console.warn("[Roos][Stories] stories.init not found");
        return;
      }

      window.Roos.stories.init({
        root: document,
        selectors: {
          rail: '[data-stories="rail"]',
          template: '[data-story="card-template"]',
          prevBtn: '[data-stories-action="prev"]',
          nextBtn: '[data-stories-action="next"]',
          lightbox: '[data-story-lightbox]'
        }
      });

      log("Initialized ✅");
    } catch (err) {
      console.error("[Roos][Stories] bootstrap failed:", err);
    }
  }

  // wait for firebase (since data layer depends on it)
  if (window.Roos?.firebase?._initialized) init();
  else window.addEventListener("roos:firebase-ready", init, { once: true });
})();
