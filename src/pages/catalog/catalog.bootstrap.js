// src/pages/catalog/catalog.bootstrap.js
(function () {
  const log = (...a) => console.log("[Roos][Catalog][Boot]", ...a);

  function has(sel) { return !!document.querySelector(sel); }

  const SEL = {
    browse: '[data-page="catalog-browse"]',            // /products
    category: '[data-page="catalog-category"]',        // /laminates-veneers etc
    vendor: '[data-page="catalog-vendor"]',            // /vendor (old route)
    collection: '[data-page="catalog-collection"]',    // /collection (old route)
    vendorCollections: '[data-vendor-collections="wrap"]' // /vendors/<slug> landing pages
    // item: '[data-page="catalog-item"]'              // /item later
  };

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
    // ✅ IMPORTANT: include vendorCollections so vendor landing pages run
    if (
      !has(SEL.browse) &&
      !has(SEL.category) &&
      !has(SEL.vendor) &&
      !has(SEL.collection) &&
      !has(SEL.vendorCollections)
    ) return;

    window.Roos = window.Roos || {};
    if (window.Roos._catalogLoaded) return;
    window.Roos._catalogLoaded = true;

    try {
      // Shared layers
      await loadFromCatalog("catalog.data.firebase.js");
      await loadFromCatalog("catalog.ui.js");

      // Load only what the page needs
      if (has(SEL.browse)) await loadFromCatalog("catalog.browse.js");
      if (has(SEL.category)) await loadFromCatalog("catalog.page.category.js");
      if (has(SEL.vendor)) await loadFromCatalog("catalog.page.vendor.js");
      if (has(SEL.collection)) await loadFromCatalog("catalog.page.collection.js");
      if (has(SEL.vendorCollections)) await loadFromCatalog("catalog.vendor.collections.widget.js");

      // ---- INIT (after scripts are loaded) ----

      if (has(SEL.browse) && window.Roos?.catalog?.browse?.init) {
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
            searchInput: '[data-catalog="searchInput"]',
            tplCategory: '[data-tpl="category"]',
            tplVendor: '[data-tpl="vendor"]',
            tplCollection: '[data-tpl="collection"]',
            tplProductCard: '[data-tpl="productCard"]'
          }
        });
        log("Browse initialized ✅");
      }

      if (has(SEL.category) && window.Roos?.catalog?.categoryPage?.init) {
        window.Roos.catalog.categoryPage.init({
          root: document,
          selectors: {
            vendorList: '[data-catalog="vendorList"]',
            tplVendorCard: '[data-tpl="vendorCard"]'
          }
        });
        log("Category page initialized ✅");
      }

      if (has(SEL.vendorCollections) && window.Roos?.catalog?.vendorCollections?.init) {
        window.Roos.catalog.vendorCollections.init({ root: document });
        log("Vendor collections widget initialized ✅");
      }

      if (has(SEL.vendor) && window.Roos?.catalog?.vendorPage?.init) {
        window.Roos.catalog.vendorPage.init({
          root: document,
          selectors: {
            vendorTitle: '[data-bind="vendorTitle"]',
            vendorSub: '[data-bind="vendorSub"]',
            vendorWeb: '[data-bind="vendorWeb"]', // ✅ add this
            collectionList: '[data-catalog="collectionList"]',
            tplCollectionCard: '[data-tpl="collectionCard"]'
          }
        });
        log("Vendor page initialized ✅");
      }

      if (has(SEL.collection) && window.Roos?.catalog?.collectionPage?.init) {
        window.Roos.catalog.collectionPage.init({
          root: document,
          selectors: {
            title: '[data-bind="collectionTitle"]',
            desc: '[data-bind="collectionDesc"]',
            hero: 'img[data-bind="collectionHero"]',
            browseBtn: '[data-action="browseProducts"]',
            previewGrid: '[data-catalog="previewGrid"]',
            tplPreviewCard: '[data-tpl="previewCard"]'
          }
        });
        log("Collection page initialized ✅");
      }

    } catch (err) {
      console.error("[Roos][Catalog] bootstrap failed:", err);
    }
  }

  // wait for firebase
  if (window.Roos?.firebase?._initialized) init();
  else window.addEventListener("roos:firebase-ready", init, { once: true });
})();
