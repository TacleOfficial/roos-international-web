// src/pages/catalog/catalog.data.firebase.js
(function () {
  const log = (...a) => console.log("[Roos][Catalog][DB]", ...a);

  function mustGetFirestore() {
    const dbi = window.Roos?.firebase?.db;
    if (!dbi) throw new Error("FIRESTORE_NOT_READY");
    return dbi;
  }

  function fs() {
    const fsMod = window.Roos?.firebase?.firestoreMod;
    if (!fsMod) throw new Error("FIRESTORE_MOD_NOT_READY");
    return fsMod;
  }

  // ----------------------------
  // Vendors
  // ----------------------------
  async function listVendorsByCategory(categorySlug, limit = 250) {
    const db = mustGetFirestore();
    const {
      collection, query, where, orderBy, limit: qLimit, getDocs
    } = fs();

    const q = query(
      collection(db, "vendors"),
      where("categorySlugs", "array-contains", categorySlug),
      orderBy("nameLower"),
      qLimit(limit)
    );

    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  async function listAllVendors(limit = 500) {
    const db = mustGetFirestore();
    const { collection, query, orderBy, limit: qLimit, getDocs } = fs();

    const q = query(
      collection(db, "vendors"),
      orderBy("nameLower"),
      qLimit(limit)
    );

    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  // ----------------------------
  // Collections
  // ----------------------------
  async function listCollectionsByVendorSlug(vendorSlug, limit = 500) {
    const db = mustGetFirestore();
    const { collection, query, where, orderBy, limit: qLimit, getDocs } = fs();

    const q = query(
      collection(db, "collections"),
      where("vendorSlug", "==", vendorSlug),
      orderBy("nameLower"),
      qLimit(limit)
    );

    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  // ----------------------------
  // Products (paged)
  // ----------------------------
  async function listProductsByCollectionSlugPaged(collectionSlug, {
    pageSize = 24,
    cursor = null // DocumentSnapshot
  } = {}) {
    const db = mustGetFirestore();
    const {
      collection, query, where, orderBy, limit: qLimit, getDocs, startAfter
    } = fs();

    const parts = [
      collection(db, "products"),
      where("collectionSlug", "==", collectionSlug),
      where("isActive", "==", true),
      orderBy("nameLower"),
      qLimit(pageSize)
    ];

    // cursor is a DocumentSnapshot (last doc from previous page)
    const q = cursor
      ? query(...parts, startAfter(cursor))
      : query(...parts);

    const snap = await getDocs(q);
    const docs = snap.docs;

    return {
      items: docs.map(d => ({ id: d.id, ...d.data() })),
      nextCursor: docs.length ? docs[docs.length - 1] : null,
      hasMore: docs.length === pageSize
    };
  }

  // ----------------------------
  // Product detail
  // ----------------------------
  async function getProductById(productId) {
    const db = mustGetFirestore();
    const { doc, getDoc } = fs();

    const ref = doc(db, "products", productId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
  }

  async function listVariants(productId, limit = 300) {
    const db = mustGetFirestore();
    const { collection, query, where, orderBy, limit: qLimit, getDocs } = fs();

    const q = query(
      collection(db, "products", productId, "variants"),
      where("discontinued", "==", false),
      orderBy("slug"),
      qLimit(limit)
    );

    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  // Expose
  window.Roos = window.Roos || {};
  window.Roos.catalog = window.Roos.catalog || {};
  window.Roos.catalog.db = {
    listVendorsByCategory,
    listAllVendors,
    listCollectionsByVendorSlug,
    listProductsByCollectionSlugPaged,
    getProductById,
    listVariants,
  };

  log("Ready ✅");
})();
