// src/pages/dashboard.admin.js
// Phase 1: Admin Users Directory (MVP)
//
// Required Webflow structure (inside admin tab pane):
// - [data-admin-users="root"]
// - [data-admin-users="search"]             (input, optional)
// - [data-admin-users="filter-role"]        (select, optional)
// - [data-admin-users="filter-status"]      (select, optional)
// - [data-admin-users="list"]               (container)
// - [data-admin-users="row-template"]       (hidden template row)
// - [data-admin-users="next"]               (button, optional)
// - [data-admin-users="prev"]               (button, optional)
// - [data-admin-users="count"]              (text, optional)
// - [data-admin-users="loading"]            (loading indicator, optional)
// - [data-admin-users="error"]              (error message, optional)
//
// Inside row-template (bind targets):
// - [data-field="name"], "email", "company", "roles", "status", "lastLogin", "counts"
// - Optional: [data-admin-users="open"] (button/link). If missing, clicking row opens.

(function () {
  window.Roos = window.Roos || {};
  window.Roos.admin = window.Roos.admin || {};

  function $(sel, scope) {
    return (scope || document).querySelector(sel);
  }
  function $all(sel, scope) {
    return Array.from((scope || document).querySelectorAll(sel));
  }

  function setText(el, value) {
    if (!el) return;
    el.textContent = value == null ? "" : String(value);
  }

  function show(el) {
    if (!el) return;
    el.style.display = "";
  }
  function hide(el) {
    if (!el) return;
    el.style.display = "none";
  }

  function debounce(fn, ms) {
    let t = null;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  function formatDate(value) {
    if (!value) return "";
    // if server returns Firestore Timestamp-like object
    if (value && typeof value === "object" && typeof value._seconds === "number") {
      const d = new Date(value._seconds * 1000);
      return d.toLocaleString();
    }
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString();
  }

  function normalizeRoles(roles) {
    if (!roles) return "";
    if (Array.isArray(roles)) return roles.join(", ");
    return String(roles);
  }

  async function api(path, opts) {
    if (!window.Roos?.api?.request) throw new Error("api_not_ready");
    return window.Roos.api.request(path, opts);
  }

  function isAdminFromMe(me) {
    const roles = Array.isArray(me?.roles) ? me.roles : [];
    return roles.includes("admin") || roles.includes("super_admin");
  }

  function buildUsersModule(rootEl) {
    const uiRoot = $('[data-admin-users="root"]', rootEl);
    if (!uiRoot) {
      console.warn('[Roos][Admin] Missing [data-admin-users="root"]');
      return null;
    }

    const ui = {
      root: uiRoot,
      search: $('[data-admin-users="search"]', uiRoot),
      role: $('[data-admin-users="filter-role"]', uiRoot),
      status: $('[data-admin-users="filter-status"]', uiRoot),
      list: $('[data-admin-users="list"]', uiRoot),
      tpl: $('[data-admin-users="row-template"]', uiRoot),
      next: $('[data-admin-users="next"]', uiRoot),
      prev: $('[data-admin-users="prev"]', uiRoot),
      count: $('[data-admin-users="count"]', uiRoot),
      loading: $('[data-admin-users="loading"]', uiRoot),
      error: $('[data-admin-users="error"]', uiRoot),
    };

    if (!ui.list || !ui.tpl) {
      console.warn("[Roos][Admin] Missing list/template", { list: !!ui.list, tpl: !!ui.tpl });
      return null;
    }

    hide(ui.tpl);

    const state = {
      limit: 25,
      cursor: null,
      nextCursor: null,
      prevStack: [],
      query: "",
      role: "",
      status: "",
      loading: false,
    };

    function setLoading(yes) {
      state.loading = yes;
      if (ui.loading) (yes ? show(ui.loading) : hide(ui.loading));
      if (ui.next) ui.next.disabled = yes || !state.nextCursor;
      if (ui.prev) ui.prev.disabled = yes || state.prevStack.length === 0;
    }

    function setError(msg) {
      if (!ui.error) return;
      setText(ui.error, msg);
      show(ui.error);
    }

    function clearError() {
      if (!ui.error) return;
      hide(ui.error);
      setText(ui.error, "");
    }

    function clearRows() {
      $all('[data-admin-users-row="item"]', ui.list).forEach((n) => n.remove());
    }

    async function openUser(uid) {
      const data = await api(`/admin/users/${encodeURIComponent(uid)}`);
      window.Roos.admin._selectedUser = data;
      console.log("[Roos][Admin] Selected user:", data);
      // Phase 2A: bind to a detail pane/drawer UI
    }

    function bindRow(row, u) {
      setText($('[data-field="name"]', row), u.displayName || "");
      setText($('[data-field="email"]', row), u.email || "");
      setText($('[data-field="company"]', row), u.company || "");
      setText($('[data-field="roles"]', row), normalizeRoles(u.roles));
      setText($('[data-field="status"]', row), u.status || "");
      setText($('[data-field="lastLogin"]', row), formatDate(u.lastLoginAt));

      const counts = u.counts && typeof u.counts === "object"
        ? `Samples: ${u.counts.samples || 0} • Quotes: ${u.counts.quotes || 0} • Orders: ${u.counts.orders || 0}`
        : "";
      setText($('[data-field="counts"]', row), counts);

      row.setAttribute("data-uid", u.uid || "");

      const openBtn = $('[data-admin-users="open"]', row);
      const handler = (e) => {
        e.preventDefault();
        const uid = row.getAttribute("data-uid");
        if (uid) openUser(uid).catch((err) => console.error("[Roos][Admin] open user failed:", err));
      };

      if (openBtn) openBtn.addEventListener("click", handler);
      else row.addEventListener("click", handler);
    }

    async function fetchUsers() {
      setLoading(true);
      clearError();
      try {
        const params = new URLSearchParams();
        if (state.query) params.set("query", state.query);
        if (state.role) params.set("role", state.role);
        if (state.status) params.set("status", state.status);
        if (state.cursor) params.set("cursor", state.cursor);
        params.set("limit", String(state.limit));

        const res = await api(`/admin/users?${params.toString()}`);
        const items = Array.isArray(res.items) ? res.items : [];
        state.nextCursor = res.nextCursor || null;

        clearRows();
        items.forEach((u) => {
          const row = ui.tpl.cloneNode(true);
          row.setAttribute("data-admin-users-row", "item");
          row.removeAttribute("id");
          show(row);
          bindRow(row, u);
          ui.list.appendChild(row);
        });

        if (ui.count) setText(ui.count, items.length ? `${items.length} users` : "No users");

        if (ui.next) ui.next.disabled = !state.nextCursor;
        if (ui.prev) ui.prev.disabled = state.prevStack.length === 0;

      } catch (err) {
        console.error("[Roos][Admin] fetchUsers failed:", err);
        setError("Unable to load users. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    function applyFilters(resetPaging) {
      state.query = ui.search ? String(ui.search.value || "").trim().toLowerCase() : "";
      state.role = ui.role ? String(ui.role.value || "").trim() : "";
      state.status = ui.status ? String(ui.status.value || "").trim() : "";

      if (resetPaging) {
        state.cursor = null;
        state.prevStack = [];
        state.nextCursor = null;
      }
      fetchUsers();
    }

    // Wire events
    const onSearch = debounce(() => applyFilters(true), 250);
    if (ui.search) ui.search.addEventListener("input", onSearch);
    if (ui.role) ui.role.addEventListener("change", () => applyFilters(true));
    if (ui.status) ui.status.addEventListener("change", () => applyFilters(true));

    if (ui.next) {
      ui.next.addEventListener("click", (e) => {
        e.preventDefault();
        if (!state.nextCursor) return;
        state.prevStack.push(state.cursor);
        state.cursor = state.nextCursor;
        fetchUsers();
      });
    }

    if (ui.prev) {
      ui.prev.addEventListener("click", (e) => {
        e.preventDefault();
        if (state.prevStack.length === 0) return;
        state.cursor = state.prevStack.pop() || null;
        fetchUsers();
      });
    }

    // Initial load
    fetchUsers();

    return {
      refresh: () => applyFilters(false),
    };
  }

  function buildRolesManager(rootEl) {
  const uiRoot = rootEl.querySelector('[data-admin-roles="root"]');
  if (!uiRoot) {
    console.warn('[Roos][Admin] Missing [data-admin-roles="root"]');
    return null;
  }

  const ui = {
    root: uiRoot,
    msg: uiRoot.querySelector('[data-admin-roles="msg"]'),
    loading: uiRoot.querySelector('[data-admin-roles="loading"]'),
    error: uiRoot.querySelector('[data-admin-roles="error"]'),

    createRoleId: uiRoot.querySelector('[data-admin-roles-input="roleId"]'),
    createName: uiRoot.querySelector('[data-admin-roles-input="name"]'),
    createDesc: uiRoot.querySelector('[data-admin-roles-input="description"]'),
    createBtn: uiRoot.querySelector('[data-admin-roles-action="create"]'),
    createPerms: Array.from(uiRoot.querySelectorAll("[data-admin-roles-perm]")),

    list: uiRoot.querySelector('[data-admin-roles="list"]'),
    tpl: uiRoot.querySelector('[data-admin-roles="row-template"]'),
  };

  function show(el) { if (el) el.style.display = ""; }
  function hide(el) { if (el) el.style.display = "none"; }
  function setText(el, v) { if (el) el.textContent = v == null ? "" : String(v); }

  async function api(path, opts) {
    if (!window.Roos?.api?.request) throw new Error("api_not_ready");
    return window.Roos.api.request(path, opts);
  }

  function setLoading(yes) {
    if (yes) show(ui.loading); else hide(ui.loading);
    if (yes) hide(ui.error);
  }

  function setError(msg) {
    if (!ui.error) return;
    setText(ui.error, msg);
    show(ui.error);
  }

  function flashMsg(msg) {
    if (!ui.msg) return;
    setText(ui.msg, msg);
    show(ui.msg);
    setTimeout(() => hide(ui.msg), 2000);
  }

  function readPermCheckboxes(checkboxEls, attrName) {
    const perms = {};
    checkboxEls.forEach((cb) => {
      const key = cb.getAttribute(attrName);
      perms[key] = !!cb.checked;
    });
    return perms;
  }

  function applyPermCheckboxes(checkboxEls, attrName, perms) {
    checkboxEls.forEach((cb) => {
      const key = cb.getAttribute(attrName);
      cb.checked = !!(perms && perms[key]);
    });
  }

  function clearRows() {
    if (!ui.list) return;
    Array.from(ui.list.querySelectorAll('[data-admin-roles-row="item"]')).forEach((n) => n.remove());
  }

  function bindRow(row, role) {
    const roleId = role.roleId;

    setText(row.querySelector('[data-field="roleId"]'), roleId);
    setText(row.querySelector('[data-field="name"]'), role.name || roleId);
    setText(row.querySelector('[data-field="isSystem"]'), role.isSystem ? "Yes" : "No");

    // Buttons
    const editBtn = row.querySelector('[data-admin-roles-action="edit"]');
    const delBtn = row.querySelector('[data-admin-roles-action="delete"]');

    // Editor
    const editor = row.querySelector('[data-admin-roles="editor"]');
    const editName = row.querySelector('[data-admin-roles-edit="name"]');
    const editDesc = row.querySelector('[data-admin-roles-edit="description"]');
    const editPerms = Array.from(row.querySelectorAll("[data-admin-roles-edit-perm]"));

    const saveBtn = row.querySelector('[data-admin-roles-action="save"]');
    const cancelBtn = row.querySelector('[data-admin-roles-action="cancel"]');

    function openEditor() {
      if (!editor) return;
      if (editName) editName.value = role.name || "";
      if (editDesc) editDesc.value = role.description || "";
      applyPermCheckboxes(editPerms, "data-admin-roles-edit-perm", role.permissions || {});
      show(editor);
    }

    function closeEditor() {
      if (!editor) return;
      hide(editor);
    }

    async function saveEdits() {
      try {
        setLoading(true);
        const patch = {
          name: editName ? String(editName.value || "").trim() : "",
          description: editDesc ? String(editDesc.value || "").trim() : "",
          permissions: readPermCheckboxes(editPerms, "data-admin-roles-edit-perm"),
        };

        await api(`/admin/roles/${encodeURIComponent(roleId)}`, {
          method: "PATCH",
          body: patch,
        });

        flashMsg("Role updated.");
        await refresh();
      } catch (e) {
        console.error(e);
        setError("Unable to update role.");
      } finally {
        setLoading(false);
      }
    }

    async function deleteRole() {
      if (role.isSystem) {
        flashMsg("System roles cannot be deleted.");
        return;
      }
      const ok = window.confirm(`Delete role "${roleId}"? This cannot be undone.`);
      if (!ok) return;

      try {
        setLoading(true);
        await api(`/admin/roles/${encodeURIComponent(roleId)}`, { method: "DELETE" });
        flashMsg("Role deleted.");
        await refresh();
      } catch (e) {
        console.error(e);
        // backend returns role_in_use, cannot_delete_system_role, etc.
        setError("Unable to delete role (it may be in use).");
      } finally {
        setLoading(false);
      }
    }

    if (editBtn) editBtn.addEventListener("click", (e) => { e.preventDefault(); openEditor(); });
    if (cancelBtn) cancelBtn.addEventListener("click", (e) => { e.preventDefault(); closeEditor(); });
    if (saveBtn) saveBtn.addEventListener("click", (e) => { e.preventDefault(); saveEdits(); });
    if (delBtn) delBtn.addEventListener("click", (e) => { e.preventDefault(); deleteRole(); });
  }

  async function refresh() {
    setLoading(true);
    try {
      const res = await api("/admin/roles");
      const items = Array.isArray(res.items) ? res.items : [];

      clearRows();
      hide(ui.tpl);

      items.forEach((r) => {
        const row = ui.tpl.cloneNode(true);
        row.setAttribute("data-admin-roles-row", "item");
        row.removeAttribute("id");
        row.style.display = "";
        bindRow(row, r);
        ui.list.appendChild(row);
      });
    } catch (e) {
      console.error(e);
      setError("Unable to load roles.");
    } finally {
      setLoading(false);
    }
  }

  async function createRole() {
    try {
      setLoading(true);
      const roleId = ui.createRoleId ? String(ui.createRoleId.value || "").trim() : "";
      const name = ui.createName ? String(ui.createName.value || "").trim() : "";
      const description = ui.createDesc ? String(ui.createDesc.value || "").trim() : "";
      const permissions = readPermCheckboxes(ui.createPerms, "data-admin-roles-perm");

      await api("/admin/roles", {
        method: "POST",
        body: { roleId, name, description, permissions },
      });

      flashMsg("Role created.");

      // Clear form
      if (ui.createRoleId) ui.createRoleId.value = "";
      if (ui.createName) ui.createName.value = "";
      if (ui.createDesc) ui.createDesc.value = "";
      ui.createPerms.forEach((cb) => (cb.checked = false));

      await refresh();
    } catch (e) {
      console.error(e);
      setError("Unable to create role. Check Role ID and try again.");
    } finally {
      setLoading(false);
    }
  }

  if (ui.createBtn) {
    ui.createBtn.addEventListener("click", (e) => {
      e.preventDefault();
      createRole();
    });
  }

  // initial load
  refresh();

  return { refresh };
}


  // Called by dashboard.js after the script is loaded
  window.Roos.admin.init = function ({ me, root }) {
    try {
      if (!isAdminFromMe(me)) return;

      // Ensure we only boot once
      if (window.Roos.admin._booted) return;
      window.Roos.admin._booted = true;

      const rootEl = root || document;

      const usersModule = buildUsersModule(rootEl);
      if (!usersModule) return;

      buildRolesManager(rootEl);


      console.log("[Roos][Admin] dashboard.admin.js initialized ✅");
    } catch (e) {
      console.error("[Roos][Admin] init failed:", e);
    }
  };
})();
