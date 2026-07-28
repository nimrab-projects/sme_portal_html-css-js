// Business Profile - View (Phase 10). A genuinely new page (no dedicated "Business Profile"
// view exists anywhere in this frontend - the closest prior thing was My Businesses' compact
// card list). Built from the same visual primitives as applicationDetails.js's info cards.
// Always loads the real, existing Business row - never constructs a second one.
//
// Phase 12 (Multiple Business Management): accepts an optional params.id (from My Businesses'
// "View" action, #/sme/business-profile/view/:id) to show any one of the caller's businesses,
// ownership-checked server-side via GET /api/business/{id}. Without params.id (Profile's own
// bare #/sme/business-profile route), behavior is unchanged from Phase 10 - it shows the
// caller's primary/first-created business via GET /api/profile/business.
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

export function render(container, params) {
  const businessId = params && params.id;
  let loading = true;
  let notFound = false;
  let biz = null;

  function loadingHtml() {
    return `<div class="px-6 py-10 text-center text-sm" style="color:${C.textMuted};">Loading business profile…</div>`;
  }

  function notFoundHtml() {
    return `
      <div class="px-6 py-10 text-center">
        <p class="text-sm font-semibold mb-2" style="color:${C.text};">No business profile found</p>
        <button data-setup class="px-5 py-2.5 rounded-xl text-sm font-semibold text-white" style="background:${C.green};">Create Business Profile</button>
      </div>
    `;
  }

  function contentHtml() {
    const showShareholders = biz.businessStatus && biz.businessStatus !== "Proprietorship";
    return `
      <div class="px-6 py-6" style="font-family:var(--font-display);">
        <div class="flex items-center gap-3 mb-6">
          <button data-back class="p-2 rounded-xl hover:bg-white border" style="border:1.5px solid ${C.border};">
            ${icon("arrow-left", { size: 16, color: C.textMuted })}
          </button>
          <div class="flex-1 min-w-0">
            <h1 class="text-lg font-bold" style="color:${C.text};">Business Profile</h1>
            <p class="text-xs" style="color:${C.textMuted};">${escapeHtml(biz.name)}</p>
          </div>
          <button data-edit class="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white" style="background:${C.green};">
            ${icon("pencil", { size: 14, color: "#fff" })} Edit Business
          </button>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
          ${cardHtml("Business Information", "building-2", `
            ${infoRow("Business Name", biz.name)}
            ${infoRow("Business Type", biz.businessStatus)}
            ${infoRow("Business Category", biz.nature)}
            ${infoRow("NTN", biz.ntn)}
            ${infoRow("STRN", biz.strn)}
            ${infoRow("Business Address", biz.address)}
            ${infoRow("Province", biz.province)}
            ${infoRow("City", biz.city)}
            ${infoRow("Postal Code", biz.postalCode)}
          `)}

          ${cardHtml("Contact Information", "phone", `
            ${infoRow("Contact Person", biz.contactPerson)}
            ${infoRow("Business Phone", biz.cellLandline)}
            ${infoRow("Business Email", biz.email)}
            ${infoRow("Website", biz.website)}
          `)}

          ${cardHtml("Bank Information", "landmark", `
            ${infoRow("Bank Name", biz.bank)}
            ${infoRow("IBAN", biz.iban)}
          `)}

          ${cardHtml("Registration & Ownership", "shield-check", `
            ${infoRow("Owner CNIC", biz.ownerCnic)}
            ${infoRow("Registration", biz.registration)}
            ${biz.registration === "Yes" ? infoRow("Registration Number", biz.registrationNumber) : ""}
            ${biz.registration === "Yes" ? infoRow("Registration Authority", biz.registrationAuthority) : ""}
            ${infoRow("Status", biz.status)}
          `)}
        </div>

        ${showShareholders ? cardHtml(biz.businessStatus === "Partnership" ? "Partners" : "Shareholders", "users", `
          <div class="space-y-3">
            ${(biz.shareholders || []).map((sh) => `
              <div class="rounded-xl p-3" style="background:${C.bg};border:1.5px solid ${C.border};">
                <div class="flex items-center justify-between mb-1">
                  <span class="text-sm font-semibold" style="color:${C.text};">${escapeHtml(sh.name)}</span>
                  ${sh.share ? `<span class="text-xs font-bold" style="color:${C.green};">${escapeHtml(sh.share)}%</span>` : ""}
                </div>
                <div class="text-xs" style="color:${C.textMuted};">
                  ${escapeHtml(sh.cnic || "—")} · ${escapeHtml(sh.phone || "—")}
                  ${sh.role ? ` · ${escapeHtml(sh.role)} (Designation)` : ""}
                </div>
              </div>
            `).join("") || `<p class="text-xs" style="color:${C.textMuted};">No shareholders added yet.</p>`}
          </div>
        `) : ""}
      </div>
    `;
  }

  function wireEvents() {
    qs("[data-back]", container)?.addEventListener("click", () => navigate(businessId ? "/sme/businesses" : "/sme"));
    qs("[data-edit]", container)?.addEventListener("click", () => navigate(businessId ? `/sme/business-profile/edit/${businessId}` : "/sme/business-profile/edit"));
    qs("[data-setup]", container)?.addEventListener("click", () => { window.location.href = "/Applicant/Setup"; });
  }

  function renderAll() {
    container.innerHTML = loading ? loadingHtml() : notFound ? notFoundHtml() : contentHtml();
    wireEvents();
    hydrateIcons();
    wireImageFallbacks(container);
  }

  renderAll();

  const fetchBusiness = businessId ? api.getBusinessById(businessId) : api.getMyPrimaryBusiness();
  fetchBusiness.then((result) => {
    loading = false;
    biz = result && result.business;
    notFound = !biz;
    renderAll();
  });
}
