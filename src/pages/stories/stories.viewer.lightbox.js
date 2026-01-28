// src/pages/stories/stories.viewer.lightbox.js
(function () {
  const log = (...a) => console.log("[Roos][Stories][Viewer]", ...a);

  const show = (el) => { if (el) el.style.display = "block"; };
  const hide = (el) => { if (el) el.style.display = "none"; };

  window.Roos = window.Roos || {};
  window.Roos.stories = {
    async init({ root, selectors }) {
      const lightboxEl = root.querySelector(selectors.lightbox);
      if (!lightboxEl) {
        console.warn("[Roos][Stories] Missing lightbox element");
        return;
      }

      const closeEls = lightboxEl.querySelectorAll('[data-story-action="close"]');
      closeEls.forEach((el) => el.addEventListener("click", close));
      const titleEl = lightboxEl.querySelector('[data-story-bind="title"]');
      const videoEl = lightboxEl.querySelector('video[data-story-player]');
      const prevItemBtn = lightboxEl.querySelector('[data-story-action="prevItem"]');
      const nextItemBtn = lightboxEl.querySelector('[data-story-action="nextItem"]');
      const likeBtn = lightboxEl.querySelector('[data-story-action="like"]');
      const likeCountEl = lightboxEl.querySelector('[data-story-bind="likeCount"]');

      const commentsListEl = lightboxEl.querySelector('[data-story-bind="commentsList"]');
      const commentForm = lightboxEl.querySelector('form[data-story-comment-form]');
      const commentInput = lightboxEl.querySelector('input[data-story-comment-input]');
      const progressEl = lightboxEl.querySelector(".story-progress");


      let stories = [];
      let currentStoryIndex = -1;
      let currentItems = [];
      let currentItemIndex = 0;
      let isPaused = false;
      let progressFills = []; // array of .story-progress-fill elements

      const rail = window.Roos.storiesRail.initRail({
        root,
        selectors,
        onOpenStory: (id) => openStory(id)
      });
      if (!rail) return;

      // ✅ realtime feed
      const unsub = window.Roos.storiesData.subToPublishedStories({
        limitN: 30,
        onChange: async (rows) => {
          stories = rows;
          await rail.setStories(stories);
        }
      });

      function cleanup() {
        try { unsub?.(); } catch (_) {}
      }

      closeBtn?.addEventListener("click", () => close());
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && lightboxEl.style.display !== "none") close();
      });


      videoEl?.addEventListener("click", () => {
        if (videoEl.paused) {
          videoEl.play();
          isPaused = false;
        } else {
          videoEl.pause();
          isPaused = true;
        }
      });

      videoEl?.addEventListener("timeupdate", () => {
        if (!videoEl || !progressFills.length) return;
        if (!currentItems.length || currentItemIndex < 0) return;

        const dur = videoEl.duration;
        if (!dur || !isFinite(dur) || dur <= 0) return;

        const pct = (videoEl.currentTime / dur) * 100;
        setProgressState(currentItemIndex, pct);
      });


      videoEl?.addEventListener("ended", () => {
        setProgressState(currentItemIndex, 100);
        if (currentItemIndex < currentItems.length - 1) playItem(currentItemIndex + 1);
        else close(); // IG-ish: close after last clip (you can change to next story)
      });

      prevItemBtn?.addEventListener("click", () => {
        if (!currentItems.length) return;
        playItem(currentItemIndex - 1);
      });

      nextItemBtn?.addEventListener("click", () => {
        if (!currentItems.length) return;
        playItem(currentItemIndex + 1);
      });


      likeBtn?.addEventListener("click", async () => {
        if (currentStoryIndex < 0) return;
        const story = stories[currentStoryIndex];

        try {
          const res = await window.Roos.storiesData.toggleLike(story.id);
          likeBtn.classList.toggle("is-liked", !!res.liked);

          const cur = Number(likeCountEl?.textContent || story.likeCount || 0);
          const next = res.liked ? (cur + 1) : Math.max(0, cur - 1);
          if (likeCountEl) likeCountEl.textContent = String(next);
          story.likeCount = next;
        } catch (err) {
          if (String(err?.message || err) === "AUTH_REQUIRED") {
            console.warn("[Roos][Stories] Login required to like");
          } else {
            console.error("Like failed:", err);
          }
        }
      });

      commentForm?.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (currentStoryIndex < 0) return;
        const story = stories[currentStoryIndex];

        const text = (commentInput?.value || "").trim();
        if (!text) return;

        try {
          await window.Roos.storiesData.addComment(story.id, text);
          if (commentInput) commentInput.value = "";
          await refreshComments(story.id);
        } catch (err) {
          if (String(err?.message || err) === "AUTH_REQUIRED") {
            console.warn("[Roos][Stories] Login required to comment");
          } else {
            console.error("Comment failed:", err);
          }
        }
      });

      async function openStory(storyId) {
        const idx = stories.findIndex(s => s.id === storyId);
        if (idx === -1) return;
        currentStoryIndex = idx;

        const story = stories[currentStoryIndex];
        if (titleEl) titleEl.textContent = story.title || "";
        if (likeCountEl) likeCountEl.textContent = String(story.likeCount || 0);

        try {
          const { liked } = await window.Roos.storiesData.getLikeState(story.id);
          likeBtn?.classList.toggle("is-liked", !!liked);
        } catch (_) {}

        currentItems = await window.Roos.storiesData.listStoryItems(story.id);
        currentItemIndex = 0;

        buildProgress(currentItems.length);
        setProgressState(0, 0);

        const hasMultiple = currentItems.length > 1;
        if (prevItemBtn) prevItemBtn.style.display = hasMultiple ? "" : "none";
        if (nextItemBtn) nextItemBtn.style.display = hasMultiple ? "" : "none";


        show(lightboxEl);
        document.body.style.overflow = "hidden";

        await refreshComments(story.id);
        playItem(0);
      }

      function playItem(i) {
        if (!videoEl || !currentItems.length) return;

        const nextIndex = Math.max(0, Math.min(i, currentItems.length - 1));
        currentItemIndex = nextIndex;

        const item = currentItems[currentItemIndex];
        videoEl.src = item.videoUrl;
        videoEl.playsInline = true;
        videoEl.autoplay = true;
        setProgressState(currentItemIndex, 0);


        const p = videoEl.play();
        if (p?.catch) p.catch(() => {});
      }

      function buildProgress(count) {
        if (!progressEl) return;

        progressEl.textContent = "";
        progressFills = [];

        const frag = document.createDocumentFragment();

        for (let i = 0; i < count; i++) {
          const seg = document.createElement("div");
          seg.className = "story-progress-seg";

          const fill = document.createElement("div");
          fill.className = "story-progress-fill";
          fill.style.width = "0%";

          seg.appendChild(fill);
          frag.appendChild(seg);
          progressFills.push(fill);
        }

        progressEl.appendChild(frag);
      }

      function setProgressState(activeIndex, pct) {
        if (!progressFills.length) return;

        for (let i = 0; i < progressFills.length; i++) {
          if (i < activeIndex) progressFills[i].style.width = "100%";
          else if (i > activeIndex) progressFills[i].style.width = "0%";
          else progressFills[i].style.width = `${Math.max(0, Math.min(100, pct))}%`;
        }
      }


      function close() {
        if (videoEl) {
          videoEl.pause();
          videoEl.removeAttribute("src");
          videoEl.load();
        }
        hide(lightboxEl);
        document.body.style.overflow = "";
        currentItems = [];
        currentItemIndex = 0;
        currentStoryIndex = -1;
      }

      async function refreshComments(storyId) {
        if (!commentsListEl) return;
        commentsListEl.textContent = "";

        const comments = await window.Roos.storiesData.listComments(storyId, 50);

        const frag = document.createDocumentFragment();
        comments.forEach(c => {
          const row = document.createElement("div");
          row.className = "story-comment";
          row.textContent = c.text || "";
          frag.appendChild(row);
        });

        commentsListEl.appendChild(frag);
      }

      window.addEventListener("beforeunload", cleanup);

      log("Ready ✅");
    }
  };
})();
