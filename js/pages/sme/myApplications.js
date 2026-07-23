// 1:1 port of src/app/pages/sme/MyApplications.tsx
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
// opening the notification bell calls markNotificationsRead()). Closure-local
// state would be wiped by that unrelated re-render mid-search; module scope
// survives it, matching how React preserves MyApplications' own local
// useState across SmeLayout's re-renders without remounting the child.
let searchQ = "";
let statusFilter = "all";

export function render(container) {
  function buildHtml() {
    const filtered = state.applications.filter((app) => {
      const matchesSearch =
        app.businessName.toLowerCase().includes(searchQ.toLowerCase()) ||
        app.caseId.toLowerCase().includes(searchQ.toLowerCase());
      const matchesStatus = statusFilter === "all" || app.status === statusFilter;
      return matchesSearch && matchesStatus;
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

        <div class="flex flex-col sm:flex-row gap-3 mb-5">
          <div class="relative flex-1">
            ${icon("search", { size: 16, color: C.textMuted, className: "absolute left-3.5 top-1/2 -translate-y-1/2" })}
            <input data-search type="text" value="${escapeHtml(searchQ)}" placeholder="Search by case ID or business..."
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

        <div class="rounded-2xl border overflow-hidden" style="background:${C.surface};border:1.5px solid ${C.border};">
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr style="background:${C.bg};">
                  ${["Case ID", "Business", "Scheme", "Amount", "Bank", "Submitted", "Status", ""].map((h) => `
                    <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style="color:${C.textMuted};font-family:var(--font-mono);">${h}</th>
                  `).join("")}
                </tr>
              </thead>
              <tbody>
                ${filtered.map((app) => `
                  <tr data-app-row class="border-t transition-colors hover:bg-gray-50 cursor-pointer" style="border-color:${C.border};">
                    <td class="px-4 py-3">
                      <span style="font-family:var(--font-mono);font-size:12px;color:${C.text};">${app.caseId}</span>
                    </td>
                    <td class="px-4 py-3 text-xs font-medium" style="color:${C.text};">${app.businessName}</td>
                    <td class="px-4 py-3 text-xs" style="color:${C.textMuted};">${app.scheme}</td>
                    <td class="px-4 py-3 text-xs font-semibold" style="color:${C.text};font-family:var(--font-mono);">${app.amount}</td>
                    <td class="px-4 py-3 text-xs" style="color:${C.textMuted};">${app.bank}</td>
                    <td class="px-4 py-3 text-xs" style="color:${C.textMuted};">${app.submittedDate}</td>
                    <td class="px-4 py-3">${statusBadge(app.status)}</td>
                    <td class="px-4 py-3">
                      <button class="p-1 rounded-lg hover:bg-gray-100" style="color:${C.textMuted};">
                        ${icon("eye", { size: 14 })}
                      </button>
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

    qsa("[data-app-row]", container).forEach((row) => {
      row.addEventListener("click", () => navigate("/sme/tracking"));
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
