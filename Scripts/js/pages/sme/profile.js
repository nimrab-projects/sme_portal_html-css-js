// Personal Profile (Phase 10) - a genuinely new page (no "Profile" page exists anywhere in
// this frontend or its original design; the closest prior thing was layout.js's small "My
// Profile" modal, now superseded by this real page - see layout.js's own comment on its
// profile-avatar button). Built entirely from the same visual primitives already used
// throughout this app (colors.js's C tokens, utils.js's icon()/escapeHtml(), the same
// "rounded-2xl border" card style used in applicationDetails.js) - not a new design language.
import { C } from "../../colors.js";
import { navigate } from "../../router.js";
import { icon, escapeHtml, hydrateIcons, wireImageFallbacks, qs } from "../../utils.js";
import * as api from "../../api.js";

function infoRow(label, value) {
  return `
    <div class="flex items-start justify-between gap-4 py-2 border-b last:border-0" style="border-color:${C.border};">
      <span class="text-xs" style="color:${C.textMuted};">${escapeHtml(label)}</span>
      <span class="text-sm font-semibold text-right" style="color:${C.text};">${escapeHtml(value ?? "—")}</span>
    </div>
  `;
}

function cardHtml(title, iconName, innerHtml) {
  return `
    <div class="rounded-2xl border p-5" style="background:${C.surface};border:1.5px solid ${C.border};">
      <div class="flex items-center gap-2.5 mb-3">
        <div class="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style="background:${C.greenLight};">
          ${icon(iconName, { size: 14, color: C.green })}
        </div>
        <h2 class="text-sm font-bold" style="color:${C.text};">${escapeHtml(title)}</h2>
      </div>
      <div>${innerHtml}</div>
    </div>
  `;
}

export function render(container) {
  let loading = true;
  let profile = null;

  function loadingHtml() {
    return `<div class="px-6 py-10 text-center text-sm" style="color:${C.textMuted};">Loading profile…</div>`;
  }

  function contentHtml() {
    return `
      <div class="px-6 py-6" style="font-family:var(--font-display);">
        <div class="flex items-center gap-3 mb-6">
          <button data-back class="p-2 rounded-xl hover:bg-white border" style="border:1.5px solid ${C.border};">
            ${icon("arrow-left", { size: 16, color: C.textMuted })}
          </button>
          <div class="flex-1 min-w-0">
            <h1 class="text-lg font-bold" style="color:${C.text};">My Profile</h1>
            <p class="text-xs" style="color:${C.textMuted};">Personal account information</p>
          </div>
          <button data-edit class="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white" style="background:${C.green};">
            ${icon("pencil", { size: 14, color: "#fff" })} Edit Profile
          </button>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
          ${cardHtml("Personal Information", "user", `
            ${infoRow("Full Name", profile.fullName)}
            ${infoRow("Email", profile.email)}
            ${infoRow("Phone Number", profile.mobile)}
            ${infoRow("CNIC", profile.cnic)}
          `)}

          ${cardHtml("Account Information", "shield-check", `
            ${infoRow("Role", (profile.roles || []).join(", ") || "Applicant")}
            ${infoRow("Registration Date", profile.registrationDate)}
            ${infoRow("Last Login", profile.lastLogin)}
            ${infoRow("Account Status", profile.accountStatus)}
          `)}
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
          <button data-business class="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold border" style="border:1.5px solid ${C.border};color:${C.text};">
            ${icon("building-2", { size: 16 })} View Business Profile
          </button>
          <button data-change-password class="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold border" style="border:1.5px solid ${C.border};color:${C.text};">
            ${icon("lock", { size: 16 })} Change Password
          </button>
        </div>
      </div>
    `;
  }

  function wireEvents() {
    qs("[data-back]", container)?.addEventListener("click", () => navigate("/sme"));
    qs("[data-edit]", container)?.addEventListener("click", () => navigate("/sme/profile/edit"));
    qs("[data-business]", container)?.addEventListener("click", () => navigate("/sme/business-profile"));
    qs("[data-change-password]", container)?.addEventListener("click", () => navigate("/sme/change-password"));
  }

  function renderAll() {
    container.innerHTML = loading ? loadingHtml() : contentHtml();
    wireEvents();
    hydrateIcons();
    wireImageFallbacks(container);
  }

  renderAll();

  api.getMyProfile().then((result) => {
    loading = false;
    profile = (result && result.profile) || {};
    renderAll();
  });
}
