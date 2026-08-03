// 1:1 port of src/app/pages/sbp/SbpPortal.tsx
import { C } from "../../colors.js";
import { icon, hydrateIcons, wireImageFallbacks, escapeHtml, matchesSearch, openModal, qs, qsa } from "../../utils.js";
import * as api from "../../api.js";

// Minimal gradient-stroke border, matching the app's redesigned dashboard cards.
function gradientCard(accent, innerHtml, className = "") {
  return `
    <div class="rounded-2xl p-px ${className}" style="background:linear-gradient(135deg, ${accent}45, ${accent}0A);">
      <div class="h-full w-full rounded-2xl" style="background:${C.surface};">
        ${innerHtml}
      </div>
    </div>
  `;
}

// ── Executive Dashboard ──────────────────────────────────────────────────────
// SBP Admin Portal sync (Phase 2). Previously every metric here was a literal hardcoded
// constant (fake totals, fake deltas, a fake 5-bank TOP_BANKS array). Now fetches real,
// system-wide stats from Controllers/SbpApplicationController.cs's Dashboard action (via
// js/api.js's getSbpDashboard()) - the same "loading placeholders, then real numbers" pattern
// js/pages/bank/portal.js's renderDashboard/renderDashboardWithStats already uses. "Disbursed"/
// "Disbursement Rate" are real COUNT/ratio queries against a real, valid Application.Status
// value this system has always recognized - they read 0 honestly today because no workflow
// anywhere yet transitions an application into "disbursed", not because they're faked (see
// Services/SbpAdminService.cs's own comment).
// Selected bank in the header's filter dropdown - module-level so it survives the re-render
// triggered by picking a bank (mirrors js/pages/bank/portal.js's module-level ca_/q_ state
// convention). "All Banks" is the sentinel for "no filter", matching the dropdown's own label.
let db_selectedBank = "All Banks";
let db_lastStats = null;
let db_exportMenuOpen = false;

function renderDashboard(outletEl) {
  renderDashboardWithStats(outletEl, null);
  api.getSbpDashboard().then((stats) => {
    db_lastStats = stats || {};
    renderDashboardWithStats(outletEl, db_lastStats);
  });
}

function renderDashboardWithStats(outletEl, stats) {
  const s = stats || {};
  const loading = stats === null;
  const fmt = (n) => (loading ? "—" : (n ?? 0).toString());
  const fmtRate = (n) => (loading ? "—" : `${(n ?? 0)}%`);
  const bankBreakdown = loading ? [] : (s.bankBreakdown || []);

  // The dropdown filters entirely client-side against the one already-fetched response - every
  // number needed (system-wide totals AND each bank's own breakdown) is already in `stats`, so
  // picking a bank never needs a second server round-trip. "All Banks" (the default) shows the
  // real system-wide totals; picking a specific bank swaps the top cards to that bank's own row
  // from bankBreakdown (every field there is precomputed the same way as the system-wide ones -
  // see BankStatsViewModel) and filters the table down to just that one row.
  const selectedRow = db_selectedBank !== "All Banks"
    ? bankBreakdown.find((b) => b.bank === db_selectedBank)
    : null;
  const displayed = selectedRow
    ? {
        totalApplications: selectedRow.applicationsReviewed, referredToBanks: selectedRow.referredToBanks,
        offersIssued: selectedRow.offersIssued, acceptedOffers: selectedRow.approved,
        disbursed: selectedRow.disbursed, conversionRate: selectedRow.conversionRate,
      }
    : s;
  const visibleBankRows = selectedRow ? [selectedRow] : bankBreakdown;

  const METRICS = [
    { label: "Total Applications", value: fmt(displayed.totalApplications), iconName: "file-text", color: C.blue, bg: C.blueLight },
    { label: "Referred to Banks", value: fmt(displayed.referredToBanks), iconName: "arrow-up-right", color: C.green, bg: C.greenLight },
    { label: "Offers Issued", value: fmt(displayed.offersIssued), iconName: "check-circle-2", color: "#D97706", bg: "#FEF3C7" },
    { label: "Accepted Offers", value: fmt(displayed.acceptedOffers), iconName: "trending-up", color: C.green, bg: C.greenLight },
    { label: "Disbursed", value: fmt(displayed.disbursed), iconName: "banknote", color: C.greenDark, bg: C.greenLight },
    { label: "Conversion Rate", value: fmtRate(displayed.conversionRate), iconName: "bar-chart-2", color: C.orange, bg: C.orangeLight },
  ];

  outletEl.innerHTML = `
    <div class="px-6 py-6" style="font-family:'Manrope', sans-serif;">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div class="flex items-center gap-2 mb-1">
            ${icon("sparkles", { size: 16, color: C.orange })}
            <span class="text-xs font-bold uppercase tracking-[0.15em]" style="color:${C.textMuted};font-family:var(--font-mono);">
              ${selectedRow ? escapeHtml(db_selectedBank) : "System-wide"} · Live
            </span>
          </div>
          <h1 class="text-2xl font-black leading-tight" style="color:${C.text};letter-spacing:-0.02em;">Executive Dashboard</h1>
        </div>
        <div class="flex gap-2">
          <select data-bank-filter class="text-xs px-3 py-2 rounded-xl border outline-none font-medium" style="border:1.5px solid ${C.border};color:${C.text};background:${C.surface};">
            <option ${db_selectedBank === "All Banks" ? "selected" : ""}>All Banks</option>
            ${bankBreakdown.map((b) => `<option ${db_selectedBank === b.bank ? "selected" : ""}>${escapeHtml(b.bank)}</option>`).join("")}
          </select>
          <div class="relative">
            <button data-export-toggle ${loading ? "disabled" : ""} class="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all hover:bg-gray-50 disabled:opacity-50" style="border:1.5px solid ${C.border};color:${C.text};">
              ${icon("download", { size: 14 })} Export
            </button>
            ${db_exportMenuOpen ? `
              <div class="absolute top-full right-0 mt-1 w-52 rounded-xl border shadow-lg z-20 overflow-hidden" style="background:${C.surface};border:1.5px solid ${C.border};">
                <button data-export-format="xlsx" class="w-full text-left px-4 py-2.5 text-xs font-semibold flex items-center gap-2.5 hover:bg-gray-50" style="color:${C.text};">
                  ${icon("file-spreadsheet", { size: 14, color: C.green })} Export as Excel (.xlsx)
                </button>
                <button data-export-format="pdf" class="w-full text-left px-4 py-2.5 text-xs font-semibold flex items-center gap-2.5 hover:bg-gray-50 border-t" style="color:${C.text};border-color:${C.border};">
                  ${icon("file-text", { size: 14, color: "#DC2626" })} Export as PDF
                </button>
              </div>
            ` : ""}
          </div>
        </div>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        ${METRICS.map(({ label, value, iconName, color }) => gradientCard(color, `
          <div class="p-4 rounded-2xl transition-all duration-200 hover:-translate-y-0.5">
            <div class="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style="background:${color}18;">
              ${icon(iconName, { size: 16, color })}
            </div>
            <div class="text-2xl font-black mb-0.5" style="color:${C.text};font-family:var(--font-mono);letter-spacing:-0.02em;">${value}</div>
            <div class="text-xs font-medium" style="color:${C.textMuted};">${label}</div>
          </div>
        `)).join("")}
      </div>

      ${gradientCard(C.orange, `
        <div class="rounded-2xl overflow-hidden">
          <div class="px-5 py-4 border-b flex items-center justify-between" style="border-color:${C.border};">
            <div class="flex items-center gap-2.5">
              <div class="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style="background:${C.orangeLight};">
                ${icon("list-checks", { size: 14, color: C.orange })}
              </div>
              <h2 class="text-sm font-bold" style="color:${C.text};">Bank Performance Overview</h2>
            </div>
            <span class="text-xs px-2.5 py-1 rounded-full font-bold" style="background:${C.orangeLight};color:${C.orange};font-family:var(--font-mono);">
              ${loading ? "Loading…" : `${visibleBankRows.length} bank${visibleBankRows.length === 1 ? "" : "s"}`}
            </span>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr style="background:${C.bg};">
                  ${["Bank", "Applications Reviewed", "Approved", "Disbursed", "Disbursement Rate"].map((h) => `
                    <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide" style="color:${C.textMuted};font-family:var(--font-mono);">${h}</th>
                  `).join("")}
                </tr>
              </thead>
              <tbody>
                ${!loading && visibleBankRows.length === 0 ? `
                  <tr>
                    <td colspan="5" class="px-4 py-10 text-center text-xs" style="color:${C.textMuted};">No applications on file yet.</td>
                  </tr>
                ` : ""}
                ${visibleBankRows.map((b) => {
                  const clickable = b.bank !== "Not Provided";
                  return `
                  <tr ${clickable ? `data-bank-row="${escapeHtml(b.bank)}"` : ""} class="border-t hover:bg-gray-50 transition-colors${clickable ? " cursor-pointer" : ""}" style="border-color:${C.border};">
                    <td class="px-4 py-3">
                      <div class="flex items-center gap-2">
                        <div class="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-white" style="background:${C.orange};">
                          ${escapeHtml((b.bank || "?")[0])}
                        </div>
                        <span class="text-sm font-bold" style="color:${clickable ? C.orange : C.text};${clickable ? "text-decoration:underline;text-underline-offset:2px;" : ""}">${escapeHtml(b.bank)}</span>
                      </div>
                    </td>
                    <td class="px-4 py-3 text-sm" style="color:${C.text};font-family:var(--font-mono);">${b.applicationsReviewed}</td>
                    <td class="px-4 py-3 text-sm font-bold" style="color:${C.green};font-family:var(--font-mono);">${b.approved}</td>
                    <td class="px-4 py-3 text-sm font-bold" style="color:${C.greenDark};font-family:var(--font-mono);">${b.disbursed}</td>
                    <td class="px-4 py-3">
                      ${b.approved === 0 ? `
                        <span class="text-xs" style="color:${C.textMuted};">No approvals yet</span>
                      ` : `
                        <div class="flex items-center gap-2">
                          <div class="flex-1 h-1.5 rounded-full" style="background:${C.border};max-width:80px;">
                            <div class="h-1.5 rounded-full" style="width:${b.disbursementRate}%;background:${C.green};"></div>
                          </div>
                          <span class="text-xs font-bold" style="color:${C.green};font-family:var(--font-mono);">${b.disbursementRate}%</span>
                        </div>
                      `}
                    </td>
                  </tr>
                `;
                }).join("")}
              </tbody>
            </table>
          </div>
        </div>
      `)}
    </div>
  `;

  const bankFilter = qs("[data-bank-filter]", outletEl);
  if (bankFilter) {
    bankFilter.addEventListener("change", (e) => {
      db_selectedBank = e.target.value;
      // Re-render from the already-fetched response - no need to hit the server again just to
      // change which bank's row is highlighted.
      renderDashboardWithStats(outletEl, loading ? null : (db_lastStats || s));
    });
  }

  const exportToggle = qs("[data-export-toggle]", outletEl);
  if (exportToggle) {
    exportToggle.addEventListener("click", () => {
      if (loading) return;
      db_exportMenuOpen = !db_exportMenuOpen;
      renderDashboardWithStats(outletEl, loading ? null : (db_lastStats || s));
    });
  }
  qsa("[data-export-format]", outletEl).forEach((btn) => {
    btn.addEventListener("click", () => {
      const format = btn.getAttribute("data-export-format");
      db_exportMenuOpen = false;
      if (format === "xlsx") exportDashboardXlsx(METRICS, visibleBankRows, db_selectedBank);
      else exportDashboardPdf(METRICS, visibleBankRows, db_selectedBank);
      renderDashboardWithStats(outletEl, loading ? null : (db_lastStats || s));
    });
  });
  qsa("[data-bank-row]", outletEl).forEach((row) => {
    row.addEventListener("click", () => openBankDetailModal(row.getAttribute("data-bank-row")));
  });

  hydrateIcons();
  wireImageFallbacks(outletEl);
}

// Exports exactly what's currently on screen (respects the active bank filter) - no new
// reporting backend/architecture exists anywhere in this system to reuse (confirmed: no
// export/report service of any kind), so both exporters below reuse the one thing that IS
// already real here - the dashboard data already fetched from
// Controllers/SbpApplicationController.cs - and just format it, entirely client-side. Never a
// server round-trip or a new "report generation" concept for what is, underneath, the same data
// already on the page.
function exportFileNameStem(selectedBank) {
  const stamp = new Date().toISOString().slice(0, 10);
  return `sbp-executive-dashboard-${selectedBank.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${stamp}`;
}

// Real .xlsx (not a renamed CSV) via the vendored SheetJS build (Scripts/vendor/xlsx.full.min.js,
// loaded globally in Views/Shared/_Layout.cshtml alongside jsPDF/lucide) - a two-sheet workbook
// (Summary, Bank Performance) that opens natively in Excel.
function exportDashboardXlsx(metrics, bankRows, selectedBank) {
  const wb = window.XLSX.utils.book_new();

  const summaryAoa = [
    [`SBP Executive Dashboard Export — ${selectedBank}`],
    [`Generated: ${new Date().toLocaleString()}`],
    [],
    ["Metric", "Value"],
    ...metrics.map((m) => [m.label, m.value]),
  ];
  const summarySheet = window.XLSX.utils.aoa_to_sheet(summaryAoa);
  summarySheet["!cols"] = [{ wch: 24 }, { wch: 16 }];
  window.XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");

  const bankAoa = [
    ["Bank", "Applications Reviewed", "Approved", "Disbursed", "Disbursement Rate (%)"],
    ...bankRows.map((b) => [b.bank, b.applicationsReviewed, b.approved, b.disbursed, b.disbursementRate]),
  ];
  const bankSheet = window.XLSX.utils.aoa_to_sheet(bankAoa);
  bankSheet["!cols"] = [{ wch: 26 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 22 }];
  window.XLSX.utils.book_append_sheet(wb, bankSheet, "Bank Performance");

  window.XLSX.writeFile(wb, `${exportFileNameStem(selectedBank)}.xlsx`);
}

// PDF via the vendored jsPDF build (Scripts/vendor/jspdf.umd.min.js) - same manual header-bar +
// alternating-row-shading style already established for the one other real PDF export in this
// app (js/pages/bank/portal.js's handleExport), just applied to dashboard summary + bank table
// data instead of a single application.
function exportDashboardPdf(metrics, bankRows, selectedBank) {
  const doc = new window.jspdf.jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;

  doc.setFillColor(234, 88, 12);
  doc.rect(0, 0, pageWidth, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("SBP Executive Dashboard", marginX, 17);

  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(selectedBank, marginX, 42);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated ${new Date().toLocaleString()}`, marginX, 49);

  let y = 64;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(20, 20, 20);
  doc.text("Summary", marginX, y);
  y += 8;

  metrics.forEach(({ label, value }, i) => {
    if (i % 2 === 0) {
      doc.setFillColor(247, 248, 250);
      doc.rect(marginX, y - 6, pageWidth - marginX * 2, 10, "F");
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text(label, marginX + 4, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(20, 20, 20);
    doc.text(String(value), marginX + 100, y);
    y += 10;
  });

  y += 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(20, 20, 20);
  doc.text("Bank Performance Overview", marginX, y);
  y += 8;

  const colX = [marginX + 2, marginX + 78, marginX + 110, marginX + 136, marginX + 162];
  const headers = ["Bank", "Reviewed", "Approved", "Disbursed", "Disb. Rate"];
  doc.setFillColor(234, 88, 12);
  doc.rect(marginX, y - 6, pageWidth - marginX * 2, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  headers.forEach((h, i) => doc.text(h, colX[i], y));
  y += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  bankRows.forEach((b, i) => {
    if (y > pageHeight - 20) {
      doc.addPage();
      y = 20;
    }
    if (i % 2 === 0) {
      doc.setFillColor(247, 248, 250);
      doc.rect(marginX, y - 6, pageWidth - marginX * 2, 8, "F");
    }
    doc.setTextColor(20, 20, 20);
    doc.text(String(b.bank), colX[0], y);
    doc.text(String(b.applicationsReviewed), colX[1], y);
    doc.text(String(b.approved), colX[2], y);
    doc.text(String(b.disbursed), colX[3], y);
    doc.text(`${b.disbursementRate}%`, colX[4], y);
    y += 8;
  });

  if (bankRows.length === 0) {
    doc.setTextColor(120, 120, 120);
    doc.text("No banks on file yet.", marginX + 2, y);
  }

  doc.save(`${exportFileNameStem(selectedBank)}.pdf`);
}

// ── Bank Performance detail modal ────────────────────────────────────────────
// Row-click drill-down for one bank (Executive Dashboard follow-up). Fetches
// Controllers/SbpApplicationController.cs's "banks/detail" action (via js/api.js's
// getSbpBankDetail()) - every number here is computed the same real way as the Bank
// Performance Overview table/top cards (Services/SbpAdminService.cs's GetBankDetailAsync),
// just for one bank plus the lists/monthly trend a drill-down needs. "Not Provided" rows are
// never clickable (see portal.js's table render above) since that bucket isn't a real bank.
function bankStatCard(label, value, color) {
  return `
    <div class="rounded-xl p-3 text-center" style="background:${C.bg};border:1.5px solid ${C.border};">
      <div class="text-lg font-black" style="color:${color || C.text};font-family:var(--font-mono);">${value}</div>
      <div class="text-xs" style="color:${C.textMuted};">${label}</div>
    </div>
  `;
}

function bankApplicationRowHtml(a) {
  const cfg = APPLICATION_STATUS_CFG[a.status] || APPLICATION_STATUS_CFG.under_review;
  return `
    <div class="rounded-xl p-3 flex items-center justify-between gap-3" style="background:${C.bg};border:1.5px solid ${C.border};">
      <div class="min-w-0">
        <div class="text-sm font-bold" style="color:${C.text};font-family:var(--font-mono);">${escapeHtml(a.caseId)}</div>
        <div class="text-xs truncate" style="color:${C.textMuted};">${escapeHtml(a.business)} · ${escapeHtml(a.scheme)} · ${escapeHtml(a.amount)} · ${escapeHtml(a.submitted)}</div>
      </div>
      <span class="text-xs px-2.5 py-0.5 rounded-full font-semibold flex-shrink-0" style="background:${cfg.bg};color:${cfg.color};">${cfg.label}</span>
    </div>
  `;
}

function bankApplicationListHtml(applications, emptyLabel) {
  if (!applications || applications.length === 0) {
    return `<p class="text-xs" style="color:${C.textMuted};">${emptyLabel}</p>`;
  }
  return `<div class="space-y-2">${applications.map(bankApplicationRowHtml).join("")}</div>`;
}

function bankMonthlyStatsHtml(monthlyStats) {
  if (!monthlyStats || monthlyStats.length === 0) {
    return `<p class="text-xs" style="color:${C.textMuted};">No monthly data yet.</p>`;
  }
  // No charting library exists anywhere in this project (confirmed) - same plain CSS
  // progress-bar visualization convention already used for Disbursement Rate in the table above,
  // just repeated per month instead of per bank.
  const max = Math.max(1, ...monthlyStats.map((m) => m.applications));
  return `
    <div class="space-y-2.5">
      ${monthlyStats.map((m) => `
        <div class="flex items-center gap-3">
          <span class="text-xs w-16 flex-shrink-0" style="color:${C.textMuted};">${escapeHtml(m.month)}</span>
          <div class="flex-1 h-2.5 rounded-full" style="background:${C.border};">
            <div class="h-2.5 rounded-full" style="width:${(m.applications / max) * 100}%;background:${C.orange};"></div>
          </div>
          <span class="text-xs font-bold w-8 text-right flex-shrink-0" style="color:${C.text};font-family:var(--font-mono);">${m.applications}</span>
          ${m.disbursed > 0 ? `<span class="text-xs flex-shrink-0" style="color:${C.greenDark};">(${m.disbursed} disbursed)</span>` : ""}
        </div>
      `).join("")}
    </div>
  `;
}

function openBankDetailModal(bankName) {
  openModal((overlay, close) => {
    function renderLoading() {
      overlay.innerHTML = `
        <div class="w-full max-w-2xl rounded-2xl border p-8 text-center" style="background:${C.surface};border:1.5px solid ${C.border};">
          <p class="text-sm" style="color:${C.textMuted};">Loading bank details…</p>
        </div>
      `;
    }
    function renderError() {
      overlay.innerHTML = `
        <div class="w-full max-w-2xl rounded-2xl border p-8 text-center" style="background:${C.surface};border:1.5px solid ${C.border};">
          <p class="text-sm" style="color:#DC2626;">Couldn't load this bank's details.</p>
          <button data-close class="mt-4 px-4 py-2 rounded-xl text-sm font-semibold border" style="border:1.5px solid ${C.border};color:${C.text};">Close</button>
        </div>
      `;
      qs("[data-close]", overlay)?.addEventListener("click", close);
      hydrateIcons();
    }
    function renderDetail(b) {
      let activeTab = "overview";

      function overviewTabHtml() {
        return `
          <div class="mb-4">
            ${fieldRow("Officers Assigned", b.officersCount)}
            ${fieldRow("First Application On", b.firstApplicationOn)}
            ${fieldRow("Total Financed Amount", `PKR ${Number(b.totalFinancedAmount || 0).toLocaleString()}`)}
          </div>
          <div class="grid grid-cols-3 gap-2.5">
            ${bankStatCard("Total Applications", b.totalApplications)}
            ${bankStatCard("Under Review", b.underReview, "#D97706")}
            ${bankStatCard("Approved", b.approved, C.green)}
            ${bankStatCard("Rejected", b.rejected, "#DC2626")}
            ${bankStatCard("Offers Issued", b.offersIssued, C.blue)}
            ${bankStatCard("Accepted Offers", b.acceptedOffers, C.green)}
            ${bankStatCard("Disbursed", b.disbursed, C.greenDark)}
            ${bankStatCard("Approval Rate", `${b.approvalRate}%`, C.green)}
            ${bankStatCard("Disbursement Rate", `${b.disbursementRate}%`, C.green)}
          </div>
        `;
      }

      function renderInner() {
        overlay.innerHTML = `
          <div class="w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl border" style="background:${C.surface};border:1.5px solid ${C.border};">
            <div class="flex items-start justify-between p-5 border-b" style="border-color:${C.border};">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold text-white" style="background:${C.orange};">${escapeHtml((b.bank || "?")[0])}</div>
                <div>
                  <h3 class="text-base font-bold" style="color:${C.text};">${escapeHtml(b.bank)}</h3>
                  <p class="text-xs" style="color:${C.textMuted};">${b.totalApplications} application${b.totalApplications === 1 ? "" : "s"} on file</p>
                </div>
              </div>
              <button data-close class="p-1 rounded-lg hover:bg-gray-100" style="color:${C.textMuted};">${icon("x", { size: 16 })}</button>
            </div>

            <div class="flex gap-1 px-5 pt-3 border-b overflow-x-auto" style="border-color:${C.border};">
              ${["overview", "recent", "pending", "monthly"].map((t) => `
                <button data-detail-tab="${t}" class="px-3 py-2 text-xs font-medium border-b-2 -mb-px whitespace-nowrap"
                  style="border-color:${activeTab === t ? C.orange : "transparent"};color:${activeTab === t ? C.orange : C.textMuted};">
                  ${t === "overview" ? "Overview" : t === "recent" ? `Recent (${b.recentApplications.length})` : t === "pending" ? `Pending (${b.pendingApplications.length})` : "Monthly Trend"}
                </button>
              `).join("")}
            </div>

            <div class="p-5">
              ${activeTab === "overview" ? overviewTabHtml() : ""}
              ${activeTab === "recent" ? bankApplicationListHtml(b.recentApplications, "No applications on file yet.") : ""}
              ${activeTab === "pending" ? bankApplicationListHtml(b.pendingApplications, "No applications pending review.") : ""}
              ${activeTab === "monthly" ? bankMonthlyStatsHtml(b.monthlyStats) : ""}
            </div>
          </div>
        `;
        qs("[data-close]", overlay)?.addEventListener("click", close);
        qsa("[data-detail-tab]", overlay).forEach((btn) => {
          btn.addEventListener("click", () => { activeTab = btn.getAttribute("data-detail-tab"); renderInner(); });
        });
        hydrateIcons();
      }
      renderInner();
    }

    renderLoading();
    api.getSbpBankDetail(bankName).then((result) => {
      if (!result || !result.success) { renderError(); return; }
      renderDetail(result.bank);
    });
  });
}

// ── Bank Management ──────────────────────────────────────────────────────────
// SBP Admin Bank Management. Previously a hardcoded, disconnected 6-bank BANKS array with dead
// Add/Edit/Toggle buttons. Now real CRUD against Controllers/SbpApplicationController.cs's
// Banks endpoints (Services/BankService.cs) - a genuinely new Models/Bank.cs entity (Name/Code/
// Type/Coverage/contact fields/IsActive), deliberately separate from the pre-existing
// Business.Bank free-text field (see Models/Bank.cs's own comment on why). Same fetch-once,
// render-from-cache convention as every other real SBP Admin page (Dashboard/Applications/
// Users) - no extra server round-trips for Edit/Toggle beyond the one save/status call itself.
let bm_banks = null;
let bm_actionError = "";
let bm_actionBusyId = null;

const BANK_TYPES = ["Commercial", "Islamic", "Microfinance", "Development Finance Institution", "Specialized"];

function renderBankManagement(outletEl) {
  renderBankManagementWithData(outletEl, null);
  api.getSbpBanks().then((result) => {
    bm_banks = (result && result.banks) || [];
    renderBankManagementWithData(outletEl, bm_banks);
  });
}

function renderBankManagementWithData(outletEl, banks) {
  const loading = banks === null;
  const rows = loading ? [] : banks;

  outletEl.innerHTML = `
    <div class="px-6 py-6">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-xl font-bold" style="color:${C.text};">Bank Management</h1>
          <p class="text-sm mt-0.5" style="color:${C.textMuted};">Manage participating banks on the portal</p>
        </div>
        <button data-add-bank class="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white" style="background:${C.orange};">
          ${icon("plus-circle", { size: 16 })} Add Bank
        </button>
      </div>

      ${bm_actionError ? `
        <div class="rounded-xl p-3 mb-4 flex gap-2.5" style="background:#FEE2E2;border:1.5px solid #DC2626;max-width:640px;">
          ${icon("x-circle", { size: 16, color: "#DC2626", style: "margin-top:2px;" })}
          <p class="text-xs leading-relaxed" style="color:#DC2626;">${escapeHtml(bm_actionError)}</p>
        </div>
      ` : ""}

      <div class="rounded-2xl border overflow-hidden" style="background:${C.surface};border:1.5px solid ${C.border};">
        <table class="w-full text-sm">
          <thead>
            <tr style="background:${C.bg};">
              ${["Bank Name", "Code", "Type", "Coverage", "Status", "Joined", "Actions"].map((h) => `
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style="color:${C.textMuted};font-family:var(--font-mono);">${h}</th>
              `).join("")}
            </tr>
          </thead>
          <tbody>
            ${loading ? `
              <tr><td colspan="7" class="px-4 py-10 text-center text-xs" style="color:${C.textMuted};">Loading…</td></tr>
            ` : rows.length === 0 ? `
              <tr><td colspan="7" class="px-4 py-10 text-center text-xs" style="color:${C.textMuted};">No banks on file yet.</td></tr>
            ` : rows.map((bank) => {
              const busy = bm_actionBusyId === bank.id;
              return `
              <tr class="border-t hover:bg-gray-50" style="border-color:${C.border};">
                <td class="px-4 py-3 font-semibold text-sm" style="color:${C.text};">${escapeHtml(bank.name)}</td>
                <td class="px-4 py-3 text-xs font-bold" style="color:${C.textMuted};font-family:var(--font-mono);">${escapeHtml(bank.code)}</td>
                <td class="px-4 py-3">
                  <span class="text-xs px-2 py-0.5 rounded-full font-semibold" style="background:${bank.type === "Islamic" ? C.orangeLight : C.blueLight};color:${bank.type === "Islamic" ? C.orange : C.blue};">${escapeHtml(bank.type)}</span>
                </td>
                <td class="px-4 py-3 text-xs" style="color:${C.textMuted};">${escapeHtml(bank.coverage)}</td>
                <td class="px-4 py-3">
                  <span class="text-xs px-2.5 py-0.5 rounded-full font-semibold" style="background:${bank.isActive ? C.greenLight : "#FEE2E2"};color:${bank.isActive ? C.green : "#DC2626"};">${bank.isActive ? "Active" : "Inactive"}</span>
                </td>
                <td class="px-4 py-3 text-xs" style="color:${C.textMuted};">${escapeHtml(bank.joined)}</td>
                <td class="px-4 py-3">
                  <div class="flex items-center gap-1">
                    <button data-edit-bank="${bank.id}" ${busy ? "disabled" : ""} class="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40" style="color:${C.textMuted};" title="Edit">
                      ${icon("edit-2", { size: 14 })}
                    </button>
                    <button data-toggle-bank="${bank.id}" data-toggle-bank-active="${bank.isActive}" ${busy ? "disabled" : ""} class="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40" style="color:${bank.isActive ? "#DC2626" : C.green};" title="${bank.isActive ? "Deactivate" : "Activate"}">
                      ${bank.isActive ? icon("toggle-right", { size: 14 }) : icon("toggle-left", { size: 14 })}
                    </button>
                  </div>
                </td>
              </tr>
            `;
            }).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;

  wireBankManagementEvents(outletEl);
  hydrateIcons();
  wireImageFallbacks(outletEl);
}

function wireBankManagementEvents(outletEl) {
  qs("[data-add-bank]", outletEl)?.addEventListener("click", () => openBankFormModal(outletEl, null));

  qsa("[data-edit-bank]", outletEl).forEach((btn) => {
    btn.addEventListener("click", () => {
      const bank = (bm_banks || []).find((b) => b.id === btn.getAttribute("data-edit-bank"));
      if (bank) openBankFormModal(outletEl, bank);
    });
  });

  qsa("[data-toggle-bank]", outletEl).forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-toggle-bank");
      const currentlyActive = btn.getAttribute("data-toggle-bank-active") === "true";
      bm_actionBusyId = id;
      bm_actionError = "";
      renderBankManagementWithData(outletEl, bm_banks);

      const result = await api.updateSbpBankStatus(id, !currentlyActive);
      bm_actionBusyId = null;

      if (!result || !result.success) {
        bm_actionError = (result && result.message) || "Couldn't update this bank's status. Please try again.";
        renderBankManagementWithData(outletEl, bm_banks);
        return;
      }

      // Patch just this one row in the cached list rather than refetching everything - same
      // convention as User Management's own status actions.
      bm_banks = (bm_banks || []).map((b) => (b.id === id ? result.bank : b));
      renderBankManagementWithData(outletEl, bm_banks);
    });
  });
}

function bankFormFieldHtml({ key, label, value, type = "text", required = true }) {
  return `
    <div>
      <label class="block text-sm font-medium mb-1.5" style="color:${C.text};">${escapeHtml(label)} ${required ? `<span style="color:#DC2626;">*</span>` : ""}</label>
      <input data-bank-field="${key}" type="${type}" value="${escapeHtml(value ?? "")}"
        class="w-full rounded-xl border text-sm outline-none" style="padding:10px 12px;border:1.5px solid ${C.border};background:${C.surface};color:${C.text};" />
    </div>
  `;
}

// "Not Provided" (Services/BankService.cs's own placeholder for blank contact fields - e.g. the
// seeded banks with no real contact info on file) is stripped back to an empty, editable field
// here rather than shown as literal form input text.
function editableBankValue(v) {
  return v === "Not Provided" ? "" : v;
}

function openBankFormModal(outletEl, existingBank) {
  const isEdit = !!existingBank;

  openModal((overlay, close) => {
    let form = isEdit
      ? {
          name: existingBank.name,
          code: existingBank.code,
          type: existingBank.type,
          coverage: editableBankValue(existingBank.coverage),
          contactPerson: editableBankValue(existingBank.contactPerson),
          contactEmail: editableBankValue(existingBank.contactEmail),
          contactNumber: editableBankValue(existingBank.contactNumber),
          address: editableBankValue(existingBank.address),
          isActive: existingBank.isActive,
        }
      : { name: "", code: "", type: "", coverage: "", contactPerson: "", contactEmail: "", contactNumber: "", address: "", isActive: true };
    let saveError = "";
    let saving = false;

    function renderInner() {
      overlay.innerHTML = `
        <div class="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border" style="background:${C.surface};border:1.5px solid ${C.border};">
          <div class="flex items-start justify-between p-5 border-b" style="border-color:${C.border};">
            <h3 class="text-sm font-bold" style="color:${C.text};">${isEdit ? "Edit Bank" : "Add Bank"}</h3>
            <button data-close class="p-1 rounded-lg hover:bg-gray-100" style="color:${C.textMuted};">${icon("x", { size: 16 })}</button>
          </div>
          <div class="p-5 space-y-4">
            ${saveError ? `
              <div class="rounded-xl p-3 flex gap-2.5" style="background:#FEE2E2;border:1.5px solid #DC2626;">
                ${icon("x-circle", { size: 16, color: "#DC2626", style: "margin-top:2px;" })}
                <p class="text-xs leading-relaxed" style="color:#DC2626;">${escapeHtml(saveError)}</p>
              </div>` : ""}
            <div class="grid grid-cols-2 gap-3">
              ${bankFormFieldHtml({ key: "name", label: "Bank Name", value: form.name })}
              ${bankFormFieldHtml({ key: "code", label: "Bank Code", value: form.code })}
            </div>
            <div>
              <label class="block text-sm font-medium mb-1.5" style="color:${C.text};">Bank Type <span style="color:#DC2626;">*</span></label>
              <div class="relative">
                <select data-bank-field="type" class="w-full rounded-xl border text-sm outline-none appearance-none" style="padding:10px 36px 10px 12px;border:1.5px solid ${C.border};background:${C.surface};color:${C.text};">
                  <option value="" ${form.type === "" ? "selected" : ""}>-- Select --</option>
                  ${BANK_TYPES.map((t) => `<option value="${t}" ${form.type === t ? "selected" : ""}>${t}</option>`).join("")}
                </select>
                ${icon("chevron-down", { size: 16, color: C.textMuted, className: "absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" })}
              </div>
            </div>
            ${bankFormFieldHtml({ key: "coverage", label: "Coverage", value: form.coverage })}
            <div class="grid grid-cols-2 gap-3">
              ${bankFormFieldHtml({ key: "contactPerson", label: "Contact Person", value: form.contactPerson })}
              ${bankFormFieldHtml({ key: "contactNumber", label: "Contact Number", value: form.contactNumber })}
            </div>
            ${bankFormFieldHtml({ key: "contactEmail", label: "Contact Email", value: form.contactEmail, type: "email" })}
            <div>
              <label class="block text-sm font-medium mb-1.5" style="color:${C.text};">Bank Address <span style="color:#DC2626;">*</span></label>
              <textarea data-bank-field="address" rows="2" class="w-full rounded-xl border text-sm outline-none" style="padding:10px 12px;border:1.5px solid ${C.border};background:${C.surface};color:${C.text};">${escapeHtml(form.address)}</textarea>
            </div>
            <label class="flex items-center justify-between p-2.5 rounded-xl border cursor-pointer" style="border:1.5px solid ${C.border};">
              <span class="text-sm" style="color:${C.text};">Status: ${form.isActive ? "Active" : "Inactive"}</span>
              <input data-bank-active-toggle type="checkbox" class="rounded" ${form.isActive ? "checked" : ""} />
            </label>
          </div>
          <div class="flex gap-3 p-5 border-t" style="border-color:${C.border};">
            <button data-close class="flex-1 py-2.5 rounded-xl text-sm font-semibold border" style="border:1.5px solid ${C.border};color:${C.text};">Cancel</button>
            <button data-save-bank ${saving ? "disabled" : ""} class="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50" style="background:${C.orange};">${saving ? "Saving…" : isEdit ? "Save Changes" : "Add Bank"}</button>
          </div>
        </div>
      `;

      qsa("[data-close]", overlay).forEach((b) => b.addEventListener("click", close));
      qsa("input[data-bank-field], textarea[data-bank-field]", overlay).forEach((el) => {
        el.addEventListener("input", (e) => { form[el.getAttribute("data-bank-field")] = e.target.value; });
      });
      const typeSelect = overlay.querySelector('select[data-bank-field="type"]');
      if (typeSelect) typeSelect.addEventListener("change", (e) => { form.type = e.target.value; });
      const activeToggle = qs("[data-bank-active-toggle]", overlay);
      if (activeToggle) activeToggle.addEventListener("change", (e) => { form.isActive = e.target.checked; renderInner(); });

      qs("[data-save-bank]", overlay)?.addEventListener("click", async () => {
        if (saving) return;
        saving = true;
        saveError = "";
        renderInner();

        const payload = { ...form };
        const result = isEdit ? await api.updateSbpBank(existingBank.id, payload) : await api.createSbpBank(payload);
        saving = false;

        if (!result || !result.success) {
          saveError = (result && result.message) || `Couldn't ${isEdit ? "save" : "add"} this bank. Please try again.`;
          renderInner();
          return;
        }

        close();
        bm_banks = isEdit
          ? (bm_banks || []).map((b) => (b.id === existingBank.id ? result.bank : b))
          : [...(bm_banks || []), result.bank];
        renderBankManagementWithData(outletEl, bm_banks);
      });

      hydrateIcons();
    }

    renderInner();
  });
}

// ── User Management ──────────────────────────────────────────────────────────
// SBP Admin Portal sync (Phase 3). Previously two hardcoded, disconnected tables ("SME
// Applicants"/"Bank Users" tabs, neither backed by real data). Now a single real, unified list
// from Controllers/SbpApplicationController.cs's Users action (via js/api.js's getSbpUsers()) -
// every real user in the system (Applicant/Bank Officer/SBP Admin alike). "User Type" is now a
// combinable FILTER (per this phase's requirement that filters work together) rather than a
// fixed tab split. Search/filters/pagination are all client-side against the one already-
// fetched list, same convention as every other real page in this app (Dashboard/Applications).
let um_search = "";
let um_typeFilter = "all";
let um_bankFilter = "all";
let um_statusFilter = "all";
let um_dateFrom = "";
let um_dateTo = "";
let um_page = 1;
const UM_PAGE_SIZE = 10;
let um_users = null;
let um_actionError = "";
let um_actionBusyId = null;

function renderUsers(outletEl) {
  renderUsersWithData(outletEl, null);
  api.getSbpUsers().then((result) => {
    um_users = (result && result.users) || [];
    renderUsersWithData(outletEl, um_users);
  });
}

function userTypeOptionsFrom(users) {
  return Array.from(new Set(users.map((u) => u.userType))).sort();
}
function bankOptionsFrom(users) {
  return Array.from(new Set(users.map((u) => u.assignedBank).filter(Boolean))).sort();
}

function matchesUserFilters(u) {
  if (um_typeFilter !== "all" && u.userType !== um_typeFilter) return false;
  if (um_bankFilter !== "all" && u.assignedBank !== um_bankFilter) return false;
  if (um_statusFilter !== "all" && u.accountStatus !== um_statusFilter) return false;
  if (um_dateFrom && u.registrationDate < um_dateFrom) return false;
  if (um_dateTo && u.registrationDate > um_dateTo) return false;
  if (!matchesSearch(um_search, u.fullName, u.email, u.cnic, u.businessNames, u.assignedBank)) return false;
  return true;
}

const USER_STATUS_BADGE = {
  Active: { color: C.green, bg: C.greenLight },
  Inactive: { color: C.textMuted, bg: "#F3F4F6" },
  Blocked: { color: "#DC2626", bg: "#FEE2E2" },
};

function userStatusActionsHtml(u) {
  const busy = um_actionBusyId === u.id;
  const btn = (action, label, iconName, color) => `
    <button data-um-action="${action}" data-um-action-id="${u.id}" ${busy ? "disabled" : ""}
      class="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40" style="color:${color};" title="${label}">
      ${icon(iconName, { size: 14 })}
    </button>
  `;

  if (u.accountStatus === "Blocked") {
    return btn("unblock", "Unblock", "unlock", C.green);
  }
  return `
    ${u.accountStatus === "Active" ? btn("deactivate", "Deactivate", "pause-circle", C.orange) : btn("activate", "Activate", "play-circle", C.green)}
    ${btn("block", "Block", "ban", "#DC2626")}
  `;
}

function userRowHtml(u) {
  const badge = USER_STATUS_BADGE[u.accountStatus] || USER_STATUS_BADGE.Inactive;
  return `
    <tr class="border-t hover:bg-gray-50" style="border-color:${C.border};">
      <td class="px-4 py-3 font-semibold text-sm whitespace-nowrap" style="color:${C.text};">${escapeHtml(u.fullName || "—")}</td>
      <td class="px-4 py-3 text-xs" style="color:${C.textMuted};">${escapeHtml(u.email)}</td>
      <td class="px-4 py-3 text-xs font-mono" style="color:${C.textMuted};">${escapeHtml(u.cnic)}</td>
      <td class="px-4 py-3 text-xs font-semibold whitespace-nowrap" style="color:${C.blue};">${escapeHtml(u.userType)}</td>
      <td class="px-4 py-3 text-xs whitespace-nowrap" style="color:${C.textMuted};">${escapeHtml(u.assignedBank || "—")}</td>
      <td class="px-4 py-3 text-xs whitespace-nowrap" style="color:${C.textMuted};">${escapeHtml(u.registrationDate)}</td>
      <td class="px-4 py-3">
        <span class="text-xs px-2.5 py-0.5 rounded-full font-semibold" style="background:${badge.bg};color:${badge.color};">${escapeHtml(u.accountStatus)}</span>
      </td>
      <td class="px-4 py-3">
        ${u.isEmailVerified
          ? `<span style="color:${C.green};">${icon("check-circle-2", { size: 14 })}</span>`
          : `<span style="color:${C.textMuted};">${icon("circle", { size: 14 })}</span>`}
      </td>
      <td class="px-4 py-3 text-xs whitespace-nowrap" style="color:${C.textMuted};">${escapeHtml(u.lastLogin)}</td>
      <td class="px-4 py-3">
        <div class="flex items-center gap-1">
          <button data-um-view="${u.id}" class="p-1.5 rounded-lg hover:bg-gray-100" style="color:${C.textMuted};" title="View">
            ${icon("eye", { size: 14 })}
          </button>
          ${userStatusActionsHtml(u)}
        </div>
      </td>
    </tr>
  `;
}

function renderUsersWithData(outletEl, users) {
  const loading = users === null;
  const all = loading ? [] : users;
  const filtered = all.filter(matchesUserFilters);
  const totalPages = Math.max(1, Math.ceil(filtered.length / UM_PAGE_SIZE));
  if (um_page > totalPages) um_page = totalPages;
  const pageRows = filtered.slice((um_page - 1) * UM_PAGE_SIZE, um_page * UM_PAGE_SIZE);

  const typeOptions = userTypeOptionsFrom(all);
  const bankOptions = bankOptionsFrom(all);

  outletEl.innerHTML = `
    <div class="px-6 py-6">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-xl font-bold" style="color:${C.text};">User Management</h1>
          <p class="text-sm mt-0.5" style="color:${C.textMuted};">Manage applicants, bank users, and SBP admins system-wide</p>
        </div>
        <button class="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white" style="background:${C.orange};">
          ${icon("plus-circle", { size: 16 })} Add User
        </button>
      </div>

      <div class="flex flex-wrap gap-2 mb-4">
        <div class="relative flex-1 min-w-[200px] max-w-sm">
          <span class="absolute left-3 top-1/2 -translate-y-1/2">${icon("search", { size: 14, color: C.textMuted })}</span>
          <input data-um-search value="${escapeHtml(um_search)}" placeholder="Search name, email, CNIC, business, bank..."
            class="w-full rounded-xl border text-xs outline-none" style="padding:8px 12px 8px 30px;border:1.5px solid ${C.border};background:${C.surface};color:${C.text};" />
        </div>
        <select data-um-type class="text-xs px-3 py-2 rounded-xl border outline-none font-medium" style="border:1.5px solid ${C.border};color:${C.text};background:${C.surface};">
          <option value="all" ${um_typeFilter === "all" ? "selected" : ""}>All User Types</option>
          ${typeOptions.map((t) => `<option value="${escapeHtml(t)}" ${um_typeFilter === t ? "selected" : ""}>${escapeHtml(t)}</option>`).join("")}
        </select>
        <select data-um-bank class="text-xs px-3 py-2 rounded-xl border outline-none font-medium" style="border:1.5px solid ${C.border};color:${C.text};background:${C.surface};">
          <option value="all" ${um_bankFilter === "all" ? "selected" : ""}>All Banks</option>
          ${bankOptions.map((b) => `<option value="${escapeHtml(b)}" ${um_bankFilter === b ? "selected" : ""}>${escapeHtml(b)}</option>`).join("")}
        </select>
        <select data-um-status class="text-xs px-3 py-2 rounded-xl border outline-none font-medium" style="border:1.5px solid ${C.border};color:${C.text};background:${C.surface};">
          ${["all", "Active", "Inactive", "Blocked"].map((s) => `<option value="${s}" ${um_statusFilter === s ? "selected" : ""}>${s === "all" ? "All Statuses" : s}</option>`).join("")}
        </select>
        <input data-um-date-from type="date" value="${um_dateFrom}" title="Registered from"
          class="text-xs px-3 py-2 rounded-xl border outline-none" style="border:1.5px solid ${C.border};color:${C.text};background:${C.surface};" />
        <input data-um-date-to type="date" value="${um_dateTo}" title="Registered to"
          class="text-xs px-3 py-2 rounded-xl border outline-none" style="border:1.5px solid ${C.border};color:${C.text};background:${C.surface};" />
      </div>

      ${um_actionError ? `
        <div class="rounded-xl p-3 mb-4 flex gap-2.5" style="background:#FEE2E2;border:1.5px solid #DC2626;max-width:640px;">
          ${icon("x-circle", { size: 16, color: "#DC2626", style: "margin-top:2px;" })}
          <p class="text-xs leading-relaxed" style="color:#DC2626;">${escapeHtml(um_actionError)}</p>
        </div>
      ` : ""}

      <div class="rounded-2xl border overflow-hidden" style="background:${C.surface};border:1.5px solid ${C.border};">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr style="background:${C.bg};">
                ${["Name", "Email", "CNIC", "User Type", "Assigned Bank", "Registered", "Status", "Verified", "Last Login", ""].map((h) => `
                  <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap" style="color:${C.textMuted};font-family:var(--font-mono);">${h}</th>
                `).join("")}
              </tr>
            </thead>
            <tbody>
              ${loading ? `
                <tr><td colspan="10" class="px-4 py-10 text-center text-xs" style="color:${C.textMuted};">Loading…</td></tr>
              ` : filtered.length === 0 ? `
                <tr><td colspan="10" class="px-4 py-10 text-center text-xs" style="color:${C.textMuted};">${all.length === 0 ? "No users on file yet." : "No users match your search/filters."}</td></tr>
              ` : pageRows.map((u) => userRowHtml(u)).join("")}
            </tbody>
          </table>
        </div>
      </div>

      ${!loading && filtered.length > 0 ? `
        <div class="flex items-center justify-between mt-4">
          <span class="text-xs" style="color:${C.textMuted};">
            Showing ${(um_page - 1) * UM_PAGE_SIZE + 1}–${Math.min(um_page * UM_PAGE_SIZE, filtered.length)} of ${filtered.length}
          </span>
          <div class="flex items-center gap-2">
            <button data-um-prev-page ${um_page <= 1 ? "disabled" : ""} class="px-3 py-1.5 rounded-lg text-xs font-semibold border disabled:opacity-40" style="border:1.5px solid ${C.border};color:${C.text};">Previous</button>
            <span class="text-xs font-semibold" style="color:${C.text};">Page ${um_page} of ${totalPages}</span>
            <button data-um-next-page ${um_page >= totalPages ? "disabled" : ""} class="px-3 py-1.5 rounded-lg text-xs font-semibold border disabled:opacity-40" style="border:1.5px solid ${C.border};color:${C.text};">Next</button>
          </div>
        </div>
      ` : ""}
    </div>
  `;

  wireUserManagementEvents(outletEl);
  hydrateIcons();
  wireImageFallbacks(outletEl);
}

function wireUserManagementEvents(outletEl) {
  const searchInput = qs("[data-um-search]", outletEl);
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      const caret = e.target.selectionStart;
      um_search = e.target.value;
      um_page = 1;
      renderUsersWithData(outletEl, um_users);
      const newInput = qs("[data-um-search]", outletEl);
      if (newInput) { newInput.focus(); newInput.setSelectionRange(caret, caret); }
    });
  }
  const typeSelect = qs("[data-um-type]", outletEl);
  if (typeSelect) typeSelect.addEventListener("change", (e) => { um_typeFilter = e.target.value; um_page = 1; renderUsersWithData(outletEl, um_users); });
  const bankSelect = qs("[data-um-bank]", outletEl);
  if (bankSelect) bankSelect.addEventListener("change", (e) => { um_bankFilter = e.target.value; um_page = 1; renderUsersWithData(outletEl, um_users); });
  const statusSelect = qs("[data-um-status]", outletEl);
  if (statusSelect) statusSelect.addEventListener("change", (e) => { um_statusFilter = e.target.value; um_page = 1; renderUsersWithData(outletEl, um_users); });
  const dateFrom = qs("[data-um-date-from]", outletEl);
  if (dateFrom) dateFrom.addEventListener("change", (e) => { um_dateFrom = e.target.value; um_page = 1; renderUsersWithData(outletEl, um_users); });
  const dateTo = qs("[data-um-date-to]", outletEl);
  if (dateTo) dateTo.addEventListener("change", (e) => { um_dateTo = e.target.value; um_page = 1; renderUsersWithData(outletEl, um_users); });

  const prevBtn = qs("[data-um-prev-page]", outletEl);
  if (prevBtn) prevBtn.addEventListener("click", () => { um_page = Math.max(1, um_page - 1); renderUsersWithData(outletEl, um_users); });
  const nextBtn = qs("[data-um-next-page]", outletEl);
  if (nextBtn) nextBtn.addEventListener("click", () => { um_page += 1; renderUsersWithData(outletEl, um_users); });

  qsa("[data-um-view]", outletEl).forEach((btn) => {
    btn.addEventListener("click", () => openUserDetailModal(btn.getAttribute("data-um-view")));
  });

  qsa("[data-um-action]", outletEl).forEach((btn) => {
    btn.addEventListener("click", async () => {
      const action = btn.getAttribute("data-um-action");
      const id = btn.getAttribute("data-um-action-id");
      um_actionBusyId = id;
      um_actionError = "";
      renderUsersWithData(outletEl, um_users);

      const result = await api.updateSbpUserStatus(id, action);
      um_actionBusyId = null;

      if (!result || !result.success) {
        um_actionError = (result && result.message) || `Couldn't ${action} this user. Please try again.`;
        renderUsersWithData(outletEl, um_users);
        return;
      }

      // Patch just this one row in the cached list rather than refetching everything.
      um_users = (um_users || []).map((u) => (u.id === id ? result.user : u));
      renderUsersWithData(outletEl, um_users);
    });
  });
}

// ── User detail modal ────────────────────────────────────────────────────────
function fieldRow(label, value) {
  return `
    <div class="flex items-center gap-4 py-2 border-b last:border-0" style="border-color:${C.border};">
      <span class="text-xs w-40 flex-shrink-0" style="color:${C.textMuted};">${escapeHtml(label)}</span>
      <span class="text-sm font-semibold" style="color:${C.text};">${escapeHtml(value ?? "—")}</span>
    </div>
  `;
}

function basicInfoTabHtml(b, activitySummary) {
  return `
    <div>
      ${fieldRow("Full Name", b.fullName)}
      ${fieldRow("Email", b.email)}
      ${fieldRow("CNIC", b.cnic)}
      ${fieldRow("User Type", b.userType)}
      ${fieldRow("Assigned Bank", b.assignedBank || "—")}
      ${fieldRow("Registered", b.registrationDate)}
      ${fieldRow("Account Status", b.accountStatus)}
      ${fieldRow("Email Verified", b.isEmailVerified ? "Yes" : "No")}
      ${fieldRow("Last Login", b.lastLogin)}
    </div>
    <div class="grid grid-cols-3 gap-3 mt-4">
      ${[
        { label: "Businesses", value: activitySummary.businessCount },
        { label: "Applications", value: activitySummary.applicationCount },
        { label: "Documents", value: activitySummary.documentCount },
      ].map(({ label, value }) => `
        <div class="rounded-xl p-3 text-center" style="background:${C.bg};border:1.5px solid ${C.border};">
          <div class="text-lg font-black" style="color:${C.text};font-family:var(--font-mono);">${value}</div>
          <div class="text-xs" style="color:${C.textMuted};">${label}</div>
        </div>
      `).join("")}
    </div>
  `;
}

function businessesTabHtml(businesses) {
  if (businesses.length === 0) return `<p class="text-xs" style="color:${C.textMuted};">No businesses on file.</p>`;
  return businesses.map((biz) => `
    <div class="rounded-xl p-3 mb-2" style="background:${C.bg};border:1.5px solid ${C.border};">
      <div class="text-sm font-bold" style="color:${C.text};">${escapeHtml(biz.name)}</div>
      <div class="text-xs" style="color:${C.textMuted};">${escapeHtml(biz.nature || "—")} · Bank: ${escapeHtml(biz.bank || "Not Provided")} · CNIC: ${escapeHtml(biz.ownerCnic || "—")}</div>
    </div>
  `).join("");
}

function applicationsTabHtml(applications) {
  if (applications.length === 0) return `<p class="text-xs" style="color:${C.textMuted};">No applications on file.</p>`;
  return `
    <div class="space-y-2">
      ${applications.map((a) => {
        const cfg = APPLICATION_STATUS_CFG[a.status] || APPLICATION_STATUS_CFG.under_review;
        return `
          <div class="rounded-xl p-3 flex items-center justify-between" style="background:${C.bg};border:1.5px solid ${C.border};">
            <div>
              <div class="text-sm font-bold" style="color:${C.text};font-family:var(--font-mono);">${escapeHtml(a.caseId)}</div>
              <div class="text-xs" style="color:${C.textMuted};">${escapeHtml(a.businessName)} · ${escapeHtml(a.scheme)} · ${escapeHtml(a.amount)}</div>
            </div>
            <span class="text-xs px-2.5 py-0.5 rounded-full font-semibold" style="background:${cfg.bg};color:${cfg.color};">${cfg.label}</span>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function documentsTabHtml(documents) {
  if (documents.length === 0) return `<p class="text-xs" style="color:${C.textMuted};">No documents uploaded.</p>`;
  return `
    <div class="space-y-2">
      ${documents.map((d) => `
        <div class="rounded-xl p-3 flex items-center justify-between" style="background:${C.bg};border:1.5px solid ${C.border};">
          <div>
            <div class="text-sm font-semibold" style="color:${C.text};">${escapeHtml(d.documentType)}</div>
            <div class="text-xs" style="color:${C.textMuted};">${escapeHtml(d.applicationCaseId)} · ${escapeHtml(d.originalFileName)} · ${escapeHtml(d.uploadedOn)}</div>
          </div>
          <span class="text-xs" style="color:${C.textMuted};">${escapeHtml(d.status)}</span>
        </div>
      `).join("")}
    </div>
  `;
}

function openUserDetailModal(userId) {
  openModal((overlay, close) => {
    function renderLoading() {
      overlay.innerHTML = `
        <div class="w-full max-w-2xl rounded-2xl border p-8 text-center" style="background:${C.surface};border:1.5px solid ${C.border};">
          <p class="text-sm" style="color:${C.textMuted};">Loading user details…</p>
        </div>
      `;
    }
    function renderError() {
      overlay.innerHTML = `
        <div class="w-full max-w-2xl rounded-2xl border p-8 text-center" style="background:${C.surface};border:1.5px solid ${C.border};">
          <p class="text-sm" style="color:#DC2626;">Couldn't load this user's details.</p>
          <button data-close class="mt-4 px-4 py-2 rounded-xl text-sm font-semibold border" style="border:1.5px solid ${C.border};color:${C.text};">Close</button>
        </div>
      `;
      qs("[data-close]", overlay)?.addEventListener("click", close);
      hydrateIcons();
    }
    function renderDetail(detail) {
      const b = detail.basic;
      let activeTab = "info";

      function renderInner() {
        overlay.innerHTML = `
          <div class="w-full max-w-3xl overflow-y-auto rounded-2xl border" style="background:${C.surface};border:1.5px solid ${C.border};max-height:85vh;">
            <div class="flex items-start justify-between p-5 border-b" style="border-color:${C.border};">
              <div>
                <h3 class="text-base font-bold" style="color:${C.text};">${escapeHtml(b.fullName || "—")}</h3>
                <p class="text-xs" style="color:${C.textMuted};">${escapeHtml(b.email)} · ${escapeHtml(b.userType)}</p>
              </div>
              <button data-close class="p-1 rounded-lg hover:bg-gray-100" style="color:${C.textMuted};">${icon("x", { size: 16 })}</button>
            </div>

            <div class="flex gap-1 px-5 pt-3 border-b" style="border-color:${C.border};">
              ${["info", "businesses", "applications", "documents"].map((t) => `
                <button data-detail-tab="${t}" class="px-3 py-2 text-xs font-medium border-b-2 -mb-px"
                  style="border-color:${activeTab === t ? C.orange : "transparent"};color:${activeTab === t ? C.orange : C.textMuted};">
                  ${t === "info" ? "Basic Info" : t === "businesses" ? `Businesses (${detail.businesses.length})` : t === "applications" ? `Applications (${detail.applications.length})` : `Documents (${detail.documents.length})`}
                </button>
              `).join("")}
            </div>

            <div class="p-5">
              ${activeTab === "info" ? basicInfoTabHtml(b, detail.activitySummary) : ""}
              ${activeTab === "businesses" ? businessesTabHtml(detail.businesses) : ""}
              ${activeTab === "applications" ? applicationsTabHtml(detail.applications) : ""}
              ${activeTab === "documents" ? documentsTabHtml(detail.documents) : ""}
            </div>
          </div>
        `;
        qs("[data-close]", overlay)?.addEventListener("click", close);
        qsa("[data-detail-tab]", overlay).forEach((btn) => {
          btn.addEventListener("click", () => { activeTab = btn.getAttribute("data-detail-tab"); renderInner(); });
        });
        hydrateIcons();
      }
      renderInner();
    }

    renderLoading();
    api.getSbpUserDetail(userId).then((result) => {
      if (!result || !result.success) { renderError(); return; }
      renderDetail(result.user);
    });
  });
}

// ── Reports ──────────────────────────────────────────────────────────────────
// SBP Admin Reports. Previously 6 hardcoded cards with dead Download buttons and a dead
// "Generate Custom Report" button. Now real, on-demand generation against Controllers/
// SbpApplicationController.cs's Reports endpoints (Services/ReportService.cs) - every number
// computed from the same real Application/Business data every other SBP Admin page already
// reads, never a second, divergent calculation. Report History (new - explicitly required by
// this phase) is rendered as an additional section below the same card grid, same visual
// language as the rest of this app, not a redesign of the existing cards.
let rp_reportBusy = null;
let rp_history = null;
let rp_actionError = "";

const REPORTS_META = [
  { key: "application_status", name: "Application Status Report", desc: "Summary of all applications by status and bank", type: "PDF" },
  { key: "turnaround_time", name: "Turnaround Time Report", desc: "Processing time per bank and application stage", type: "Excel" },
  { key: "assessment", name: "Assessment Report", desc: "Credit assessment outcomes and risk distribution", type: "PDF" },
  { key: "decline_analysis", name: "Decline Analysis Report", desc: "Reasons for rejection by sector and bank", type: "Excel" },
  { key: "disbursement_summary", name: "Disbursement Summary Report", desc: "Total disbursements by bank, region and scheme", type: "PDF" },
  { key: "geographic_spread", name: "Geographic Spread Report", desc: "Application and disbursement distribution by province and city", type: "PDF" },
];

const CUSTOM_REPORT_SECTIONS = [
  { key: "bank", label: "Bank-wise Summary" },
  { key: "scheme", label: "Scheme-wise Summary" },
  { key: "turnaround", label: "Turnaround Time" },
  { key: "decline", label: "Decline Analysis" },
  { key: "disbursement", label: "Disbursement Summary" },
  { key: "geographic", label: "Geographic Spread" },
  { key: "risk", label: "Risk Assessment" },
];

const CUSTOM_REPORT_STATUSES = ["under_review", "approved", "rejected", "offer_issued", "disbursed"];

function renderReports(outletEl) {
  renderReportsWithData(outletEl);
  api.getSbpReportHistory().then((result) => {
    rp_history = (result && result.history) || [];
    renderReportsWithData(outletEl);
  });
}

function renderReportsWithData(outletEl) {
  const loadingHistory = rp_history === null;
  const historyRows = loadingHistory ? [] : rp_history;

  outletEl.innerHTML = `
    <div class="px-6 py-6">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-xl font-bold" style="color:${C.text};">Reports</h1>
          <p class="text-sm mt-0.5" style="color:${C.textMuted};">Download and schedule system reports</p>
        </div>
        <button data-generate-custom class="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white" style="background:${C.orange};">
          ${icon("bar-chart-2", { size: 16 })} Generate Custom Report
        </button>
      </div>

      ${rp_actionError ? `
        <div class="rounded-xl p-3 mb-4 flex gap-2.5" style="background:#FEE2E2;border:1.5px solid #DC2626;max-width:640px;">
          ${icon("x-circle", { size: 16, color: "#DC2626", style: "margin-top:2px;" })}
          <p class="text-xs leading-relaxed" style="color:#DC2626;">${escapeHtml(rp_actionError)}</p>
        </div>
      ` : ""}

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        ${REPORTS_META.map((r) => {
          const busy = rp_reportBusy === r.key;
          return `
          <div class="rounded-2xl border p-5 flex flex-col gap-3" style="background:${C.surface};border:1.5px solid ${C.border};">
            <div class="flex items-start justify-between gap-2">
              <div class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style="background:${C.orangeLight};">
                ${icon("bar-chart-2", { size: 16, color: C.orange })}
              </div>
              <span class="text-xs px-2 py-0.5 rounded-full font-semibold" style="background:${r.type === "PDF" ? "#FEE2E2" : C.blueLight};color:${r.type === "PDF" ? "#DC2626" : C.blue};font-family:var(--font-mono);">
                ${r.type}
              </span>
            </div>
            <div>
              <h3 class="text-sm font-bold mb-1" style="color:${C.text};">${r.name}</h3>
              <p class="text-xs leading-snug" style="color:${C.textMuted};">${r.desc}</p>
            </div>
            <div class="flex items-center justify-between mt-auto pt-2 border-t" style="border-color:${C.border};">
              <span class="text-xs" style="color:${C.textMuted};">Live data</span>
              <button data-download-report="${r.key}" ${busy ? "disabled" : ""} class="flex items-center gap-1.5 text-xs font-semibold disabled:opacity-50" style="color:${C.orange};">
                ${icon("download", { size: 14 })} ${busy ? "Generating…" : "Download"}
              </button>
            </div>
          </div>
        `;
        }).join("")}
      </div>

      <div>
        <h2 class="text-sm font-bold mb-3" style="color:${C.text};">Report History</h2>
        <div class="rounded-2xl border overflow-hidden" style="background:${C.surface};border:1.5px solid ${C.border};">
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr style="background:${C.bg};">
                  ${["Report Name", "Generated By", "Generated Date", "Format", "Filters Used", ""].map((h) => `
                    <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap" style="color:${C.textMuted};font-family:var(--font-mono);">${h}</th>
                  `).join("")}
                </tr>
              </thead>
              <tbody>
                ${loadingHistory ? `
                  <tr><td colspan="6" class="px-4 py-10 text-center text-xs" style="color:${C.textMuted};">Loading…</td></tr>
                ` : historyRows.length === 0 ? `
                  <tr><td colspan="6" class="px-4 py-10 text-center text-xs" style="color:${C.textMuted};">No reports generated yet.</td></tr>
                ` : historyRows.map((h) => `
                  <tr class="border-t hover:bg-gray-50" style="border-color:${C.border};">
                    <td class="px-4 py-3 font-semibold text-sm" style="color:${C.text};">${escapeHtml(h.reportName)}</td>
                    <td class="px-4 py-3 text-xs" style="color:${C.textMuted};">${escapeHtml(h.generatedBy)}</td>
                    <td class="px-4 py-3 text-xs whitespace-nowrap" style="color:${C.textMuted};">${escapeHtml(h.generatedOn)}</td>
                    <td class="px-4 py-3">
                      <span class="text-xs px-2 py-0.5 rounded-full font-semibold" style="background:${h.format === "PDF" ? "#FEE2E2" : C.blueLight};color:${h.format === "PDF" ? "#DC2626" : C.blue};font-family:var(--font-mono);">${escapeHtml(h.format)}</span>
                    </td>
                    <td class="px-4 py-3 text-xs max-w-xs" style="color:${C.textMuted};">${escapeHtml(h.filtersUsed)}</td>
                    <td class="px-4 py-3">
                      <button data-redownload="${h.id}" class="flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap" style="color:${C.orange};">
                        ${icon("download", { size: 14 })} Download
                      </button>
                    </td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;

  wireReportsEvents(outletEl);
  hydrateIcons();
  wireImageFallbacks(outletEl);
}

function wireReportsEvents(outletEl) {
  qs("[data-generate-custom]", outletEl)?.addEventListener("click", () => openCustomReportModal(outletEl));

  qsa("[data-download-report]", outletEl).forEach((btn) => {
    btn.addEventListener("click", async () => {
      const key = btn.getAttribute("data-download-report");
      rp_reportBusy = key;
      rp_actionError = "";
      renderReportsWithData(outletEl);

      const result = await api.getSbpReport(key);
      rp_reportBusy = null;

      if (!result || !result.success) {
        rp_actionError = (result && result.message) || "Couldn't generate this report. Please try again.";
        renderReportsWithData(outletEl);
        return;
      }

      exportReport(result.report);
      api.getSbpReportHistory().then((histResult) => {
        rp_history = (histResult && histResult.history) || [];
        renderReportsWithData(outletEl);
      });
    });
  });

  qsa("[data-redownload]", outletEl).forEach((btn) => {
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      const result = await api.regenerateSbpReport(btn.getAttribute("data-redownload"));
      btn.disabled = false;
      if (!result || !result.success) {
        rp_actionError = (result && result.message) || "Couldn't re-download this report. Please try again.";
        renderReportsWithData(outletEl);
        return;
      }
      exportReport(result.report);
    });
  });
}

// ── Generate Custom Report modal ─────────────────────────────────────────────
function openCustomReportModal(outletEl) {
  openModal((overlay, close) => {
    // openModal()'s own `close` only tears down the DOM (utils.js) - it doesn't know about the
    // Esc/backdrop-click listeners this modal adds below, so every close path (X, Cancel, Esc,
    // backdrop click, successful generate) must route through this wrapper instead of `close`
    // directly, or the document-level keydown listener would leak and stack up across repeated
    // open/close cycles. Scoped locally to this modal (not added to the shared openModal() in
    // utils.js) so no other modal in the app is affected.
    function closeModal() {
      document.removeEventListener("keydown", handleKeydown);
      overlay.removeEventListener("click", handleOverlayClick);
      close();
    }
    function handleKeydown(e) {
      if (e.key === "Escape") closeModal();
    }
    // overlay is the fixed, full-viewport backdrop (see utils.js's openModal/app.css's
    // .modal-overlay) - only a click that lands directly on it (not one that bubbled up from the
    // modal panel/its form fields) should close, hence the target === overlay check.
    function handleOverlayClick(e) {
      if (e.target === overlay) closeModal();
    }
    // Attached once here (overlay itself is never replaced - only overlay.innerHTML is, on every
    // renderInner() call below) rather than inside renderInner(), so re-renders (format change,
    // validation error, section toggle) never attach a second copy of either listener.
    document.addEventListener("keydown", handleKeydown);
    overlay.addEventListener("click", handleOverlayClick);

    let form = {
      dateFrom: "", dateTo: "", bank: "", province: "", city: "", business: "", scheme: "",
      status: "", amountMin: "", amountMax: "", format: "PDF",
      sections: CUSTOM_REPORT_SECTIONS.map((s) => s.key),
    };
    let saveError = "";
    let generating = false;

    function textFieldHtml(key, label, type = "text") {
      return `
        <div>
          <label class="block text-sm font-medium mb-1.5" style="color:${C.text};">${label}</label>
          <input data-cf="${key}" type="${type}" value="${escapeHtml(form[key])}"
            class="w-full rounded-xl border text-sm outline-none" style="padding:10px 12px;border:1.5px solid ${C.border};background:${C.surface};color:${C.text};" />
        </div>
      `;
    }

    function renderInner() {
      overlay.innerHTML = `
        <div class="w-full max-w-2xl overflow-y-auto rounded-2xl border" style="background:${C.surface};border:1.5px solid ${C.border};max-height:85vh;">
          <div class="flex items-start justify-between p-5 border-b" style="border-color:${C.border};">
            <h3 class="text-sm font-bold" style="color:${C.text};">Generate Custom Report</h3>
            <button data-close class="p-1 rounded-lg hover:bg-gray-100" style="color:${C.textMuted};">${icon("x", { size: 16 })}</button>
          </div>
          <div class="p-5 space-y-4">
            ${saveError ? `
              <div class="rounded-xl p-3 flex gap-2.5" style="background:#FEE2E2;border:1.5px solid #DC2626;">
                ${icon("x-circle", { size: 16, color: "#DC2626", style: "margin-top:2px;" })}
                <p class="text-xs leading-relaxed" style="color:#DC2626;">${escapeHtml(saveError)}</p>
              </div>` : ""}

            <div class="grid grid-cols-2 gap-3">
              ${textFieldHtml("dateFrom", "Date From", "date")}
              ${textFieldHtml("dateTo", "Date To", "date")}
            </div>
            <div class="grid grid-cols-2 gap-3">
              ${textFieldHtml("bank", "Bank")}
              ${textFieldHtml("scheme", "Scheme")}
            </div>
            <div class="grid grid-cols-2 gap-3">
              ${textFieldHtml("province", "Province")}
              ${textFieldHtml("city", "City")}
            </div>
            ${textFieldHtml("business", "Business Name")}
            <div class="grid grid-cols-2 gap-3">
              ${textFieldHtml("amountMin", "Amount Min (PKR)", "number")}
              ${textFieldHtml("amountMax", "Amount Max (PKR)", "number")}
            </div>
            <div>
              <label class="block text-sm font-medium mb-1.5" style="color:${C.text};">Application Status</label>
              <div class="relative">
                <select data-cf="status" class="w-full rounded-xl border text-sm outline-none appearance-none" style="padding:10px 36px 10px 12px;border:1.5px solid ${C.border};background:${C.surface};color:${C.text};">
                  <option value="">-- Any Status --</option>
                  ${CUSTOM_REPORT_STATUSES.map((s) => `<option value="${s}" ${form.status === s ? "selected" : ""}>${escapeHtml(s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()))}</option>`).join("")}
                </select>
                ${icon("chevron-down", { size: 16, color: C.textMuted, className: "absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" })}
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium mb-2" style="color:${C.text};">Sections to Include</label>
              <div class="grid grid-cols-2 gap-2">
                ${CUSTOM_REPORT_SECTIONS.map((s) => `
                  <label class="flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-xs" style="border:1.5px solid ${C.border};color:${C.text};">
                    <input data-cf-section="${s.key}" type="checkbox" class="rounded" ${form.sections.includes(s.key) ? "checked" : ""} />
                    ${s.label}
                  </label>
                `).join("")}
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium mb-2" style="color:${C.text};">Format</label>
              <div class="flex gap-2">
                ${["PDF", "Excel"].map((f) => `
                  <label class="flex-1 flex items-center justify-center gap-2 p-2.5 rounded-xl border cursor-pointer text-sm font-semibold"
                    style="border:1.5px solid ${form.format === f ? C.orange : C.border};color:${form.format === f ? C.orange : C.text};background:${form.format === f ? C.orangeLight : "transparent"};">
                    <input data-cf-format="${f}" type="radio" name="cf-format" class="hidden" ${form.format === f ? "checked" : ""} /> ${f === "PDF" ? "PDF" : "Excel (.xlsx)"}
                  </label>
                `).join("")}
              </div>
            </div>
          </div>
          <div class="flex gap-3 p-5 border-t" style="border-color:${C.border};">
            <button data-close class="flex-1 py-2.5 rounded-xl text-sm font-semibold border" style="border:1.5px solid ${C.border};color:${C.text};">Cancel</button>
            <button data-generate ${generating ? "disabled" : ""} class="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50" style="background:${C.orange};">${generating ? "Generating…" : "Generate Report"}</button>
          </div>
        </div>
      `;

      qsa("[data-close]", overlay).forEach((b) => b.addEventListener("click", closeModal));
      qsa("input[data-cf], select[data-cf]", overlay).forEach((el) => {
        const evt = el.tagName === "SELECT" ? "change" : "input";
        el.addEventListener(evt, (e) => { form[el.getAttribute("data-cf")] = e.target.value; });
      });
      qsa("[data-cf-section]", overlay).forEach((el) => {
        el.addEventListener("change", (e) => {
          const key = el.getAttribute("data-cf-section");
          if (e.target.checked) {
            if (!form.sections.includes(key)) form.sections.push(key);
          } else {
            form.sections = form.sections.filter((s) => s !== key);
          }
        });
      });
      qsa("[data-cf-format]", overlay).forEach((el) => {
        el.addEventListener("change", () => { form.format = el.getAttribute("data-cf-format"); renderInner(); });
      });

      qs("[data-generate]", overlay)?.addEventListener("click", async () => {
        if (generating) return;
        generating = true;
        saveError = "";
        renderInner();

        const payload = {
          dateFrom: form.dateFrom || null,
          dateTo: form.dateTo || null,
          bank: form.bank || null,
          province: form.province || null,
          city: form.city || null,
          business: form.business || null,
          scheme: form.scheme || null,
          status: form.status || null,
          amountMin: form.amountMin === "" ? null : Number(form.amountMin),
          amountMax: form.amountMax === "" ? null : Number(form.amountMax),
          sections: form.sections,
          format: form.format,
        };

        const result = await api.generateSbpCustomReport(payload);
        generating = false;

        if (!result || !result.success) {
          saveError = (result && result.message) || "Couldn't generate this report. Please try again.";
          renderInner();
          hydrateIcons();
          return;
        }

        closeModal();
        exportReport(result.report);
        api.getSbpReportHistory().then((histResult) => {
          rp_history = (histResult && histResult.history) || [];
          renderReportsWithData(outletEl);
        });
      });

      hydrateIcons();
    }

    renderInner();
  });
}

// ── Report export (generic - reused by every report type, fixed and custom alike) ───────────
function reportFileNameStem(reportData) {
  const stamp = new Date().toISOString().slice(0, 10);
  return `sbp-${reportData.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${stamp}`;
}

function exportReport(reportData) {
  if ((reportData.format || "PDF").toLowerCase() === "excel") exportReportXlsx(reportData);
  else exportReportPdf(reportData);
}

function exportReportXlsx(reportData) {
  const wb = window.XLSX.utils.book_new();

  const summaryAoa = [
    [reportData.title],
    [`Generated: ${reportData.generatedOn} by ${reportData.generatedBy}`],
    ...(reportData.filtersApplied && reportData.filtersApplied.length ? [[], ["Filters Applied"], ...reportData.filtersApplied.map((f) => [f])] : []),
    [],
    ["Metric", "Value"],
    ...reportData.metrics.map((m) => [m.label, m.value]),
  ];
  const summarySheet = window.XLSX.utils.aoa_to_sheet(summaryAoa);
  summarySheet["!cols"] = [{ wch: 32 }, { wch: 22 }];
  window.XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");

  (reportData.sections || []).forEach((section) => {
    const aoa = [section.columns, ...section.rows];
    const sheet = window.XLSX.utils.aoa_to_sheet(aoa);
    sheet["!cols"] = section.columns.map(() => ({ wch: 22 }));
    window.XLSX.utils.book_append_sheet(wb, sheet, section.title.length > 31 ? section.title.slice(0, 31) : section.title);
  });

  window.XLSX.writeFile(wb, `${reportFileNameStem(reportData)}.xlsx`);
}

function pdfTruncate(s, n) {
  const str = String(s ?? "");
  return str.length > n ? `${str.slice(0, n - 1)}…` : str;
}

function exportReportPdf(reportData) {
  const doc = new window.jspdf.jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;

  doc.setFillColor(234, 88, 12);
  doc.rect(0, 0, pageWidth, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("SBP Admin Reports", marginX, 17);

  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(reportData.title, marginX, 42);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated ${reportData.generatedOn} by ${reportData.generatedBy}`, marginX, 49);

  let y = 58;
  if (reportData.filtersApplied && reportData.filtersApplied.length) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.text(`Filters: ${reportData.filtersApplied.join(", ")}`, marginX, y);
    y += 8;
  }

  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(20, 20, 20);
  doc.text("Summary", marginX, y);
  y += 8;

  reportData.metrics.forEach(({ label, value }, i) => {
    if (y > pageHeight - 20) {
      doc.addPage();
      y = 20;
    }
    if (i % 2 === 0) {
      doc.setFillColor(247, 248, 250);
      doc.rect(marginX, y - 6, pageWidth - marginX * 2, 10, "F");
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text(label, marginX + 4, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(20, 20, 20);
    doc.text(String(value), marginX + 100, y);
    y += 10;
  });

  (reportData.sections || []).forEach((section) => {
    y += 10;
    if (y > pageHeight - 40) {
      doc.addPage();
      y = 20;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(20, 20, 20);
    doc.text(section.title, marginX, y);
    y += 8;

    const colCount = section.columns.length;
    const colWidth = (pageWidth - marginX * 2) / colCount;
    const colX = section.columns.map((_, i) => marginX + 2 + i * colWidth);

    doc.setFillColor(234, 88, 12);
    doc.rect(marginX, y - 6, pageWidth - marginX * 2, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    section.columns.forEach((c, i) => doc.text(pdfTruncate(c, 20), colX[i], y));
    y += 10;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    if (section.rows.length === 0) {
      doc.setTextColor(120, 120, 120);
      doc.text("No data.", marginX + 2, y);
      y += 8;
    }
    section.rows.forEach((row, i) => {
      if (y > pageHeight - 20) {
        doc.addPage();
        y = 20;
      }
      if (i % 2 === 0) {
        doc.setFillColor(247, 248, 250);
        doc.rect(marginX, y - 6, pageWidth - marginX * 2, 8, "F");
      }
      doc.setTextColor(20, 20, 20);
      row.forEach((cell, ci) => doc.text(pdfTruncate(cell, 22), colX[ci], y));
      y += 8;
    });
  });

  doc.save(`${reportFileNameStem(reportData)}.pdf`);
}

// ── Audit Trail ──────────────────────────────────────────────────────────────
// SBP Admin Portal sync. Previously 8 hardcoded fake log rows with dead Filter/Export buttons
// and a dead eye icon. Now real Models/AuditLog.cs rows (Controllers/SbpApplicationController.cs's
// audit-logs endpoint, via Services/AuditService.cs) - every real login/registration/logout event
// already logged throughout AccountController.cs, plus this session's own admin actions (Bank
// Management, User Management, Reports, Profile updates), all now audited too. "Module"/"Status"
// are honest derivations of the real, stored Action string (see AuditService.cs's own comment) -
// never a fabricated field. Same fetch-once-filter/search-client-side convention as every other
// real SBP Admin page.
let at_logs = null;
let at_search = "";
let at_filters = { dateFrom: "", dateTo: "", user: "", role: "", activity: "", module: "", status: "" };
let at_exportMenuOpen = false;

// Shared by every modal this page opens (Filter popup, Log Detail) - wires Esc/backdrop-click/
// duplicate-listener-safe close on top of utils.js's openModal(), which only ever wires an
// explicit [data-close] click by itself. Kept local to this file rather than changing the shared
// openModal() utility, so no other modal anywhere else in the app is affected.
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

const AUDIT_STATUS_BADGE = {
  Success: { color: C.green, bg: C.greenLight },
  Failed: { color: "#DC2626", bg: "#FEE2E2" },
};

function renderAuditTrail(outletEl) {
  renderAuditTrailWithData(outletEl);
  api.getSbpAuditLogs().then((result) => {
    at_logs = (result && result.logs) || [];
    renderAuditTrailWithData(outletEl);
  });
}

function matchesAuditFilters(log) {
  const f = at_filters;
  if (f.dateFrom && log.timestamp.slice(0, 10) < f.dateFrom) return false;
  if (f.dateTo && log.timestamp.slice(0, 10) > f.dateTo) return false;
  if (f.user && log.user !== f.user) return false;
  if (f.role && log.userRole !== f.role) return false;
  if (f.activity && log.activity !== f.activity) return false;
  if (f.module && log.module !== f.module) return false;
  if (f.status && log.status !== f.status) return false;
  if (!matchesSearch(at_search, log.user, log.activity, log.module, log.ipAddress)) return false;
  return true;
}

function auditOptionsFrom(logs, key) {
  return Array.from(new Set(logs.map((l) => l[key]))).sort();
}

function renderAuditTrailWithData(outletEl) {
  const loading = at_logs === null;
  const all = loading ? [] : at_logs;
  const filtered = all.filter(matchesAuditFilters);
  const activeFilterCount = Object.values(at_filters).filter((v) => v).length;

  outletEl.innerHTML = `
    <div class="px-6 py-6">
      <div class="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 class="text-xl font-bold" style="color:${C.text};">Audit Trail</h1>
          <p class="text-sm mt-0.5" style="color:${C.textMuted};">Immutable system activity log — all actions tracked</p>
        </div>
        <div class="flex flex-wrap gap-2 items-center">
          <div class="relative">
            <span class="absolute left-3 top-1/2 -translate-y-1/2">${icon("search", { size: 14, color: C.textMuted })}</span>
            <input data-audit-search value="${escapeHtml(at_search)}" placeholder="Search user, activity, module, IP..."
              class="w-56 rounded-xl border text-xs outline-none" style="padding:8px 12px 8px 30px;border:1.5px solid ${C.border};background:${C.surface};color:${C.text};" />
          </div>
          <button data-open-filter class="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border" style="border:1.5px solid ${C.border};color:${C.text};">
            ${icon("filter", { size: 14 })} Filter${activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
          </button>
          <div class="relative">
            <button data-export-toggle ${loading ? "disabled" : ""} class="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border disabled:opacity-50" style="border:1.5px solid ${C.border};color:${C.text};">
              ${icon("download", { size: 14 })} Export
            </button>
            ${at_exportMenuOpen ? `
              <div class="absolute top-full right-0 mt-1 w-44 rounded-xl border shadow-lg z-20 overflow-hidden" style="background:${C.surface};border:1.5px solid ${C.border};">
                <button data-export-format="csv" class="w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-gray-50" style="color:${C.text};">Export as CSV</button>
                <button data-export-format="xlsx" class="w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-gray-50 border-t" style="color:${C.text};border-color:${C.border};">Export as Excel (.xlsx)</button>
                <button data-export-format="pdf" class="w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-gray-50 border-t" style="color:${C.text};border-color:${C.border};">Export as PDF</button>
              </div>
            ` : ""}
          </div>
        </div>
      </div>

      <div class="rounded-2xl border overflow-hidden" style="background:${C.surface};border:1.5px solid ${C.border};">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr style="background:${C.bg};">
                ${["Timestamp", "User", "Activity", "IP Address", "Status", ""].map((h) => `
                  <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style="color:${C.textMuted};font-family:var(--font-mono);">${h}</th>
                `).join("")}
              </tr>
            </thead>
            <tbody>
              ${loading ? `
                <tr><td colspan="6" class="px-4 py-10 text-center text-xs" style="color:${C.textMuted};">Loading…</td></tr>
              ` : filtered.length === 0 ? `
                <tr><td colspan="6" class="px-4 py-10 text-center text-xs" style="color:${C.textMuted};">${all.length === 0 ? "No audit logs on file yet." : "No logs match your search/filters."}</td></tr>
              ` : filtered.map((log) => {
                const badge = AUDIT_STATUS_BADGE[log.status] || AUDIT_STATUS_BADGE.Success;
                return `
                <tr class="border-t hover:bg-gray-50" style="border-color:${C.border};">
                  <td class="px-4 py-3 text-xs whitespace-nowrap" style="color:${C.textMuted};font-family:var(--font-mono);">${escapeHtml(log.timestamp)}</td>
                  <td class="px-4 py-3 text-xs font-semibold" style="color:${C.text};">${escapeHtml(log.user)}</td>
                  <td class="px-4 py-3 text-xs max-w-xs" style="color:${C.textMuted};">${escapeHtml(log.activity)}</td>
                  <td class="px-4 py-3 text-xs" style="color:${C.textMuted};font-family:var(--font-mono);">${escapeHtml(log.ipAddress)}</td>
                  <td class="px-4 py-3">
                    <span class="text-xs px-2.5 py-0.5 rounded-full font-semibold" style="background:${badge.bg};color:${badge.color};">${escapeHtml(log.status)}</span>
                  </td>
                  <td class="px-4 py-3">
                    <button data-view-audit="${log.id}" class="p-1 rounded hover:bg-gray-100" style="color:${C.textMuted};" title="View Details">
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
      ${!loading ? `
        <p class="text-xs mt-3" style="color:${C.textMuted};">Showing ${filtered.length} of ${all.length} log${all.length === 1 ? "" : "s"}</p>
      ` : ""}
    </div>
  `;

  wireAuditTrailEvents(outletEl);
  hydrateIcons();
  wireImageFallbacks(outletEl);
}

function wireAuditTrailEvents(outletEl) {
  const searchInput = qs("[data-audit-search]", outletEl);
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      const caret = e.target.selectionStart;
      at_search = e.target.value;
      renderAuditTrailWithData(outletEl);
      const newInput = qs("[data-audit-search]", outletEl);
      if (newInput) { newInput.focus(); newInput.setSelectionRange(caret, caret); }
    });
  }

  qs("[data-open-filter]", outletEl)?.addEventListener("click", () => openAuditFilterModal(outletEl));

  const exportToggle = qs("[data-export-toggle]", outletEl);
  if (exportToggle) {
    exportToggle.addEventListener("click", () => {
      if (at_logs === null) return;
      at_exportMenuOpen = !at_exportMenuOpen;
      renderAuditTrailWithData(outletEl);
    });
  }
  qsa("[data-export-format]", outletEl).forEach((btn) => {
    btn.addEventListener("click", () => {
      const format = btn.getAttribute("data-export-format");
      at_exportMenuOpen = false;
      const rows = (at_logs || []).filter(matchesAuditFilters);
      if (format === "csv") exportAuditCsv(rows);
      else if (format === "xlsx") exportAuditXlsx(rows);
      else exportAuditPdf(rows);
      renderAuditTrailWithData(outletEl);
    });
  });

  qsa("[data-view-audit]", outletEl).forEach((btn) => {
    btn.addEventListener("click", () => {
      const log = (at_logs || []).find((l) => l.id === btn.getAttribute("data-view-audit"));
      if (log) openAuditDetailModal(log);
    });
  });
}

function auditFieldRow(label, value) {
  return `
    <div class="flex items-start justify-between gap-4 py-2 border-b last:border-0" style="border-color:${C.border};">
      <span class="text-xs w-36 flex-shrink-0" style="color:${C.textMuted};">${escapeHtml(label)}</span>
      <span class="text-sm font-semibold text-right break-all" style="color:${C.text};">${escapeHtml(value ?? "—")}</span>
    </div>
  `;
}

function openAuditDetailModal(log) {
  openModal((overlay, close) => {
    const closeModal = wireModalDismissal(overlay, close);

    overlay.innerHTML = `
      <div class="w-full max-w-lg overflow-y-auto rounded-2xl border" style="background:${C.surface};border:1.5px solid ${C.border};max-height:85vh;">
        <div class="flex items-start justify-between p-5 border-b" style="border-color:${C.border};">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style="background:${C.orangeLight};">${icon("eye", { size: 18, color: C.orange })}</div>
            <h3 class="text-sm font-bold" style="color:${C.text};">Audit Log Details</h3>
          </div>
          <button data-close class="p-1 rounded-lg hover:bg-gray-100" style="color:${C.textMuted};">${icon("x", { size: 16 })}</button>
        </div>
        <div class="p-5">
          ${auditFieldRow("Timestamp", log.timestamp)}
          ${auditFieldRow("User", log.user)}
          ${auditFieldRow("User Role", log.userRole)}
          ${auditFieldRow("Activity", log.activity)}
          ${auditFieldRow("Module / Page", log.module)}
          ${auditFieldRow("IP Address", log.ipAddress)}
          ${auditFieldRow("Browser / Device", log.browser)}
          ${auditFieldRow("Status", log.status)}
          ${auditFieldRow("Action Code (metadata)", log.rawAction)}
        </div>
        <div class="flex gap-3 p-5 border-t" style="border-color:${C.border};">
          <button data-close class="flex-1 py-2.5 rounded-xl text-sm font-semibold border" style="border:1.5px solid ${C.border};color:${C.text};">Close</button>
        </div>
      </div>
    `;
    qsa("[data-close]", overlay).forEach((b) => b.addEventListener("click", closeModal));
    hydrateIcons();
  });
}

function openAuditFilterModal(outletEl) {
  openModal((overlay, close) => {
    const closeModal = wireModalDismissal(overlay, close);
    let form = { ...at_filters };
    const logs = at_logs || [];
    const userOptions = auditOptionsFrom(logs, "user");
    const roleOptions = auditOptionsFrom(logs, "userRole");
    const activityOptions = auditOptionsFrom(logs, "activity");
    const moduleOptions = auditOptionsFrom(logs, "module");

    function selectFieldHtml(key, label, options, allLabel) {
      return `
        <div>
          <label class="block text-sm font-medium mb-1.5" style="color:${C.text};">${label}</label>
          <div class="relative">
            <select data-af="${key}" class="w-full rounded-xl border text-sm outline-none appearance-none" style="padding:10px 36px 10px 12px;border:1.5px solid ${C.border};background:${C.surface};color:${C.text};">
              <option value="" ${form[key] === "" ? "selected" : ""}>${allLabel}</option>
              ${options.map((o) => `<option value="${escapeHtml(o)}" ${form[key] === o ? "selected" : ""}>${escapeHtml(o)}</option>`).join("")}
            </select>
            ${icon("chevron-down", { size: 16, color: C.textMuted, className: "absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" })}
          </div>
        </div>
      `;
    }

    function renderInner() {
      overlay.innerHTML = `
        <div class="w-full max-w-lg overflow-y-auto rounded-2xl border" style="background:${C.surface};border:1.5px solid ${C.border};max-height:85vh;">
          <div class="flex items-start justify-between p-5 border-b" style="border-color:${C.border};">
            <h3 class="text-sm font-bold" style="color:${C.text};">Filter Audit Logs</h3>
            <button data-close class="p-1 rounded-lg hover:bg-gray-100" style="color:${C.textMuted};">${icon("x", { size: 16 })}</button>
          </div>
          <div class="p-5 space-y-4">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm font-medium mb-1.5" style="color:${C.text};">Date From</label>
                <input data-af="dateFrom" type="date" value="${form.dateFrom}" class="w-full rounded-xl border text-sm outline-none" style="padding:10px 12px;border:1.5px solid ${C.border};background:${C.surface};color:${C.text};" />
              </div>
              <div>
                <label class="block text-sm font-medium mb-1.5" style="color:${C.text};">Date To</label>
                <input data-af="dateTo" type="date" value="${form.dateTo}" class="w-full rounded-xl border text-sm outline-none" style="padding:10px 12px;border:1.5px solid ${C.border};background:${C.surface};color:${C.text};" />
              </div>
            </div>
            ${selectFieldHtml("user", "User", userOptions, "-- All Users --")}
            ${selectFieldHtml("role", "User Role", roleOptions, "-- All Roles --")}
            ${selectFieldHtml("activity", "Activity Type", activityOptions, "-- All Activities --")}
            ${selectFieldHtml("module", "Module / Page", moduleOptions, "-- All Modules --")}
            ${selectFieldHtml("status", "Status", ["Success", "Failed"], "-- All Statuses --")}
          </div>
          <div class="flex gap-2 p-5 border-t flex-wrap" style="border-color:${C.border};">
            <button data-close class="flex-1 py-2.5 rounded-xl text-sm font-semibold border" style="border:1.5px solid ${C.border};color:${C.text};">Cancel</button>
            <button data-reset class="flex-1 py-2.5 rounded-xl text-sm font-semibold border" style="border:1.5px solid ${C.border};color:${C.text};">Reset Filters</button>
            <button data-apply class="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style="background:${C.orange};">Apply Filters</button>
          </div>
        </div>
      `;

      qsa("[data-close]", overlay).forEach((b) => b.addEventListener("click", closeModal));
      qsa("[data-af]", overlay).forEach((el) => {
        const evt = el.tagName === "SELECT" ? "change" : "input";
        el.addEventListener(evt, (e) => { form[el.getAttribute("data-af")] = e.target.value; });
      });
      qs("[data-reset]", overlay)?.addEventListener("click", () => {
        form = { dateFrom: "", dateTo: "", user: "", role: "", activity: "", module: "", status: "" };
        renderInner();
      });
      qs("[data-apply]", overlay)?.addEventListener("click", () => {
        at_filters = { ...form };
        closeModal();
        renderAuditTrailWithData(outletEl);
      });
      hydrateIcons();
    }

    renderInner();
  });
}

// ── Audit Trail export (CSV / Excel / PDF) ───────────────────────────────────
// Exports exactly the rows currently passed in - the caller (wireAuditTrailEvents above) already
// applies the active search/filter state before calling these, so "no filters" naturally exports
// everything and "some filters" naturally exports only what matched, satisfying this page's own
// requirement without a second, separate "export scope" concept.
function auditFileNameStem() {
  return `sbp-audit-trail-${new Date().toISOString().slice(0, 10)}`;
}

function exportAuditCsv(rows) {
  const headers = ["Timestamp", "User", "User Role", "Activity", "Module", "IP Address", "Browser", "Status"];
  const csvEscape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [headers.map(csvEscape).join(",")];
  rows.forEach((r) => {
    lines.push([r.timestamp, r.user, r.userRole, r.activity, r.module, r.ipAddress, r.browser, r.status].map(csvEscape).join(","));
  });

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${auditFileNameStem()}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function exportAuditXlsx(rows) {
  const wb = window.XLSX.utils.book_new();
  const aoa = [
    ["Timestamp", "User", "User Role", "Activity", "Module", "IP Address", "Browser", "Status"],
    ...rows.map((r) => [r.timestamp, r.user, r.userRole, r.activity, r.module, r.ipAddress, r.browser, r.status]),
  ];
  const sheet = window.XLSX.utils.aoa_to_sheet(aoa);
  sheet["!cols"] = [{ wch: 20 }, { wch: 20 }, { wch: 16 }, { wch: 26 }, { wch: 18 }, { wch: 16 }, { wch: 26 }, { wch: 10 }];
  window.XLSX.utils.book_append_sheet(wb, sheet, "Audit Trail");
  window.XLSX.writeFile(wb, `${auditFileNameStem()}.xlsx`);
}

function exportAuditPdf(rows) {
  const doc = new window.jspdf.jsPDF({ orientation: "landscape" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;

  doc.setFillColor(234, 88, 12);
  doc.rect(0, 0, pageWidth, 24, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("SBP Admin Audit Trail", marginX, 16);

  doc.setTextColor(100, 100, 100);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Generated ${new Date().toLocaleString()} — ${rows.length} record${rows.length === 1 ? "" : "s"}`, marginX, 32);

  const headers = ["Timestamp", "User", "Role", "Activity", "Module", "IP Address", "Browser", "Status"];
  const widths = [30, 32, 22, 46, 26, 24, 58, 18];
  const colX = [];
  let cursorX = marginX;
  widths.forEach((w) => { colX.push(cursorX); cursorX += w; });

  let y = 42;
  function drawHeaderRow() {
    doc.setFillColor(234, 88, 12);
    doc.rect(marginX, y - 6, pageWidth - marginX * 2, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    headers.forEach((h, i) => doc.text(h, colX[i], y));
    y += 9;
  }
  drawHeaderRow();

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  if (rows.length === 0) {
    doc.setTextColor(120, 120, 120);
    doc.text("No records match the current filters.", marginX + 2, y);
  }
  rows.forEach((r, i) => {
    if (y > pageHeight - 15) {
      doc.addPage();
      y = 20;
      drawHeaderRow();
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
    }
    if (i % 2 === 0) {
      doc.setFillColor(247, 248, 250);
      doc.rect(marginX, y - 5, pageWidth - marginX * 2, 7, "F");
    }
    doc.setTextColor(20, 20, 20);
    const vals = [r.timestamp, r.user, r.userRole, r.activity, r.module, r.ipAddress, r.browser, r.status];
    vals.forEach((v, ci) => doc.text(pdfTruncate(v, ci === 6 ? 38 : ci === 3 ? 30 : 18), colX[ci], y));
    y += 7;
  });

  doc.save(`${auditFileNameStem()}.pdf`);
}

// ── Applications view ────────────────────────────────────────────────────────
// SBP Admin Portal sync (Phase 2). Previously 5 hardcoded fake rows ("Green Logistics",
// "Fatima Textiles", ...) that existed nowhere in the real database. Now fetches the real,
// system-wide application list from Controllers/SbpApplicationController.cs's Applications
// action (via js/api.js's getSbpApplications()) - Services/SbpAdminService.cs's
// GetAllApplicationsAsync reuses BankApplicationService's own row mapping, so this is the exact
// same real rows (same case IDs, same real business/bank names) a Bank Officer already sees for
// their own bank, just unscoped across every bank.
const APPLICATION_STATUS_CFG = {
  under_review: { label: "Under Review", color: "#D97706", bg: "#FEF3C7" },
  offer_issued: { label: "Offer Issued", color: C.blue, bg: C.blueLight },
  approved: { label: "Approved", color: C.green, bg: C.greenLight },
  rejected: { label: "Rejected", color: "#DC2626", bg: "#FEE2E2" },
  disbursed: { label: "Disbursed", color: C.greenDark, bg: C.greenLight },
};

function renderApplications(outletEl) {
  renderApplicationsWithData(outletEl, null);
  api.getSbpApplications().then((result) => {
    renderApplicationsWithData(outletEl, (result && result.applications) || []);
  });
}

function renderApplicationsWithData(outletEl, applications) {
  const loading = applications === null;
  const rows = loading ? [] : applications;

  outletEl.innerHTML = `
    <div class="px-6 py-6">
      <h1 class="text-xl font-bold mb-1" style="color:${C.text};">All Applications</h1>
      <p class="text-sm mb-5" style="color:${C.textMuted};">System-wide view of all financing applications</p>

      <div class="rounded-2xl border overflow-hidden" style="background:${C.surface};border:1.5px solid ${C.border};">
        <table class="w-full text-sm">
          <thead>
            <tr style="background:${C.bg};">
              ${["Case ID", "Business", "Assigned Bank", "Scheme", "Amount", "Date", "Status"].map((h) => `
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style="color:${C.textMuted};font-family:var(--font-mono);">${h}</th>
              `).join("")}
            </tr>
          </thead>
          <tbody>
            ${loading ? `
              <tr><td colspan="7" class="px-4 py-10 text-center text-xs" style="color:${C.textMuted};">Loading…</td></tr>
            ` : rows.length === 0 ? `
              <tr><td colspan="7" class="px-4 py-10 text-center text-xs" style="color:${C.textMuted};">No applications on file yet.</td></tr>
            ` : rows.map((a) => {
              const s = APPLICATION_STATUS_CFG[a.status] ?? APPLICATION_STATUS_CFG.under_review;
              return `
                <tr class="border-t hover:bg-gray-50 cursor-pointer" style="border-color:${C.border};">
                  <td class="px-4 py-3 text-xs font-mono" style="color:${C.text};font-family:var(--font-mono);">${escapeHtml(a.caseId)}</td>
                  <td class="px-4 py-3 text-xs font-semibold" style="color:${C.text};">${escapeHtml(a.business)}</td>
                  <td class="px-4 py-3 text-xs" style="color:${C.textMuted};">${escapeHtml(a.businessBank)}</td>
                  <td class="px-4 py-3 text-xs" style="color:${C.textMuted};">${escapeHtml(a.scheme)}</td>
                  <td class="px-4 py-3 text-xs font-semibold" style="color:${C.text};font-family:var(--font-mono);">${escapeHtml(a.amount)}</td>
                  <td class="px-4 py-3 text-xs" style="color:${C.textMuted};">${escapeHtml(a.submitted)}</td>
                  <td class="px-4 py-3">
                    <span class="text-xs px-2.5 py-0.5 rounded-full font-semibold" style="background:${s.bg};color:${s.color};">${s.label}</span>
                  </td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;

  hydrateIcons();
  wireImageFallbacks(outletEl);
}

// ── Main export ──────────────────────────────────────────────────────────────
export function render(outletEl, activeKey) {
  // Dashboard, Applications, Users, Banks, Reports, and Audit Trail are all real/async (fetch
  // from the server) and render themselves.
  if (activeKey !== "applications" && activeKey !== "users" && activeKey !== "banks" &&
      activeKey !== "reports" && activeKey !== "audit") {
    renderDashboard(outletEl);
    return;
  }
  if (activeKey === "applications") {
    renderApplications(outletEl);
    return;
  }
  if (activeKey === "users") {
    renderUsers(outletEl);
    return;
  }
  if (activeKey === "banks") {
    renderBankManagement(outletEl);
    return;
  }
  if (activeKey === "reports") {
    renderReports(outletEl);
    return;
  }
  if (activeKey === "audit") {
    renderAuditTrail(outletEl);
    return;
  }
}
