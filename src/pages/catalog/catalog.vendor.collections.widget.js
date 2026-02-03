(function () {
  const log = (...a) => console.log("[Roos][VendorCollections]", ...a);

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

  function getVendorSlug(wrap) {
    return wrap?.getAttribute("data-vendor-slug") || null;
  }

  function getLayout(wrap) {
    return wrap?.getAttribute("data-layout") || "grid";
  }

  function buildCollectionHref({ vendorSlug, collectionSlug }) {
    // simplest: go to products filtered
    const qs = new URLSearchParams();
    qs.set("vendor", vendorSlug);
    qs.set("collection", collectionSlug);
    return `/products?${qs.toString()}`;
  }

  async function initOne(wrap) {
    const ui = window.Roos.catalog.ui;
    const db = window.Roos.catalog.db;
    const { cloneTemplate, clear, setText, setImg } = ui;

    const vendorSlug = getVendorSlug(wrap);
    if (!vendorSlug) throw new Error("MISSING_VENDOR_SLUG");

    const list = $('[data-vendor-collections="list"]', wrap);
    if (!list) throw new Error("MISSING_LIST_CONTAINER");

    clear(list);

    const cols = await db.listCollectionsByVendorSlug(vendorSlug);

    cols.forEach(c => {
      const card = cloneTemplate('[data-tpl="collectionCard"]', wrap);
      setText(card, '[data-bind="name"]', c.name || "");
      setText(card, '[data-bind="desc"]', c.description || "");

      const thumb = c.heroImage || "https://placehold.co/800x600?text=Collection";
      setImg(card, 'img[data-bind="thumb"]', thumb, c.name || "");

      card.href = buildCollectionHref({ vendorSlug, collectionSlug: c.slug });
      list.appendChild(card);
    });

    // Layout hook (optional CSS based on wrap attribute)
    wrap.setAttribute("data-layout", getLayout(wrap));

    log("Initialized ✅", { vendorSlug, collections: cols.length });
  }

  async function init(opts) {
    const root = opts?.root || document;
    const wraps = $all('[data-vendor-collections="wrap"]', root);
    if (!wraps.length) return;

    for (const w of wraps) {
      try { await initOne(w); }
      catch (e) { console.error("[Roos][VendorCollections] failed:", e); }
    }
  }

  window.Roos = window.Roos || {};
  window.Roos.catalog = window.Roos.catalog || {};
  window.Roos.catalog.vendorCollections = { init };
})();
