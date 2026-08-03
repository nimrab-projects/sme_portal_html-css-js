// 1:1 port of src/app/pages/sme/SmeDashboard.tsx
import { state } from "../../state.js";
import { C } from "../../colors.js";
import { navigate } from "../../router.js";
import { icon, hydrateIcons, wireImageFallbacks, qs, qsa, matchesSearch } from "../../utils.js";

const STATUS_CONFIG = {
  draft: { label: "Draft", color: C.textMuted, bg: "#F3F4F6" },
  submitted: { label: "Submitted", color: C.blue, bg: C.blueLight },
  under_review: { label: "Under Review", color: "#D97706", bg: "#FEF3C7" },
  approved: { label: "Approved", color: C.green, bg: C.greenLight },
  rejected: { label: "Rejected", color: "#DC2626", bg: "#FEE2E2" },
  disbursed: { label: "Disbursed", color: C.greenDark, bg: C.greenLight },
};

function statusBadge(status) {
  const cfg = STATUS_CONFIG[status];
  return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold" style="background:${cfg.bg};color:${cfg.color};">${cfg.label}</span>`;
}

// Visible gradient-stroke border — the app's shared card treatment.
function gradientCard(accent, innerHtml, className = "") {
  return `
    <div class="rounded-2xl p-[1.5px] ${className}" style="background:linear-gradient(135deg, ${accent}90, ${accent}40);">
      <div class="h-full w-full rounded-2xl" style="background:${C.surface};">
        ${innerHtml}
      </div>
    </div>
  `;
}

export function render(container) {
  const selectedBusiness = state.selectedBusiness;
  const viewAllBusinesses = state.viewAllBusinesses;
  // Scoped to whichever business is currently active in the header switcher - this is what
  // makes switching businesses there actually change what the Dashboard shows (stat cards,
  // Recent Applications, By Status), not just the snapshot card above them. state.applications
  // holds every application across all of the applicant's businesses (My Applications
  // intentionally shows that full list unfiltered); Dashboard is the "acting as this business"
  // view, so it filters down to just that business's applications. Picking "All Businesses" in
  // the same switcher (viewAllBusinesses) opts back into the unfiltered list. No selectedBusiness
  // (a brand-new user with none yet, or a transient load) also falls back to showing everything
  // rather than an empty dashboard.
  const applications = selectedBusiness && !viewAllBusinesses
    ? state.applications.filter((a) => a.businessId === selectedBusiness.id)
    : state.applications;

  // Header's global search bar (layout.js) - filters the Recent Applications table only (stat
  // cards/composition below stay based on the full business-scoped `applications` set, matching
  // "search businesses and recent applications" rather than changing the actual counts). Reuses
  // the exact same matching helper every other page's global-search filtering uses.
  const searchQuery = state.globalSearchQuery;
  const recentApplications = applications.filter((a) =>
    matchesSearch(searchQuery, a.caseId, a.businessName, a.scheme, a.bank)
  );

  // Draft/Submitted are no longer reachable applicant-facing states - every application now
  // starts directly at "under_review" (see Services/ApplicationService.cs's
  // SubmitApplicationAsync) and nothing ever creates a "draft" row from this portal. Both
  // values stay valid in the backend/enum (bank/SBP tooling and historical data may still use
  // them) - this only stops the applicant's own Dashboard/My Applications from surfacing them.
  const counts = {
    under_review: applications.filter((a) => a.status === "under_review").length,
    approved: applications.filter((a) => a.status === "approved").length,
    rejected: applications.filter((a) => a.status === "rejected").length,
    disbursed: applications.filter((a) => a.status === "disbursed").length,
  };

  // Phase 8: "Dashboard application cards should navigate directly to /Application" - every
  // stat card now opens the real My Applications list (previously some had no destination at
  // all, and others went straight to the single, ID-less tracking/offer pages).
  const CARDS = [
    { label: "Under Review", value: counts.under_review, iconName: "clock", color: "#D97706", path: "/sme/applications" },
    { label: "Approved", value: counts.approved, iconName: "check-circle-2", color: C.green, path: "/sme/applications" },
    { label: "Rejected", value: counts.rejected, iconName: "x-circle", color: "#DC2626", path: "/sme/applications" },
    { label: "Disbursed", value: counts.disbursed, iconName: "banknote", color: C.greenDark, path: "/sme/applications" },
  ];

  // Part-to-whole composition of the applicant's applications by status.
  // Single sequential hue (opacity-stepped) — the app's own status colors (esp.
  // red vs. green) fail a colorblind-safety check when used as adjacent segments,
  // so identity here rides on the always-visible legend labels, not hue alone.
  const totalApps = Math.max(1, applications.length);
  const COMPOSITION = [
    { name: "Under Review", value: counts.under_review, opacity: 0.6 },
    { name: "Approved", value: counts.approved, opacity: 0.76 },
    { name: "Rejected", value: counts.rejected, opacity: 0.88 },
    { name: "Disbursed", value: counts.disbursed, opacity: 1 },
  ].filter((d) => d.value > 0);

  // "All Businesses" has no single name/nature/address/NTN to show - swaps those four fields
  // for an aggregate business-count + application-count instead, same card/icon/layout
  // otherwise untouched.
  const snapshotInner = viewAllBusinesses ? `
    <div class="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 px-3.5 sm:px-5 py-3 sm:py-4">
      <div class="w-9 h-9 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0"
        style="background:linear-gradient(135deg, ${C.green}, ${C.greenDark});">
        ${icon("layers", { size: 20, color: "#fff" })}
      </div>
      <div class="flex-1 min-w-0">
        <div class="text-base font-extrabold truncate" style="color:${C.text};">All Businesses</div>
        <div class="text-xs mt-0.5" style="color:${C.textMuted};">Showing applications across every business you own</div>
      </div>
      <div class="flex items-center gap-4 sm:pl-4 sm:border-l" style="border-color:${C.border};">
        <div class="flex items-center gap-1.5">
          ${icon("building-2", { size: 14, color: C.textMuted })}
          <span class="text-xs font-semibold" style="color:${C.text};font-family:var(--font-mono);">${state.businesses.length} businesses</span>
        </div>
        <span class="text-xs font-bold px-2.5 py-1 rounded-full" style="background:${C.greenLight};color:${C.green};">
          ${applications.length} applications
        </span>
      </div>
    </div>
  ` : `
    <div class="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 px-3.5 sm:px-5 py-3 sm:py-4">
      <div class="w-9 h-9 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0"
        style="background:linear-gradient(135deg, ${C.green}, ${C.greenDark});">
        ${icon("building-2", { size: 20, color: "#fff" })}
      </div>
      <div class="flex-1 min-w-0">
        <div class="text-base font-extrabold truncate" style="color:${C.text};">${selectedBusiness?.name ?? "—"}</div>
        <div class="text-xs mt-0.5" style="color:${C.textMuted};">${selectedBusiness?.nature ?? "—"} · ${selectedBusiness?.address ?? "—"}</div>
      </div>
      <div class="flex items-center gap-4 sm:pl-4 sm:border-l" style="border-color:${C.border};">
        <div class="flex items-center gap-1.5">
          ${icon("hash", { size: 14, color: C.textMuted })}
          <span class="text-xs font-semibold" style="color:${C.text};font-family:var(--font-mono);">${selectedBusiness?.ntn ?? "—"}</span>
        </div>
        <span class="text-xs font-bold px-2.5 py-1 rounded-full" style="background:${C.greenLight};color:${C.green};">
          ${selectedBusiness?.status ?? "Active"}
        </span>
      </div>
    </div>
  `;

  const statCards = CARDS.map(({ label, value, iconName, color, path }) => gradientCard(
    color,
    `
      <button data-card-path="${path}" class="w-full h-full text-left p-2.5 sm:p-4 rounded-2xl transition-all duration-200 hover:-translate-y-0.5" style="background:${C.surface};">
        <div class="w-6 h-6 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center mb-1.5 sm:mb-3" style="background:${color}18;">
          ${icon(iconName, { size: 16, color })}
        </div>
        <div class="text-base sm:text-2xl font-black leading-none mb-0.5 sm:mb-1" style="color:${C.text};font-family:var(--font-mono);letter-spacing:-0.02em;">${value}</div>
        <div class="text-[10px] sm:text-xs font-medium leading-snug" style="color:${C.textMuted};">${label}</div>
      </button>
    `
  )).join("");

  const tableInner = `
    <div class="rounded-2xl overflow-hidden" style="background:${C.surface};">
      <div class="flex items-center justify-between px-5 py-4 border-b" style="border-color:${C.border};">
        <div class="flex items-center gap-2.5">
          <div class="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style="background:${C.greenLight};">
            ${icon("list-checks", { size: 14, color: C.green })}
          </div>
          <h2 class="text-sm font-bold" style="color:${C.text};">Recent Applications</h2>
        </div>
        <button data-view-all-applications class="text-xs flex items-center gap-1 font-bold" style="color:${C.green};">
          View all ${icon("chevron-right", { size: 12 })}
        </button>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr style="background:${C.bg};">
              ${["Case ID", "Business", "Scheme", "Amount", "Bank", "Status", ""].map((h) => `
                <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide" style="color:${C.textMuted};font-family:var(--font-mono);">${h}</th>
              `).join("")}
            </tr>
          </thead>
          <tbody>
            ${recentApplications.map((app) => `
              <tr data-app-row data-app-id="${app.id}" class="border-t transition-colors hover:bg-gray-50 cursor-pointer" style="border-color:${C.border};">
                <td class="px-4 py-3">
                  <span style="font-family:var(--font-mono);font-size:12px;color:${C.text};">${app.caseId}</span>
                </td>
                <td class="px-4 py-3">
                  <div class="flex items-center gap-2">
                    <div class="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-white" style="background:${C.green};">
                      ${app.businessName?.[0] ?? "?"}
                    </div>
                    <span class="text-xs font-semibold" style="color:${C.text};">${app.businessName}</span>
                  </div>
                </td>
                <td class="px-4 py-3 text-xs" style="color:${C.textMuted};">${app.scheme}</td>
                <td class="px-4 py-3 text-xs font-bold" style="color:${C.text};font-family:'Manrope', sans-serif;">${app.amount}</td>
                <td class="px-4 py-3 text-xs" style="color:${C.textMuted};">${app.bank}</td>
                <td class="px-4 py-3">${statusBadge(app.status)}</td>
                <td class="px-4 py-3">
                  <button data-view-details="${app.id}" class="p-1.5 rounded-lg hover:bg-gray-100" style="color:${C.textMuted};">
                    ${icon("eye", { size: 14 })}
                  </button>
                </td>
              </tr>
            `).join("")}
            ${recentApplications.length === 0 ? `
              <tr>
                <td colspan="7" class="px-4 py-10 text-center text-xs" style="color:${C.textMuted};">
                  ${applications.length === 0 ? "No applications yet." : "No applications match your search."}
                </td>
              </tr>
            ` : ""}
          </tbody>
        </table>
      </div>
    </div>
  `;

  const compositionInner = `
    <div class="p-3.5 sm:p-5">
      <div class="flex items-center gap-2.5 mb-4">
        <div class="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style="background:${C.greenLight};">
          ${icon("pie-chart", { size: 14, color: C.green })}
        </div>
        <h2 class="text-sm font-bold" style="color:${C.text};">By Status</h2>
      </div>

      <div class="flex w-full h-3 rounded-full overflow-hidden mb-4" style="gap:2px;background:${C.bg};">
        ${COMPOSITION.length === 0 ? `
          <div class="w-full h-full rounded-full" style="background:${C.border};"></div>
        ` : COMPOSITION.map((d) => `
          <div class="h-full rounded-full transition-all" style="width:${(d.value / totalApps) * 100}%;background:${C.green};opacity:${d.opacity};min-width:3px;" title="${d.name}: ${d.value}"></div>
        `).join("")}
      </div>

      <div class="space-y-2">
        ${COMPOSITION.length === 0 ? `
          <p class="text-xs" style="color:${C.textMuted};">No applications yet.</p>
        ` : COMPOSITION.map((d) => `
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2 min-w-0">
              <div class="w-2.5 h-2.5 rounded-full flex-shrink-0" style="background:${C.green};opacity:${d.opacity};"></div>
              <span class="text-xs font-medium truncate" style="color:${C.text};">${d.name}</span>
            </div>
            <span class="text-xs font-bold flex-shrink-0" style="color:${C.textMuted};font-family:var(--font-mono);">
              ${d.value} · ${Math.round((d.value / totalApps) * 100)}%
            </span>
          </div>
        `).join("")}
      </div>
    </div>
  `;

  const quickActions = [
    { label: "Apply for Financing", desc: "Start a new application", iconName: "plus-circle", path: "/sme/apply", color: C.green },
    { label: "Track Application", desc: "View application status", iconName: "activity", path: "/sme/tracking", color: C.blue },
    { label: "View Offer Letter", desc: "Review & accept offers", iconName: "file-text", path: "/sme/offer", color: C.orange },
  ];

  const quickActionsInner = `
    <div class="p-3.5 sm:p-5">
      <div class="flex items-center gap-2.5 mb-4">
        <div class="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style="background:${C.blueLight};">
          ${icon("activity", { size: 14, color: C.blue })}
        </div>
        <h2 class="text-sm font-bold" style="color:${C.text};">Quick Actions</h2>
      </div>
      <div class="space-y-2">
        ${quickActions.map(({ label, desc, iconName, path, color }) => `
          <button data-quick-action="${path}" class="w-full flex items-center gap-3 p-3 rounded-xl text-left border transition-all hover:shadow-sm" style="border:1.5px solid ${C.border};">
            <div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style="background:${color}18;">
              ${icon(iconName, { size: 16, color })}
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-xs font-bold" style="color:${C.text};">${label}</div>
              <div class="text-xs" style="color:${C.textMuted};">${desc}</div>
            </div>
            ${icon("arrow-right", { size: 14, color: C.textMuted, className: "flex-shrink-0" })}
          </button>
        `).join("")}
      </div>
    </div>
  `;

  container.innerHTML = `
    <div class="px-6 py-6" style="font-family:'Manrope', sans-serif;">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div class="flex items-center gap-2 mb-1">
            ${icon("sparkles", { size: 16, color: C.orange })}
            <span class="text-xs font-bold uppercase tracking-[0.15em]" style="color:${C.textMuted};font-family:var(--font-mono);">Welcome back</span>
          </div>
          <h1 class="text-2xl font-black leading-tight" style="color:${C.text};letter-spacing:-0.02em;">Dashboard</h1>
        </div>
        <button data-new-application class="flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98]"
          style="background:linear-gradient(135deg, ${C.green}, ${C.greenDark});box-shadow:0 8px 20px -6px ${C.green}55;">
          ${icon("plus-circle", { size: 16 })} New Application
        </button>
      </div>

      ${gradientCard(C.green, snapshotInner, "mb-6")}

      <div class="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-6">
        ${statCards}
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
        ${gradientCard(C.green, tableInner, "lg:col-span-2")}

        <div class="space-y-4">
          ${gradientCard(C.green, compositionInner)}
          ${gradientCard(C.blue, quickActionsInner)}
        </div>
      </div>
    </div>
  `;

  wireEvents(container);
  hydrateIcons();
  wireImageFallbacks(container);
}

function wireEvents(container) {
  qs("[data-new-application]", container)?.addEventListener("click", () => navigate("/sme/apply"));

  qsa("[data-card-path]", container).forEach((btn) => {
    const path = btn.getAttribute("data-card-path");
    if (path) btn.addEventListener("click", () => navigate(path));
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

  qs("[data-view-all-applications]", container)?.addEventListener("click", () => navigate("/sme/applications"));

  qsa("[data-quick-action]", container).forEach((btn) => {
    btn.addEventListener("click", () => navigate(btn.getAttribute("data-quick-action")));
  });
}
