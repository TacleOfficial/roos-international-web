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

  // Supports both:
  // vendor.media.hero = "https://.../hero.jpg"  (legacy string)
  // vendor.media.hero = { type:"video"|"image", src:"...", poster:"..." } (new standard)
  function normalizeHero(vendor) {
    const m = vendor?.media || {};
    const hero = m.hero;

    // New object format
    if (hero && typeof hero === "object") {
      return {
        type: hero.type || "image",
        src: hero.src || "",
        poster: hero.poster || ""
      };
    }

    // Legacy string format (treat as image)
    if (typeof hero === "string" && hero) {
      return { type: "image", src: hero, poster: "" };
    }

    // Fallback to thumb, then logo
    const fallback = m.thumb || m.logo || "";
    return { type: "image", src: fallback, poster: "" };
  }

  function renderVendorHero({ ui, root, vendor }) {
    const hero = normalizeHero(vendor);

    // You should have BOTH on the page:
    // <video data-bind="vendorHeroVideo" ...></video>
    // <img data-bind="vendorHeroImage" ... />
    const videoEl = root.querySelector('[data-bind="vendorHeroVideo"]');
    const imgEl = root.querySelector('img[data-bind="vendorHeroImage"]');

    // If hero is video and we have a video element
    if (hero.type === "video" && hero.src && videoEl) {
      videoEl.muted = true;           // enforce
      videoEl.autoplay = true;
      videoEl.loop = true;
      videoEl.playsInline = true;

      videoEl.src = hero.src;
      if (hero.poster) videoEl.poster = hero.poster;

      videoEl.style.display = "";
      if (imgEl) imgEl.style.display = "none";

      requestAnimationFrame(() => {
        const playPromise = videoEl.play();
        if (playPromise?.catch) {
          playPromise.catch(() => {
            // Autoplay blocked → keep poster visible
            videoEl.pause();
          });
        }
      });

      return;
    }


    // Otherwise render as image (or fallback)
    const imgSrc = hero.src || "https://placehold.co/1600x900?text=Vendor+Hero";
    if (imgEl) {
      // show image, hide video
      imgEl.style.display = "";
      if (videoEl) videoEl.style.display = "none";

      // Use your UI helper (supports passing a root node too)
      ui.setImg(imgEl, null, imgSrc, vendor?.name || "");
    } else {
      // Backward compat: if you still have old markup <img data-bind="vendorHero">
      ui.setImg(root, 'img[data-bind="vendorHero"]', imgSrc, vendor?.name || "");
      if (videoEl) videoEl.style.display = "none";
    }
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
      setText(state.root, state.selectors.vendorSub, vendor.tagline || "");
      setText(state.root, state.selectors.vendorWeb, vendor.website || "");

      const logo = vendor.media?.logo || "";
      if (logo) ui.setImg(state.root, 'img[data-bind="vendorLogo"]', logo, vendor.name + " logo");

      // ✅ NEW: hero supports video OR image
      renderVendorHero({ ui, root: state.root, vendor });
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
