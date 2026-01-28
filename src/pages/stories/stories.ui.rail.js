// src/pages/stories/stories.ui.rail.js
(function () {
  const log = (...a) => console.log("[Roos][Stories][Rail]", ...a);

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

  // --- Cover image (default) ---
  const coverImg = card.querySelector('[data-story-bind="cover"]');
  if (coverImg && coverImg.tagName === "IMG") {
    coverImg.src = story.coverUrl || "";
    coverImg.alt = story.title || "Story";
    coverImg.loading = "lazy";
    coverImg.decoding = "async";
  }

  // --- Hover preview video (optional) ---
  const wrap = card.querySelector('[data-story-bind="previewWrap"]');
  const vid  = card.querySelector('video[data-story-bind="previewVideo"]');
  const previewUrl = story.previewUrl || "";

  // Only enable hover previews on devices that actually support hover
  const canHover = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  if (canHover && wrap && vid && previewUrl) {
    // Setup once
    vid.src = previewUrl;
    vid.muted = true;
    vid.loop = true;
    vid.playsInline = true;
    vid.preload = "metadata"; // don’t download full file immediately

    // Keep it hidden until hover
    wrap.style.display = "none";

    let started = false;

    const startPreview = () => {
      wrap.style.display = "block";
      // start playing on first hover (some browsers still might block; muted usually OK)
      if (!started) {
        started = true;
        const p = vid.play();
        if (p && p.catch) p.catch(() => {}); // ignore autoplay blocks
      } else {
        const p = vid.play();
        if (p && p.catch) p.catch(() => {});
      }
    };

    const stopPreview = () => {
      // pause + reset to avoid continuing downloads
      try { vid.pause(); } catch (_) {}
      wrap.style.display = "none";
      // Optional: reset time so it starts from beginning next hover
      try { vid.currentTime = 0; } catch (_) {}
    };

    card.addEventListener("mouseenter", startPreview);
    card.addEventListener("mouseleave", stopPreview);

    // Safety: if user clicks while hovering, stop preview so it doesn't overlap with lightbox audio
    card.addEventListener("click", stopPreview);
  } else {
    // No hover support or no previewUrl: ensure it's hidden
    if (wrap) wrap.style.display = "none";
    if (vid) vid.removeAttribute("src");
  }

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

        const frag = document.createDocumentFragment();
        stories.forEach(story => frag.appendChild(renderCard(templateEl, story)));
        railEl.appendChild(frag);

        updateArrows(railEl, prevBtn, nextBtn);
      }

      log("Ready ✅");
      return { setStories };
    }
  };
})();
