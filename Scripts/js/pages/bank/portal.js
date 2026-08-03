// 1:1 port of src/app/pages/bank/BankPortal.tsx
import { state, setBankApplications } from "../../state.js";
import { C } from "../../colors.js";
import { icon, hydrateIcons, wireImageFallbacks, openModal, qs, qsa } from "../../utils.js";
import * as api from "../../api.js";

/* Minimal gradient-stroke border, matching the app's redesigned dashboard cards */
function gradientCardOpen(accent, extraClass = "") {
  return `<div class="rounded-2xl p-px ${extraClass}" style="background:linear-gradient(135deg, ${accent}45, ${accent}0A);">
    <div class="h-full w-full rounded-2xl" style="background:${C.surface};">`;
}
function gradientCardClose() {
  return `</div></div>`;
}

const STATUS_CFG = {
  pending: { label: "Pending Review", color: C.textMuted, bg: "#F3F4F6" },
  under_review: { label: "Under Review", color: "#D97706", bg: "#FEF3C7" },
  offer_issued: { label: "Offer Issued", color: C.blue, bg: C.blueLight },
  approved: { label: "Approved", color: C.green, bg: C.greenLight },
  rejected: { label: "Rejected", color: "#DC2626", bg: "#FEE2E2" },
  disbursed: { label: "Disbursed", color: C.greenDark, bg: C.greenLight },
};

// Statuses where assessment is still actionable — everything else is already resolved
const ASSESSABLE_STATUSES = ["pending", "under_review"];

const STATUS_RESOLUTION_NOTE = {
  offer_issued: "A conditional offer has already been issued for this application.",
  approved: "This application has already been approved.",
  rejected: "This application has already been declined.",
  disbursed: "Funds have already been disbursed for this application.",
};

function badgeHtml(status) {
  const c = STATUS_CFG[status] ?? STATUS_CFG.pending;
  return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold" style="background:${c.bg};color:${c.color};">${c.label}</span>`;
}

// ── Dashboard ───────────────────────────────────────────────────────────────
// Decorative only - there is no real historical-trend or credit-risk-scoring data source
// anywhere in this system, and neither is part of this phase's required Bank Dashboard stats
// (Total Assigned/Under Review/Approved/Rejected/Documents Pending/Recently Assigned - see
// STAT_CARDS and the Recent Applications table below, which are all real). Left as-is rather
// than fabricating a fake trend/risk model.
const MONTHLY_TREND = [
  { month: "Jan", value: 28 },
  { month: "Feb", value: 34 },
  { month: "Mar", value: 31 },
  { month: "Apr", value: 42 },
  { month: "May", value: 39 },
  { month: "Jun", value: 48 },
];

// Fetches real, live counts from SQL Server (Controllers/BankApplicationController.cs's
// Dashboard action) rather than computing them client-side from state.bankApplications - the
// one stat that genuinely can't be derived from that list alone (Documents Pending) needs a
// real query anyway, so all five cards share the one server round-trip for consistency.
function renderDashboard(outletEl, ctx) {
  renderDashboardWithStats(outletEl, ctx, null);
  api.getBankDashboard().then((stats) => {
    renderDashboardWithStats(outletEl, ctx, stats || {});
  });
}

function renderDashboardWithStats(outletEl, ctx, stats) {
  const bankApplications = state.bankApplications;
  const s = stats || {};
  const loading = stats === null;
  const fmt = (n) => (loading ? "—" : (n ?? 0).toString());

  const openForReview = (id) => {
    if (typeof ctx.setFocusApplicationId === "function") ctx.setFocusApplicationId(id);
    ctx.setActiveKey("queue", id);
  };

  const STAT_CARDS = [
    { label: "Total Assigned", value: fmt(s.totalAssigned), iconName: "file-text", color: C.blue, bg: C.blueLight, delta: "" },
    { label: "Under Review", value: fmt(s.underReview), iconName: "clock", color: "#D97706", bg: "#FEF3C7", delta: "" },
    { label: "Approved", value: fmt(s.approved), iconName: "check-circle-2", color: C.green, bg: C.greenLight, delta: "" },
    { label: "Rejected", value: fmt(s.rejected), iconName: "x-circle", color: "#DC2626", bg: "#FEE2E2", delta: "" },
    { label: "Documents Pending", value: fmt(s.documentsPending), iconName: "file-clock", color: C.orange, bg: C.orangeLight, delta: "" },
  ];

  const totalApps = Math.max(1, bankApplications.length);
  const statusCount = (s) => bankApplications.filter((a) => a.status === s).length;
  const STATUS_COMPOSITION = [
    { name: "Under Review", value: statusCount("under_review"), opacity: 0.48 },
    { name: "Offer Issued", value: statusCount("offer_issued"), opacity: 0.64 },
    { name: "Approved", value: statusCount("approved"), opacity: 0.8 },
    { name: "Rejected", value: statusCount("rejected"), opacity: 1 },
  ].filter((d) => d.value > 0);

  const riskCount = (r) => bankApplications.filter((a) => a.risk === r).length;
  const RISK_COMPOSITION = [
    { name: "Low Risk", value: riskCount("Low"), color: C.green },
    { name: "Medium Risk", value: riskCount("Medium"), color: C.orange },
    { name: "High Risk", value: riskCount("High"), color: C.blue },
  ].filter((d) => d.value > 0);

  const trendMax = Math.max(...MONTHLY_TREND.map((d) => d.value));

  outletEl.innerHTML = `
    <div class="px-6 py-6" style="font-family:'Manrope', sans-serif;">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div class="flex items-center gap-2 mb-1">
            ${icon("sparkles", { size: 16, color: C.orange })}
            <span class="text-xs font-bold uppercase tracking-[0.15em]" style="color:${C.textMuted};font-family:var(--font-mono);">Welcome back</span>
          </div>
          <h1 class="text-2xl font-black leading-tight" style="color:${C.text};letter-spacing:-0.02em;">Bank Dashboard</h1>
        </div>
      </div>

      ${gradientCardOpen(C.blue, "mb-6")}
        <div class="flex items-center gap-4 px-5 py-4">
          <div class="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style="background:linear-gradient(135deg, ${C.blue}, #1E3A8A);">
            ${icon("landmark", { size: 20, className: "text-white" })}
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-base font-extrabold truncate" style="color:${C.text};">${state.user?.bankName ?? "Bank"}</div>
            <div class="text-xs mt-0.5" style="color:${C.textMuted};">SME Finance Division · Karachi Region</div>
          </div>
        </div>
      ${gradientCardClose()}

      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        ${STAT_CARDS.map(({ label, value, iconName, color, delta }) => `
          ${gradientCardOpen(color)}
            <div class="p-4 rounded-2xl transition-all duration-200 hover:-translate-y-0.5">
              <div class="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style="background:${color}18;">
                ${icon(iconName, { size: 16, color })}
              </div>
              <div class="text-2xl font-black mb-0.5" style="color:${C.text};font-family:var(--font-mono);letter-spacing:-0.02em;">${value}</div>
              <div class="text-xs font-medium mb-1" style="color:${C.textMuted};">${label}</div>
              ${delta ? `<div class="text-xs font-bold" style="color:${color};">${delta}</div>` : ""}
            </div>
          ${gradientCardClose()}
        `).join("")}
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
        ${gradientCardOpen(C.blue, "lg:col-span-2")}
          <div class="rounded-2xl overflow-hidden">
            <div class="px-5 py-4 border-b flex items-center justify-between" style="border-color:${C.border};">
              <div class="flex items-center gap-2.5">
                <div class="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style="background:${C.blueLight};">
                  ${icon("list-checks", { size: 14, color: C.blue })}
                </div>
                <h2 class="text-sm font-bold" style="color:${C.text};">Recent Applications</h2>
              </div>
              <button data-view-all-queue class="text-xs font-bold flex items-center gap-1 hover:opacity-80" style="color:${C.blue};">
                View All Queue ${icon("arrow-right", { size: 12 })}
              </button>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr style="background:${C.bg};">
                    ${["Case ID", "Business", "Scheme", "Amount", "Submitted", "Status", "Risk", ""].map((h) => `
                      <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide" style="color:${C.textMuted};font-family:var(--font-mono);">${h}</th>
                    `).join("")}
                  </tr>
                </thead>
                <tbody>
                  ${bankApplications.slice(0, 4).map((app) => {
                    // Applications start life at "under_review" (there is no separate "pending"/
                    // "submitted" holding state - see ApplicationService.SubmitApplicationAsync),
                    // so that's the real "newly assigned, not yet actioned" status to flag here -
                    // matching the same first status the Applicant Portal shows.
                    const isNew = app.status === "under_review";
                    return `
                      <tr data-open-review="${app.id}"
                        class="border-t hover:bg-gray-50 cursor-pointer transition-colors"
                        style="border-color:${C.border};background:${isNew ? "#FEF2F2" : ""};border-left:${isNew ? "3px solid #DC2626" : "3px solid transparent"};">
                        <td class="px-4 py-3 text-xs font-mono" style="color:${C.text};font-family:var(--font-mono);">${app.caseId}</td>
                        <td class="px-4 py-3">
                          <div class="flex items-center gap-2">
                            <div class="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-white" style="background:${C.blue};">
                              ${app.business[0]}
                            </div>
                            <span class="text-xs font-semibold" style="color:${C.text};">${app.business}</span>
                            ${isNew ? `<span class="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white" style="background:#DC2626;">NEW</span>` : ""}
                          </div>
                        </td>
                        <td class="px-4 py-3 text-xs" style="color:${C.textMuted};">${app.scheme}</td>
                        <td class="px-4 py-3 text-xs font-bold" style="color:${C.text};font-family:var(--font-mono);">${app.amount}</td>
                        <td class="px-4 py-3 text-xs" style="color:${C.textMuted};">${app.submitted}</td>
                        <td class="px-4 py-3">${badgeHtml(app.status)}</td>
                        <td class="px-4 py-3">
                          <span class="text-xs font-semibold px-2 py-0.5 rounded-full"
                            style="background:${app.risk === "Low" ? C.greenLight : app.risk === "Medium" ? "#FEF3C7" : "#FEE2E2"};color:${app.risk === "Low" ? C.green : app.risk === "Medium" ? "#D97706" : "#DC2626"};">${app.risk}</span>
                        </td>
                        <td class="px-4 py-3">
                          <button data-open-review-eye="${app.id}" class="p-1.5 rounded-lg hover:bg-gray-100" style="color:${C.textMuted};">
                            ${icon("eye", { size: 14 })}
                          </button>
                        </td>
                      </tr>
                    `;
                  }).join("")}
                </tbody>
              </table>
            </div>
          </div>
        ${gradientCardClose()}

        <div class="space-y-4">
          ${gradientCardOpen(C.blue)}
            <div class="p-3.5 sm:p-5">
              <div class="flex items-center gap-2.5 mb-4">
                <div class="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style="background:${C.blueLight};">
                  ${icon("bar-chart-3", { size: 14, color: C.blue })}
                </div>
                <h2 class="text-sm font-bold" style="color:${C.text};">Monthly Applications</h2>
              </div>
              <div class="flex items-end justify-between gap-2" style="height:104px;">
                ${MONTHLY_TREND.map((d) => `
                  <div class="flex-1 flex flex-col items-center justify-end h-full gap-1.5">
                    <span class="text-xs font-bold" style="color:${C.text};font-family:var(--font-mono);">${d.value}</span>
                    <div class="w-full rounded-t-md transition-all"
                      style="height:${(d.value / trendMax) * 100}%;background:${C.blue};min-height:4px;"
                      title="${d.month}: ${d.value} applications"></div>
                    <span class="text-[10px] font-semibold" style="color:${C.textMuted};">${d.month}</span>
                  </div>
                `).join("")}
              </div>
            </div>
          ${gradientCardClose()}

          ${gradientCardOpen(C.orange)}
            <div class="p-3.5 sm:p-5">
              <div class="flex items-center gap-2.5 mb-4">
                <div class="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style="background:${C.orangeLight};">
                  ${icon("pie-chart", { size: 14, color: C.orange })}
                </div>
                <h2 class="text-sm font-bold" style="color:${C.text};">By Status</h2>
              </div>

              <div class="flex w-full h-3 rounded-full overflow-hidden mb-4" style="gap:2px;background:${C.bg};">
                ${STATUS_COMPOSITION.length === 0
                  ? `<div class="w-full h-full rounded-full" style="background:${C.border};"></div>`
                  : STATUS_COMPOSITION.map((d) => `
                    <div class="h-full rounded-full transition-all"
                      style="width:${(d.value / totalApps) * 100}%;background:${C.blue};opacity:${d.opacity};min-width:3px;"
                      title="${d.name}: ${d.value}"></div>
                  `).join("")}
              </div>

              <div class="space-y-2">
                ${STATUS_COMPOSITION.map((d) => `
                  <div class="flex items-center justify-between gap-2">
                    <div class="flex items-center gap-2 min-w-0">
                      <div class="w-2.5 h-2.5 rounded-full flex-shrink-0" style="background:${C.blue};opacity:${d.opacity};"></div>
                      <span class="text-xs font-medium truncate" style="color:${C.text};">${d.name}</span>
                    </div>
                    <span class="text-xs font-bold flex-shrink-0" style="color:${C.textMuted};font-family:var(--font-mono);">
                      ${d.value} · ${Math.round((d.value / totalApps) * 100)}%
                    </span>
                  </div>
                `).join("")}
              </div>
            </div>
          ${gradientCardClose()}

          ${gradientCardOpen(C.green)}
            <div class="p-3.5 sm:p-5">
              <div class="flex items-center gap-2.5 mb-4">
                <div class="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style="background:${C.greenLight};">
                  ${icon("trending-up", { size: 14, color: C.green })}
                </div>
                <h2 class="text-sm font-bold" style="color:${C.text};">Portfolio by Risk</h2>
              </div>

              <div class="flex w-full h-3 rounded-full overflow-hidden mb-4" style="gap:2px;background:${C.bg};">
                ${RISK_COMPOSITION.length === 0
                  ? `<div class="w-full h-full rounded-full" style="background:${C.border};"></div>`
                  : RISK_COMPOSITION.map((d) => `
                    <div class="h-full rounded-full transition-all"
                      style="width:${(d.value / totalApps) * 100}%;background:${d.color};min-width:3px;"
                      title="${d.name}: ${d.value}"></div>
                  `).join("")}
              </div>

              <div class="space-y-2">
                ${RISK_COMPOSITION.map((d) => `
                  <div class="flex items-center justify-between gap-2">
                    <div class="flex items-center gap-2 min-w-0">
                      <div class="w-2.5 h-2.5 rounded-full flex-shrink-0" style="background:${d.color};"></div>
                      <span class="text-xs font-medium truncate" style="color:${C.text};">${d.name}</span>
                    </div>
                    <span class="text-xs font-bold flex-shrink-0" style="color:${C.textMuted};font-family:var(--font-mono);">
                      ${d.value} · ${Math.round((d.value / totalApps) * 100)}%
                    </span>
                  </div>
                `).join("")}
              </div>
            </div>
          ${gradientCardClose()}
        </div>
      </div>
    </div>
  `;

  qsa("[data-view-all-queue]", outletEl).forEach((b) => b.addEventListener("click", () => ctx.setActiveKey("queue")));
  qsa("[data-open-review]", outletEl).forEach((tr) => {
    tr.addEventListener("click", () => openForReview(tr.getAttribute("data-open-review")));
  });
  qsa("[data-open-review-eye]", outletEl).forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      openForReview(btn.getAttribute("data-open-review-eye"));
    });
  });

  hydrateIcons();
  wireImageFallbacks(outletEl);
}

// ── Request More Info modal ──────────────────────────────────────────────────
function openRequestInfoModal(business, caseId, onSubmit) {
  let requestType = "documents";
  let messages = [""];

  openModal((overlay, close) => {
    function renderInner() {
      const isDocs = requestType === "documents";
      overlay.innerHTML = `
        <div class="w-full max-w-lg rounded-2xl border max-h-[90vh] overflow-y-auto" style="background:${C.surface};border:1.5px solid ${C.border};">
          <div class="flex items-start justify-between p-5 border-b" style="border-color:${C.border};">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style="background:${C.orangeLight};">
                ${icon("message-square", { size: 18, color: C.orange })}
              </div>
              <div>
                <h3 class="text-sm font-bold" style="color:${C.text};">Request More Information</h3>
                <p class="text-xs" style="color:${C.textMuted};">${business} · ${caseId}</p>
              </div>
            </div>
            <button data-close class="p-1 rounded-lg hover:bg-gray-100" style="color:${C.textMuted};">${icon("x", { size: 16 })}</button>
          </div>

          <div class="p-5 space-y-5">
            <div>
              <label class="block text-sm font-medium mb-2" style="color:${C.text};">Request Type</label>
              <div class="grid grid-cols-2 gap-2.5">
                ${[
                  { value: "documents", label: "Request Documents" },
                  { value: "info", label: "Request More Info" },
                ].map((opt) => `
                  <label data-request-type="${opt.value}"
                    class="flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer"
                    style="border:1.5px solid ${requestType === opt.value ? C.orange : C.border};background:${requestType === opt.value ? C.orangeLight : C.bg};">
                    <input type="radio" name="requestType" class="accent-current" ${requestType === opt.value ? "checked" : ""} />
                    <span class="text-sm font-medium" style="color:${requestType === opt.value ? C.orange : C.text};">${opt.label}</span>
                  </label>
                `).join("")}
              </div>
            </div>

            <div class="rounded-xl p-3 flex gap-2.5" style="background:${C.blueLight};border:1.5px solid ${C.blue}20;">
              ${icon("message-square", { size: 16, color: C.blue, style: "margin-top:2px;" })}
              <p class="text-xs leading-relaxed" style="color:${C.blue};">
                This sends a notification to the applicant on the SME Portal${isDocs ? " asking them to upload the document(s) described below." : " with your message below."}
              </p>
            </div>

            <div>
              <label class="block text-sm font-medium mb-1.5" style="color:${C.text};">
                ${isDocs ? "Document(s) Needed" : "Message to Applicant"}
              </label>
              <div class="space-y-2.5">
                ${messages.map((m, i) => `
                  <div class="relative">
                    <textarea rows="3" data-message-idx="${i}"
                      placeholder="${i > 0 ? "Add another request..." : isDocs ? "Describe the document you need (e.g. latest bank statement, tax return)..." : "Describe what additional information is needed..."}"
                      class="w-full rounded-xl border text-sm outline-none resize-none"
                      style="padding:10px 36px 10px 12px;border:1.5px solid ${C.border};background:${C.bg};color:${C.text};">${m.replace(/</g, "&lt;")}</textarea>
                    ${messages.length > 1 ? `
                      <button type="button" data-remove-message="${i}" class="absolute top-2.5 right-2.5 p-1 rounded-lg hover:bg-red-50" style="color:#DC2626;">
                        ${icon("trash-2", { size: 14 })}
                      </button>` : ""}
                  </div>
                `).join("")}
              </div>
              <button type="button" data-add-message class="mt-2.5 flex items-center gap-1.5 text-xs font-semibold" style="color:${C.orange};">
                ${icon("plus", { size: 14 })} Add another
              </button>
            </div>
          </div>

          <div class="flex gap-3 p-5 border-t" style="border-color:${C.border};">
            <button data-close class="flex-1 py-2.5 rounded-xl text-sm font-semibold border" style="border:1.5px solid ${C.border};color:${C.text};">Cancel</button>
            <button data-submit ${messages.every((m) => !m.trim()) ? "disabled" : ""}
              class="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40" style="background:${C.orange};">
              ${icon("send", { size: 16 })} Send Request
            </button>
          </div>
        </div>
      `;

      qsa("[data-close]", overlay).forEach((b) => b.addEventListener("click", close));
      qsa("[data-request-type]", overlay).forEach((label) => {
        label.addEventListener("click", () => {
          requestType = label.getAttribute("data-request-type");
          renderInner();
        });
      });
      qsa("[data-message-idx]", overlay).forEach((ta) => {
        ta.addEventListener("input", (e) => {
          const i = Number(ta.getAttribute("data-message-idx"));
          messages[i] = e.target.value;
          // Send Request's disabled attribute is only computed at render time (see markup
          // above); without this, it was set once from the initial empty messages=[""] and
          // never cleared, so Send Request stayed permanently disabled - typing here never
          // re-rendered the modal (unlike Add another/Remove, which do), so the button (and
          // therefore this whole request) was silently unreachable regardless of what was typed.
          const submitBtn = qs("[data-submit]", overlay);
          if (submitBtn) submitBtn.disabled = messages.every((m) => !m.trim());
        });
      });
      qsa("[data-remove-message]", overlay).forEach((btn) => {
        btn.addEventListener("click", () => {
          const i = Number(btn.getAttribute("data-remove-message"));
          messages = messages.filter((_, idx) => idx !== i);
          renderInner();
        });
      });
      const addBtn = qs("[data-add-message]", overlay);
      if (addBtn) addBtn.addEventListener("click", () => { messages = [...messages, ""]; renderInner(); });
      const submitBtn = qs("[data-submit]", overlay);
      if (submitBtn) submitBtn.addEventListener("click", () => {
        onSubmit(requestType, messages.filter((m) => m.trim()));
        close();
      });

      hydrateIcons();
    }
    renderInner();
  });
}

// ── Issue Conditional Offer modal ────────────────────────────────────────────
// Collects the real terms (Phase 14) alongside the signed PDF - previously this modal only
// ever collected a file, and the "terms" shown to the applicant afterward were 100% hardcoded
// in js/pages/sme/offerLetter.js. onSubmit(terms, file) now drives a real, persisted
// api.issueBankOffer() call (see submitIssueOffer below), not a client-only blob URL.
function openIssueOfferModal(business, caseId, onSubmit) {
  let file = null;
  const terms = {
    approvedAmount: "", markupRate: "", tenor: "", monthlyInstallment: "",
    processingFee: "", expiryDate: "", disbursementTimeline: "",
  };

  const FIELDS = [
    { key: "approvedAmount", label: "Approved Amount (PKR)", type: "number", placeholder: "e.g. 8000000", required: true },
    { key: "markupRate", label: "Markup Rate", type: "text", placeholder: "e.g. 9.5% per annum (Fixed)", required: true },
    { key: "tenor", label: "Tenor", type: "text", placeholder: "e.g. 3 Years (36 Months)", required: true },
    { key: "monthlyInstallment", label: "Monthly Installment", type: "text", placeholder: "e.g. PKR 254,800 (approx.)" },
    { key: "processingFee", label: "Processing Fee", type: "text", placeholder: "e.g. 0.5% of approved amount" },
    { key: "expiryDate", label: "Offer Expiry Date", type: "date" },
    { key: "disbursementTimeline", label: "Disbursement Timeline", type: "text", placeholder: "e.g. 5–7 business days post acceptance" },
  ];

  function canSubmit() {
    return !!file && !!terms.approvedAmount && Number(terms.approvedAmount) > 0 && !!terms.markupRate && !!terms.tenor;
  }

  openModal((overlay, close) => {
    function renderInner() {
      overlay.innerHTML = `
        <div class="w-full max-w-lg rounded-2xl border max-h-[90vh] overflow-y-auto" style="background:${C.surface};border:1.5px solid ${C.border};">
          <div class="flex items-start justify-between p-5 border-b" style="border-color:${C.border};">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style="background:${C.greenLight};">
                ${icon("upload-cloud", { size: 18, color: C.green })}
              </div>
              <div>
                <h3 class="text-sm font-bold" style="color:${C.text};">Issue Conditional Offer</h3>
                <p class="text-xs" style="color:${C.textMuted};">${business} · ${caseId}</p>
              </div>
            </div>
            <button data-close class="p-1 rounded-lg hover:bg-gray-100" style="color:${C.textMuted};">${icon("x", { size: 16 })}</button>
          </div>

          <div class="p-5 space-y-4">
            <div class="rounded-xl p-3 flex gap-2.5" style="background:${C.blueLight};border:1.5px solid ${C.blue}20;">
              ${icon("file-text", { size: 16, color: C.blue, style: "margin-top:2px;" })}
              <p class="text-xs leading-relaxed" style="color:${C.blue};">
                Enter the real financing terms and attach the signed offer letter. The applicant
                will be notified on the SME Portal and can review these exact terms there to
                accept or decline.
              </p>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              ${FIELDS.map(({ key, label, type, placeholder, required }) => `
                <div class="${type === "text" && (key === "disbursementTimeline") ? "sm:col-span-2" : ""}">
                  <label class="block text-xs font-medium mb-1.5" style="color:${C.text};">${label}${required ? " *" : ""}</label>
                  <input data-term="${key}" type="${type}" value="${terms[key]}" placeholder="${placeholder || ""}"
                    class="w-full rounded-xl border text-sm outline-none"
                    style="padding:8px 10px;border:1.5px solid ${C.border};background:${C.bg};color:${C.text};" />
                </div>
              `).join("")}
            </div>

            <div>
              <label class="block text-sm font-medium mb-2" style="color:${C.text};">Offer Document *</label>
              <label class="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-8 cursor-pointer transition-all hover:bg-gray-50"
                style="border-color:${file ? C.green : C.border};">
                <input type="file" data-file-input accept=".pdf,.jpg,.jpeg,.png" class="hidden" />
                ${file ? `
                  ${icon("check-circle-2", { size: 24, color: C.green })}
                  <span class="text-sm font-semibold" style="color:${C.text};">${file.name}</span>
                  <span class="text-xs" style="color:${C.textMuted};">Click to replace</span>
                ` : `
                  ${icon("upload-cloud", { size: 24, color: C.textMuted })}
                  <span class="text-sm font-medium" style="color:${C.text};">Click to upload offer letter</span>
                  <span class="text-xs" style="color:${C.textMuted};">PDF, JPG, or PNG</span>
                `}
              </label>
            </div>
          </div>

          <div class="flex gap-3 p-5 border-t" style="border-color:${C.border};">
            <button data-close class="flex-1 py-2.5 rounded-xl text-sm font-semibold border" style="border:1.5px solid ${C.border};color:${C.text};">Cancel</button>
            <button data-submit ${!canSubmit() ? "disabled" : ""}
              class="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40" style="background:${C.green};">
              ${icon("send", { size: 16 })} Issue &amp; Send to Applicant
            </button>
          </div>
        </div>
      `;

      qsa("[data-close]", overlay).forEach((b) => b.addEventListener("click", close));
      qsa("[data-term]", overlay).forEach((input) => {
        input.addEventListener("input", (e) => {
          terms[e.target.getAttribute("data-term")] = e.target.value;
          const submitBtn = qs("[data-submit]", overlay);
          if (submitBtn) submitBtn.disabled = !canSubmit();
        });
      });
      const fileInput = qs("[data-file-input]", overlay);
      if (fileInput) fileInput.addEventListener("change", (e) => {
        file = e.target.files && e.target.files[0] ? e.target.files[0] : null;
        renderInner();
      });
      const submitBtn = qs("[data-submit]", overlay);
      if (submitBtn) submitBtn.addEventListener("click", () => { if (canSubmit()) { onSubmit({ ...terms }, file); close(); } });

      hydrateIcons();
    }
    renderInner();
  });
}

// ── Application Queue ────────────────────────────────────────────────────────
// Module-level local state (survives re-renders triggered by outer state changes).
let q_selected = null;
// Full ApplicationDetailViewModel for q_selected, fetched fresh from
// Controllers/BankApplicationController.cs whenever the selection changes - the queue list
// itself only carries the list-shape fields (business/caseId/amount/...), not NTN/applicant/
// financing/documents/timeline, so the detail tabs need this second, per-application fetch.
let q_detail = null;
let q_detailLoading = false;
let q_activeTab = "info";
let q_searchQ = "";
let q_requestSent = false;
let q_docActionError = "";

const TABS = ["info", "ownership", "financing", "documents", "audit"];
// "ownership" had no case in the original source (always rendered blank) - repurposed here to
// show Applicant Information (a real requirement of this phase with nowhere else to live
// without adding a new tab/page, which "do not redesign the UI" rules out).
const TAB_LABELS = {
  info: "Business Information", ownership: "Applicant Info", financing: "Financing Details",
  documents: "Documents", audit: "Audit Trail",
};

const DOC_STATUS_CFG = {
  pending_verification: { label: "Pending Verification", color: "#D97706", bg: "#FEF3C7" },
  verified: { label: "Verified", color: C.green, bg: C.greenLight },
  rejected: { label: "Rejected", color: "#DC2626", bg: "#FEE2E2" },
};

function handleExport(selected) {
  if (!selected) return;
  const doc = new window.jspdf.jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(29, 78, 216);
  doc.rect(0, 0, pageWidth, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("SBP SME Portal — Application Summary", 14, 17);

  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(selected.business, 14, 42);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(selected.caseId, 14, 49);

  const rows = [
    ["Financing Scheme", selected.scheme],
    ["Requested Amount", selected.amount],
    ["Submitted", selected.submitted],
    ["Status", STATUS_CFG[selected.status]?.label ?? selected.status],
    ["Risk Rating", selected.risk],
  ];

  let y = 62;
  rows.forEach(([label, value], i) => {
    if (i % 2 === 0) {
      doc.setFillColor(247, 248, 250);
      doc.rect(14, y - 6, pageWidth - 28, 10, "F");
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text(label, 18, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(20, 20, 20);
    doc.text(String(value), 90, y);
    y += 10;
  });

  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(`Generated ${new Date().toLocaleString()}`, 14, y + 10);

  doc.save(`${selected.caseId}.pdf`);
}

function fetchDetailFor(outletEl, ctx, statusFilter, title, applicationId) {
  q_detail = null;
  q_detailLoading = true;
  q_docActionError = "";
  api.getBankApplicationDetail(applicationId).then((result) => {
    // The selection may have changed (or the officer may have navigated away) while this was
    // in flight - never let a slow, stale response overwrite a newer selection's data.
    if (!q_selected || q_selected.id !== applicationId) return;
    q_detailLoading = false;
    q_detail = (result && result.success) ? result.application : null;
    renderApplicationQueue(outletEl, ctx, statusFilter, title);
  });
}

function docStatusBadgeHtml(status) {
  const c = DOC_STATUS_CFG[status] ?? DOC_STATUS_CFG.pending_verification;
  return `<span class="text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0" style="background:${c.bg};color:${c.color};">${c.label}</span>`;
}

function renderApplicationQueue(outletEl, ctx, statusFilter, title) {
  // One-shot: consume any pending focus-application id from the layout.
  const focusId = typeof ctx.consumeFocusApplicationId === "function" ? ctx.consumeFocusApplicationId() : null;
  if (focusId) {
    const app = state.bankApplications.find((a) => a.id === focusId);
    if (app) {
      q_selected = app;
      q_requestSent = false;
      fetchDetailFor(outletEl, ctx, statusFilter, title, app.id);
    }
  } else if (q_selected && !q_detail && !q_detailLoading) {
    // Re-entering this view (e.g. "Back to Queue" from Credit Assessment) with a selection but
    // no detail loaded yet - either the very first render, or the detail was deliberately
    // invalidated after a status change made elsewhere. Fetch it instead of showing a
    // permanently-empty detail panel.
    fetchDetailFor(outletEl, ctx, statusFilter, title, q_selected.id);
  }

  const scoped = statusFilter ? state.bankApplications.filter((a) => statusFilter.includes(a.status)) : state.bankApplications;
  // Extended beyond the original business/caseId-only match so the existing single search box
  // also covers this phase's "search by Reference Number, Applicant Name, Business Name,
  // Status, Date, Requested Amount" requirement, without adding new filter UI elements.
  const q = q_searchQ.toLowerCase();
  const filtered = scoped.filter((a) =>
    a.business.toLowerCase().includes(q) ||
    a.caseId.toLowerCase().includes(q) ||
    (a.applicantName || "").toLowerCase().includes(q) ||
    (STATUS_CFG[a.status]?.label || a.status || "").toLowerCase().includes(q) ||
    (a.submitted || "").toLowerCase().includes(q) ||
    (a.amount || "").toLowerCase().includes(q)
  );

  function fieldsGridHtml(fields) {
    return `
      <div class="grid grid-cols-2 gap-3">
        ${fields.map(({ label, value }) => `
          <div class="p-3 rounded-xl" style="background:${C.bg};border:1.5px solid ${C.border};">
            <div class="text-xs mb-1" style="color:${C.textMuted};">${label}</div>
            <div class="text-sm font-semibold" style="color:${C.text};">${value ?? "—"}</div>
          </div>
        `).join("")}
      </div>
    `;
  }

  function detailTabContent(detail) {
    if (q_detailLoading || !detail) {
      return `
        <div class="flex items-center justify-center gap-2 py-10 text-center">
          <p class="text-xs" style="color:${C.textMuted};">${q_detailLoading ? "Loading…" : "Couldn't load this application's details."}</p>
        </div>
      `;
    }
    if (q_activeTab === "info") {
      return fieldsGridHtml([
        { label: "Business Name", value: detail.businessName },
        { label: "Business Nature", value: detail.businessNature },
        { label: "NTN", value: detail.businessNtn || "Not Provided" },
        { label: "Business Age (years)", value: detail.businessAge },
        { label: "Monthly Turnover (PKR)", value: Number(detail.monthlyTurnover || 0).toLocaleString() },
        { label: "Employees", value: detail.employees },
        { label: "Business Status", value: detail.businessStatus },
        { label: "Business Premises", value: detail.businessPremise },
      ]);
    }
    if (q_activeTab === "ownership") {
      return fieldsGridHtml([
        { label: "Applicant Name", value: detail.applicantName },
        { label: "Applicant Email", value: detail.applicantEmail },
        { label: "Applicant Mobile", value: detail.applicantMobile },
        { label: "Owner CNIC", value: detail.businessOwnerCnic },
        { label: "Contact Person", value: detail.businessContactPerson },
        { label: "Contact No.", value: detail.businessCellLandline },
        { label: "Business Email", value: detail.businessEmail },
      ]);
    }
    if (q_activeTab === "financing") {
      const fields = [
        { label: "Facility Type", value: detail.scheme },
        { label: "Purpose of Finance", value: detail.purposeOfFinance },
        { label: "Requested Amount", value: detail.amount },
        { label: "IBAN", value: detail.businessIban || "Not Provided" },
      ];
      return `
        <div class="space-y-3">
          ${fields.map(({ label, value }) => `
            <div class="flex items-center gap-4 py-2 border-b" style="border-color:${C.border};">
              <span class="text-xs w-36 flex-shrink-0" style="color:${C.textMuted};">${label}</span>
              <span class="text-sm font-semibold" style="color:${C.text};${label === "IBAN" ? "font-family:var(--font-mono);" : ""}">${value ?? "—"}</span>
            </div>
          `).join("")}
        </div>
      `;
    }
    if (q_activeTab === "documents") {
      const docs = detail.documents || [];
      return `
        ${q_docActionError ? `
          <div class="rounded-xl p-3 flex gap-2.5 mb-3" style="background:#FEE2E2;border:1.5px solid #DC2626;">
            ${icon("x-circle", { size: 16, color: "#DC2626", style: "margin-top:2px;" })}
            <p class="text-xs leading-relaxed" style="color:#DC2626;">${q_docActionError}</p>
          </div>
        ` : ""}
        ${docs.length === 0 ? `
          <div class="flex flex-col items-center justify-center gap-2 py-10 text-center">
            ${icon("file-text", { size: 32, className: "opacity-20", color: C.textMuted })}
            <p class="text-xs" style="color:${C.textMuted};">No documents on file for this application</p>
          </div>
        ` : `
          <div class="space-y-2">
            ${docs.map((doc) => `
              <div class="flex items-center gap-3 p-3 rounded-xl" style="background:${C.bg};border:1.5px solid ${C.border};">
                ${icon("file-text", { size: 16, color: C.blue })}
                <div class="flex-1 min-w-0">
                  <div class="text-sm" style="color:${C.text};">${doc.documentType}</div>
                  <div class="text-xs truncate" style="color:${C.textMuted};">${doc.originalFileName} · ${doc.uploadedOn}</div>
                  ${doc.remarks ? `<div class="text-xs mt-0.5" style="color:#DC2626;">${doc.remarks}</div>` : ""}
                </div>
                ${docStatusBadgeHtml(doc.status)}
                <a href="${api.bankApplicationDocumentDownloadUrl(q_selected.id, doc.id)}" target="_blank" rel="noopener noreferrer"
                  title="View / Download" class="p-1.5 rounded-lg hover:bg-gray-100" style="color:${C.textMuted};">
                  ${icon("download", { size: 14 })}
                </a>
                ${doc.status === "pending_verification" ? `
                  <button data-verify-doc="${doc.id}" title="Verify" class="p-1.5 rounded-lg hover:bg-green-50" style="color:${C.green};">
                    ${icon("check-circle-2", { size: 14 })}
                  </button>
                  <button data-reject-doc="${doc.id}" title="Reject" class="p-1.5 rounded-lg hover:bg-red-50" style="color:#DC2626;">
                    ${icon("x-circle", { size: 14 })}
                  </button>
                ` : ""}
              </div>
            `).join("")}
          </div>
        `}
      `;
    }
    if (q_activeTab === "audit") {
      const entries = detail.timeline || [];
      if (entries.length === 0) {
        return `<p class="text-xs" style="color:${C.textMuted};">No status history yet.</p>`;
      }
      return `
        <div class="space-y-3">
          ${entries.map((h) => {
            const isSystem = h.updatedBy === "System";
            const label = STATUS_CFG[h.status]?.label ?? h.status;
            return `
              <div class="flex gap-3 p-3 rounded-xl" style="background:${C.bg};border:1.5px solid ${C.border};">
                <div class="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white"
                  style="background:${isSystem ? C.textMuted : C.blue};font-size:10px;">${(h.updatedBy || "S")[0]}</div>
                <div class="flex-1">
                  <div class="text-xs font-semibold" style="color:${C.text};">${label}${h.remarks ? ` — ${h.remarks}` : ""}</div>
                  <div class="text-xs" style="color:${C.textMuted};">${h.updatedBy} · ${h.date} ${h.time}</div>
                </div>
              </div>
            `;
          }).join("")}
        </div>
      `;
    }
    return "";
  }

  outletEl.innerHTML = `
    <div class="flex h-full overflow-hidden">
      <div class="w-80 flex-shrink-0 flex flex-col border-r overflow-hidden" style="background:${C.surface};border-color:${C.border};">
        <div class="p-4 border-b" style="border-color:${C.border};">
          <div class="flex items-center gap-2 mb-3">
            <h2 class="text-sm font-semibold flex-1" style="color:${C.text};">${title}</h2>
            <button class="p-1.5 rounded-lg hover:bg-gray-100" style="color:${C.textMuted};">${icon("filter", { size: 16 })}</button>
          </div>
          <div class="relative">
            <span class="absolute left-3 top-1/2 -translate-y-1/2">${icon("search", { size: 14, color: C.textMuted })}</span>
            <input data-search value="${q_searchQ.replace(/"/g, "&quot;")}" placeholder="Search applications..."
              class="w-full rounded-xl border text-xs outline-none"
              style="padding:9px 12px 9px 32px;border:1.5px solid ${C.border};background:${C.bg};color:${C.text};" />
          </div>
        </div>
        <div class="flex-1 overflow-y-auto divide-y" style="border-color:${C.border};">
          ${filtered.length === 0 ? `
            <div class="flex flex-col items-center justify-center gap-2 py-10 px-4 text-center">
              ${icon("file-text", { size: 32, className: "opacity-20", color: C.textMuted })}
              <p class="text-xs" style="color:${C.textMuted};">No applications in this list right now</p>
            </div>
          ` : ""}
          ${filtered.map((app) => {
            const isNew = app.status === "under_review";
            return `
              <div style="background:${q_selected?.id === app.id ? C.blueLight : isNew ? "#FEF2F2" : ""};border-left:${isNew ? "3px solid #DC2626" : "3px solid transparent"};">
                <button data-select-app="${app.id}" class="w-full text-left p-4 hover:bg-gray-50 transition-all">
                  <div class="flex items-start justify-between gap-2 mb-1">
                    <span class="flex items-center gap-1.5 text-xs font-semibold" style="color:${C.text};">
                      ${app.business}
                      ${isNew ? `<span class="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white" style="background:#DC2626;">NEW</span>` : ""}
                    </span>
                    ${badgeHtml(app.status)}
                  </div>
                  <div class="text-xs mb-1" style="color:${C.textMuted};font-family:var(--font-mono);">${app.caseId}</div>
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-semibold" style="color:${C.text};">${app.amount}</span>
                    <span class="text-xs" style="color:${C.textMuted};">${app.submitted}</span>
                  </div>
                </button>
              </div>
            `;
          }).join("")}
        </div>
      </div>

      <div class="flex-1 overflow-y-auto">
        ${!q_selected ? `
          <div class="flex items-center justify-center h-full flex-col gap-3">
            ${icon("file-text", { size: 48, className: "opacity-20", color: C.textMuted })}
            <p class="text-sm" style="color:${C.textMuted};">Select an application to review</p>
          </div>
        ` : `
          <div class="px-6 py-5">
            <div class="flex items-start justify-between mb-5">
              <div>
                <h2 class="text-lg font-bold" style="color:${C.text};">${q_selected.business}</h2>
                <p class="text-xs mt-0.5" style="color:${C.textMuted};font-family:var(--font-mono);">${q_selected.caseId}</p>
              </div>
              <div class="flex gap-2">
                <button data-export class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border" style="border:1.5px solid ${C.border};color:${C.text};">
                  ${icon("download", { size: 14 })} Export
                </button>
                ${ASSESSABLE_STATUSES.includes(q_selected.status) ? `
                  <button data-begin-assessment class="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold text-white" style="background:${C.blue};">
                    ${icon("clipboard-check", { size: 14 })} Begin Assessment
                  </button>
                ` : badgeHtml(q_selected.status)}
              </div>
            </div>

            ${q_requestSent ? `
              <div class="mb-5 rounded-xl p-3 flex items-center gap-2.5" style="background:${C.greenLight};border:1.5px solid ${C.green}40;">
                ${icon("check-circle-2", { size: 16, color: C.green })}
                <p class="text-xs font-medium" style="color:${C.green};">
                  Request sent — the applicant has been notified on the SME Portal to upload the requested documents.
                </p>
              </div>
            ` : ""}
            ${q_docActionError && q_activeTab !== "documents" ? `
              <div class="mb-5 rounded-xl p-3 flex gap-2.5" style="background:#FEE2E2;border:1.5px solid #DC2626;">
                ${icon("x-circle", { size: 16, color: "#DC2626", style: "margin-top:2px;" })}
                <p class="text-xs leading-relaxed" style="color:#DC2626;">${q_docActionError}</p>
              </div>
            ` : ""}

            <div class="flex gap-1 mb-5 border-b" style="border-color:${C.border};">
              ${TABS.map((t) => `
                <button data-tab="${t}" class="px-4 py-2 text-xs font-medium transition-all border-b-2 -mb-px"
                  style="border-color:${q_activeTab === t ? C.blue : "transparent"};color:${q_activeTab === t ? C.blue : C.textMuted};">
                  ${TAB_LABELS[t]}
                </button>
              `).join("")}
            </div>

            ${detailTabContent(q_detail)}

            ${ASSESSABLE_STATUSES.includes(q_selected.status) ? `
              <div class="mt-6 pt-5 border-t flex gap-3" style="border-color:${C.border};">
                <button data-request-more-info class="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90" style="background:${C.orange};">
                  ${icon("message-square", { size: 16 })} Request more info
                </button>
                <button data-start-assessment class="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90" style="background:${C.blue};">
                  ${icon("clipboard-check", { size: 16 })} Start assessment
                </button>
              </div>
            ` : `
              <div class="mt-6 pt-5 border-t flex items-center gap-3" style="border-color:${C.border};">
                <div class="rounded-xl p-3.5 flex items-center gap-2.5 w-full"
                  style="background:${STATUS_CFG[q_selected.status]?.bg};border:1.5px solid ${STATUS_CFG[q_selected.status]?.color}40;">
                  ${icon("check-circle-2", { size: 16, color: STATUS_CFG[q_selected.status]?.color })}
                  <p class="text-xs font-medium" style="color:${STATUS_CFG[q_selected.status]?.color};">
                    ${STATUS_RESOLUTION_NOTE[q_selected.status] ?? `This application is currently ${STATUS_CFG[q_selected.status]?.label.toLowerCase()}.`}
                  </p>
                </div>
              </div>
            `}
          </div>
        `}
      </div>
    </div>
  `;

  // Wire events
  const searchInput = qs("[data-search]", outletEl);
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      q_searchQ = e.target.value;
      renderApplicationQueue(outletEl, ctx, statusFilter, title);
    });
  }
  qsa("[data-select-app]", outletEl).forEach((btn) => {
    btn.addEventListener("click", () => {
      const app = state.bankApplications.find((a) => a.id === btn.getAttribute("data-select-app"));
      q_selected = app ?? null;
      q_requestSent = false;
      q_detail = null;
      if (app) fetchDetailFor(outletEl, ctx, statusFilter, title, app.id);
      renderApplicationQueue(outletEl, ctx, statusFilter, title);
    });
  });
  const exportBtn = qs("[data-export]", outletEl);
  if (exportBtn) exportBtn.addEventListener("click", () => handleExport(q_selected));
  // "Begin/Start Assessment" hand off to the Credit Assessment view (renderCreditAssessment
  // below) - reuses the same setFocusApplicationId/consumeFocusApplicationId one-shot deep-link
  // mechanism the Dashboard's "Recent Applications" row-click already uses, just in the
  // opposite direction, so that view knows which real application to load instead of the
  // hardcoded one it used to show.
  // setActiveKey MUST run before setFocusApplicationId here: this view (Queue) itself also
  // calls ctx.consumeFocusApplicationId() on every render (see the top of
  // renderApplicationQueue), so setting the focus id while still on "queue" gets immediately
  // swallowed by the Queue's own re-render before Credit Assessment ever gets a chance to read
  // it. Switching activeKey first means the id is set (and consumed) while "reports" is already
  // current.
  const beginBtn = qs("[data-begin-assessment]", outletEl);
  if (beginBtn) beginBtn.addEventListener("click", () => {
    const id = q_selected?.id;
    ctx.setActiveKey("reports");
    if (id && typeof ctx.setFocusApplicationId === "function") ctx.setFocusApplicationId(id);
  });
  const startBtn = qs("[data-start-assessment]", outletEl);
  if (startBtn) startBtn.addEventListener("click", () => {
    const id = q_selected?.id;
    ctx.setActiveKey("reports");
    if (id && typeof ctx.setFocusApplicationId === "function") ctx.setFocusApplicationId(id);
  });
  qsa("[data-tab]", outletEl).forEach((btn) => {
    btn.addEventListener("click", () => {
      q_activeTab = btn.getAttribute("data-tab");
      renderApplicationQueue(outletEl, ctx, statusFilter, title);
    });
  });
  qsa("[data-verify-doc]", outletEl).forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!q_selected) return;
      const docId = btn.getAttribute("data-verify-doc");
      const result = await api.verifyBankDocument(q_selected.id, docId, "");
      if (!result || !result.success) {
        q_docActionError = (result && result.message) || "Couldn't verify this document. Please try again.";
        renderApplicationQueue(outletEl, ctx, statusFilter, title);
        return;
      }
      fetchDetailFor(outletEl, ctx, statusFilter, title, q_selected.id);
    });
  });
  qsa("[data-reject-doc]", outletEl).forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!q_selected) return;
      const docId = btn.getAttribute("data-reject-doc");
      const remarks = window.prompt("Reason for rejecting this document (shown to the applicant):", "") || "";
      const result = await api.rejectBankDocument(q_selected.id, docId, remarks);
      if (!result || !result.success) {
        q_docActionError = (result && result.message) || "Couldn't reject this document. Please try again.";
        renderApplicationQueue(outletEl, ctx, statusFilter, title);
        return;
      }
      fetchDetailFor(outletEl, ctx, statusFilter, title, q_selected.id);
    });
  });
  const requestBtn = qs("[data-request-more-info]", outletEl);
  if (requestBtn) requestBtn.addEventListener("click", () => {
    if (!q_selected) return;
    const business = q_selected.business;
    const caseId = q_selected.caseId;
    openRequestInfoModal(business, caseId, async (type, messages) => {
      // Real notification (Controllers/BankApplicationController.cs's RequestInfo action) -
      // previously this only ever called the client-only addNotification(), which updated the
      // bank officer's own browser tab and never reached the applicant at all.
      const result = await api.requestApplicationInfo(q_selected.id, type, messages);
      if (!result || !result.success) {
        q_docActionError = (result && result.message) || "Couldn't send this request. Please try again.";
        renderApplicationQueue(outletEl, ctx, statusFilter, title);
        return;
      }
      q_requestSent = true;
      renderApplicationQueue(outletEl, ctx, statusFilter, title);
    });
  });

  hydrateIcons();
  wireImageFallbacks(outletEl);
}

// ── Credit Assessment ────────────────────────────────────────────────────────
const RED = "#DC2626";

const CHECK_DEFS = [
  {
    key: "ecib", label: "Credit Bureau Result (eCIB)", note: "Score: 742/850",
    options: [
      { value: "Clean · No defaults", status: "pass" },
      { value: "Minor Defaults", status: "warn" },
      { value: "Defaults", status: "fail" },
    ],
  },
  {
    key: "risk", label: "Risk Assessment Result", note: "Manufacturing sector exposure within limits",
    options: [
      { value: "Low Risk", status: "pass" },
      { value: "Medium Risk", status: "warn" },
      { value: "High Risk", status: "fail" },
    ],
  },
  {
    key: "aml", label: "AML Screening Status", note: "No match on OFAC / UN sanctions list",
    options: [
      { value: "Clear", status: "pass" },
      { value: "Under Review", status: "warn" },
      { value: "Flagged", status: "fail" },
    ],
  },
  {
    key: "dd", label: "Due Diligence Status", note: "Site visit conducted June 14, 2025",
    options: [
      { value: "Completed", status: "pass" },
      { value: "In Progress", status: "warn" },
      { value: "Pending", status: "fail" },
    ],
  },
];

// Module-level local state for the Credit Assessment view.
let ca_applicationId = null;
let ca_detail = null;
let ca_loading = false;
let ca_decision = null; // null | "decline" - "accept" no longer sets this directly (see ca_offerSent)
let ca_offerSent = false;
let ca_remarks = "";
let ca_submitting = false;
let ca_error = "";
// The eCIB/AML/risk/due-diligence checks below have no real backing data source anywhere in
// this system (no credit bureau integration, no AML screening service) and aren't part of this
// phase's required scope (Status Management is just Under Review/Approved/Rejected + remarks -
// see IBankApplicationService.UpdateStatusAsync). Left exactly as the existing UI already had
// them - local-only, illustrative, never persisted - rather than fabricating a fake scoring
// backend for them.
let ca_values = { ecib: "Clean · No defaults", risk: "Medium Risk", aml: "Clear", dd: "Completed" };

function statusColorFor(status) {
  return status === "pass" ? C.green : status === "warn" ? "#D97706" : RED;
}

function renderCreditAssessment(outletEl, ctx) {
  // One-shot: which real application "Begin/Start Assessment" (in the Queue view) was clicked
  // for. Falls back to whatever was already loaded (e.g. re-rendering after an action) rather
  // than losing the selection.
  const focusId = typeof ctx.consumeFocusApplicationId === "function" ? ctx.consumeFocusApplicationId() : null;
  if (focusId && focusId !== ca_applicationId) {
    ca_applicationId = focusId;
    ca_detail = null;
    ca_decision = null;
    ca_offerSent = false;
    ca_remarks = "";
    ca_error = "";
    ca_loading = true;
    api.getBankApplicationDetail(focusId).then((result) => {
      if (ca_applicationId !== focusId) return;
      ca_loading = false;
      ca_detail = (result && result.success) ? result.application : null;
      renderCreditAssessment(outletEl, ctx);
    });
  }

  if (!ca_applicationId) {
    outletEl.innerHTML = `
      <div class="px-6 py-10 text-center">
        <p class="text-sm" style="color:${C.textMuted};">Select an application from the queue to begin its assessment.</p>
      </div>
    `;
    return;
  }

  const detail = ca_detail;

  outletEl.innerHTML = `
    <div class="px-6 py-6">
      <button data-back-to-queue class="flex items-center gap-2 mb-4 text-sm font-medium hover:opacity-70 transition-opacity" style="color:${C.textMuted};">
        ${icon("arrow-left", { size: 16 })} Back to Queue
      </button>
      <h1 class="text-xl font-bold mb-1" style="color:${C.text};">Credit Assessment</h1>
      <p class="text-sm mb-6" style="color:${C.textMuted};">
        ${ca_loading || !detail ? "Loading…" : `${detail.caseId} · ${detail.businessName}`}
      </p>

      ${!ca_loading && !detail ? `
        <div class="rounded-xl p-4" style="background:#FEE2E2;border:1.5px solid #DC2626;">
          <p class="text-sm font-medium" style="color:#DC2626;">Couldn't load this application. Please go back to the queue and try again.</p>
        </div>
      ` : ca_loading ? "" : `
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div class="lg:col-span-2 space-y-3">
          ${CHECK_DEFS.map(({ key, label, note, options }) => {
            const value = ca_values[key];
            const status = options.find((o) => o.value === value)?.status ?? "pass";
            const color = statusColorFor(status);
            return `
              <div class="rounded-xl p-4 border flex items-start gap-4"
                style="background:${status === "pass" ? C.greenLight : status === "warn" ? "#FEF3C7" : "#FEE2E2"};border:1.5px solid ${color}${status === "pass" ? "40" : ""};">
                <div class="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style="background:${color};">
                  ${status === "pass" ? icon("check-circle-2", { size: 14, className: "text-white" }) : icon("alert-circle", { size: 14, className: "text-white" })}
                </div>
                <div class="flex-1">
                  <div class="flex items-center justify-between gap-3">
                    <span class="text-sm font-semibold" style="color:${C.text};">${label}</span>
                    <div class="relative">
                      <select data-check-key="${key}"
                        class="text-xs font-bold rounded-lg border outline-none appearance-none cursor-pointer"
                        style="padding:6px 28px 6px 10px;color:${color};border:1.5px solid ${color};background:${C.surface};">
                        ${options.map((o) => `<option value="${o.value}" ${o.value === value ? "selected" : ""}>${o.value}</option>`).join("")}
                      </select>
                      <span class="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">${icon("chevron-down", { size: 14, color })}</span>
                    </div>
                  </div>
                  <p class="text-xs mt-0.5" style="color:${C.textMuted};">${note}</p>
                </div>
              </div>
            `;
          }).join("")}

          <div class="rounded-xl p-4 border" style="background:${C.surface};border:1.5px solid ${C.border};">
            <label class="block text-sm font-medium mb-2" style="color:${C.text};">Internal Remarks</label>
            <textarea data-remarks rows="4" placeholder="Enter assessment remarks, conditions, or notes..."
              class="w-full rounded-xl border text-sm outline-none resize-none"
              style="padding:10px 12px;border:1.5px solid ${C.border};background:${C.bg};color:${C.text};">${ca_remarks.replace(/</g, "&lt;")}</textarea>
          </div>

          ${ca_error ? `
            <div class="rounded-xl p-3 flex gap-2.5" style="background:#FEE2E2;border:1.5px solid #DC2626;">
              ${icon("x-circle", { size: 16, color: "#DC2626", style: "margin-top:2px;" })}
              <p class="text-xs leading-relaxed" style="color:#DC2626;">${ca_error}</p>
            </div>
          ` : ""}
        </div>

        <div class="space-y-4">
          <div class="rounded-2xl border p-5" style="background:${C.surface};border:1.5px solid ${C.border};">
            <h3 class="text-sm font-bold mb-4" style="color:${C.text};">Assessment Decision</h3>

            ${ca_decision === null && !ca_offerSent ? `
              <div class="space-y-3">
                <button data-issue-offer ${ca_submitting ? "disabled" : ""} class="w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60" style="background:${C.green};">
                  ${icon("upload-cloud", { size: 16 })} Issue Conditional Offer
                </button>
                <button data-decide-decline ${ca_submitting ? "disabled" : ""} class="w-full py-3 rounded-xl text-sm font-semibold border flex items-center justify-center gap-2 disabled:opacity-60" style="border:1.5px solid #DC2626;color:#DC2626;">
                  ${icon("x-circle", { size: 16 })} ${ca_submitting ? "Submitting..." : "Decline"}
                </button>
              </div>
            ` : ""}

            ${ca_decision === "decline" ? `
              <div class="rounded-xl p-4 text-center" style="background:#FEE2E2;border:1.5px solid #DC2626;">
                ${icon("x-circle", { size: 24, className: "mx-auto mb-2", color: "#DC2626" })}
                <p class="text-sm font-bold" style="color:#DC2626;">Application Declined</p>
                <p class="text-xs mt-1" style="color:${C.textMuted};">The applicant has been notified of this decision.</p>
              </div>
            ` : ""}
          </div>
          ${ca_offerSent ? `
            <div class="rounded-2xl p-4 text-center" style="background:${C.greenLight};border:1.5px solid ${C.green};">
              ${icon("check-circle-2", { size: 32, className: "mx-auto mb-2", color: C.green })}
              <p class="text-sm font-bold" style="color:${C.green};">Offer issued &amp; sent!</p>
              <p class="text-xs mt-1" style="color:${C.textMuted};">The applicant can now review these exact terms and accept or decline the offer on the SME Portal.</p>
            </div>
          ` : ""}
        </div>
      </div>
      `}
    </div>
  `;

  qsa("[data-back-to-queue]", outletEl).forEach((b) => b.addEventListener("click", () => ctx.setActiveKey("queue")));
  qsa("[data-check-key]", outletEl).forEach((sel) => {
    sel.addEventListener("change", (e) => {
      ca_values[sel.getAttribute("data-check-key")] = e.target.value;
      renderCreditAssessment(outletEl, ctx);
    });
  });
  const remarksInput = qs("[data-remarks]", outletEl);
  if (remarksInput) remarksInput.addEventListener("input", (e) => { ca_remarks = e.target.value; });

  // Real Approve/Reject (Controllers/BankApplicationController.cs's UpdateStatus action) -
  // updates Application.Status, appends an ApplicationStatusHistory row (this remarks text),
  // and notifies the applicant, exactly this phase's Status Management requirement. Refreshes
  // state.bankApplications afterward so the Queue list's badge/status reflects the change
  // immediately if the officer navigates back to it.
  async function submitDecision(newStatus, decisionLabel) {
    if (ca_submitting || !ca_applicationId) return;
    ca_submitting = true;
    ca_error = "";
    renderCreditAssessment(outletEl, ctx);

    const result = await api.updateBankApplicationStatus(ca_applicationId, newStatus, ca_remarks.trim());
    ca_submitting = false;

    if (!result || !result.success) {
      ca_error = (result && result.message) || `Couldn't record this decision. Please try again.`;
      renderCreditAssessment(outletEl, ctx);
      return;
    }

    ca_decision = decisionLabel;
    ca_detail = result.application;

    const applicationsResult = await api.getBankApplications();
    const refreshed = (applicationsResult && applicationsResult.applications) || [];
    setBankApplications(refreshed);
    // q_selected (Queue view's module-level selection) is a stale snapshot from before this
    // decision - re-point it at the refreshed record so going "Back to Queue" doesn't show a
    // just-approved/rejected application as if it were still awaiting assessment.
    if (q_selected && q_selected.id === ca_applicationId) {
      q_selected = refreshed.find((a) => a.id === ca_applicationId) || q_selected;
      q_detail = null; // stale (pre-decision) - re-fetched next time the Queue view renders it
    }

    renderCreditAssessment(outletEl, ctx);
  }

  const declineBtn = qs("[data-decide-decline]", outletEl);
  if (declineBtn) declineBtn.addEventListener("click", () => submitDecision("rejected", "decline"));

  // Real Issue Conditional Offer (Controllers/BankApplicationController.cs's IssueOffer action) -
  // saves the uploaded PDF as a real ApplicationDocument, sets Application.Status to the real
  // "offer_issued", and notifies the applicant - the applicant's own Accept/Decline on
  // js/pages/sme/offerLetter.js is what finally produces "approved"/"rejected", not this button.
  const issueOfferBtn = qs("[data-issue-offer]", outletEl);
  if (issueOfferBtn) issueOfferBtn.addEventListener("click", () => {
    const business = detail?.businessName ?? "";
    const caseId = detail?.caseId ?? "";
    openIssueOfferModal(business, caseId, async (terms, file) => {
      if (ca_submitting || !ca_applicationId) return;
      ca_submitting = true;
      ca_error = "";
      renderCreditAssessment(outletEl, ctx);

      const result = await api.issueBankOffer(ca_applicationId, terms, file);
      ca_submitting = false;

      if (!result || !result.success) {
        ca_error = (result && result.message) || "Couldn't issue this offer. Please try again.";
        renderCreditAssessment(outletEl, ctx);
        return;
      }

      ca_offerSent = true;
      ca_detail = result.application;

      const applicationsResult = await api.getBankApplications();
      const refreshed = (applicationsResult && applicationsResult.applications) || [];
      setBankApplications(refreshed);
      if (q_selected && q_selected.id === ca_applicationId) {
        q_selected = refreshed.find((a) => a.id === ca_applicationId) || q_selected;
        q_detail = null;
      }

      renderCreditAssessment(outletEl, ctx);
    });
  });

  hydrateIcons();
  wireImageFallbacks(outletEl);
}

// ── Main export ──────────────────────────────────────────────────────────────
// NOTE: ConditionalOffer() from the source is intentionally not ported — it is
// dead/unreachable code (no activeKey routes to it in the source's switch,
// and its "Generate & Send Offer Letter" button has no handler either).
export function render(outletEl, activeKey, ctx) {
  switch (activeKey) {
    case "queue":
      renderApplicationQueue(outletEl, ctx, undefined, "Application Queue");
      break;
    case "assessment":
      renderApplicationQueue(outletEl, ctx, ["under_review"], "Under Assessment");
      break;
    case "offers":
      renderApplicationQueue(outletEl, ctx, ["offer_issued"], "Offers Issued");
      break;
    case "offers_accepted":
      renderApplicationQueue(outletEl, ctx, ["approved"], "Offers Accepted by Applicant");
      break;
    case "offers_rejected":
      renderApplicationQueue(outletEl, ctx, ["rejected"], "Offers Rejected by Applicant");
      break;
    case "reports":
      renderCreditAssessment(outletEl, ctx);
      break;
    default:
      renderDashboard(outletEl, ctx);
      break;
  }
}
