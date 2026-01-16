// src/core/roles.ui.js
(function () {
  window.Roos = window.Roos || {};
  window.Roos.ui = window.Roos.ui || {};

function setVisible(el, yes) {
  if (!el) return;

  // Your Webflow combo class that hides the admin tab:
  // <a class="... hide w-inline-block w-tab-link" ...>
  if (yes) el.classList.remove("hide");
  else el.classList.add("hide");

  // Force visibility inline with !important (beats CSS rules)
  if (yes) {
    // Webflow tab links are inline-block (w-inline-block)
    el.style.setProperty("display", "inline-block", "important");
    el.style.setProperty("visibility", "visible", "important");
    el.style.setProperty("pointer-events", "auto", "important");
    el.style.setProperty("opacity", "1", "important");
  } else {
    el.style.setProperty("display", "none", "important");
  }
}




  /**
   * Apply role-based visibility across the page.
   * - data-role="admin"      → admin-only elements (including tab links)
   * - data-role-pane="admin" → optional tab panes
   */
  function applyRoleVisibility(roles) {
    const r = Array.isArray(roles) ? roles : [];
    const isAdmin = r.includes("admin");

    // Admin-only elements (tab links, sections, buttons)
    document.querySelectorAll('[data-role="admin"]').forEach((el) => {
      setVisible(el, isAdmin);
    });

    // Optional: admin-only tab panes
    document.querySelectorAll('[data-role-pane="admin"]').forEach((el) => {
      setVisible(el, isAdmin);
    });

    // Prevent Webflow Tabs from staying on a hidden admin tab
    const activeAdminTab = document.querySelector(
      '.w-tab-link.w--current[data-role="admin"]'
    );

    if (activeAdminTab && !isAdmin) {
      const tabMenu = activeAdminTab.closest(".w-tab-menu") || document;
      const fallback = Array.from(tabMenu.querySelectorAll(".w-tab-link"))
        .find((el) => el.style.display !== "none");

      if (fallback) fallback.click();
    }

    return { isAdmin };
  }

  window.Roos.ui.applyRoleVisibility = applyRoleVisibility;
})();
