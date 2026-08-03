// Application Tracking (Phase 8) - was previously "UI only, fully static/hardcoded, does NOT
// read from state.js" (see git history). Phase 8 explicitly requires the tracking timeline and
// status history to load from SQL Server and forbids hardcoding status values in the view, so
// this now fetches the real application (Controllers/ApplicationController.cs's Detail action,
// via js/api.js's getApplicationDetail()) and computes STAGES/CASE_SUMMARY from it. The HTML
// structure/classes/animation below are byte-for-byte the same as before - only the data
// feeding them is now real.
import { state } from "../../state.js";
import { C } from "../../colors.js";
import { navigate } from "../../router.js";
import { icon, hydrateIcons, wireImageFallbacks, escapeHtml, qs, qsa, matchesSearch } from "../../utils.js";
import * as api from "../../api.js";

// The existing, established status vocabulary (dashboard.js/myApplications.js's STATUS_CONFIG) -
// not the spec's illustrative "Under Initial Review/Documents Verification/Credit Assessment/
// Approval Committee" stage names, which have no backing data or transitions anywhere in this
// system yet. "rejected" is a terminal alternate branch off the same linear order, matching the
// spec's own "...Approval Committee → Approved OR Rejected" structure.
const LINEAR_STAGES = [
  { status: "submitted", label: "Application Submitted", fallbackDesc: "Your application has been received and assigned a case ID." },
  { status: "under_review", label: "Under Review", fallbackDesc: "Your application is being reviewed by the assigned bank." },
  { status: "approved", label: "Approved", fallbackDesc: "Your application has been approved." },
  { status: "disbursed", label: "Disbursed", fallbackDesc: "Financing amount credited to your nominated bank account." },
];

const STATUS_LABELS = {
  draft: "Draft", submitted: "Submitted", under_review: "Under Review",
  approved: "Approved", rejected: "Rejected", disbursed: "Disbursed",
};

function stageIconHtml(done, active) {
  if (done) return icon("check-circle-2", { size: 16, color: "#FFFFFF" });
  if (active) return icon("clock", { size: 16, color: "#D97706" });
  return icon("circle", { size: 16, color: C.border });
}

// Builds the same {label, desc, done, active}[] shape the view always expected, now computed
// from the application's real current status + its real ApplicationStatusHistory timeline
// (used only to source per-stage remarks/dates when available) instead of literal booleans.
function buildStages(app) {
  const timelineByStatus = {};
  (app.timeline || []).forEach((t) => { timelineByStatus[t.status] = t; });

  if (app.status === "rejected") {
    return [
      { ...LINEAR_STAGES[0], done: true, active: false, desc: timelineByStatus.submitted?.remarks || LINEAR_STAGES[0].fallbackDesc },
      { ...LINEAR_STAGES[1], done: true, active: false, desc: timelineByStatus.under_review?.remarks || LINEAR_STAGES[1].fallbackDesc },
      { status: "rejected", label: "Rejected", done: false, active: true, desc: timelineByStatus.rejected?.remarks || "Your application was not approved at this time." },
    ];
  }

  const currentIndex = LINEAR_STAGES.findIndex((s) => s.status === app.status);
  const idx = currentIndex === -1 ? 0 : currentIndex;

  return LINEAR_STAGES.map((stage, i) => ({
    ...stage,
    desc: timelineByStatus[stage.status]?.remarks || stage.fallbackDesc,
    done: i < idx || (i === idx && idx === LINEAR_STAGES.length - 1),
    active: i === idx && idx !== LINEAR_STAGES.length - 1,
  }));
}

function emptyStateHtml(message) {
  return `
    <div class="px-6 py-10 text-center">
      <p class="text-sm" style="color:${C.textMuted};">${escapeHtml(message)}</p>
    </div>
  `;
}

export function render(container, params) {
  const requestedId = params && params.id;
  // Bare "/sme/tracking" (no id, e.g. the sidebar's own nav link) falls back to the applicant's
  // most recent application - but it must fall back within whichever business is currently
  // active in the header switcher (same scoping dashboard.js already uses for its own stat
  // cards/Recent Applications), not the single most recent application across every business
  // the applicant owns. Without this, switching businesses here did nothing: state.applications
  // is one flat, cross-business list ordered most-recent-first, so state.applications[0] always
  // resolved to the same one application regardless of which business was selected.
  const selectedBusiness = state.selectedBusiness;
  const viewAllBusinesses = state.viewAllBusinesses;
  const scopedApplications = selectedBusiness && !viewAllBusinesses
    ? state.applications.filter((a) => a.businessId === selectedBusiness.id)
    : state.applications;

  // Header's global search bar (layout.js) - this page shows exactly one application at a time
  // rather than a list, so "search applications by reference number, business name, scheme, or
  // bank" means picking which one to display, not filtering a visible list. Only applies to the
  // bare fallback (no explicit requestedId) - an explicit deep link (e.g. from a notification)
  // always stays pinned to that exact application regardless of an unrelated search query.
  const searchQuery = state.globalSearchQuery;
  const matchingApplications = !requestedId && searchQuery.trim()
    ? scopedApplications.filter((a) => matchesSearch(searchQuery, a.caseId, a.businessName, a.scheme, a.bank))
    : scopedApplications;
  const effectiveId = requestedId || matchingApplications[0]?.id;

  if (!effectiveId) {
    container.innerHTML = emptyStateHtml(
      !requestedId && searchQuery.trim() && scopedApplications.length > 0
        ? "No applications match your search."
        : "You have no applications to track yet."
    );
    return;
  }

  container.innerHTML = emptyStateHtml("Loading application tracking…");

  api.getApplicationDetail(effectiveId).then((result) => {
    if (!result || !result.success) {
      container.innerHTML = emptyStateHtml("This application could not be found, or it doesn't belong to your account.");
      return;
    }
    renderTracking(container, result.application);
  });
}

function renderTracking(container, app) {
  const STAGES = buildStages(app);
  const currentLabel = STATUS_LABELS[app.status] || app.status;
  const currentPos = STAGES.findIndex((s) => s.active);
  const stagePosLabel = `${currentLabel} (${(currentPos === -1 ? STAGES.length : currentPos + 1)}/${STAGES.length})`;

  const CASE_SUMMARY = [
    { label: "Case ID", value: app.caseId, mono: true },
    { label: "Scheme", value: app.scheme, mono: false },
    { label: "Amount Requested", value: app.amount, mono: true },
    { label: "Assigned Bank", value: app.bank, mono: false },
    { label: "Submission Date", value: app.submittedDate, mono: false },
    { label: "Current Stage", value: stagePosLabel, mono: false },
  ];

  // There is no separate "assigned bank" workflow in this system - the only bank that exists
  // anywhere is the one the applicant selected on their own Business Profile (Business.Bank),
  // which the server now returns here unchanged (see ApplicationService.cs). Business.Bank is
  // optional on that form, so a business that skipped it has none on file - "Not Provided" is
  // shown honestly rather than a fabricated bank name. No real per-bank directory (address/
  // contact) exists anywhere in this system, so none is fabricated here either.
  const hasBank = !!app.bank && app.bank !== "Not Provided";

  container.innerHTML = `
    <div class="px-6 py-6" style="font-family:var(--font-display);">
      <div class="flex items-center gap-3 mb-6">
        <button data-back class="p-2 rounded-xl hover:bg-white border" style="border:1.5px solid ${C.border};">
          ${icon("arrow-left", { size: 16, color: C.textMuted })}
        </button>
        <div>
          <h1 class="text-lg font-bold" style="color:${C.text};">Application Tracking</h1>
          <p class="text-xs" style="color:${C.textMuted};">${escapeHtml(app.scheme)} — ${escapeHtml(app.businessName)}</p>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <!-- Timeline -->
        <div class="lg:col-span-2">
          <div class="rounded-2xl border overflow-hidden" style="background:${C.surface};border:1.5px solid ${C.border};">
            <div class="px-5 py-4 border-b flex items-center justify-between" style="border-color:${C.border};">
              <h2 class="text-sm font-semibold" style="color:${C.text};">Application Journey</h2>
              <span class="text-xs px-3 py-1 rounded-full font-semibold" style="background:#FEF3C7;color:#D97706;">${escapeHtml(currentLabel)}</span>
            </div>
            <div class="p-5">
              ${STAGES.map(({ label, desc, done, active }, i) => `
                <div class="flex gap-4">
                  <!-- Icon column -->
                  <div class="flex flex-col items-center flex-shrink-0">
                    <div class="w-8 h-8 rounded-full flex items-center justify-center"
                      style="background:${done ? C.green : active ? "#FEF3C7" : C.bg};border:2px solid ${done ? C.green : active ? "#D97706" : C.border};">
                      ${stageIconHtml(done, active)}
                    </div>
                    ${i < STAGES.length - 1 ? `
                      <div class="w-0.5 flex-1 my-1 min-h-8" style="background:${done ? C.green : C.border};"></div>
                    ` : ""}
                  </div>
                  <!-- Content -->
                  <div class="pb-6 flex-1 min-w-0">
                    <h3 class="text-sm font-semibold mb-0.5" style="color:${done || active ? C.text : C.textMuted};">
                      ${escapeHtml(label)}
                      ${active ? `<span class="ml-2 text-xs px-2 py-0.5 rounded-full" style="background:#FEF3C7;color:#D97706;">In Progress</span>` : ""}
                    </h3>
                    <p class="text-xs leading-snug" style="color:${done || active ? C.textMuted : "#CBD5E1"};">${escapeHtml(desc)}</p>
                  </div>
                </div>
              `).join("")}
            </div>
          </div>
        </div>

        <!-- Right: Case details -->
        <div class="space-y-4">
          <div class="rounded-2xl border p-5" style="background:${C.surface};border:1.5px solid ${C.border};">
            <h2 class="text-sm font-semibold mb-4" style="color:${C.text};">Case Summary</h2>
            <div class="space-y-3">
              ${CASE_SUMMARY.map(({ label, value, mono }) => `
                <div class="flex flex-col gap-0.5 pb-2 border-b last:border-0" style="border-color:${C.border};">
                  <span class="text-xs" style="color:${C.textMuted};">${escapeHtml(label)}</span>
                  <span class="text-sm font-semibold" style="color:${C.text};${mono ? "font-family:var(--font-mono);" : ""}">${escapeHtml(value)}</span>
                </div>
              `).join("")}
            </div>
          </div>

          <div class="rounded-2xl border p-5" style="background:${C.surface};border:1.5px solid ${C.border};">
            <h2 class="text-sm font-semibold mb-3" style="color:${C.text};">Assigned Bank</h2>
            ${hasBank ? `
              <div class="flex items-center gap-3 mb-3">
                <div class="w-10 h-10 rounded-xl flex items-center justify-center" style="background:${C.blueLight};">
                  ${icon("building-2", { size: 20, color: C.blue })}
                </div>
                <div class="text-sm font-bold" style="color:${C.text};">${escapeHtml(app.bank)}</div>
              </div>
              <p class="text-xs leading-snug" style="color:${C.textMuted};">Contact your bank for details on this application.</p>
            ` : `
              <div class="flex items-center gap-3 mb-2">
                <div class="w-10 h-10 rounded-xl flex items-center justify-center" style="background:${C.bg};">
                  ${icon("building-2", { size: 18, color: C.textMuted })}
                </div>
                <div class="text-sm font-semibold" style="color:${C.textMuted};">Not Provided</div>
              </div>
              <p class="text-xs leading-snug" style="color:${C.textMuted};">No bank was provided on this business's profile.</p>
            `}
          </div>

          <button data-details class="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold border" style="border:1.5px solid ${C.border};color:${C.text};">
            ${icon("file-text", { size: 16, color: C.text })} View Full Details
          </button>
          <button data-view-offer class="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white" style="background:${C.green};">
            View Offer Letter ${icon("arrow-right", { size: 16 })}
          </button>
        </div>
      </div>
    </div>
  `;

  wireEvents(container, app);
  hydrateIcons();
  wireImageFallbacks(container);
}

function wireEvents(container, app) {
  qs("[data-back]", container).addEventListener("click", () => navigate("/sme"));
  qs("[data-view-offer]", container).addEventListener("click", () => navigate(`/sme/offer/${app.id}`));
  qs("[data-details]", container)?.addEventListener("click", () => navigate(`/sme/application-details/${app.id}`));
}
