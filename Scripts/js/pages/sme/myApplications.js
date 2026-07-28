// 1:1 port of src/app/pages/sme/MyApplications.tsx, extended in Phase 8 with the filters and
// per-row actions the My Applications spec explicitly asks for (Business/Scheme/Date-range
// filters, View Details + Track Application). New controls reuse the exact same input/button
// style already used by the search box and status filter buttons in this same file - no new
// visual language introduced.
import { state } from "../../state.js";
import { C } from "../../colors.js";
import { navigate } from "../../router.js";
import { icon, hydrateIcons, wireImageFallbacks, escapeHtml, qs, qsa } from "../../utils.js";

const STATUS_CONFIG = {
  draft: { label: "Draft", color: C.textMuted, bg: "#F3F4F6" },
  submitted: { label: "Submitted", color: C.blue, bg: C.blueLight },
  under_review: { label: "Under Review", color: "#D97706", bg: "#FEF3C7" },
  approved: { label: "Approved", color: C.green, bg: C.greenLight },
  rejected: { label: "Rejected", color: "#DC2626", bg: "#FEE2E2" },
  disbursed: { label: "Disbursed", color: C.greenDark, bg: C.greenLight },
};

const STATUS_FILTERS = ["all", "draft", "submitted", "under_review", "approved", "rejected", "disbursed"];

function statusBadge(status) {
  const cfg = STATUS_CONFIG[status];
  return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold" style="background:${cfg.bg};color:${cfg.color};">${cfg.label}</span>`;
}

// Module-level (not inside render()): SmeLayout subscribes to every state.js
// mutation and re-invokes this outlet's render(container) on each one (e.g.
// marking a notification read). Closure-local state would be wiped by that
// unrelated re-render mid-search; module scope survives it, matching how
// React preserves MyApplications' own local useState across SmeLayout's
// re-renders without remounting the child.
let searchQ = "";
let statusFilter = "all";
let businessFilter = "all";
let schemeFilter = "all";
let dateFrom = "";
let dateTo = "";

export function render(container) {
  function buildHtml() {
    const schemeOptions = Array.from(new Set(state.applications.map((a) => a.scheme).filter(Boolean)));

    const filtered = state.applications.filter((app) => {
      const q = searchQ.toLowerCase();
      const matchesSearch =
        !q ||
        app.businessName.toLowerCase().includes(q) ||
        app.caseId.toLowerCase().includes(q) ||
        (app.scheme || "").toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" || app.status === statusFilter;
      const matchesBusiness = businessFilter === "all" || app.businessName === businessFilter;
      const matchesScheme = schemeFilter === "all" || app.scheme === schemeFilter;
      const matchesDateFrom = !dateFrom || (app.submittedDate && app.submittedDate >= dateFrom);
      const matchesDateTo = !dateTo || (app.submittedDate && app.submittedDate <= dateTo);
      return matchesSearch && matchesStatus && matchesBusiness && matchesScheme && matchesDateFrom && matchesDateTo;
    });

    return `
      <div class="px-6 py-6">
        <div class="flex items-start justify-between mb-6">
          <div>
            <h1 class="text-xl font-bold" style="color:${C.text};">My Applications</h1>
            <p class="text-sm mt-0.5" style="color:${C.textMuted};">Track and manage all your financing applications</p>
          </div>
          <button data-new-application class="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
            style="background:${C.green};">
            ${icon("plus-circle", { size: 16 })} New Application
          </button>
        </div>

        <div class="flex flex-col sm:flex-row gap-3 mb-3">
          <div class="relative flex-1">
            ${icon("search", { size: 16, color: C.textMuted, className: "absolute left-3.5 top-1/2 -translate-y-1/2" })}
            <input data-search type="text" value="${escapeHtml(searchQ)}" placeholder="Search by reference number, business or scheme..."
              class="w-full rounded-xl border text-sm outline-none"
              style="padding:10px 14px 10px 38px;border:1.5px solid ${C.border};background:${C.surface};color:${C.text};" />
          </div>
          <div class="flex gap-2 overflow-x-auto">
            ${STATUS_FILTERS.map((s) => `
              <button data-status-filter="${s}" class="px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all"
                style="background:${statusFilter === s ? C.green : C.surface};color:${statusFilter === s ? "white" : C.textMuted};border:1.5px solid ${statusFilter === s ? C.green : C.border};">
                ${s === "all" ? "All" : STATUS_CONFIG[s].label}
              </button>
            `).join("")}
          </div>
        </div>

        <div class="flex flex-col sm:flex-row gap-3 mb-5">
          <div class="relative flex-1">
            <select data-business-filter class="w-full rounded-xl border text-sm outline-none appearance-none"
              style="padding:10px 32px 10px 14px;border:1.5px solid ${C.border};background:${C.surface};color:${C.text};">
              <option value="all" ${businessFilter === "all" ? "selected" : ""}>All Businesses</option>
              ${state.businesses.map((b) => `<option value="${escapeHtml(b.name)}" ${businessFilter === b.name ? "selected" : ""}>${escapeHtml(b.name)}</option>`).join("")}
            </select>
            ${icon("chevron-down", { size: 14, color: C.textMuted, className: "absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" })}
          </div>
          <div class="relative flex-1">
            <select data-scheme-filter class="w-full rounded-xl border text-sm outline-none appearance-none"
              style="padding:10px 32px 10px 14px;border:1.5px solid ${C.border};background:${C.surface};color:${C.text};">
              <option value="all" ${schemeFilter === "all" ? "selected" : ""}>All Finance Schemes</option>
              ${schemeOptions.map((s) => `<option value="${escapeHtml(s)}" ${schemeFilter === s ? "selected" : ""}>${escapeHtml(s)}</option>`).join("")}
            </select>
            ${icon("chevron-down", { size: 14, color: C.textMuted, className: "absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" })}
          </div>
          <div class="flex items-center gap-2 flex-1">
            <input data-date-from type="date" value="${escapeHtml(dateFrom)}"
              class="w-full rounded-xl border text-sm outline-none" style="padding:10px 14px;border:1.5px solid ${C.border};background:${C.surface};color:${C.text};" />
            <span class="text-xs flex-shrink-0" style="color:${C.textMuted};">to</span>
            <input data-date-to type="date" value="${escapeHtml(dateTo)}"
              class="w-full rounded-xl border text-sm outline-none" style="padding:10px 14px;border:1.5px solid ${C.border};background:${C.surface};color:${C.text};" />
          </div>
        </div>

        <div class="rounded-2xl border overflow-hidden" style="background:${C.surface};border:1.5px solid ${C.border};">
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr style="background:${C.bg};">
                  ${["Reference No.", "Business", "Scheme", "Applied Date", "Requested Amount", "Bank", "Status", "Last Updated", "Actions"].map((h) => `
                    <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style="color:${C.textMuted};font-family:var(--font-mono);">${h}</th>
                  `).join("")}
                </tr>
              </thead>
              <tbody>
                ${filtered.map((app) => `
                  <tr data-app-row data-app-id="${app.id}" class="border-t transition-colors hover:bg-gray-50 cursor-pointer" style="border-color:${C.border};">
                    <td class="px-4 py-3">
                      <span style="font-family:var(--font-mono);font-size:12px;color:${C.text};">${escapeHtml(app.caseId)}</span>
                    </td>
                    <td class="px-4 py-3 text-xs font-medium" style="color:${C.text};">${escapeHtml(app.businessName)}</td>
                    <td class="px-4 py-3 text-xs" style="color:${C.textMuted};">${escapeHtml(app.scheme)}</td>
                    <td class="px-4 py-3 text-xs" style="color:${C.textMuted};">${escapeHtml(app.submittedDate)}</td>
                    <td class="px-4 py-3 text-xs font-semibold" style="color:${C.text};font-family:var(--font-mono);">${escapeHtml(app.amount)}</td>
                    <td class="px-4 py-3 text-xs" style="color:${C.textMuted};">${escapeHtml(app.bank)}</td>
                    <td class="px-4 py-3">${statusBadge(app.status)}</td>
                    <td class="px-4 py-3 text-xs" style="color:${C.textMuted};">${escapeHtml(app.lastUpdatedDate || app.submittedDate)}</td>
                    <td class="px-4 py-3">
                      <div class="flex items-center gap-1">
                        <button data-view-details="${app.id}" title="View Details" class="p-1.5 rounded-lg hover:bg-gray-100" style="color:${C.textMuted};">
                          ${icon("eye", { size: 14 })}
                        </button>
                        <button data-track-application="${app.id}" title="Track Application" class="p-1.5 rounded-lg hover:bg-gray-100" style="color:${C.textMuted};">
                          ${icon("map-pin", { size: 14 })}
                        </button>
                      </div>
                    </td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>

          ${filtered.length === 0 ? `
            <div class="p-10 text-center">
              <p class="text-sm" style="color:${C.textMuted};">No applications match your filters.</p>
            </div>
          ` : ""}
        </div>
      </div>
    `;
  }

  function wireEvents() {
    qs("[data-new-application]", container)?.addEventListener("click", () => navigate("/sme/apply"));

    const searchInput = qs("[data-search]", container);
    searchInput?.addEventListener("input", (e) => {
      searchQ = e.target.value;
      const caret = e.target.selectionStart;
      renderAll();
      const newInput = qs("[data-search]", container);
      if (newInput) {
        newInput.focus();
        newInput.setSelectionRange(caret, caret);
      }
    });

    qsa("[data-status-filter]", container).forEach((btn) => {
      btn.addEventListener("click", () => {
        statusFilter = btn.getAttribute("data-status-filter");
        renderAll();
      });
    });

    qs("[data-business-filter]", container)?.addEventListener("change", (e) => {
      businessFilter = e.target.value;
      renderAll();
    });

    qs("[data-scheme-filter]", container)?.addEventListener("change", (e) => {
      schemeFilter = e.target.value;
      renderAll();
    });

    qs("[data-date-from]", container)?.addEventListener("change", (e) => {
      dateFrom = e.target.value;
      renderAll();
    });

    qs("[data-date-to]", container)?.addEventListener("change", (e) => {
      dateTo = e.target.value;
      renderAll();
    });

    qsa("[data-app-row]", container).forEach((row) => {
      row.addEventListener("click", () => navigate(`/sme/application-details/${row.getAttribute("data-app-id")}`));
    });

    qsa("[data-view-details]", container).forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        navigate(`/sme/application-details/${btn.getAttribute("data-view-details")}`);
      });
    });

    qsa("[data-track-application]", container).forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        navigate(`/sme/tracking/${btn.getAttribute("data-track-application")}`);
      });
    });
  }

  function renderAll() {
    container.innerHTML = buildHtml();
    wireEvents();
    hydrateIcons();
    wireImageFallbacks(container);
  }

  renderAll();
}
