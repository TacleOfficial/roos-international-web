// src/pages/catalog/catalog.bootstrap.js
(function () {
  const log = (...a) => console.log("[Roos][Catalog][Boot]", ...a);

  // Page exists if either browse DOM or item DOM exists
  function hasDom() {
    return hasBrowseDom() || hasItemDom();
  }

  function hasBrowseDom() {
    return !!document.querySelector('[data-catalog="productGrid"]')
        || !!document.querySelector('[data-catalog="categoryBar"]');
  }

  function hasItemDom() {
    return !!document.querySelector('[data-item="title"]')
        || !!document.querySelector('[data-item="hero"]');
  }

  function loadFromCatalog(path) {
    return new Promise((resolve, reject) => {
      const ENV = window.Roos?._env || "dev";
      const REF = window.Roos?._ref || "main";
      const CACHE = (ENV === "dev") ? ("?v=" + Date.now()) : "";

      const url =
        "https://cdn.jsdelivr.net/gh/TacleOfficial/roos-international-web@" +
        REF +
        "/src/pages/catalog/" +
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
    if (window.Roos._catalogLoaded) return;
    window.Roos._catalogLoaded = true;

    try {
      // Always load data + UI helpers
      await loadFromCatalog("catalog.data.firebase.js");
      await loadFromCatalog("catalog.ui.js");

      // Conditionally load controller(s)
      if (hasBrowseDom()) {
        await loadFromCatalog("catalog.browse.js");
      }

      if (hasItemDom()) {
        await loadFromCatalog("catalog.item.js");
      }

      // Init browse
      if (hasBrowseDom()) {
        if (!window.Roos?.catalog?.browse?.init) {
          console.warn("[Roos][Catalog] catalog.browse.init not found");
        } else {
          window.Roos.catalog.browse.init({
            root: document,
            selectors: {
              categoryBar: '[data-catalog="categoryBar"]',
              vendorList: '[data-catalog="vendorList"]',
              collectionList: '[data-catalog="collectionList"]',
              productGrid: '[data-catalog="productGrid"]',
              loadMore: '[data-catalog="loadMore"]',
              resultsCount: '[data-catalog="resultsCount"]',
              crumbs: '[data-catalog="crumbs"]',

              // Templates
              tplCategory: '[data-tpl="category"]',
              tplVendor: '[data-tpl="vendor"]',
              tplCollection: '[data-tpl="collection"]',
              tplProductCard: '[data-tpl="productCard"]',
            }
          });

          log("Browse initialized ✅");
        }
      }

      // Init item
      if (hasItemDom()) {
        if (!window.Roos?.catalog?.item?.init) {
          console.warn("[Roos][Catalog] catalog.item.init not found");
        } else {
          window.Roos.catalog.item.init({
            root: document,
            selectors: {
              title: '[data-item="title"]',
              subTitle: '[data-item="subTitle"]',
              hero: '[data-item="hero"]',
              chips: '[data-item="chips"]',
              specs: '[data-item="specs"]',
              gallery: '[data-item="gallery"]',
              docs: '[data-item="docs"]',
              inspoGrid: '[data-item="inspoGrid"]',

              // Templates
              tplSpecRow: '[data-tpl="specRow"]',
              tplGalleryImg: '[data-tpl="galleryImg"]',
              tplDocLink: '[data-tpl="docLink"]',
              tplInspoImg: '[data-tpl="inspoImg"]',

              // Actions
              requestSample: '[data-item="requestSample"]',
              requestQuote: '[data-item="requestQuote"]',
              favorite: '[data-item="favorite"]',
              addToJob: '[data-item="addToJob"]',
            }
          });

          log("Item initialized ✅");
        }
      }

    } catch (err) {
      console.error("[Roos][Catalog] bootstrap failed:", err);
    }
  }

  // Wait for firebase (same as stories)
  if (window.Roos?.firebase?._initialized) init();
  else window.addEventListener("roos:firebase-ready", init, { once: true });
})();
