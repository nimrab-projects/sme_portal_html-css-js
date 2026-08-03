// 1:1 port of src/app/pages/sbp/SbpLayout.tsx
//
// Like Bank, SBP has only ONE index child route — all internal navigation
// between Executive Dashboard/Applications/... happens via local `activeKey`
// state inside this layout, never touching the URL/hash. SbpPortal's sub-views
// are fully static/hardcoded and never navigate each other, so unlike Bank
// there is no ctx object passed through — just the activeKey.
import { state, subscribe, setUser } from "../../state.js";
import { C } from "../../colors.js";
import { navigate } from "../../router.js";
import { icon, escapeHtml, hydrateIcons, wireImageFallbacks, openModal, qs, qsa } from "../../utils.js";
import * as api from "../../api.js";
import { render as renderSbpPortal } from "./portal.js";

const NAV = [
  { label: "Executive Dashboard", iconName: "layout-dashboard", key: "dashboard" },
  { label: "Applications", iconName: "scroll-text", key: "applications" },
  { label: "User Management", iconName: "users", key: "users" },
  { label: "Bank Management", iconName: "building-2", key: "banks" },
  { label: "Reports", iconName: "bar-chart-2", key: "reports" },
  { label: "Audit Trail", iconName: "shield-check", key: "audit" },
];

// ── Admin Profile dropdown/menu ──────────────────────────────────────────────
// Both entry points (top-right header avatar, bottom-left sidebar card) open this exact same
// menu - real data throughout, reusing the exact same generic /api/profile/* endpoints
// (Controllers/ProfileController.cs) the Applicant Portal's own Profile/Edit Profile/Change
// Password pages already call. ProfileController is [Authorize] only (not role-scoped) and
// resolves everything from the caller's own claims, so it already works correctly for an
// SBP Admin's own account with zero backend changes.
function profileFieldRow(label, value) {
  return `
    <div class="flex items-center gap-4 py-2 border-b last:border-0" style="border-color:${C.border};">
      <span class="text-xs w-36 flex-shrink-0" style="color:${C.textMuted};">${escapeHtml(label)}</span>
      <span class="text-sm font-semibold" style="color:${C.text};">${escapeHtml(value ?? "—")}</span>
    </div>
  `;
}

// Shared by every modal opened from this file - wires Esc/backdrop-click/duplicate-listener-safe
// close on top of utils.js's openModal(), which only ever wires an explicit [data-close] click
// by itself. Kept local to this file (mirrors the identical helper in ./portal.js) rather than
// changing the shared openModal() utility, so no other modal anywhere else in the app changes.
function wireModalDismissal(overlay, close) {
  function closeModal() {
    document.removeEventListener("keydown", handleKeydown);
    overlay.removeEventListener("click", handleOverlayClick);
    close();
  }
  function handleKeydown(e) {
    if (e.key === "Escape") closeModal();
  }
  function handleOverlayClick(e) {
    if (e.target === overlay) closeModal();
  }
  document.addEventListener("keydown", handleKeydown);
  overlay.addEventListener("click", handleOverlayClick);
  return closeModal;
}

// Real uploaded picture (stored as a data: URL - see Models/ApplicationUser.cs's own comment on
// why, ProfilePictureUrl) when set, else the same initial-letter avatar already used everywhere
// in this app - same circular slot/size, just swapping what's inside it.
function avatarHtml({ name, profilePictureUrl }, size, extraClass = "") {
  if (profilePictureUrl) {
    return `<img src="${escapeHtml(profilePictureUrl)}" alt="Profile" class="rounded-full object-cover flex-shrink-0 ${extraClass}" style="width:${size}px;height:${size}px;" />`;
  }
  const initial = escapeHtml((name || "A")[0] || "A");
  const fontSize = Math.round(size * 0.42);
  return `<div class="rounded-full flex items-center justify-center font-bold text-white flex-shrink-0 ${extraClass}" style="width:${size}px;height:${size}px;background:${C.orange};font-size:${fontSize}px;">${initial}</div>`;
}

function profileMenuHtml(anchor) {
  const posClass = anchor === "sidebar" ? "bottom-full left-0 mb-2" : "top-full right-0 mt-2";
  return `
    <div data-profile-menu class="absolute ${posClass} w-52 rounded-xl border shadow-lg z-20 overflow-hidden" style="background:${C.surface};border:1.5px solid ${C.border};">
      <button data-profile-action="view" class="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2.5 hover:bg-gray-50" style="color:${C.text};">
        ${icon("user", { size: 14, color: C.textMuted })} View Profile
      </button>
      <button data-profile-action="edit" class="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2.5 hover:bg-gray-50" style="color:${C.text};">
        ${icon("pencil", { size: 14, color: C.textMuted })} Edit Profile
      </button>
      <button data-profile-action="password" class="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2.5 hover:bg-gray-50 border-t" style="color:${C.text};border-color:${C.border};">
        ${icon("lock", { size: 14, color: C.textMuted })} Change Password
      </button>
      <button data-profile-action="logout" class="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2.5 hover:bg-gray-50 border-t" style="color:#DC2626;border-color:${C.border};">
        ${icon("log-out", { size: 14, color: "#DC2626" })} Logout
      </button>
    </div>
  `;
}

function openViewProfileModal() {
  openModal((overlay, close) => {
    function renderLoading() {
      overlay.innerHTML = `
        <div class="w-full max-w-md rounded-2xl border p-8 text-center" style="background:${C.surface};border:1.5px solid ${C.border};">
          <p class="text-sm" style="color:${C.textMuted};">Loading profile…</p>
        </div>
      `;
    }
    function renderProfile(profile) {
      overlay.innerHTML = `
        <div class="w-full max-w-md rounded-2xl border" style="background:${C.surface};border:1.5px solid ${C.border};">
          <div class="flex items-start justify-between p-5 border-b" style="border-color:${C.border};">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style="background:${C.orangeLight};">${icon("user", { size: 18, color: C.orange })}</div>
              <h3 class="text-sm font-bold" style="color:${C.text};">My Profile</h3>
            </div>
            <button data-close class="p-1 rounded-lg hover:bg-gray-100" style="color:${C.textMuted};">${icon("x", { size: 16 })}</button>
          </div>
          <div class="p-5">
            ${profileFieldRow("Full Name", profile.fullName)}
            ${profileFieldRow("Email", profile.email)}
            ${profileFieldRow("Phone Number", profile.mobile)}
            ${profileFieldRow("Role", (profile.roles || []).map((r) => (r === "SbpAdmin" ? "SBP Admin" : r)).join(", ") || "SBP Admin")}
            ${profileFieldRow("Registration Date", profile.registrationDate)}
            ${profileFieldRow("Last Login", profile.lastLogin)}
            ${profileFieldRow("Account Status", profile.accountStatus)}
          </div>
        </div>
      `;
      qs("[data-close]", overlay)?.addEventListener("click", close);
      hydrateIcons();
    }

    renderLoading();
    api.getMyProfile().then((result) => renderProfile((result && result.profile) || {}));
  });
}

function openEditProfileModal() {
  openModal((overlay, close) => {
    let profile = null;
    let form = { fullName: "", mobile: "" };
    let saveError = "";
    let saving = false;
    let showSuccess = false;

    function renderInner() {
      if (!profile) {
        overlay.innerHTML = `
          <div class="w-full max-w-md rounded-2xl border p-8 text-center" style="background:${C.surface};border:1.5px solid ${C.border};">
            <p class="text-sm" style="color:${C.textMuted};">Loading…</p>
          </div>
        `;
        return;
      }
      overlay.innerHTML = `
        <div class="w-full max-w-md rounded-2xl border" style="background:${C.surface};border:1.5px solid ${C.border};">
          <div class="flex items-start justify-between p-5 border-b" style="border-color:${C.border};">
            <h3 class="text-sm font-bold" style="color:${C.text};">Edit Profile</h3>
            <button data-close class="p-1 rounded-lg hover:bg-gray-100" style="color:${C.textMuted};">${icon("x", { size: 16 })}</button>
          </div>
          <div class="p-5 space-y-4">
            ${saveError ? `
              <div class="rounded-xl p-3 flex gap-2.5" style="background:#FEE2E2;border:1.5px solid #DC2626;">
                ${icon("x-circle", { size: 16, color: "#DC2626", style: "margin-top:2px;" })}
                <p class="text-xs leading-relaxed" style="color:#DC2626;">${escapeHtml(saveError)}</p>
              </div>` : ""}
            ${showSuccess ? `
              <div class="rounded-xl p-3 flex gap-2.5" style="background:${C.greenLight};border:1.5px solid ${C.green};">
                ${icon("check-circle-2", { size: 16, color: C.green, style: "margin-top:2px;" })}
                <p class="text-xs leading-relaxed" style="color:${C.green};">Profile updated successfully.</p>
              </div>` : ""}
            <div>
              <label class="block text-sm font-medium mb-1.5" style="color:${C.text};">Full Name</label>
              <input data-field="fullName" type="text" value="${escapeHtml(form.fullName)}"
                class="w-full rounded-xl border text-sm outline-none" style="padding:10px 12px;border:1.5px solid ${C.border};background:${C.surface};color:${C.text};" />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1.5" style="color:${C.text};">Email Address</label>
              <input type="text" value="${escapeHtml(profile.email || "")}" disabled
                class="w-full rounded-xl border text-sm outline-none" style="padding:10px 12px;border:1.5px solid ${C.border};background:${C.bg};color:${C.textMuted};" />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1.5" style="color:${C.text};">Phone Number</label>
              <input data-field="mobile" type="text" value="${escapeHtml(form.mobile)}" placeholder="+92 300 0000000"
                class="w-full rounded-xl border text-sm outline-none" style="padding:10px 12px;border:1.5px solid ${C.border};background:${C.surface};color:${C.text};" />
            </div>
          </div>
          <div class="flex gap-3 p-5 border-t" style="border-color:${C.border};">
            <button data-close class="flex-1 py-2.5 rounded-xl text-sm font-semibold border" style="border:1.5px solid ${C.border};color:${C.text};">Cancel</button>
            <button data-save ${saving ? "disabled" : ""} class="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50" style="background:${C.orange};">${saving ? "Saving…" : "Save Changes"}</button>
          </div>
        </div>
      `;
      qsa("[data-close]", overlay).forEach((b) => b.addEventListener("click", close));
      qs('[data-field="fullName"]', overlay)?.addEventListener("input", (e) => { form.fullName = e.target.value; });
      qs('[data-field="mobile"]', overlay)?.addEventListener("input", (e) => { form.mobile = e.target.value; });
      qs("[data-save]", overlay)?.addEventListener("click", async () => {
        if (saving) return;
        saving = true;
        saveError = "";
        showSuccess = false;
        renderInner();
        hydrateIcons();

        const result = await api.updateProfile({ fullName: form.fullName, mobile: form.mobile });
        saving = false;
        if (!result || !result.success) {
          saveError = (result && result.message) || "Couldn't save your profile. Please try again.";
          renderInner();
          hydrateIcons();
          return;
        }

        profile = result.profile;
        form = { fullName: profile.fullName || "", mobile: profile.mobile || "" };
        showSuccess = true;
        renderInner();
        hydrateIcons();
        // Keeps the header/sidebar name in sync immediately, without a full page reload.
        // profilePictureUrl carried forward (this form never edits it) so a picture set via the
        // dedicated Profile Modal (bottom-left) is never wiped out by saving here - setUser()
        // fully replaces state.user, it doesn't merge.
        setUser({ name: profile.fullName, email: profile.email, profilePictureUrl: profile.profilePictureUrl });
      });
      hydrateIcons();
    }

    renderInner();
    api.getMyProfile().then((result) => {
      profile = (result && result.profile) || {};
      form = { fullName: profile.fullName || "", mobile: profile.mobile || "" };
      renderInner();
    });
  });
}

function openChangePasswordModal() {
  openModal((overlay, close) => {
    let form = { currentPassword: "", newPassword: "", confirmPassword: "" };
    let saveError = "";
    let saving = false;
    let showSuccess = false;

    function passwordFieldHtml(key, label) {
      return `
        <div>
          <label class="block text-sm font-medium mb-1.5" style="color:${C.text};">${label}</label>
          <input data-field="${key}" type="password" placeholder="••••••••"
            class="w-full rounded-xl border text-sm outline-none" style="padding:10px 12px;border:1.5px solid ${C.border};background:${C.surface};color:${C.text};" />
        </div>
      `;
    }

    function renderInner() {
      overlay.innerHTML = `
        <div class="w-full max-w-md rounded-2xl border" style="background:${C.surface};border:1.5px solid ${C.border};">
          <div class="flex items-start justify-between p-5 border-b" style="border-color:${C.border};">
            <h3 class="text-sm font-bold" style="color:${C.text};">Change Password</h3>
            <button data-close class="p-1 rounded-lg hover:bg-gray-100" style="color:${C.textMuted};">${icon("x", { size: 16 })}</button>
          </div>
          <div class="p-5 space-y-4">
            ${saveError ? `
              <div class="rounded-xl p-3 flex gap-2.5" style="background:#FEE2E2;border:1.5px solid #DC2626;">
                ${icon("x-circle", { size: 16, color: "#DC2626", style: "margin-top:2px;" })}
                <p class="text-xs leading-relaxed" style="color:#DC2626;">${escapeHtml(saveError)}</p>
              </div>` : ""}
            ${showSuccess ? `
              <div class="rounded-xl p-3 flex gap-2.5" style="background:${C.greenLight};border:1.5px solid ${C.green};">
                ${icon("check-circle-2", { size: 16, color: C.green, style: "margin-top:2px;" })}
                <p class="text-xs leading-relaxed" style="color:${C.green};">Password changed successfully.</p>
              </div>` : ""}
            ${passwordFieldHtml("currentPassword", "Current Password")}
            ${passwordFieldHtml("newPassword", "New Password")}
            ${passwordFieldHtml("confirmPassword", "Confirm New Password")}
            <p class="text-xs" style="color:${C.textMuted};">Must contain uppercase, lowercase, number and special character (min. 8 characters).</p>
          </div>
          <div class="flex gap-3 p-5 border-t" style="border-color:${C.border};">
            <button data-close class="flex-1 py-2.5 rounded-xl text-sm font-semibold border" style="border:1.5px solid ${C.border};color:${C.text};">Cancel</button>
            <button data-save ${saving ? "disabled" : ""} class="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50" style="background:${C.orange};">${saving ? "Saving…" : "Change Password"}</button>
          </div>
        </div>
      `;
      qsa("[data-close]", overlay).forEach((b) => b.addEventListener("click", close));
      ["currentPassword", "newPassword", "confirmPassword"].forEach((key) => {
        qs(`[data-field="${key}"]`, overlay)?.addEventListener("input", (e) => { form[key] = e.target.value; });
      });
      qs("[data-save]", overlay)?.addEventListener("click", async () => {
        if (saving) return;
        saveError = "";
        showSuccess = false;

        if (form.newPassword !== form.confirmPassword) {
          saveError = "New password and confirmation do not match.";
          renderInner();
          hydrateIcons();
          return;
        }

        saving = true;
        renderInner();
        hydrateIcons();

        const result = await api.changePassword(form);
        saving = false;
        if (!result || !result.success) {
          saveError = (result && result.message) || "Couldn't change your password. Please try again.";
          renderInner();
          hydrateIcons();
          return;
        }

        form = { currentPassword: "", newPassword: "", confirmPassword: "" };
        showSuccess = true;
        renderInner();
        hydrateIcons();
      });
      hydrateIcons();
    }

    renderInner();
  });
}

// ── Bottom-left Profile Modal ─────────────────────────────────────────────────
// Unlike the top-right dropdown (View Profile / Edit Profile / Change Password / Logout, left
// unchanged), the bottom-left sidebar card opens this single, dedicated modal directly: a real
// profile summary that flips in place into an edit form (Name/Phone/Picture editable, Email/Role
// read-only) rather than routing through the shared menu. Reuses the exact same generic
// /api/profile/* endpoints as everything else here - no new backend concept, just a different
// front-end entry point/presentation.
function openProfileModal() {
  openModal((overlay, close) => {
    const closeModal = wireModalDismissal(overlay, close);
    let mode = "view";
    let profile = null;
    let form = { fullName: "", mobile: "", profilePictureUrl: "" };
    let saveError = "";
    let saving = false;

    function roleLabel(p) {
      return (p.roles || []).map((r) => (r === "SbpAdmin" ? "SBP Admin" : r)).join(", ") || "SBP Admin";
    }

    function viewModeHtml() {
      return `
        <div class="w-full max-w-md overflow-y-auto rounded-2xl border" style="background:${C.surface};border:1.5px solid ${C.border};max-height:85vh;">
          <div class="flex items-start justify-between p-5 border-b" style="border-color:${C.border};">
            <h3 class="text-sm font-bold" style="color:${C.text};">My Profile</h3>
            <button data-close class="p-1 rounded-lg hover:bg-gray-100" style="color:${C.textMuted};">${icon("x", { size: 16 })}</button>
          </div>
          <div class="p-5">
            <div class="flex items-center gap-4 mb-4">
              ${avatarHtml({ name: profile.fullName, profilePictureUrl: profile.profilePictureUrl }, 56)}
              <div class="min-w-0">
                <div class="text-base font-bold truncate" style="color:${C.text};">${escapeHtml(profile.fullName)}</div>
                <div class="text-xs truncate" style="color:${C.textMuted};">${escapeHtml(profile.email)}</div>
              </div>
            </div>
            ${profileFieldRow("Role", roleLabel(profile))}
            ${profileFieldRow("Phone", profile.mobile)}
            ${profileFieldRow("Department", profile.department)}
            ${profileFieldRow("Last Login", profile.lastLogin)}
            ${profileFieldRow("Joined Date", profile.registrationDate)}
          </div>
          <div class="flex gap-3 p-5 border-t" style="border-color:${C.border};">
            <button data-cancel class="flex-1 py-2.5 rounded-xl text-sm font-semibold border" style="border:1.5px solid ${C.border};color:${C.text};">Cancel</button>
            <button data-edit class="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style="background:${C.orange};">Edit Profile</button>
          </div>
        </div>
      `;
    }

    function editModeHtml() {
      return `
        <div class="w-full max-w-md overflow-y-auto rounded-2xl border" style="background:${C.surface};border:1.5px solid ${C.border};max-height:85vh;">
          <div class="flex items-start justify-between p-5 border-b" style="border-color:${C.border};">
            <h3 class="text-sm font-bold" style="color:${C.text};">Edit Profile</h3>
            <button data-close class="p-1 rounded-lg hover:bg-gray-100" style="color:${C.textMuted};">${icon("x", { size: 16 })}</button>
          </div>
          <div class="p-5 space-y-4">
            ${saveError ? `
              <div class="rounded-xl p-3 flex gap-2.5" style="background:#FEE2E2;border:1.5px solid #DC2626;">
                ${icon("x-circle", { size: 16, color: "#DC2626", style: "margin-top:2px;" })}
                <p class="text-xs leading-relaxed" style="color:#DC2626;">${escapeHtml(saveError)}</p>
              </div>` : ""}

            <div class="flex items-center gap-4">
              ${avatarHtml({ name: form.fullName, profilePictureUrl: form.profilePictureUrl }, 56)}
              <div>
                <label class="inline-block px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer hover:bg-gray-50" style="border:1.5px solid ${C.border};color:${C.text};">
                  Change Picture
                  <input data-picture-input type="file" accept="image/*" class="hidden" />
                </label>
                ${form.profilePictureUrl ? `<button data-remove-picture class="ml-2 text-xs font-semibold" style="color:#DC2626;">Remove</button>` : ""}
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium mb-1.5" style="color:${C.text};">Full Name</label>
              <input data-field="fullName" type="text" value="${escapeHtml(form.fullName)}"
                class="w-full rounded-xl border text-sm outline-none" style="padding:10px 12px;border:1.5px solid ${C.border};background:${C.surface};color:${C.text};" />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1.5" style="color:${C.text};">Email Address</label>
              <input type="text" value="${escapeHtml(profile.email || "")}" disabled
                class="w-full rounded-xl border text-sm outline-none" style="padding:10px 12px;border:1.5px solid ${C.border};background:${C.bg};color:${C.textMuted};" />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1.5" style="color:${C.text};">Role</label>
              <input type="text" value="${escapeHtml(roleLabel(profile))}" disabled
                class="w-full rounded-xl border text-sm outline-none" style="padding:10px 12px;border:1.5px solid ${C.border};background:${C.bg};color:${C.textMuted};" />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1.5" style="color:${C.text};">Phone Number</label>
              <input data-field="mobile" type="text" value="${escapeHtml(form.mobile)}" placeholder="+92 300 0000000"
                class="w-full rounded-xl border text-sm outline-none" style="padding:10px 12px;border:1.5px solid ${C.border};background:${C.surface};color:${C.text};" />
            </div>
          </div>
          <div class="flex gap-3 p-5 border-t" style="border-color:${C.border};">
            <button data-cancel-edit class="flex-1 py-2.5 rounded-xl text-sm font-semibold border" style="border:1.5px solid ${C.border};color:${C.text};">Cancel</button>
            <button data-save ${saving ? "disabled" : ""} class="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50" style="background:${C.orange};">${saving ? "Saving…" : "Save Changes"}</button>
          </div>
        </div>
      `;
    }

    function renderInner() {
      if (!profile) {
        overlay.innerHTML = `
          <div class="w-full max-w-md rounded-2xl border p-8 text-center" style="background:${C.surface};border:1.5px solid ${C.border};">
            <p class="text-sm" style="color:${C.textMuted};">Loading profile…</p>
          </div>
        `;
        return;
      }

      overlay.innerHTML = mode === "edit" ? editModeHtml() : viewModeHtml();
      qsa("[data-close]", overlay).forEach((b) => b.addEventListener("click", closeModal));

      if (mode === "view") {
        qs("[data-cancel]", overlay)?.addEventListener("click", closeModal);
        qs("[data-edit]", overlay)?.addEventListener("click", () => {
          form = { fullName: profile.fullName || "", mobile: profile.mobile || "", profilePictureUrl: profile.profilePictureUrl || "" };
          saveError = "";
          mode = "edit";
          renderInner();
          hydrateIcons();
        });
      } else {
        // Goes back to the view (not a full close) - the modal itself stays open since the admin
        // is still "looking at their profile", just without discarding it via Esc/backdrop/X.
        qs("[data-cancel-edit]", overlay)?.addEventListener("click", () => {
          mode = "view";
          saveError = "";
          renderInner();
          hydrateIcons();
        });
        qs('[data-field="fullName"]', overlay)?.addEventListener("input", (e) => { form.fullName = e.target.value; });
        qs('[data-field="mobile"]', overlay)?.addEventListener("input", (e) => { form.mobile = e.target.value; });
        qs("[data-remove-picture]", overlay)?.addEventListener("click", () => {
          form.profilePictureUrl = "";
          renderInner();
          hydrateIcons();
        });
        qs("[data-picture-input]", overlay)?.addEventListener("change", (e) => {
          const file = e.target.files && e.target.files[0];
          if (!file) return;
          if (!file.type.startsWith("image/")) {
            saveError = "Please choose an image file.";
            renderInner();
            hydrateIcons();
            return;
          }
          if (file.size > 500 * 1024) {
            saveError = "Image is too large. Please choose a file under 500KB.";
            renderInner();
            hydrateIcons();
            return;
          }
          const reader = new FileReader();
          reader.onload = () => {
            form.profilePictureUrl = reader.result;
            saveError = "";
            renderInner();
            hydrateIcons();
          };
          reader.readAsDataURL(file);
        });

        qs("[data-save]", overlay)?.addEventListener("click", async () => {
          if (saving) return;
          saving = true;
          saveError = "";
          renderInner();
          hydrateIcons();

          const result = await api.updateProfile({
            fullName: form.fullName,
            mobile: form.mobile,
            profilePictureUrl: form.profilePictureUrl,
          });
          saving = false;
          if (!result || !result.success) {
            saveError = (result && result.message) || "Couldn't save your profile. Please try again.";
            renderInner();
            hydrateIcons();
            return;
          }

          profile = result.profile;
          // Updates both the top-right header AND bottom-left sidebar avatar/name/picture
          // immediately, no page refresh - both read from the same state.user.
          setUser({ name: profile.fullName, email: profile.email, profilePictureUrl: profile.profilePictureUrl });
          mode = "view";
          renderInner();
          hydrateIcons();
        });
      }

      hydrateIcons();
    }

    renderInner();
    api.getMyProfile().then((result) => {
      profile = (result && result.profile) || {};
      renderInner();
      hydrateIcons();
    });
  });
}

export function mount(container) {
  let sidebarOpen = false;
  let activeKey = "dashboard";
  // null | "header" - whether the top-right header's profile dropdown is open. The bottom-left
  // sidebar no longer shares this menu (see data-open-profile-modal below) - it opens the
  // dedicated Profile Modal directly instead.
  let profileMenuOpen = null;

  function sidebarHtml() {
    return `
      <div class="flex flex-col h-full" style="background:#ffffff;border-right:1.5px solid ${C.border};">
        <div class="px-5 py-5 flex items-center gap-3 border-b" style="border-color:${C.border};">
          <div class="w-9 h-9 rounded-xl flex items-center justify-center" style="background:${C.orangeLight};border:1px solid ${C.orange}30;">
            <img data-fallback src="/Content/images/state_bank_of_pakistan_logo-1.png" alt="SBP" class="w-8 h-8 object-contain" />
          </div>
          <div class="min-w-0">
            <div class="font-bold text-xs leading-tight truncate" style="color:${C.text};">SBP SME Portal</div>
            <div class="text-xs" style="font-family:var(--font-mono);font-size:10px;color:${C.textMuted};">Administrator</div>
          </div>
        </div>

        <div class="px-3 py-2 mx-3 mt-3 rounded-xl flex items-center gap-2" style="background:${C.orangeLight};border:1px solid ${C.orange}25;">
          ${icon("shield-check", { size: 14, color: C.orange })}
          <div>
            <div class="text-xs font-semibold" style="color:${C.orange};">SBP Admin</div>
            <div class="text-xs" style="color:${C.textMuted};">Elevated Privileges</div>
          </div>
        </div>

        <nav class="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          ${NAV.map(({ label, iconName, key }) => {
            const active = activeKey === key;
            return `
              <button data-nav-key="${key}" class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-left"
                style="background:${active ? C.orangeLight : "transparent"};color:${active ? C.orange : C.textMuted};border-left:${active ? `3px solid ${C.orange}` : "3px solid transparent"};">
                ${icon(iconName, { size: 16 })}
                ${label}
              </button>
            `;
          }).join("")}
        </nav>

        <div class="px-3 py-4 border-t" style="border-color:${C.border};">
          <button data-signout class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-left hover:bg-gray-50" style="color:${C.textMuted};">
            ${icon("log-out", { size: 16 })}
            Sign Out
          </button>
          <div class="px-3 pt-3 mt-2 border-t" style="border-color:${C.border};">
            <button data-open-profile-modal class="w-full flex items-center gap-3 text-left rounded-lg hover:bg-gray-50 p-1 -m-1">
              ${avatarHtml({ name: state.user?.name, profilePictureUrl: state.user?.profilePictureUrl }, 32)}
              <div class="min-w-0 flex-1">
                <div class="text-xs font-semibold truncate" style="color:${C.text};">${state.user?.name ?? "SBP Admin"}</div>
                <div class="text-xs truncate" style="font-size:10px;color:${C.textMuted};">${state.user?.email ?? ""}</div>
              </div>
              ${icon("settings", { size: 14, color: C.textMuted })}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  function renderShell() {
    const activeNav = NAV.find((n) => n.key === activeKey);
    const headerTitle = activeNav?.label ?? "Dashboard";

    container.innerHTML = `
      <div class="flex h-screen overflow-hidden" style="font-family:'Manrope',sans-serif;background:${C.bg};">
        <div class="hidden lg:flex w-[240px] flex-shrink-0 flex-col h-full">
          ${sidebarHtml()}
        </div>
        ${sidebarOpen ? `
          <div class="lg:hidden fixed inset-0 z-50 flex">
            <div class="w-64 flex-shrink-0 h-full">${sidebarHtml()}</div>
            <div data-close-sidebar class="flex-1" style="background:rgba(0,0,0,0.5);"></div>
          </div>` : ""}
        <div class="flex-1 flex flex-col overflow-hidden">
          <header class="h-14 flex items-center px-5 gap-4 flex-shrink-0 border-b" style="background:${C.surface};border-color:${C.border};">
            <button data-open-sidebar class="lg:hidden p-1">${icon("menu", { size: 20, color: C.textMuted })}</button>
            <div class="flex-1">
              <div class="text-sm font-semibold" style="color:${C.text};">${headerTitle}</div>
            </div>
            <button class="relative p-2 rounded-lg hover:bg-gray-100 transition-all" style="color:${C.textMuted};">
              ${icon("bell", { size: 16 })}
            </button>
            <div class="relative">
              <button data-open-profile-header class="flex items-center gap-2 rounded-lg p-1 -m-1 hover:bg-gray-100">
                ${avatarHtml({ name: state.user?.name, profilePictureUrl: state.user?.profilePictureUrl }, 32)}
                <span class="hidden md:block text-sm font-medium" style="color:${C.text};">${(state.user?.name ?? "Admin").split(" ")[0]}</span>
              </button>
              ${profileMenuOpen === "header" ? profileMenuHtml("header") : ""}
            </div>
          </header>
          <main id="sbp-outlet" class="flex-1 overflow-y-auto"></main>
        </div>
      </div>
    `;

    wireShellEvents();
    hydrateIcons();
    wireImageFallbacks(container);

    const outlet = qs("#sbp-outlet", container);
    if (outlet) renderSbpPortal(outlet, activeKey);
  }

  function wireShellEvents() {
    qsa("[data-nav-key]", container).forEach((btn) => {
      btn.addEventListener("click", () => {
        activeKey = btn.getAttribute("data-nav-key");
        sidebarOpen = false;
        renderShell();
      });
    });
    // Real sign-out (was a bare hash navigate() that never actually logged out server-side -
    // same bug already fixed for Bank Portal's layout.js). /Sbp is server-protected, so the
    // real auth cookie must actually be cleared, not just the client-side hash changed.
    qsa("[data-signout]", container).forEach((btn) => btn.addEventListener("click", async () => {
      await api.logout();
      window.location.href = "/";
    }));
    qsa("[data-close-sidebar]", container).forEach((el) => el.addEventListener("click", () => { sidebarOpen = false; renderShell(); }));
    qsa("[data-open-sidebar]", container).forEach((btn) => btn.addEventListener("click", () => { sidebarOpen = true; renderShell(); }));

    // Admin Profile - top-right header keeps its existing dropdown menu unchanged (View Profile/
    // Edit Profile/Change Password/Logout). Bottom-left sidebar now opens the dedicated Profile
    // Modal directly instead of toggling that same dropdown.
    qsa("[data-open-profile-header]", container).forEach((btn) => btn.addEventListener("click", () => {
      profileMenuOpen = profileMenuOpen === "header" ? null : "header";
      renderShell();
    }));
    qsa("[data-open-profile-modal]", container).forEach((btn) => btn.addEventListener("click", () => {
      openProfileModal();
    }));
    qsa("[data-profile-action]", container).forEach((btn) => btn.addEventListener("click", async () => {
      const action = btn.getAttribute("data-profile-action");
      profileMenuOpen = null;
      renderShell();
      if (action === "view") openViewProfileModal();
      else if (action === "edit") openEditProfileModal();
      else if (action === "password") openChangePasswordModal();
      else if (action === "logout") { await api.logout(); window.location.href = "/"; }
    }));
  }

  const unsubscribe = subscribe(renderShell);
  renderShell();

  return {
    renderOutlet(renderFn) {
      // SBP has only one router-level child (index route); its sub-view
      // rendering is driven by local activeKey state, not by router-supplied
      // renderers. We accept renderFn to satisfy router.js's call contract but
      // intentionally ignore it — the shell always renders via renderSbpPortal().
      renderShell();
    },
    destroy() {
      unsubscribe();
    },
  };
}
