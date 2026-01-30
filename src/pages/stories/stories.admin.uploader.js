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

  async function putSigned(uploadUrl, blobOrFile, contentType, token) {
    const res = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": contentType,
        // IMPORTANT: this must match what your signer expects
        ...(token ? { "x-goog-meta-firebaseStorageDownloadTokens": token } : {}),
      },
      body: blobOrFile,
    });
    if (!res.ok) throw new Error(`upload_failed_${res.status}`);
  }

  async function grabCoverJpegFromVideoUrl(videoUrl) {
    const v = document.createElement("video");
    v.crossOrigin = "anonymous";
    v.muted = true;
    v.playsInline = true;
    v.src = videoUrl;

    await new Promise((resolve, reject) => {
      v.addEventListener("loadedmetadata", resolve, { once: true });
      v.addEventListener("error", reject, { once: true });
    });

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

    // ✅ NEW: optional “Upload clips” button (recommended)
    const pickBtn = $('[data-stories-admin="pick"]', modalWrap);

    const recordBtn = $('[data-stories-admin="record"]', modalWrap);

    // ✅ NEW: hidden iPhone-native capture input
    const captureInput = $('[data-stories-admin="capture"]', modalWrap);

    const clipsEl = $('[data-stories-admin="clips"]', modalWrap);
    const saveBtn = $('[data-stories-admin="save"]', modalWrap);
    const publishBtn = $('[data-stories-admin="publish"]', modalWrap);

    const statusEl = $('[data-stories-admin="status"]', modalWrap);
    const progressWrap = $('[data-stories-admin="progressWrap"]', modalWrap);
    const progressBar = $('[data-stories-admin="progressBar"]', modalWrap);
    const progressText = $('[data-stories-admin="progressText"]', modalWrap);

    let storyId = null;
    let clips = []; // { file, videoUrl, orderIndex, durationSec }

    // recording state (desktop)
    let rec = null;
    let recStream = null;
    let recChunks = [];
    let recStopTimer = null;

    function show() { modalWrap.style.display = "block"; }
    function hide() { modalWrap.style.display = "none"; }

    // ✅ Platform logic
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const supportsMediaRecorder = typeof window.MediaRecorder !== "undefined";
    const useNativeCapture = isIOS || !supportsMediaRecorder;

    function pushFilesToClips(files) {
      const arr = Array.from(files || []);
      arr.forEach((f) => {
        clips.push({ file: f, videoUrl: null, orderIndex: null, durationSec: null });
      });
      renderClips();
    }

    function setStatus(msg, type = "info") {
      if (!statusEl) return;
      statusEl.style.display = msg ? "block" : "none";
      statusEl.textContent = msg || "";
      statusEl.setAttribute("data-state", type); // style via [data-state="error"]
    }

    function setProgress(pct, label) {
      if (!progressWrap || !progressBar) return;
      const v = Math.max(0, Math.min(100, Number(pct || 0)));
      progressWrap.style.display = "block";
      progressBar.style.width = `${v}%`;
      if (progressText) progressText.textContent = label ? `${label} (${v}%)` : `${v}%`;
    }

    function clearProgress() {
      if (!progressWrap || !progressBar) return;
      progressWrap.style.display = "none";
      progressBar.style.width = "0%";
      if (progressText) progressText.textContent = "";
    }

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
        label.textContent = `${i + 1}. ${c.file?.name || "Clip"}`;

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

        // ✅ NEW: remove clip
        const del = document.createElement("button");
        del.type = "button";
        del.textContent = "✕";
        del.addEventListener("click", () => {
          clips.splice(i, 1);
          renderClips();
        });

        row.appendChild(label);
        row.appendChild(up);
        row.appendChild(down);
        row.appendChild(del);
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
  try {
    setStatus("", "info");
    setProgress(1, "Preparing draft");

    const id = await ensureStoryDraft();
    if (!clips.length) throw new Error("no_clips");

    const totalSteps = clips.length * 3 + 3; 
    // per clip: sign + upload + createItem, plus cover sign+upload+save
    let step = 0;
    const bump = (label) => {
      step += 1;
      const pct = Math.round((step / totalSteps) * 100);
      setProgress(pct, label);
    };

    for (let i = 0; i < clips.length; i++) {
      const c = clips[i];
      const file = c.file;
      const contentType = file?.type || "video/mp4";

      bump(`Signing clip ${i + 1}/${clips.length}`);
      const signed = await apiFetch(`/admin/stories/${id}/clips:signUpload`, {
        method: "POST",
        body: { contentType, filename: file?.name || "clip" },
      });

      bump(`Uploading clip ${i + 1}/${clips.length}`);
      await putSigned(signed.uploadUrl, file, contentType, signed.token);

      bump(`Saving clip ${i + 1}/${clips.length}`);
      await apiFetch(`/admin/stories/${id}/items`, {
        method: "POST",
        body: { videoUrl: signed.videoUrl, orderIndex: i, durationSec: null },
      });

      c.videoUrl = signed.videoUrl;
      c.orderIndex = i;
    }

    // cover from first clip
    if (clips[0]?.videoUrl) {
      bump("Generating cover image");
      const coverBlob = await grabCoverJpegFromVideoUrl(clips[0].videoUrl);

      bump("Signing cover upload");
      const signedCover = await apiFetch(`/admin/stories/${id}/cover:signUpload`, {
        method: "POST",
        body: {},
      });

      bump("Uploading cover");
      await putSigned(signedCover.uploadUrl, coverBlob, "image/jpeg", signedCover.token);

      bump("Saving cover");
      await apiFetch(`/admin/stories/${id}/cover`, {
        method: "POST",
        body: { coverUrl: signedCover.coverUrl },
      });
    }

    setProgress(100, "Done");
    setStatus("Uploads complete ✅", "success");
  } catch (err) {
    // Make errors human-readable
    const msg = String(err?.message || err);

    if (msg === "AUTH_REQUIRED") setStatus("Please log in again and retry.", "error");
    else if (msg === "title_required") setStatus("Title is required.", "error");
    else if (msg === "no_clips") setStatus("Add at least one clip before saving/publishing.", "error");
    else if (msg.startsWith("upload_failed_") || msg.startsWith("clip_upload_failed_")) {
      setStatus("Upload failed. Check your network / CORS and retry.", "error");
    } else if (msg.startsWith("http_")) {
      setStatus(`Server error (${msg}). Open console + Network tab for details.`, "error");
    } else {
      setStatus(`Error: ${msg}`, "error");
    }

    console.error("[Stories Admin] uploadAllClipsAndCreateItems failed:", err);
    throw err;
  }
}


    async function saveDraft() {
      await uploadAllClipsAndCreateItems();
      log("Draft saved:", storyId);
    }

    async function publish() {
      await uploadAllClipsAndCreateItems();

      const title = (titleInput?.value || "").trim();
      const publishAtRaw = publishAtInput?.value || "";
      const publishAtIso = publishAtRaw ? new Date(publishAtRaw).toISOString() : null;

      await apiFetch(`/admin/stories/${storyId}/publish`, {
        method: "POST",
        body: { title, publishAt: publishAtIso },
      });

      log("Published:", storyId);
      hide();

      storyId = null;
      clips = [];
      if (filesInput) filesInput.value = "";
      if (captureInput) captureInput.value = "";
      if (publishAtInput) publishAtInput.value = "";
      renderClips();
    }

    // -------------------------
    // ✅ Desktop recording
    // -------------------------
    async function startDesktopRecording() {
      // If already recording, ignore
      if (rec) return;

      // Safer default mime: pick first supported
      const preferred = [
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm",
      ];
      const mimeType = preferred.find((t) => window.MediaRecorder?.isTypeSupported?.(t)) || "";

      recStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      recChunks = [];

      rec = new MediaRecorder(recStream, mimeType ? { mimeType } : undefined);
      rec.ondataavailable = (e) => { if (e.data?.size) recChunks.push(e.data); };

      rec.onstop = () => {
        try { recStream?.getTracks()?.forEach((t) => t.stop()); } catch (_) {}
        recStream = null;

        const blob = new Blob(recChunks, { type: rec.mimeType || "video/webm" });
        const ext = (rec.mimeType || "").includes("webm") ? "webm" : "webm";
        const file = new File([blob], `recorded-${Date.now()}.${ext}`, { type: blob.type });

        clips.push({ file, videoUrl: null, orderIndex: null, durationSec: null });
        renderClips();

        rec = null;
        recChunks = [];
        if (recStopTimer) clearTimeout(recStopTimer);
        recStopTimer = null;
      };

      rec.start();

      // stop after 10s for now
      recStopTimer = setTimeout(() => {
        try { rec?.stop(); } catch (_) {}
      }, 10_000);
    }

    // -------------------------
    // Wire up UI
    // -------------------------
    openBtn.addEventListener("click", () => show());
    closeBtn?.addEventListener("click", () => hide());

    // ✅ Upload clips button (recommended)
    pickBtn?.addEventListener("click", () => filesInput?.click());

    filesInput?.addEventListener("change", () => {
      pushFilesToClips(filesInput.files);
      filesInput.value = "";
    });

    // ✅ iPhone capture returned file
    captureInput?.addEventListener("change", () => {
      const file = (captureInput.files && captureInput.files[0]) || null;
      if (!file) return;
      clips.push({ file, videoUrl: null, orderIndex: null, durationSec: null });
      captureInput.value = "";
      renderClips();
    });

    // ✅ Record button decides path
    recordBtn?.addEventListener("click", async () => {
      try {
        if (useNativeCapture) {
          // iPhone: open native camera UI
          if (!captureInput) {
            console.warn("[Roos][Stories][Admin] Missing capture input. Add data-stories-admin='capture'");
            return;
          }
          captureInput.click();
          return;
        }

        // Desktop: MediaRecorder
        await startDesktopRecording();
      } catch (e) {
        console.error("record failed", e);
      }
    });

    saveBtn?.addEventListener("click", async () => {
      saveBtn.disabled = true;
      publishBtn && (publishBtn.disabled = true);
      try {
        await saveDraft();
      } finally {
        saveBtn.disabled = false;
        publishBtn && (publishBtn.disabled = false);
        // keep progress visible if you want; otherwise:
        // clearProgress();
      }
    });

    publishBtn?.addEventListener("click", async () => {
      publishBtn.disabled = true;
      saveBtn && (saveBtn.disabled = true);
      try {
        await publish();
        clearProgress();
        setStatus("", "info");
      } finally {
        publishBtn.disabled = false;
        saveBtn && (saveBtn.disabled = false);
      }
    });

    renderClips();
    log("Admin uploader ready ✅", { useNativeCapture, isIOS, supportsMediaRecorder });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAdminUploader, { once: true });
  } else {
    initAdminUploader();
  }
})();
