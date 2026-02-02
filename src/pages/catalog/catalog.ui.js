// src/pages/catalog/catalog.ui.js
(function () {
  const log = (...a) => console.log("[Roos][Catalog][UI]", ...a);

  function $(sel, root = document) { return root.querySelector(sel); }
  function $all(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

  function clear(el) {
    if (!el) return;
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  function cloneTemplate(selector, root = document) {
    const tpl = root.querySelector(selector);
    if (!tpl) throw new Error("Missing template: " + selector);
    const node = tpl.cloneNode(true);
    node.classList.remove("is-hidden");
    node.style.display = "";
    // Do NOT keep the data-tpl attribute on clones
    node.removeAttribute("data-tpl");
    return node;
  }

  function setText(root, sel, value) {
    const el = root.querySelector(sel);
    if (el) el.textContent = value ?? "";
  }

  function setAttr(root, sel, attr, value) {
    const el = root.querySelector(sel);
    if (!el) return;
    if (value === null || value === undefined || value === "") el.removeAttribute(attr);
    else el.setAttribute(attr, value);
  }

  function setImg(root, sel, src, alt = "") {
    const el = root.querySelector(sel);
    if (!el) return;
    if (el.tagName !== "IMG") return;
    el.loading = "lazy";
    el.src = src || "";
    el.alt = alt || "";
  }

  function makeChip(text, className = "chip") {
    const d = document.createElement("div");
    d.className = className;
    d.textContent = text;
    return d;
  }

  window.Roos = window.Roos || {};
  window.Roos.catalog = window.Roos.catalog || {};
  window.Roos.catalog.ui = {
    $, $all, clear,
    cloneTemplate, setText, setAttr, setImg,
    makeChip,
  };

  log("Ready ✅");
})();
