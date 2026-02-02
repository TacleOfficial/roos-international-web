// src/pages/catalog/catalog.data.firebase.js
(function () {
  const log = (...a) => console.log("[Roos][Catalog][DB]", ...a);

  function db() {
    const fs = window.Roos?.firebase?.firestore;
    if (!fs) throw new Error("FIRESTORE_NOT_READY");
    return fs;
  }

  function vendorsRef() { return db().collection("vendors"); }
  function collectionsRef() { return db().collection("collections"); }
  function productsRef() { return db().collection("products"); }

  // ----------------------------
  // Vendors
  // ----------------------------
  async function listVendorsByCategory(categorySlug, limit = 250) {
    // requires vendors.categorySlugs: []
    const snap = await vendorsRef()
      .where("categorySlugs", "array-contains", categorySlug)
      .orderBy("nameLower")
      .limit(limit)
      .get();

    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  // Optional fallback (if you want to show vendors even without category mapping)
  async function listAllVendors(limit = 500) {
    const snap = await vendorsRef()
      .orderBy("nameLower")
      .limit(limit)
      .get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  // ----------------------------
  // Collections
  // ----------------------------
  async function listCollectionsByVendorSlug(vendorSlug, limit = 500) {
    const snap = await collectionsRef()
      .where("vendorSlug", "==", vendorSlug)
      .orderBy("nameLower")
      .limit(limit)
      .get();

    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  // ----------------------------
  // Products (paged)
  // ----------------------------
  async function listProductsByCollectionSlugPaged(collectionSlug, {
    pageSize = 24,
    cursor = null // Firestore doc snapshot
  } = {}) {
    let q = productsRef()
      .where("collectionSlug", "==", collectionSlug)
      .where("isActive", "==", true)
      .orderBy("nameLower")
      .limit(pageSize);

    if (cursor) q = q.startAfter(cursor);

    const snap = await q.get();
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
    const doc = await productsRef().doc(productId).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  }

  async function listVariants(productId, limit = 300) {
    const snap = await productsRef()
      .doc(productId)
      .collection("variants")
      .where("discontinued", "==", false)
      .orderBy("slug")
      .limit(limit)
      .get();

    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

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
