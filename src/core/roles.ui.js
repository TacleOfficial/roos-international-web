// src/core/roles.ui.js
(function () {
  window.Roos = window.Roos || {};
  window.Roos.ui = window.Roos.ui || {};

  function getHideClass(el) {
    return el.getAttribute("data-role-hide-class") || "hide";
  }

  function isTabLink(el) {
    return el.classList && el.classList.contains("w-tab-link");
  }

  function isTabPane(el) {
    return el.classList && el.classList.contains("w-tab-pane");
  }

function show(el) {
  if (!el) return;

  const hideClass = getHideClass(el);
  el.classList.remove(hideClass);

  // For TAB LINKS: force visible
  if (isTabLink(el)) {
    el.style.setProperty("display", "flex", "important");
    el.style.setProperty("visibility", "visible", "important");
    el.style.setProperty("pointer-events", "auto", "important");
    el.style.setProperty("opacity", "1", "important");
    return;
  }

  // For TAB PANES: DO NOT force display:block
  // Let Webflow control active/inactive panes.
  if (isTabPane(el)) {
    el.style.removeProperty("display");
    el.style.removeProperty("visibility");
    el.style.removeProperty("pointer-events");
    el.style.removeProperty("opacity");
    return;
  }

  // For normal elements (optional)
  el.style.removeProperty("display");
}


function hide(el) {
  if (!el) return;

  const hideClass = getHideClass(el);
  el.classList.add(hideClass);

  // Always force hidden when not allowed
  el.style.setProperty("display", "none", "important");
}

  function ensureValidTab() {
    const activeAdminTab = document.querySelector(
      '.w-tab-link.w--current[data-role="admin"]'
    );
    if (!activeAdminTab) return;

    const tabMenu = activeAdminTab.closest(".w-tab-menu") || document;
    const fallback = Array.from(tabMenu.querySelectorAll(".w-tab-link"))
      .find((el) => getComputedStyle(el).display !== "none");

    if (fallback) fallback.click();
  }

  function applyOnce(roles) {
    const r = Array.isArray(roles) ? roles : [];
    const isAdmin = r.includes("admin");

    document.querySelectorAll('[data-role="admin"]').forEach((el) => {
      if (isAdmin) show(el);
      else hide(el);
    });

    document.querySelectorAll('[data-role-pane="admin"]').forEach((el) => {
      if (isAdmin) show(el);
      else hide(el);
    });

    if (!isAdmin) ensureValidTab();
    return { isAdmin };
  }

  function applyRoleVisibility(roles) {
    const result = applyOnce(roles);

    // Re-apply after Webflow initializes components (Tabs can mutate DOM state)
    if (window.Webflow && Array.isArray(window.Webflow)) {
      window.Webflow.push(function () {
        applyOnce(roles);
      });
    }

    // Re-apply again after short delays (covers late mutations)
    setTimeout(function () { applyOnce(roles); }, 50);
    setTimeout(function () { applyOnce(roles); }, 250);

    return result;
  }

  window.Roos.ui.applyRoleVisibility = applyRoleVisibility;
})();
