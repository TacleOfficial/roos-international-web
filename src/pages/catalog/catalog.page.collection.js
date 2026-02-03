// src/pages/catalog/catalog.page.collection.js
(function () {
  const log = (...a) => console.log("[Roos][Catalog][CollectionPage]", ...a);
  const state = { root: null, selectors: null };

  function getParams() {
    const p = new URLSearchParams(location.search);
    return {
      slug: p.get("slug") || null,
      vendor: p.get("vendor") || null,
      cat: p.get("cat") || null
    };
  }

  async function init(opts) {
    state.root = opts?.root || document;
    state.selectors = opts?.selectors || {};

    const ui = window.Roos.catalog.ui;
    const db = window.Roos.catalog.db;
    const { setText, setImg, cloneTemplate, clear } = ui;

    const { slug: collectionSlug, vendor: vendorSlug, cat } = getParams();
    if (!collectionSlug || !vendorSlug) return;

    const col = await db.getCollectionBySlug(vendorSlug, collectionSlug);
    if (col) {
      setText(state.root, state.selectors.title, col.name || "");
      setText(state.root, state.selectors.desc, col.description || "");
      setImg(state.root, state.selectors.hero, col.heroImage || "", col.name || "");
    }

    // Browse button → /products with filters
    const btn = ui.$(state.selectors.browseBtn, state.root);
    if (btn) {
      const qs = new URLSearchParams();
      if (cat) qs.set("cat", cat);
      qs.set("vendor", vendorSlug);
      qs.set("collection", collectionSlug);
      btn.addEventListener("click", () => {
        location.href = `/products?${qs.toString()}`;
      });
    }

    // Optional: preview first 6 products
    const previewWrap = ui.$(state.selectors.previewGrid, state.root);
    if (previewWrap) {
      clear(previewWrap);
      const { items } = await db.listProductsByCollectionSlugPaged(collectionSlug, { pageSize: 6 });

      items.forEach(p => {
        const card = cloneTemplate(state.selectors.tplPreviewCard, state.root);

        const media = p.media || p.baseSpecs?.media || null;
        const hero = media?.hero || media?.images?.[0] || "https://placehold.co/800x800?text=No+Image";

        setImg(card, 'img[data-bind="thumb"]', hero, p.name || "");
        setText(card, '[data-bind="name"]', p.name || "");

        const from = new URLSearchParams();
        if (cat) from.set("cat", cat);
        from.set("vendor", vendorSlug);
        from.set("collection", collectionSlug);

        card.href = `/item?id=${encodeURIComponent(p.id)}&from=${encodeURIComponent(from.toString())}`;
        previewWrap.appendChild(card);
      });
    }

    log("Initialized ✅", { vendor: vendorSlug, collection: collectionSlug });
  }

  window.Roos = window.Roos || {};
  window.Roos.catalog = window.Roos.catalog || {};
  window.Roos.catalog.collectionPage = { init };
})();
