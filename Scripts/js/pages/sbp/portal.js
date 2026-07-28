// 1:1 port of src/app/pages/sbp/SbpPortal.tsx
import { C } from "../../colors.js";
import { icon, hydrateIcons, wireImageFallbacks, qs, qsa } from "../../utils.js";

// Local UI state for UserManagement()'s tab toggle — kept module-level so it
// survives across re-renders (render() is called fresh on every activeKey change).
let userMgmtTab = "applicants";

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
function sbpDashboardHtml() {
  const METRICS = [
    { label: "Total Applications", value: "4,842", iconName: "file-text", color: C.blue, bg: C.blueLight, delta: "+318 this month" },
    { label: "Referred to Banks", value: "3,901", iconName: "arrow-up-right", color: C.green, bg: C.greenLight, delta: "80.6% referral rate" },
    { label: "Offers Issued", value: "2,614", iconName: "check-circle-2", color: "#D97706", bg: "#FEF3C7", delta: "67% offer rate" },
    { label: "Accepted Offers", value: "2,189", iconName: "trending-up", color: C.green, bg: C.greenLight, delta: "83.7% acceptance" },
    { label: "Disbursed", value: "1,847", iconName: "banknote", color: C.greenDark, bg: C.greenLight, delta: "PKR 340B total" },
    { label: "Conversion Rate", value: "38.1%", iconName: "bar-chart-2", color: C.orange, bg: C.orangeLight, delta: "+2.4% vs last yr" },
  ];

  const TOP_BANKS = [
    { name: "HBL", approved: 412, disbursed: 356, rate: "86%" },
    { name: "UBL", approved: 368, disbursed: 299, rate: "81%" },
    { name: "MCB", approved: 287, disbursed: 241, rate: "84%" },
    { name: "Meezan Bank", approved: 243, disbursed: 198, rate: "81%" },
    { name: "NBP", approved: 201, disbursed: 165, rate: "82%" },
  ];

  return `
    <div class="px-6 py-6" style="font-family:'Manrope', sans-serif;">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div class="flex items-center gap-2 mb-1">
            ${icon("sparkles", { size: 16, color: C.orange })}
            <span class="text-xs font-bold uppercase tracking-[0.15em]" style="color:${C.textMuted};font-family:var(--font-mono);">
              FY 2024–25 Cumulative
            </span>
          </div>
          <h1 class="text-2xl font-black leading-tight" style="color:${C.text};letter-spacing:-0.02em;">Executive Dashboard</h1>
        </div>
        <div class="flex gap-2">
          <select class="text-xs px-3 py-2 rounded-xl border outline-none font-medium" style="border:1.5px solid ${C.border};color:${C.text};background:${C.surface};">
            <option>All Banks</option>
            <option>HBL</option>
            <option>UBL</option>
            <option>MCB</option>
          </select>
          <button class="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all hover:bg-gray-50" style="border:1.5px solid ${C.border};color:${C.text};">
            ${icon("download", { size: 14 })} Export
          </button>
        </div>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        ${METRICS.map(({ label, value, iconName, color, delta }) => gradientCard(color, `
          <div class="p-4 rounded-2xl transition-all duration-200 hover:-translate-y-0.5">
            <div class="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style="background:${color}18;">
              ${icon(iconName, { size: 16, color })}
            </div>
            <div class="text-2xl font-black mb-0.5" style="color:${C.text};font-family:var(--font-mono);letter-spacing:-0.02em;">${value}</div>
            <div class="text-xs font-medium mb-1" style="color:${C.textMuted};">${label}</div>
            <div class="text-xs font-bold" style="color:${color};">${delta}</div>
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
            <span class="text-xs px-2.5 py-1 rounded-full font-bold" style="background:${C.orangeLight};color:${C.orange};font-family:var(--font-mono);">Top 5 Banks</span>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr style="background:${C.bg};">
                  ${["Bank", "Applications Reviewed", "Approved", "Disbursed", "Disbursement Rate", ""].map((h) => `
                    <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide" style="color:${C.textMuted};font-family:var(--font-mono);">${h}</th>
                  `).join("")}
                </tr>
              </thead>
              <tbody>
                ${TOP_BANKS.map((b) => `
                  <tr class="border-t hover:bg-gray-50 transition-colors" style="border-color:${C.border};">
                    <td class="px-4 py-3">
                      <div class="flex items-center gap-2">
                        <div class="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-white" style="background:${C.orange};">
                          ${b.name[0]}
                        </div>
                        <span class="text-sm font-bold" style="color:${C.text};">${b.name}</span>
                      </div>
                    </td>
                    <td class="px-4 py-3 text-sm" style="color:${C.text};font-family:var(--font-mono);">${b.approved + b.disbursed}</td>
                    <td class="px-4 py-3 text-sm font-bold" style="color:${C.green};font-family:var(--font-mono);">${b.approved}</td>
                    <td class="px-4 py-3 text-sm font-bold" style="color:${C.greenDark};font-family:var(--font-mono);">${b.disbursed}</td>
                    <td class="px-4 py-3">
                      <div class="flex items-center gap-2">
                        <div class="flex-1 h-1.5 rounded-full" style="background:${C.border};">
                          <div class="h-1.5 rounded-full" style="width:${b.rate};background:${C.green};"></div>
                        </div>
                        <span class="text-xs font-bold" style="color:${C.green};font-family:var(--font-mono);">${b.rate}</span>
                      </div>
                    </td>
                    <td class="px-4 py-3">
                      <button class="p-1.5 rounded-lg hover:bg-gray-100" style="color:${C.textMuted};">
                        ${icon("eye", { size: 14 })}
                      </button>
                    </td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        </div>
      `)}
    </div>
  `;
}

// ── Bank Management ──────────────────────────────────────────────────────────
function bankManagementHtml() {
  const BANKS = [
    { name: "Habib Bank Limited", code: "HBL", type: "Commercial", region: "Nationwide", active: true, joined: "Jan 2023" },
    { name: "United Bank Limited", code: "UBL", type: "Commercial", region: "Nationwide", active: true, joined: "Jan 2023" },
    { name: "MCB Bank Limited", code: "MCB", type: "Commercial", region: "Nationwide", active: true, joined: "Feb 2023" },
    { name: "Meezan Bank", code: "MEEZ", type: "Islamic", region: "Nationwide", active: true, joined: "Mar 2023" },
    { name: "Bank Alfalah", code: "BAFL", type: "Commercial", region: "Nationwide", active: true, joined: "Apr 2023" },
    { name: "Faysal Bank", code: "FABL", type: "Islamic", region: "Nationwide", active: false, joined: "Jun 2023" },
  ];

  return `
    <div class="px-6 py-6">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-xl font-bold" style="color:${C.text};">Bank Management</h1>
          <p class="text-sm mt-0.5" style="color:${C.textMuted};">Manage participating banks on the portal</p>
        </div>
        <button class="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white" style="background:${C.orange};">
          ${icon("plus-circle", { size: 16 })} Add Bank
        </button>
      </div>

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
            ${BANKS.map((bank) => `
              <tr class="border-t hover:bg-gray-50" style="border-color:${C.border};">
                <td class="px-4 py-3 font-semibold text-sm" style="color:${C.text};">${bank.name}</td>
                <td class="px-4 py-3 text-xs font-bold" style="color:${C.textMuted};font-family:var(--font-mono);">${bank.code}</td>
                <td class="px-4 py-3">
                  <span class="text-xs px-2 py-0.5 rounded-full font-semibold" style="background:${bank.type === "Islamic" ? C.orangeLight : C.blueLight};color:${bank.type === "Islamic" ? C.orange : C.blue};">${bank.type}</span>
                </td>
                <td class="px-4 py-3 text-xs" style="color:${C.textMuted};">${bank.region}</td>
                <td class="px-4 py-3">
                  <span class="text-xs px-2.5 py-0.5 rounded-full font-semibold" style="background:${bank.active ? C.greenLight : "#FEE2E2"};color:${bank.active ? C.green : "#DC2626"};">${bank.active ? "Active" : "Inactive"}</span>
                </td>
                <td class="px-4 py-3 text-xs" style="color:${C.textMuted};">${bank.joined}</td>
                <td class="px-4 py-3">
                  <div class="flex items-center gap-1">
                    <button class="p-1.5 rounded-lg hover:bg-gray-100" style="color:${C.textMuted};">
                      ${icon("edit-2", { size: 14 })}
                    </button>
                    <button class="p-1.5 rounded-lg hover:bg-gray-100" style="color:${bank.active ? "#DC2626" : C.green};">
                      ${bank.active ? icon("toggle-right", { size: 14 }) : icon("toggle-left", { size: 14 })}
                    </button>
                  </div>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ── User Management ──────────────────────────────────────────────────────────
function userManagementHtml() {
  const APPLICANTS = [
    { name: "Ahmed Khan", email: "ahmed@abctraders.com", businesses: 2, applications: 4, joined: "Mar 2025", status: "active" },
    { name: "Fatima Malik", email: "fatima@xyzfoods.pk", businesses: 1, applications: 2, joined: "Apr 2025", status: "active" },
    { name: "Usman Raza", email: "usman@greenfields.com", businesses: 3, applications: 6, joined: "May 2025", status: "suspended" },
    { name: "Ayesha Siddiqui", email: "ayesha@fashionhub.pk", businesses: 1, applications: 1, joined: "Jun 2025", status: "active" },
  ];

  const BANK_USERS = [
    { name: "Bilal Raza", email: "bilal.raza@hbl.com", bank: "HBL", role: "Credit Officer", status: "active" },
    { name: "Sana Iqbal", email: "sana.iqbal@ubl.com", bank: "UBL", role: "Branch Manager", status: "active" },
    { name: "Kamran Ali", email: "kamran.ali@mcb.com", bank: "MCB", role: "SME Relationship", status: "inactive" },
  ];

  const TABS = ["applicants", "bank_users"];

  return `
    <div class="px-6 py-6">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-xl font-bold" style="color:${C.text};">User Management</h1>
          <p class="text-sm mt-0.5" style="color:${C.textMuted};">Manage applicants, bank users, roles and permissions</p>
        </div>
        <button class="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white" style="background:${C.orange};">
          ${icon("plus-circle", { size: 16 })} Add User
        </button>
      </div>

      <div class="flex gap-1 mb-5 border-b" style="border-color:${C.border};">
        ${TABS.map((t) => `
          <button data-tab="${t}" class="px-4 py-2 text-sm font-medium transition-all border-b-2 -mb-px"
            style="border-color:${userMgmtTab === t ? C.orange : "transparent"};color:${userMgmtTab === t ? C.orange : C.textMuted};">
            ${t === "applicants" ? "SME Applicants" : "Bank Users"}
          </button>
        `).join("")}
      </div>

      ${userMgmtTab === "applicants" ? `
        <div class="rounded-2xl border overflow-hidden" style="background:${C.surface};border:1.5px solid ${C.border};">
          <table class="w-full text-sm">
            <thead>
              <tr style="background:${C.bg};">
                ${["Name", "Email", "Businesses", "Applications", "Joined", "Status", ""].map((h) => `
                  <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style="color:${C.textMuted};font-family:var(--font-mono);">${h}</th>
                `).join("")}
              </tr>
            </thead>
            <tbody>
              ${APPLICANTS.map((u) => `
                <tr class="border-t hover:bg-gray-50" style="border-color:${C.border};">
                  <td class="px-4 py-3 font-semibold text-sm" style="color:${C.text};">${u.name}</td>
                  <td class="px-4 py-3 text-xs" style="color:${C.textMuted};">${u.email}</td>
                  <td class="px-4 py-3 text-sm font-mono text-center" style="color:${C.text};">${u.businesses}</td>
                  <td class="px-4 py-3 text-sm font-mono text-center" style="color:${C.text};">${u.applications}</td>
                  <td class="px-4 py-3 text-xs" style="color:${C.textMuted};">${u.joined}</td>
                  <td class="px-4 py-3">
                    <span class="text-xs px-2.5 py-0.5 rounded-full font-semibold" style="background:${u.status === "active" ? C.greenLight : "#FEE2E2"};color:${u.status === "active" ? C.green : "#DC2626"};">${u.status === "active" ? "Active" : "Suspended"}</span>
                  </td>
                  <td class="px-4 py-3">
                    <button class="p-1 rounded hover:bg-gray-100" style="color:${C.textMuted};">
                      ${icon("eye", { size: 14 })}
                    </button>
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      ` : ""}

      ${userMgmtTab === "bank_users" ? `
        <div class="rounded-2xl border overflow-hidden" style="background:${C.surface};border:1.5px solid ${C.border};">
          <table class="w-full text-sm">
            <thead>
              <tr style="background:${C.bg};">
                ${["Name", "Email", "Bank", "Role", "Status", ""].map((h) => `
                  <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style="color:${C.textMuted};font-family:var(--font-mono);">${h}</th>
                `).join("")}
              </tr>
            </thead>
            <tbody>
              ${BANK_USERS.map((u) => `
                <tr class="border-t hover:bg-gray-50" style="border-color:${C.border};">
                  <td class="px-4 py-3 font-semibold text-sm" style="color:${C.text};">${u.name}</td>
                  <td class="px-4 py-3 text-xs" style="color:${C.textMuted};">${u.email}</td>
                  <td class="px-4 py-3 text-xs font-semibold" style="color:${C.blue};">${u.bank}</td>
                  <td class="px-4 py-3 text-xs" style="color:${C.textMuted};">${u.role}</td>
                  <td class="px-4 py-3">
                    <span class="text-xs px-2.5 py-0.5 rounded-full font-semibold" style="background:${u.status === "active" ? C.greenLight : "#FEE2E2"};color:${u.status === "active" ? C.green : "#DC2626"};">${u.status === "active" ? "Active" : "Inactive"}</span>
                  </td>
                  <td class="px-4 py-3">
                    <button class="p-1 rounded hover:bg-gray-100" style="color:${C.textMuted};">
                      ${icon("edit-2", { size: 14 })}
                    </button>
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      ` : ""}
    </div>
  `;
}

// ── Reports ──────────────────────────────────────────────────────────────────
function reportsHtml() {
  const REPORTS = [
    { name: "Application Status Report", desc: "Summary of all applications by status and bank", updated: "Jul 15, 2025", type: "PDF" },
    { name: "Turnaround Time Report", desc: "Processing time per bank and application stage", updated: "Jul 15, 2025", type: "Excel" },
    { name: "Assessment Report", desc: "Credit assessment outcomes and risk distribution", updated: "Jul 14, 2025", type: "PDF" },
    { name: "Decline Analysis Report", desc: "Reasons for rejection by sector and bank", updated: "Jul 14, 2025", type: "Excel" },
    { name: "Disbursement Summary Report", desc: "Total disbursements by bank, region and scheme", updated: "Jul 13, 2025", type: "PDF" },
    { name: "Geographic Spread Report", desc: "Application and disbursement distribution by province and city", updated: "Jul 12, 2025", type: "PDF" },
  ];

  return `
    <div class="px-6 py-6">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-xl font-bold" style="color:${C.text};">Reports</h1>
          <p class="text-sm mt-0.5" style="color:${C.textMuted};">Download and schedule system reports</p>
        </div>
        <button class="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white" style="background:${C.orange};">
          ${icon("bar-chart-2", { size: 16 })} Generate Custom Report
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        ${REPORTS.map((r) => `
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
              <span class="text-xs" style="color:${C.textMuted};">Updated ${r.updated}</span>
              <button class="flex items-center gap-1.5 text-xs font-semibold" style="color:${C.orange};">
                ${icon("download", { size: 14 })} Download
              </button>
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

// ── Audit Trail ──────────────────────────────────────────────────────────────
function auditTrailHtml() {
  const LOGS = [
    { user: "Bilal Raza (HBL)", action: "Application SBP-SME-2025-00142 opened for review", time: "Jul 16, 2025 09:15", ip: "192.168.1.12", type: "view" },
    { user: "System", action: "Credit bureau check initiated for SBP-SME-2025-00142", time: "Jul 16, 2025 09:46", ip: "10.0.0.1", type: "action" },
    { user: "Sana Iqbal (UBL)", action: "Conditional offer generated for SBP-SME-2025-00139", time: "Jul 15, 2025 14:30", ip: "192.168.2.5", type: "action" },
    { user: "Ahmed Khan", action: "Login — SME Applicant Portal", time: "Jul 15, 2025 11:02", ip: "203.129.45.12", type: "auth" },
    { user: "Dr. Amjad Hussain (SBP)", action: "Exported disbursement summary report", time: "Jul 15, 2025 10:30", ip: "10.0.1.5", type: "export" },
    { user: "System", action: "Bank deactivation: Faysal Bank — admin action", time: "Jul 14, 2025 16:00", ip: "10.0.0.1", type: "admin" },
    { user: "Fatima Malik", action: "New application submitted SBP-SME-2025-00201", time: "Jul 14, 2025 15:22", ip: "110.93.210.44", type: "submit" },
    { user: "Kamran Ali (MCB)", action: "Failed login attempt — account locked", time: "Jul 14, 2025 09:05", ip: "192.168.3.8", type: "error" },
  ];

  const TYPE_COLOR = {
    view: { color: C.blue, bg: C.blueLight },
    action: { color: C.green, bg: C.greenLight },
    auth: { color: C.textMuted, bg: "#F3F4F6" },
    export: { color: C.orange, bg: C.orangeLight },
    admin: { color: "#D97706", bg: "#FEF3C7" },
    submit: { color: C.green, bg: C.greenLight },
    error: { color: "#DC2626", bg: "#FEE2E2" },
  };

  return `
    <div class="px-6 py-6">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-xl font-bold" style="color:${C.text};">Audit Trail</h1>
          <p class="text-sm mt-0.5" style="color:${C.textMuted};">Immutable system activity log — all actions tracked</p>
        </div>
        <div class="flex gap-2">
          <button class="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border" style="border:1.5px solid ${C.border};color:${C.text};">
            ${icon("filter", { size: 14 })} Filter
          </button>
          <button class="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border" style="border:1.5px solid ${C.border};color:${C.text};">
            ${icon("download", { size: 14 })} Export
          </button>
        </div>
      </div>

      <div class="rounded-2xl border overflow-hidden" style="background:${C.surface};border:1.5px solid ${C.border};">
        <table class="w-full text-sm">
          <thead>
            <tr style="background:${C.bg};">
              ${["Timestamp", "User", "Activity", "IP Address", "Type", ""].map((h) => `
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style="color:${C.textMuted};font-family:var(--font-mono);">${h}</th>
              `).join("")}
            </tr>
          </thead>
          <tbody>
            ${LOGS.map((log) => {
              const tc = TYPE_COLOR[log.type] ?? TYPE_COLOR.view;
              return `
                <tr class="border-t hover:bg-gray-50" style="border-color:${C.border};">
                  <td class="px-4 py-3 text-xs" style="color:${C.textMuted};font-family:var(--font-mono);">${log.time}</td>
                  <td class="px-4 py-3 text-xs font-semibold" style="color:${C.text};">${log.user}</td>
                  <td class="px-4 py-3 text-xs max-w-xs" style="color:${C.textMuted};">${log.action}</td>
                  <td class="px-4 py-3 text-xs" style="color:${C.textMuted};font-family:var(--font-mono);">${log.ip}</td>
                  <td class="px-4 py-3">
                    <span class="text-xs px-2.5 py-0.5 rounded-full font-semibold capitalize" style="background:${tc.bg};color:${tc.color};">${log.type}</span>
                  </td>
                  <td class="px-4 py-3">
                    <button class="p-1 rounded hover:bg-gray-100" style="color:${C.textMuted};">
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
  `;
}

// ── Applications view ────────────────────────────────────────────────────────
function allApplicationsHtml() {
  const APPS = [
    { caseId: "SBP-SME-2025-00217", business: "Green Logistics", bank: "HBL", scheme: "SAAF", amount: "PKR 9M", status: "submitted", date: "Jul 16" },
    { caseId: "SBP-SME-2025-00201", business: "Fatima Textiles", bank: "UBL", scheme: "Refinance", amount: "PKR 14M", status: "under_review", date: "Jul 14" },
    { caseId: "SBP-SME-2025-00183", business: "XYZ Foods", bank: "—", scheme: "SAAF", amount: "PKR 5M", status: "pending", date: "Jul 10" },
    { caseId: "SBP-SME-2025-00142", business: "ABC Traders", bank: "HBL", scheme: "SAAF", amount: "PKR 8.5M", status: "under_review", date: "Jun 12" },
    { caseId: "SBP-SME-2025-00098", business: "XYZ Foods", bank: "MCB", scheme: "Refinance", amount: "PKR 15M", status: "approved", date: "May 28" },
  ];

  const S = {
    pending: { label: "New", color: C.textMuted, bg: "#F3F4F6" },
    submitted: { label: "Submitted", color: C.blue, bg: C.blueLight },
    under_review: { label: "Under Review", color: "#D97706", bg: "#FEF3C7" },
    approved: { label: "Approved", color: C.green, bg: C.greenLight },
  };

  return `
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
            ${APPS.map((a) => {
              const s = S[a.status] ?? S.pending;
              return `
                <tr class="border-t hover:bg-gray-50 cursor-pointer" style="border-color:${C.border};">
                  <td class="px-4 py-3 text-xs font-mono" style="color:${C.text};font-family:var(--font-mono);">${a.caseId}</td>
                  <td class="px-4 py-3 text-xs font-semibold" style="color:${C.text};">${a.business}</td>
                  <td class="px-4 py-3 text-xs" style="color:${C.textMuted};">${a.bank}</td>
                  <td class="px-4 py-3 text-xs" style="color:${C.textMuted};">${a.scheme}</td>
                  <td class="px-4 py-3 text-xs font-semibold" style="color:${C.text};font-family:var(--font-mono);">${a.amount}</td>
                  <td class="px-4 py-3 text-xs" style="color:${C.textMuted};">${a.date}</td>
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
}

// ── Main export ──────────────────────────────────────────────────────────────
export function render(outletEl, activeKey) {
  let html;
  switch (activeKey) {
    case "applications": html = allApplicationsHtml(); break;
    case "users": html = userManagementHtml(); break;
    case "banks": html = bankManagementHtml(); break;
    case "reports": html = reportsHtml(); break;
    case "audit": html = auditTrailHtml(); break;
    default: html = sbpDashboardHtml();
  }

  outletEl.innerHTML = html;

  if (activeKey === "users") {
    qsa("[data-tab]", outletEl).forEach((btn) => {
      btn.addEventListener("click", () => {
        userMgmtTab = btn.getAttribute("data-tab");
        render(outletEl, activeKey);
      });
    });
  }

  hydrateIcons();
  wireImageFallbacks(outletEl);
}
