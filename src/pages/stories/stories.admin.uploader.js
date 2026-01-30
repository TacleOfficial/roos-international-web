// src/pages/stories/stories.admin.uploader.js
(function () {
  const log = (...a) => console.log("[Roos][Stories][Admin]", ...a);

  const API_BASE = "https://api-v5ojxajk4a-uc.a.run.app"; // change later if you proxy

  function $(sel, root = document) { return root.querySelector(sel); }
  function $all(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

  async function getIdToken() {
    const user = window.Roos?.firebase?.auth?.currentUser;
    if (!user) throw new Error("AUTH_REQUIRED");
    return await user.getIdToken(true);
  }

  async function apiFetch(path, { method = "GET", body } = {}) {
    const token = await getIdToken();
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json?.ok === false) throw new Error(json?.error || `http_${res.status}`);
    return json;
  }

  async function putSigned(uploadUrl, blobOrFile, contentType) {
    const res = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": contentType,
        // this header must match what the signed url expects (extensionHeaders were embedded in signing)
        "x-goog-meta-firebaseStorageDownloadTokens": "1", // harmless; token is already baked into signature
      },
      body: blobOrFile,
    });
    if (!res.ok) throw new Error(`upload_failed_${res.status}`);
  }

  async function grabCoverJpegFromVideoUrl(videoUrl) {
    // Load the video, seek, draw to canvas
    const v = document.createElement("video");
    v.crossOrigin = "anonymous";
    v.muted = true;
    v.playsInline = true;
    v.src = videoUrl;

    await new Promise((resolve, reject) => {
      v.addEventListener("loadedmetadata", resolve, { once: true });
      v.addEventListener("error", reject, { once: true });
    });

    // pick a frame
    const t = Math.min(0.35, Math.max(0.1, (v.duration || 1) * 0.1));
    v.currentTime = t;

    await new Promise((resolve) => v.addEventListener("seeked", resolve, { once: true }));

    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth || 720;
    canvas.height = v.videoHeight || 1280;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.86)
    );

    if (!blob) throw new Error("cover_blob_failed");
    return blob;
  }

  function initAdminUploader() {
    const openBtn = $('[data-stories-admin="open"]');
    const modalWrap = $('[data-stories-admin-modal="wrap"]');
    if (!openBtn || !modalWrap) {
      log("No admin uploader UI found (ok on public pages).");
      return;
    }

    const closeBtn = $('[data-stories-admin="close"]', modalWrap);
    const titleInput = $('[data-stories-admin="title"]', modalWrap);
    const publishAtInput = $('[data-stories-admin="publishAt"]', modalWrap);
    const filesInput = $('[data-stories-admin="files"]', modalWrap);
    const recordBtn = $('[data-stories-admin="record"]', modalWrap);
    const clipsEl = $('[data-stories-admin="clips"]', modalWrap);
    const saveBtn = $('[data-stories-admin="save"]', modalWrap);
    const publishBtn = $('[data-stories-admin="publish"]', modalWrap);

    let storyId = null;
    let clips = []; // { file, videoUrl, orderIndex, durationSec }

    function show() { modalWrap.style.display = "block"; }
    function hide() { modalWrap.style.display = "none"; }

    function renderClips() {
      if (!clipsEl) return;
      clipsEl.textContent = "";
      clips.forEach((c, i) => {
        const row = document.createElement("div");
        row.style.display = "flex";
        row.style.gap = "10px";
        row.style.alignItems = "center";
        row.style.padding = "8px 0";

        const label = document.createElement("div");
        label.textContent = `${i + 1}. ${c.file?.name || "Recorded clip"}`;

        const up = document.createElement("button");
        up.type = "button";
        up.textContent = "↑";
        up.disabled = i === 0;
        up.addEventListener("click", () => {
          const tmp = clips[i - 1];
          clips[i - 1] = clips[i];
          clips[i] = tmp;
          renderClips();
        });

        const down = document.createElement("button");
        down.type = "button";
        down.textContent = "↓";
        down.disabled = i === clips.length - 1;
        down.addEventListener("click", () => {
          const tmp = clips[i + 1];
          clips[i + 1] = clips[i];
          clips[i] = tmp;
          renderClips();
        });

        row.appendChild(label);
        row.appendChild(up);
        row.appendChild(down);
        clipsEl.appendChild(row);
      });
    }

    async function ensureStoryDraft() {
      if (storyId) return storyId;

      const title = (titleInput?.value || "").trim();
      if (!title) throw new Error("title_required");

      const resp = await apiFetch("/admin/stories", {
        method: "POST",
        body: { title, status: "draft", publishAt: null },
      });

      storyId = resp.storyId;
      return storyId;
    }

    async function uploadAllClipsAndCreateItems() {
      const id = await ensureStoryDraft();

      // upload in current order
      for (let i = 0; i < clips.length; i++) {
        const c = clips[i];
        const file = c.file;
        const contentType = file?.type || "video/mp4";

        // sign upload
        const signed = await apiFetch(`/admin/stories/${id}/clips:signUpload`, {
          method: "POST",
          body: { contentType, filename: file?.name || "clip" },
        });

        // PUT to signed URL
        await fetch(signed.uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": contentType,
            // must match what signer included (safe even if duplicated)
            "x-goog-meta-firebaseStorageDownloadTokens": signed.token,
          },
          body: file,
        }).then((r) => {
          if (!r.ok) throw new Error(`clip_upload_failed_${r.status}`);
        });

        // create item doc (server-side)
        await apiFetch(`/admin/stories/${id}/items`, {
          method: "POST",
          body: {
            videoUrl: signed.videoUrl,
            orderIndex: i,
            durationSec: null,
          },
        });

        c.videoUrl = signed.videoUrl;
        c.orderIndex = i;
      }

      // cover from first clip
      if (clips[0]?.videoUrl) {
        const coverBlob = await grabCoverJpegFromVideoUrl(clips[0].videoUrl);

        const signedCover = await apiFetch(`/admin/stories/${id}/cover:signUpload`, {
          method: "POST",
          body: {},
        });

        await fetch(signedCover.uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": "image/jpeg",
            "x-goog-meta-firebaseStorageDownloadTokens": signedCover.token,
          },
          body: coverBlob,
        }).then((r) => {
          if (!r.ok) throw new Error(`cover_upload_failed_${r.status}`);
        });

        await apiFetch(`/admin/stories/${id}/cover`, {
          method: "POST",
          body: { coverUrl: signedCover.coverUrl },
        });
      }
    }

    async function saveDraft() {
      await uploadAllClipsAndCreateItems();
      log("Draft saved:", storyId);
    }

    async function publish() {
      await uploadAllClipsAndCreateItems();

      const title = (titleInput?.value || "").trim();
      const publishAtRaw = publishAtInput?.value || ""; // datetime-local (no timezone)
      // Convert datetime-local to ISO with local timezone assumption:
      const publishAtIso = publishAtRaw ? new Date(publishAtRaw).toISOString() : null;

      await apiFetch(`/admin/stories/${storyId}/publish`, {
        method: "POST",
        body: { title, publishAt: publishAtIso },
      });

      log("Published:", storyId);
      hide();
      // reset modal state
      storyId = null;
      clips = [];
      if (filesInput) filesInput.value = "";
      if (publishAtInput) publishAtInput.value = "";
      renderClips();
    }

    openBtn.addEventListener("click", () => {
      show();
    });

    closeBtn?.addEventListener("click", () => {
      hide();
    });

    filesInput?.addEventListener("change", () => {
      const files = Array.from(filesInput.files || []);
      files.forEach((f) => clips.push({ file: f, videoUrl: null, orderIndex: null, durationSec: null }));
      renderClips();
    });

    // Simple recording (optional)
    recordBtn?.addEventListener("click", async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        const chunks = [];
        const rec = new MediaRecorder(stream, { mimeType: "video/webm" });

        rec.ondataavailable = (e) => { if (e.data?.size) chunks.push(e.data); };

        rec.onstop = () => {
          stream.getTracks().forEach((t) => t.stop());
          const blob = new Blob(chunks, { type: "video/webm" });
          const file = new File([blob], `recorded-${Date.now()}.webm`, { type: "video/webm" });
          clips.push({ file, videoUrl: null, orderIndex: null, durationSec: null });
          renderClips();
        };

        rec.start();
        // stop after 10s for now (you can build a real UI later)
        setTimeout(() => rec.stop(), 10_000);
      } catch (e) {
        console.error("record failed", e);
      }
    });

    saveBtn?.addEventListener("click", async () => {
      saveBtn.disabled = true;
      try { await saveDraft(); }
      finally { saveBtn.disabled = false; }
    });

    publishBtn?.addEventListener("click", async () => {
      publishBtn.disabled = true;
      try { await publish(); }
      finally { publishBtn.disabled = false; }
    });

    renderClips();
    log("Admin uploader ready ✅");
  }

    if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAdminUploader, { once: true });
    } else {
    initAdminUploader();
    }

})();
