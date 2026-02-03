// src/pages/catalog/catalog.page.category.js
(function () {
  const log = (...a) => console.log("[Roos][Catalog][CategoryPage]", ...a);

  const state = { root: null, selectors: null };

  function getCategorySlug() {
    const el = state.root.querySelector('[data-page="catalog-category"]');
    return el?.getAttribute("data-category-slug") || null;
  }

  async function init(opts) {
    state.root = opts?.root || document;
    state.selectors = opts?.selectors || {};

    const ui = window.Roos.catalog.ui;
    const db = window.Roos.catalog.db;
    const { cloneTemplate, clear, setText } = ui;

    const slug = getCategorySlug();
    if (!slug) {
      console.warn("[Roos][Catalog] Missing data-category-slug on category page");
      return;
    }

    const wrap = ui.$(state.selectors.vendorList, state.root);
    clear(wrap);

    const vendors = await db.listVendorsByCategory(slug);

    vendors.forEach(v => {
      const card = cloneTemplate(state.selectors.tplVendorCard, state.root);
      setText(card, '[data-bind="name"]', v.name);

      // go to vendor page (separate page)
      card.href = `/vendor?slug=${encodeURIComponent(v.slug)}&cat=${encodeURIComponent(slug)}`;

      wrap.appendChild(card);
    });

    log("Initialized ✅", { category: slug, vendors: vendors.length });
  }

  window.Roos = window.Roos || {};
  window.Roos.catalog = window.Roos.catalog || {};
  window.Roos.catalog.categoryPage = { init };
})();
