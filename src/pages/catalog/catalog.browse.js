// src/pages/catalog/catalog.browse.js
(function () {
  const log = (...a) => console.log("[Roos][Catalog][Browse]", ...a);

  const CATEGORIES = [
    { slug: "acoustical-products", name: "Acoustical Products" },
    { slug: "architectural-panels", name: "Architectural Panels" },
    { slug: "laminates-veneers", name: "Laminates & Veneers" },
    { slug: "specialty-products", name: "Specialty Products" },
    { slug: "wallcovering", name: "Wallcovering" },
    { slug: "digital-prints", name: "Digital Prints" },
  ];

  const state = {
    cat: null,
    vendor: null,
    collection: null,
    cursor: null,
    hasMore: false,
    loading: false,
    selectors: null,
    root: null,
  };

  function getParams() {
    const p = new URLSearchParams(location.search);
    return {
      cat: p.get("cat") || null,
      vendor: p.get("vendor") || null,
      collection: p.get("collection") || null,
    };
  }

  function setParams(next) {
    const p = new URLSearchParams(location.search);
    Object.entries(next).forEach(([k, v]) => {
      if (!v) p.delete(k);
      else p.set(k, v);
    });
    history.pushState({}, "", `/products?${p.toString()}`);
  }

  function buildFromQueryString() {
    // preserve current browse state for back-navigation
    const p = new URLSearchParams();
    if (state.cat) p.set("cat", state.cat);
    if (state.vendor) p.set("vendor", state.vendor);
    if (state.collection) p.set("collection", state.collection);
    return p.toString(); // e.g. cat=...&vendor=...&collection=...
  }

  async function renderCategories() {
    const ui = window.Roos.catalog.ui;
    const { cloneTemplate, clear, setText } = ui;

    const wrap = ui.$(state.selectors.categoryBar, state.root);
    clear(wrap);

    CATEGORIES.forEach(c => {
      const node = cloneTemplate(state.selectors.tplCategory, state.root);
      setText(node, '[data-bind="name"]', c.name);

      if (state.cat === c.slug) node.setAttribute("aria-current", "true");
      else node.removeAttribute("aria-current");

      node.addEventListener("click", () => {
        state.cat = c.slug;
        state.vendor = null;
        state.collection = null;
        state.cursor = null;
        state.hasMore = false;

        setParams({ cat: state.cat, vendor: null, collection: null });
        initVendors();
      });

      wrap.appendChild(node);
    });
  }

  async function initVendors() {
    const ui = window.Roos.catalog.ui;
    const db = window.Roos.catalog.db;
    const { cloneTemplate, clear, setText, setImg } = ui;

    const vendorWrap = ui.$(state.selectors.vendorList, state.root);
    const collWrap = ui.$(state.selectors.collectionList, state.root);
    const gridWrap = ui.$(state.selectors.productGrid, state.root);

    clear(vendorWrap);
    clear(collWrap);
    clear(gridWrap);

    if (!state.cat) return;

    const vendors = await db.listVendorsByCategory(state.cat);

    vendors.forEach(v => {
      const node = cloneTemplate(state.selectors.tplVendor, state.root);
      setText(node, '[data-bind="name"]', v.name);
      setImg(node, '[data-bind="logo"]', v.logo || "", v.name);

      node.addEventListener("click", () => {
        state.vendor = v.slug;
        state.collection = null;
        state.cursor = null;
        state.hasMore = false;

        setParams({ cat: state.cat, vendor: state.vendor, collection: null });
        initCollections();
      });

      vendorWrap.appendChild(node);
    });

    if (state.vendor) await initCollections();
  }

  async function initCollections() {
    const ui = window.Roos.catalog.ui;
    const db = window.Roos.catalog.db;
    const { cloneTemplate, clear, setText, setImg } = ui;

    const collWrap = ui.$(state.selectors.collectionList, state.root);
    const gridWrap = ui.$(state.selectors.productGrid, state.root);

    clear(collWrap);
    clear(gridWrap);

    if (!state.vendor) return;

    const cols = await db.listCollectionsByVendorSlug(state.vendor);

    cols.forEach(c => {
      const node = cloneTemplate(state.selectors.tplCollection, state.root);
      setText(node, '[data-bind="name"]', c.name);
      setImg(node, '[data-bind="thumb"]', c.heroImage || "", c.name);

      node.addEventListener("click", () => {
        state.collection = c.slug;
        state.cursor = null;
        state.hasMore = false;

        setParams({ cat: state.cat, vendor: state.vendor, collection: state.collection });
        loadProducts(true);
      });

      collWrap.appendChild(node);
    });

    if (state.collection) await loadProducts(true);
  }

  async function loadProducts(reset) {
    if (state.loading) return;
    state.loading = true;

    const ui = window.Roos.catalog.ui;
    const db = window.Roos.catalog.db;
    const { cloneTemplate, setText, setImg, clear, makeChip } = ui;

    const gridWrap = ui.$(state.selectors.productGrid, state.root);
    const btnMore = ui.$(state.selectors.loadMore, state.root);
    const resultsCount = ui.$(state.selectors.resultsCount, state.root);

    if (reset) {
      clear(gridWrap);
      state.cursor = null;
    }

    if (!state.collection) {
      state.loading = false;
      if (btnMore) btnMore.style.display = "none";
      return;
    }

    const { items, nextCursor, hasMore } =
      await db.listProductsByCollectionSlugPaged(state.collection, {
        pageSize: 24,
        cursor: state.cursor
      });

    // Optional: update count display incrementally
    if (resultsCount) {
      const current = gridWrap.children.length;
      resultsCount.textContent = `(${current + items.length}${hasMore ? "+" : ""})`;
    }

    console.log("[Roos][Catalog] product media check:", {
      id: p.id,
      name: p.name,
      media: p.media,
      hero: p.media?.hero,
      firstImage: p.media?.images?.[0],
    });


    items.forEach(p => {
      const card = cloneTemplate(state.selectors.tplProductCard, state.root);

      const hero = p.media?.hero || p.media?.images?.[0] || "";
      setImg(card, '[data-bind="thumb"]', hero, p.name || "");
      setText(card, '[data-bind="name"]', p.name || "");

      // Chips (AI tags later)
      const chipsWrap = card.querySelector('[data-bind="chips"]');
      if (chipsWrap) {
        chipsWrap.textContent = "";
        const tags = p.tags || p.search?.tags || [];
        tags.slice(0, 3).forEach(t => chipsWrap.appendChild(makeChip(t)));
      }

      // IMPORTANT: link to /item and preserve where user came from
      const fromQS = buildFromQueryString();
      card.href = `/item?id=${encodeURIComponent(p.id)}&from=${encodeURIComponent(fromQS)}`;

      gridWrap.appendChild(card);
    });

    state.cursor = nextCursor;
    state.hasMore = hasMore;

    if (btnMore) {
      btnMore.style.display = hasMore ? "" : "none";
      btnMore.onclick = () => loadProducts(false);
    }

    state.loading = false;
  }

  function syncFromUrl() {
    const p = getParams();
    state.cat = p.cat;
    state.vendor = p.vendor;
    state.collection = p.collection;
  }

  async function init(opts) {
    state.root = opts?.root || document;
    state.selectors = opts?.selectors || {};
    syncFromUrl();

    await renderCategories();
    if (state.cat) await initVendors();

    // handle browser back/forward
    window.addEventListener("popstate", () => {
      syncFromUrl();
      renderCategories().then(() => {
        if (state.cat) initVendors();
      });
    });

    log("Initialized ✅", { ...state });
  }

  window.Roos = window.Roos || {};
  window.Roos.catalog = window.Roos.catalog || {};
  window.Roos.catalog.browse = { init };
})();
