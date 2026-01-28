// src/pages/stories/stories.data.firebase.js
(function () {
  const log = (...a) => console.log("[Roos][Stories][Data]", ...a);

  function assertMods() {
    const fb = window.Roos?.firebase;
    if (!fb?.db) throw new Error("Roos.firebase.db missing (Firestore not initialized)");
    if (!fb?.firestoreMod) throw new Error("Roos.firebase.firestoreMod missing");
    return fb;
  }

  function getUser() {
    const auth = window.Roos?.firebase?.auth;
    return auth?.currentUser || null;
  }

  async function listPublishedStories(limitN = 30) {
    const fb = assertMods();
    const {
      collection, query, where, orderBy, limit, getDocs
    } = fb.firestoreMod;

    const base = collection(fb.db, "stories");
    const q = query(
      base,
      where("status", "==", "published"),
      orderBy("createdAt", "desc"),
      limit(limitN)
    );

    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  function subToPublishedStories({ limitN = 30, onChange }) {
    const fb = assertMods();
    const {
      collection, query, where, orderBy, limit, onSnapshot
    } = fb.firestoreMod;

    const base = collection(fb.db, "stories");
    const q = query(
      base,
      where("status", "==", "published"),
      orderBy("createdAt", "desc"),
      limit(limitN)
    );

    return onSnapshot(q, (snap) => {
      const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      onChange?.(rows);
    });
  }

  async function listStoryItems(storyId) {
    const fb = assertMods();
    const { collection, query, orderBy, getDocs } = fb.firestoreMod;

    const base = collection(fb.db, "stories", storyId, "items");
    const q = query(base, orderBy("orderIndex", "asc"));
    const snap = await getDocs(q);

    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  async function listComments(storyId, limitN = 50) {
    const fb = assertMods();
    const { collection, query, orderBy, limit, getDocs } = fb.firestoreMod;

    const base = collection(fb.db, "stories", storyId, "comments");
    const q = query(base, orderBy("createdAt", "desc"), limit(limitN));
    const snap = await getDocs(q);

    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  async function addComment(storyId, text) {
    const fb = assertMods();
    const user = getUser();
    if (!user) throw new Error("AUTH_REQUIRED");

    const { collection, addDoc, serverTimestamp } = fb.firestoreMod;

    const clean = String(text || "").trim();
    if (!clean) throw new Error("EMPTY_COMMENT");

    const base = collection(fb.db, "stories", storyId, "comments");
    const ref = await addDoc(base, {
      uid: user.uid,
      text: clean,
      createdAt: serverTimestamp(),
    });

    return ref.id;
  }

  async function getLikeState(storyId) {
    const fb = assertMods();
    const user = getUser();
    if (!user) return { liked: false };

    const { doc, getDoc } = fb.firestoreMod;

    const ref = doc(fb.db, "stories", storyId, "likes", user.uid);
    const snap = await getDoc(ref);
    return { liked: snap.exists() };
  }

  async function toggleLike(storyId) {
    const fb = assertMods();
    const user = getUser();
    if (!user) throw new Error("AUTH_REQUIRED");

    const {
      doc, getDoc, setDoc, deleteDoc,
      updateDoc, increment, serverTimestamp
    } = fb.firestoreMod;

    const likeRef = doc(fb.db, "stories", storyId, "likes", user.uid);
    const storyRef = doc(fb.db, "stories", storyId);

    const snap = await getDoc(likeRef);
    const liked = snap.exists();

    if (liked) {
      await deleteDoc(likeRef);
      // best-effort count update (don’t fail if rules block it)
      try { await updateDoc(storyRef, { likeCount: increment(-1) }); } catch (_) {}
      return { liked: false };
    } else {
      await setDoc(likeRef, { createdAt: serverTimestamp() });
      try { await updateDoc(storyRef, { likeCount: increment(1) }); } catch (_) {}
      return { liked: true };
    }
  }

  window.Roos = window.Roos || {};
  window.Roos.storiesData = {
    listPublishedStories,
    subToPublishedStories,
    listStoryItems,
    listComments,
    addComment,
    getLikeState,
    toggleLike
  };

  log("Loaded ✅");
})();
