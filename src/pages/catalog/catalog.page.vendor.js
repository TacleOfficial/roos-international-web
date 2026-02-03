// src/pages/catalog/catalog.page.vendor.js
(function () {
  const log = (...a) => console.log("[Roos][Catalog][VendorPage]", ...a);
  const state = { root: null, selectors: null };

  function getParams() {
    const p = new URLSearchParams(location.search);
    return {
      slug: p.get("slug") || null,
      cat: p.get("cat") || null
    };
  }

  async function init(opts) {
    state.root = opts?.root || document;
    state.selectors = opts?.selectors || {};

    const ui = window.Roos.catalog.ui;
    const db = window.Roos.catalog.db;
    const { cloneTemplate, clear, setText, setImg } = ui;

    const { slug: vendorSlug, cat } = getParams();
    if (!vendorSlug) return;

    // header
    const vendor = await db.getVendorBySlug(vendorSlug);
    if (vendor) {
      setText(state.root, state.selectors.vendorTitle, vendor.name);
      setText(state.root, state.selectors.vendorSub, vendor.website || "");
    }

    const wrap = ui.$(state.selectors.collectionList, state.root);
    clear(wrap);

    const cols = await db.listCollectionsByVendorSlug(vendorSlug);

    cols.forEach(c => {
      const card = cloneTemplate(state.selectors.tplCollectionCard, state.root);
      setText(card, '[data-bind="name"]', c.name);
      setImg(card, 'img[data-bind="thumb"]', c.heroImage || "", c.name);

      card.href =
        `/collection?slug=${encodeURIComponent(c.slug)}` +
        `&vendor=${encodeURIComponent(vendorSlug)}` +
        (cat ? `&cat=${encodeURIComponent(cat)}` : "");

      wrap.appendChild(card);
    });

    log("Initialized ✅", { vendor: vendorSlug, collections: cols.length });
  }

  window.Roos = window.Roos || {};
  window.Roos.catalog = window.Roos.catalog || {};
  window.Roos.catalog.vendorPage = { init };
})();
