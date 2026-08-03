// 1:1 port of src/app/pages/sme/MyBusinesses.tsx
//
// Phase 12 (Multiple Business Management): "Add Business" now opens the exact same Business
// Profile form used after registration (businessSetup.js), mounted as a layout child at
// #/sme/business-profile/add rather than leaving the shell for the guarded, first-time-only
// /Applicant/Setup page (which redirects away once the user already owns a business - exactly
// the case "Add Business" needs to handle). Each card also gained an explicit View/Edit/Delete
// action row (the spec's required actions), reusing the same businessProfile.js (View)/
// businessSetup.js (Edit) pages the rest of the app already uses, parameterized to this specific
// business instead of always the caller's primary one - no new form/page/service anywhere.
import { state, setSelectedBusiness, removeBusinessFromState } from "../../state.js";
import { C } from "../../colors.js";
import { navigate } from "../../router.js";
import { icon, hydrateIcons, wireImageFallbacks, escapeHtml, qs, qsa, matchesSearch } from "../../utils.js";
import * as api from "../../api.js";

export function render(container) {
  let deleteError = "";
  let deletingId = null;

  function renderAll() {
    const { selectedBusiness } = state;
    // Header's global search bar (layout.js) - "search businesses by name, owner, CNIC,
    // business type, etc.", reusing the exact same matching helper every other page's
    // global-search filtering uses.
    const searchQuery = state.globalSearchQuery;
    const businesses = state.businesses.filter((biz) =>
      matchesSearch(searchQuery, biz.name, biz.ownerCnic, biz.nature, biz.businessStatus, biz.contactPerson, biz.ntn, biz.address, biz.bank)
    );

    container.innerHTML = `
      <div class="px-6 py-6">
        <div class="flex items-start justify-between mb-6">
          <div>
            <h1 class="text-xl font-bold" style="color:${C.text};">My Businesses</h1>
            <p class="text-sm mt-0.5" style="color:${C.textMuted};">Manage the business profiles linked to your account</p>
          </div>
          <button data-add-business class="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
            style="background:${C.green};">
            ${icon("plus-circle", { size: 16 })} Add Business
          </button>
        </div>

        ${deleteError ? `
          <div class="rounded-xl p-3 flex gap-2.5 mb-5" style="background:#FEE2E2;border:1.5px solid #DC2626;max-width:640px;">
            ${icon("x-circle", { size: 16, color: "#DC2626", style: "margin-top:2px;" })}
            <p class="text-xs leading-relaxed" style="color:#DC2626;">${escapeHtml(deleteError)}</p>
          </div>
        ` : ""}

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          ${businesses.map((biz) => {
            const active = selectedBusiness?.id === biz.id;
            return `
              <div class="rounded-2xl border p-5 transition-all hover:shadow-md"
                style="background:${C.surface};border:1.5px solid ${active ? C.green : C.border};${active ? `box-shadow:0 0 0 3px ${C.green}18;` : ""}">
                <div data-biz-select="${biz.id}" class="cursor-pointer">
                  <div class="flex items-start justify-between mb-3">
                    <div class="w-10 h-10 rounded-xl flex items-center justify-center" style="background:${C.greenLight};">
                      ${icon("building-2", { size: 20, color: C.green })}
                    </div>
                    ${active ? `
                      <span class="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full" style="background:${C.greenLight};color:${C.green};">
                        ${icon("check-circle-2", { size: 12 })} Active
                      </span>
                    ` : ""}
                  </div>

                  <h2 class="text-base font-bold mb-0.5" style="color:${C.text};">${escapeHtml(biz.name)}</h2>
                  <p class="text-xs mb-3" style="color:${C.textMuted};">${escapeHtml(biz.nature || "")}</p>

                  <div class="space-y-1.5">
                    <div class="flex items-center gap-2 text-xs" style="color:${C.textMuted};">
                      ${icon("briefcase", { size: 14, className: "flex-shrink-0" })}
                      <span>Type: ${escapeHtml(biz.businessStatus || "—")}</span>
                    </div>
                    <div class="flex items-center gap-2 text-xs" style="color:${C.textMuted};">
                      ${icon("hash", { size: 14, className: "flex-shrink-0" })}
                      <span>NTN: ${escapeHtml(biz.ntn || "—")}</span>
                    </div>
                    <div class="flex items-start gap-2 text-xs" style="color:${C.textMuted};">
                      ${icon("map-pin", { size: 14, className: "flex-shrink-0 mt-0.5" })}
                      <span class="leading-snug">${escapeHtml(biz.address || "—")}</span>
                    </div>
                    <div class="flex items-center gap-2 text-xs" style="color:${C.textMuted};">
                      ${icon("building-2", { size: 14, className: "flex-shrink-0" })}
                      <span>Bank: ${escapeHtml(biz.bank || "Not provided")}</span>
                    </div>
                    <div class="flex items-center gap-2 text-xs" style="color:${C.textMuted};">
                      ${icon("credit-card", { size: 14, className: "flex-shrink-0" })}
                      <span>IBAN: ${escapeHtml(biz.iban || "Not provided")}</span>
                    </div>
                  </div>

                  <div class="mt-4 pt-3 border-t flex items-center justify-between gap-2" style="border-color:${C.border};">
                    <div class="flex items-center gap-2 min-w-0">
                      <span class="text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0" style="background:${C.greenLight};color:${C.green};">${escapeHtml(biz.status || "")}</span>
                      <span class="text-xs truncate" style="color:${C.textMuted};">${biz.createdOn ? `Created ${escapeHtml(biz.createdOn)}` : ""}</span>
                    </div>
                    ${!active ? `<span class="text-xs font-medium flex-shrink-0" style="color:${C.green};">Select →</span>` : ""}
                  </div>
                </div>

                <div class="mt-3 pt-3 border-t flex items-center gap-2" style="border-color:${C.border};">
                  <button data-view-business="${biz.id}" class="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold border transition-all hover:bg-gray-50"
                    style="border:1.5px solid ${C.border};color:${C.text};">
                    ${icon("eye", { size: 13 })} View
                  </button>
                  <button data-edit-business="${biz.id}" class="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold border transition-all hover:bg-gray-50"
                    style="border:1.5px solid ${C.border};color:${C.text};">
                    ${icon("pencil", { size: 13 })} Edit
                  </button>
                  <button data-delete-business="${biz.id}" ${deletingId === biz.id ? "disabled" : ""} class="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold border transition-all hover:bg-red-50 disabled:opacity-50"
                    style="border:1.5px solid #DC2626;color:#DC2626;">
                    ${icon("trash-2", { size: 13 })} ${deletingId === biz.id ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </div>
            `;
          }).join("")}
        </div>

        ${businesses.length === 0 ? `
          <div class="rounded-2xl border p-10 text-center" style="background:${C.surface};border:1.5px solid ${C.border};">
            ${icon("building-2", { size: 40, color: C.textMuted, className: "mx-auto mb-3 opacity-30" })}
            <p class="text-sm" style="color:${C.textMuted};">${state.businesses.length === 0 ? "No businesses added yet." : "No businesses match your search."}</p>
          </div>
        ` : ""}
      </div>
    `;

    wireEvents(container);
    hydrateIcons();
    wireImageFallbacks(container);
  }

  function wireEvents(container) {
    // Add Business (Phase 12) reuses the exact same Business Profile form shown after
    // registration, mounted inside this persistent shell rather than leaving it for the
    // guarded, first-time-only /Applicant/Setup page.
    qs("[data-add-business]", container)?.addEventListener("click", () => navigate("/sme/business-profile/add"));

    qsa("[data-biz-select]", container).forEach((el) => {
      el.addEventListener("click", () => {
        const biz = state.businesses.find((b) => b.id === el.getAttribute("data-biz-select"));
        if (biz) setSelectedBusiness(biz);
      });
    });

    qsa("[data-view-business]", container).forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        navigate(`/sme/business-profile/view/${btn.getAttribute("data-view-business")}`);
      });
    });

    qsa("[data-edit-business]", container).forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        navigate(`/sme/business-profile/edit/${btn.getAttribute("data-edit-business")}`);
      });
    });

    qsa("[data-delete-business]", container).forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const id = btn.getAttribute("data-delete-business");
        const biz = state.businesses.find((b) => b.id === id);
        if (!window.confirm(`Delete "${biz?.name ?? "this business"}"? This cannot be undone.`)) return;

        deleteError = "";
        deletingId = id;
        renderAll();

        const result = await api.deleteBusiness(id);
        deletingId = null;

        if (!result || !result.success) {
          deleteError = (result && result.message) || "Couldn't delete this business. Please try again.";
          renderAll();
          return;
        }

        removeBusinessFromState(id);
      });
    });
  }

  renderAll();
}
