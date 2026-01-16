// src/loader/page-loader.js
(function () {
  /**
   * Universal page loader for Webflow.
   * Loads /src/pages/<page>.js after the global loader has finished.
   *
   * Webflow usage:
   * <script src=".../src/loader/page-loader.js" data-roos-page="login" defer></script>
   */

  // Grab the script tag this file is running from
  var tag = document.currentScript;
  if (!tag) {
    // fallback for older edge cases
    var list = document.querySelectorAll('script[src*="/src/loader/page-loader.js"]');
    tag = list[list.length - 1] || null;
  }
  if (!tag) {
    console.error("[Roos] page-loader: could not locate script tag");
    return;
  }

  var page = tag.getAttribute("data-roos-page");
  if (!page) {
    console.error("[Roos] page-loader: missing data-roos-page");
    return;
  }

  function loadPageScript() {
    window.Roos = window.Roos || {};
    window.Roos._pagesLoaded = window.Roos._pagesLoaded || {};

    // Prevent double-load
    if (window.Roos._pagesLoaded[page]) return;
    window.Roos._pagesLoaded[page] = true;

    // Inherit env/ref from global loader (source of truth)
    var ENV = window.Roos._env || "dev";
    var REF = window.Roos._ref || "main";

    // IMPORTANT:
    // - In DEV, the global loader uses cache-busting query params.
    // - We should do the same here to keep page scripts fresh too.
    var CACHE = (ENV === "dev") ? ("?v=" + Date.now()) : "";

    var url =
      "https://cdn.jsdelivr.net/gh/TacleOfficial/roos-international-web@" +
      REF +
      "/src/pages/" +
      page +
      ".js" +
      CACHE;

    var s = document.createElement("script");
    s.src = url;
    s.defer = true;
    s.onload = function () {
      console.log("[Roos] Page script loaded ✅", { page: page, env: ENV, ref: REF });
    };
    s.onerror = function (e) {
      console.error("[Roos] Failed to load page script:", url, e);
    };
    document.head.appendChild(s);
  }

  // Wait for global-ready so Roos._env/_ref are populated
  if (window.Roos && window.Roos._globalReady) loadPageScript();
  else window.addEventListener("roos:global-ready", loadPageScript, { once: true });
})();
