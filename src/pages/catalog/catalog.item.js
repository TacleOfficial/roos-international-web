// src/pages/catalog/catalog.item.js
(function () {
  const log = (...a) => console.log("[Roos][Catalog][Item]", ...a);

  function qs(name) {
    return new URLSearchParams(location.search).get(name);
  }

  function safeDate(v) {
    try {
      // Firestore Timestamp support
      if (v?.toDate) return v.toDate();
      if (typeof v === "number") return new Date(v);
      return v ? new Date(v) : null;
    } catch { return null; }
  }

  function renderSpecs(root, selectors, product) {
    const ui = window.Roos.catalog.ui;
    const wrap = ui.$(selectors.specs, root);
    if (!wrap) return;

    ui.clear(wrap);

    const tplSel = selectors.tplSpecRow;
    if (!tplSel) return;

    const add = (k, v) => {
      if (v === null || v === undefined || v === "") return;
      const row = ui.cloneTemplate(tplSel, root);
      ui.setText(row, '[data-bind="k"]', k);
      ui.setText(row, '[data-bind="v"]', String(v));
      wrap.appendChild(row);
    };

    add("Vendor", product.vendorSlug || product.vendorId || "");
    add("Collection", product.collectionSlug || product.collectionId || "");
    add("Fire rating", product.baseSpecs?.core?.fireRating || product.baseSpecs?.fireRating || "");
    add("Status", product.flags?.discontinued ? "Discontinued" : (product.isActive ? "Active" : "Inactive"));

    const updated = safeDate(product.search?.updatedAt || product.updatedAt || product.baseSpecs?.core?.createdAt);
    if (updated) add("Updated", updated.toLocaleDateString());
  }

  async function init(opts) {
    const root = opts?.root || document;
    const selectors = opts?.selectors || {};
    const ui = window.Roos.catalog.ui;
    const db = window.Roos.catalog.db;

    const productId = qs("id");
    const from = qs("from"); // cat=...&vendor=...&collection=...

    if (!productId) {
      console.warn("[Roos][Catalog][Item] Missing ?id=");
      return;
    }

    const product = await db.getProductById(productId);
    if (!product) {
      console.warn("[Roos][Catalog][Item] Product not found:", productId);
      return;
    }

    // Title
    const titleEl = ui.$(selectors.title, root);
    if (titleEl) titleEl.textContent = product.name || "";

    // Subtitle (vendor / collection)
    const sub = ui.$(selectors.subTitle, root);
    if (sub) {
      const a = product.vendorSlug || "";
      const b = product.collectionSlug || "";
      sub.textContent = [a, b].filter(Boolean).join(" • ");
    }

    // Hero
    const heroEl = ui.$(selectors.hero, root);
    if (heroEl && heroEl.tagName === "IMG") {
      const hero = product.media?.hero || product.media?.images?.[0] || "";
      heroEl.src = hero;
      heroEl.alt = product.name || "";
    }

    // Chips
    const chipsWrap = ui.$(selectors.chips, root);
    if (chipsWrap) {
      ui.clear(chipsWrap);
      const tags = product.tags || product.search?.tags || [];
      tags.forEach(t => chipsWrap.appendChild(ui.makeChip(t)));
    }

    // Gallery
    const galWrap = ui.$(selectors.gallery, root);
    if (galWrap && selectors.tplGalleryImg) {
      ui.clear(galWrap);
      const imgs = product.media?.images || [];
      imgs.slice(0, 16).forEach(url => {
        const img = ui.cloneTemplate(selectors.tplGalleryImg, root);
        // template is an <img>
        img.src = url;
        img.alt = product.name || "";
        img.loading = "lazy";
        galWrap.appendChild(img);
      });
    }

    // Specs
    renderSpecs(root, selectors, product);

    // Documents
    const docsWrap = ui.$(selectors.docs, root);
    if (docsWrap && selectors.tplDocLink) {
      ui.clear(docsWrap);

      const docs = product.docs || {};
      const docPairs = [
        ["Installation Guide", docs.installPdfUrl],
        ["Spec Sheet", docs.specSheetUrl],
        ["Care & Maintenance", docs.careUrl],
      ];

      docPairs.forEach(([label, href]) => {
        if (!href) return;
        const a = ui.cloneTemplate(selectors.tplDocLink, root);
        a.href = href;
        ui.setText(a, '[data-bind="label"]', label);
        docsWrap.appendChild(a);
      });
    }

    // Back behavior (optional):
    // If you add a button/anchor like <a data-item="backToResults">Back</a>
    // you can wire it like this:
    const backEl = root.querySelector('[data-item="backToResults"]');
    if (backEl && from) {
      backEl.href = `/products?${decodeURIComponent(from)}`;
    }

    // Actions (sample/quote/favorite) are next phase.
    // You can still wire buttons to open your modal or redirect.

    log("Initialized ✅", { productId, from });
  }

  window.Roos = window.Roos || {};
  window.Roos.catalog = window.Roos.catalog || {};
  window.Roos.catalog.item = { init };
})();
