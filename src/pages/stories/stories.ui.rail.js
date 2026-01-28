// src/pages/stories/stories.ui.rail.js
(function () {
  const log = (...a) => console.log("[Roos][Stories][Rail]", ...a);

  const VIEWED_KEY = "roos_stories_viewed_v1";

  function loadViewedMap() {
    try {
      return JSON.parse(localStorage.getItem(VIEWED_KEY) || "{}") || {};
    } catch (_) {
      return {};
    }
  }

  function saveViewedMap(map) {
    try {
      localStorage.setItem(VIEWED_KEY, JSON.stringify(map || {}));
    } catch (_) {}
  }

  function isStoryViewed(storyId) {
    const map = loadViewedMap();
    return !!map[storyId];
  }

  function markStoryViewed(storyId) {
    const map = loadViewedMap();
    map[storyId] = Date.now();
    saveViewedMap(map);
  }


  function setDisabled(btn, disabled) {
    if (!btn) return;
    btn.disabled = !!disabled;
    btn.classList.toggle("is-disabled", !!disabled);
    btn.setAttribute("aria-disabled", disabled ? "true" : "false");
  }

  function updateArrows(railEl, prevBtn, nextBtn) {
    const maxScroll = railEl.scrollWidth - railEl.clientWidth;
    const x = railEl.scrollLeft;
    setDisabled(prevBtn, x <= 2);
    setDisabled(nextBtn, x >= maxScroll - 2);
  }

  function getStep(railEl) {
    const first = railEl.querySelector('[data-story="card"]');
    if (!first) return 320;
    const gap = parseFloat(getComputedStyle(railEl).gap || "0") || 0;
    return first.getBoundingClientRect().width + gap;
  }

function renderCard(templateEl, story) {
  const card = templateEl.cloneNode(true);
  card.style.display = "";
  card.classList.remove("is-template");
  card.setAttribute("data-story", "card");
  card.setAttribute("data-story-id", story.id);
  card.style.scrollSnapAlign = "start";

  const titleEl = card.querySelector('[data-story-bind="title"]');
  if (titleEl) titleEl.textContent = story.title || "";

  // still image
  const coverImg = card.querySelector('[data-story-bind="cover"]');
  if (coverImg && coverImg.tagName === "IMG") {
    coverImg.src = story.coverUrl || "";
    coverImg.alt = story.title || "Story";
    coverImg.loading = "lazy";
    coverImg.decoding = "async";
  }

  // hover preview
  const wrap = card.querySelector('[data-story-bind="previewWrap"]');
  const vid  = card.querySelector('video[data-story-bind="previewVideo"]');
  const previewUrl = story.previewUrl || "";

  const canHover = window.matchMedia &&
    window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  if (canHover && wrap && vid && previewUrl) {
    wrap.style.display = "none";
    vid.src = previewUrl;
    vid.muted = true;
    vid.loop = true;
    vid.playsInline = true;
    vid.preload = "metadata";

    let started = false;

    const start = () => {
      wrap.style.display = "block";
      if (!started) started = true;
      const p = vid.play();
      if (p?.catch) p.catch(() => {});
    };

    const stop = () => {
      try { vid.pause(); } catch (_) {}
      wrap.style.display = "none";
      try { vid.currentTime = 0; } catch (_) {}
    };

    card.addEventListener("mouseenter", start);
    card.addEventListener("mouseleave", stop);
    card.addEventListener("click", stop); // prevent overlap when opening lightbox
  } else {
    if (wrap) wrap.style.display = "none";
    if (vid) vid.removeAttribute("src");
  }

  // viewed state (client-side)
  if (isStoryViewed(story.id)) card.classList.add("is-viewed");
  else card.classList.remove("is-viewed");

  return card;
}



  window.Roos = window.Roos || {};
  window.Roos.storiesRail = {
    initRail({ root, selectors, onOpenStory }) {
      const railEl = root.querySelector(selectors.rail);
      const templateEl = root.querySelector(selectors.template);
      const prevBtn = root.querySelector(selectors.prevBtn);
      const nextBtn = root.querySelector(selectors.nextBtn);

      if (!railEl || !templateEl) {
        console.warn("[Roos][Stories] Missing rail/template");
        return null;
      }

      // "snug" carousel feel
      railEl.style.overflowX = railEl.style.overflowX || "auto";
      railEl.style.scrollSnapType = railEl.style.scrollSnapType || "x mandatory";

      railEl.addEventListener("scroll", () => updateArrows(railEl, prevBtn, nextBtn), { passive: true });
      window.addEventListener("resize", () => updateArrows(railEl, prevBtn, nextBtn));
      updateArrows(railEl, prevBtn, nextBtn);

      prevBtn?.addEventListener("click", () => {
        railEl.scrollBy({ left: -getStep(railEl), behavior: "smooth" });
      });
      nextBtn?.addEventListener("click", () => {
        railEl.scrollBy({ left: getStep(railEl), behavior: "smooth" });
      });

      railEl.addEventListener("click", (e) => {
        const card = e.target.closest('[data-story="card"]');
        if (!card) return;
        const id = card.getAttribute("data-story-id");
        if (id) onOpenStory?.(id);
      });

      async function setStories(stories) {
        // remove old cards
        railEl.querySelectorAll('[data-story="card"]').forEach(n => n.remove());

        // ✅ pull server-viewed ids (if signed in) and merge into local viewed map
        try {
          const ids = await window.Roos?.storiesData?.listMyViewedStoryIds?.(200);
          if (Array.isArray(ids) && ids.length) {
            // merge into localStorage map so renderCard() sees them as viewed too
            const map = loadViewedMap();
            ids.forEach((id) => { map[id] = map[id] || Date.now(); });
            saveViewedMap(map);
          }
        } catch (_) {}

        const frag = document.createDocumentFragment();
        stories.forEach(story => frag.appendChild(renderCard(templateEl, story)));
        railEl.appendChild(frag);

        updateArrows(railEl, prevBtn, nextBtn);
      }


      window.Roos.storiesRail.markViewed = markStoryViewed;


      log("Ready ✅");
      return { setStories };
    }
  };
})();
