// Application Details (Phase 8) - a genuinely new page (no "Application Details" component
// exists anywhere in this frontend or its original design), built entirely from the same
// visual primitives already used throughout the rest of this app: colors.js's C tokens,
// utils.js's icon()/escapeHtml()/hydrateIcons(), and the same "rounded-2xl border" card style
// used in dashboard.js/myApplications.js/newApplication.js. The STATUS_CONFIG map below is
// copied verbatim from dashboard.js/myApplications.js (same existing convention, not a new
// pattern) purely for the status badge's label/color - the actual status VALUE always comes
// from the server (see api.getApplicationDetail), never hardcoded here.
//
// Phase 9 replaces the Documents card's empty state with a real upload/view/replace/delete UI,
// reusing the exact same required-document checklist and drag-surface/list-row visual style
// already defined in js/pages/sme/newApplication.js's Documents step (imported from there, not
// duplicated) - now wired to a real per-application upload endpoint instead of a client-only
// file preview.
import { navigate } from "../../router.js";
import { icon, hydrateIcons, wireImageFallbacks, escapeHtml, qs, qsa } from "../../utils.js";
import { requiredDocLabels } from "./newApplication.js";
import * as api from "../../api.js";

const STATUS_CONFIG = {
  draft: { label: "Draft", color: "#6B7280", bg: "#F3F4F6" },
  submitted: { label: "Submitted", color: "#2563EB", bg: "#DBEAFE" },
  under_review: { label: "Under Review", color: "#D97706", bg: "#FEF3C7" },
  approved: { label: "Approved", color: "#16A34A", bg: "#DCFCE7" },
  rejected: { label: "Rejected", color: "#DC2626", bg: "#FEE2E2" },
  disbursed: { label: "Disbursed", color: "#15803D", bg: "#DCFCE7" },
};

// Matches Services/DocumentService.cs's DocumentStatus vocabulary exactly.
const DOC_STATUS_CONFIG = {
  pending_verification: { label: "Pending Verification", color: "#D97706", bg: "#FEF3C7" },
  verified: { label: "Verified", color: "#16A34A", bg: "#DCFCE7" },
  rejected: { label: "Rejected", color: "#DC2626", bg: "#FEE2E2" },
};

// Applications at/after these statuses are locked server-side too (Services/DocumentService.cs)
// - kept in sync here purely so the Replace/Delete buttons can be disabled up front instead of
// only failing after a round trip.
const DOCUMENT_LOCKED_STATUSES = ["under_review", "approved", "rejected", "disbursed"];

function statusBadge(status) {
  const cfg = STATUS_CONFIG[status] || { label: status || "Unknown", color: "#6B7280", bg: "#F3F4F6" };
  return `<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold" style="background:${cfg.bg};color:${cfg.color};">${escapeHtml(cfg.label)}</span>`;
}

function docStatusBadge(status) {
  const cfg = DOC_STATUS_CONFIG[status] || { label: status || "Unknown", color: "#6B7280", bg: "#F3F4F6" };
  return `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold" style="background:${cfg.bg};color:${cfg.color};">${escapeHtml(cfg.label)}</span>`;
}

function infoRow(label, value) {
  return `
    <div class="flex items-start justify-between gap-4 py-2 border-b last:border-0" style="border-color:var(--details-border,#E5E7EB);">
      <span class="text-xs" style="color:#6B7280;">${escapeHtml(label)}</span>
      <span class="text-sm font-semibold text-right" style="color:#111827;">${escapeHtml(value ?? "—")}</span>
    </div>
  `;
}

function cardHtml(title, iconName, innerHtml, extraHeader = "") {
  return `
    <div class="rounded-2xl border p-5" style="background:#fff;border:1.5px solid #E5E7EB;">
      <div class="flex items-center justify-between gap-2.5 mb-3">
        <div class="flex items-center gap-2.5">
          <div class="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style="background:#F0FDF4;">
            ${icon(iconName, { size: 14, color: "#16A34A" })}
          </div>
          <h2 class="text-sm font-bold" style="color:#111827;">${escapeHtml(title)}</h2>
        </div>
        ${extraHeader}
      </div>
      <div>${innerHtml}</div>
    </div>
  `;
}

export function render(container, params) {
  const applicationId = params && params.id;
  let loading = true;
  let notFound = false;
  let app = null;
  let documents = [];
  let docError = "";
  let uploadingType = null; // the DocumentType currently being uploaded/replaced, if any

  function loadingHtml() {
    return `<div class="px-6 py-10 text-center text-sm" style="color:#6B7280;">Loading application details…</div>`;
  }

  function notFoundHtml() {
    return `
      <div class="px-6 py-10 text-center">
        <p class="text-sm font-semibold mb-2" style="color:#111827;">Application not found</p>
        <p class="text-xs mb-5" style="color:#6B7280;">It may not exist, or it doesn't belong to your account.</p>
        <button data-back class="px-5 py-2.5 rounded-xl text-sm font-semibold text-white" style="background:#16A34A;">Back to My Applications</button>
      </div>
    `;
  }

  function documentRowHtml(label) {
    const doc = documents.find((d) => d.documentType === label);
    const isUploading = uploadingType === label;
    const locked = DOCUMENT_LOCKED_STATUSES.includes(app.status);

    return `
      <div class="flex items-center gap-3 p-3 rounded-xl border"
        style="border:1.5px solid ${doc ? "#16A34A40" : "#E5E7EB"};background:${doc ? "#F0FDF4" : "#fff"};">
        <div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style="background:${doc ? "#16A34A" : "#F3F4F6"};">
          ${doc ? icon("check-circle-2", { size: 16, color: "#fff" }) : icon("file-up", { size: 16, color: "#6B7280" })}
        </div>
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium" style="color:#111827;">${escapeHtml(label)}</div>
          <div class="text-xs truncate flex items-center gap-2 mt-0.5" style="color:#6B7280;">
            ${doc ? `${escapeHtml(doc.originalFileName)} · ${escapeHtml(doc.uploadedOn)}` : "Required · not uploaded yet"}
            ${doc ? docStatusBadge(doc.status) : ""}
          </div>
          ${doc && doc.remarks ? `<div class="text-xs mt-1" style="color:#DC2626;">${escapeHtml(doc.remarks)}</div>` : ""}
        </div>
        <div class="flex items-center gap-1.5 flex-shrink-0">
          ${doc ? `
            <a href="${api.applicationDocumentDownloadUrl(applicationId, doc.id)}" target="_blank" rel="noopener"
              title="Download / Preview" class="p-1.5 rounded-lg hover:bg-gray-100" style="color:#6B7280;">
              ${icon("download", { size: 14 })}
            </a>
          ` : ""}
          <label class="text-xs px-3 py-1.5 rounded-lg font-medium border transition-all flex-shrink-0"
            style="border:1.5px solid ${doc ? "#16A34A" : "#E5E7EB"};color:${doc ? "#16A34A" : "#6B7280"};background:#fff;${locked ? "opacity:0.4;pointer-events:none;" : "cursor:pointer;"}">
            <input type="file" class="hidden" accept=".pdf,.jpg,.jpeg,.png" data-doc-file="${escapeHtml(label)}" ${isUploading ? "disabled" : ""} />
            ${isUploading ? "Uploading…" : doc ? "Replace" : "Upload"}
          </label>
          ${doc && !locked ? `
            <button data-doc-delete="${doc.id}" title="Delete" class="p-1.5 rounded-lg hover:bg-gray-100" style="color:#DC2626;">
              ${icon("trash-2", { size: 14 })}
            </button>
          ` : ""}
        </div>
      </div>
    `;
  }

  function documentsCardHtml() {
    const required = requiredDocLabels(app.businessStatus);
    const uploadedCount = required.filter((label) => documents.some((d) => d.documentType === label)).length;
    const missingCount = required.length - uploadedCount;
    const anyRejected = documents.some((d) => d.status === "rejected");
    const allVerified = documents.length > 0 && documents.every((d) => d.status === "verified");
    const verificationLabel = anyRejected ? "Action Required" : missingCount > 0 ? "Incomplete" : allVerified ? "Verified" : "Pending Verification";

    const summary = `
      <div class="grid grid-cols-3 gap-2 mb-4">
        <div class="rounded-xl p-2.5 text-center" style="background:#F9FAFB;">
          <div class="text-lg font-black" style="color:#111827;">${required.length}</div>
          <div class="text-[10px] font-medium" style="color:#6B7280;">Required</div>
        </div>
        <div class="rounded-xl p-2.5 text-center" style="background:#F0FDF4;">
          <div class="text-lg font-black" style="color:#16A34A;">${uploadedCount}</div>
          <div class="text-[10px] font-medium" style="color:#6B7280;">Uploaded</div>
        </div>
        <div class="rounded-xl p-2.5 text-center" style="background:${missingCount > 0 ? "#FEF3C7" : "#F9FAFB"};">
          <div class="text-lg font-black" style="color:${missingCount > 0 ? "#D97706" : "#111827"};">${missingCount}</div>
          <div class="text-[10px] font-medium" style="color:#6B7280;">Missing</div>
        </div>
      </div>
    `;

    const errorBanner = docError ? `
      <div class="rounded-xl p-3 flex gap-2.5 mb-3" style="background:#FEE2E2;border:1.5px solid #DC2626;">
        ${icon("x-circle", { size: 16, color: "#DC2626", style: "margin-top:2px;" })}
        <p class="text-xs leading-relaxed" style="color:#DC2626;">${escapeHtml(docError)}</p>
      </div>
    ` : "";

    return cardHtml(
      "Documents",
      "file-text",
      `${summary}${errorBanner}<div class="space-y-2">${required.map(documentRowHtml).join("")}</div>`,
      `<span class="text-xs font-semibold px-2.5 py-1 rounded-full" style="background:#F3F4F6;color:#374151;">${escapeHtml(verificationLabel)}</span>`
    );
  }

  function contentHtml() {
    return `
      <div class="px-6 py-6" style="font-family:var(--font-display);">
        <div class="flex items-center gap-3 mb-6">
          <button data-back class="p-2 rounded-xl hover:bg-white border" style="border:1.5px solid #E5E7EB;">
            ${icon("arrow-left", { size: 16, color: "#6B7280" })}
          </button>
          <div class="flex-1 min-w-0">
            <h1 class="text-lg font-bold" style="color:#111827;">Application Details</h1>
            <p class="text-xs" style="font-family:var(--font-mono);color:#6B7280;">${escapeHtml(app.caseId)}</p>
          </div>
          ${statusBadge(app.status)}
          <button data-track class="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white" style="background:#2563EB;">
            ${icon("map-pin", { size: 14, color: "#fff" })} Track Application
          </button>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
          ${cardHtml("Finance Details", "banknote", `
            ${infoRow("Reference Number", app.caseId)}
            ${infoRow("Finance Scheme", app.scheme)}
            ${infoRow("Purpose of Finance", app.purposeOfFinance)}
            ${infoRow("Requested Amount", app.amount)}
            ${infoRow("Assigned Bank", app.bank)}
            ${infoRow("Submitted Date", app.submittedDate)}
            ${infoRow("Last Updated", app.lastUpdatedDate)}
          `)}

          ${cardHtml("Business Information", "building-2", `
            ${infoRow("Business Name", app.businessName)}
            ${infoRow("Nature of Business", app.businessNature)}
            ${infoRow("NTN", app.businessNtn)}
            ${infoRow("Address", app.businessAddress)}
            ${infoRow("Business Status", app.businessStatus)}
            ${infoRow("Business Age (years)", app.businessAge)}
            ${infoRow("Monthly Turnover", app.monthlyTurnover != null ? `PKR ${Number(app.monthlyTurnover).toLocaleString()}` : "—")}
            ${infoRow("Employees", app.employees)}
          `)}

          ${cardHtml("Applicant Information", "user", `
            ${infoRow("Full Name", app.applicantName)}
            ${infoRow("Email", app.applicantEmail)}
            ${infoRow("Mobile", app.applicantMobile)}
            ${infoRow("Contact Person (Business)", app.businessContactPerson)}
            ${infoRow("Business Contact No.", app.businessCellLandline)}
            ${infoRow("Business Email", app.businessEmail)}
            ${infoRow("Owner CNIC", app.businessOwnerCnic)}
          `)}

          ${documentsCardHtml()}
        </div>

        ${cardHtml("Status Timeline", "list-checks", (app.timeline && app.timeline.length) ? `
          <div class="space-y-3">
            ${app.timeline.map((t) => `
              <div class="flex items-start justify-between gap-4 pb-3 border-b last:border-0" style="border-color:#E5E7EB;">
                <div>
                  <div class="text-sm font-semibold" style="color:#111827;">${escapeHtml((STATUS_CONFIG[t.status] || {}).label || t.status)}</div>
                  ${t.remarks ? `<div class="text-xs mt-0.5" style="color:#6B7280;">${escapeHtml(t.remarks)}</div>` : ""}
                  ${t.updatedBy ? `<div class="text-xs mt-0.5" style="color:#9CA3AF;">Updated by ${escapeHtml(t.updatedBy)}</div>` : ""}
                </div>
                <div class="text-right flex-shrink-0">
                  <div class="text-xs font-medium" style="color:#111827;">${escapeHtml(t.date)}</div>
                  <div class="text-xs" style="color:#9CA3AF;">${escapeHtml(t.time)}</div>
                </div>
              </div>
            `).join("")}
          </div>
        ` : `<p class="text-xs" style="color:#6B7280;">No status history yet.</p>`)}
      </div>
    `;
  }

  async function handleFileChosen(label, file, existingDoc) {
    if (!file) return;
    uploadingType = label;
    docError = "";
    renderAll();

    const result = existingDoc
      ? await api.replaceApplicationDocument(applicationId, existingDoc.id, file)
      : await api.uploadApplicationDocument(applicationId, label, file);

    uploadingType = null;
    if (!result || !result.success) {
      docError = (result && result.message) || "Couldn't upload the document. Please try again.";
      renderAll();
      return;
    }

    const refreshed = await api.listApplicationDocuments(applicationId);
    documents = (refreshed && refreshed.documents) || documents;
    renderAll();
  }

  async function handleDelete(documentId) {
    docError = "";
    const result = await api.deleteApplicationDocument(applicationId, documentId);
    if (!result || !result.success) {
      docError = (result && result.message) || "Couldn't delete the document. Please try again.";
      renderAll();
      return;
    }
    const refreshed = await api.listApplicationDocuments(applicationId);
    documents = (refreshed && refreshed.documents) || documents.filter((d) => d.id !== String(documentId));
    renderAll();
  }

  function wireEvents() {
    qs("[data-back]", container)?.addEventListener("click", () => navigate("/sme/applications"));
    qs("[data-track]", container)?.addEventListener("click", () => navigate(`/sme/tracking/${applicationId}`));

    qsa("[data-doc-file]", container).forEach((input) => {
      const label = input.getAttribute("data-doc-file");
      input.addEventListener("change", (e) => {
        const file = e.target.files && e.target.files[0];
        const existingDoc = documents.find((d) => d.documentType === label);
        handleFileChosen(label, file, existingDoc);
      });
    });

    qsa("[data-doc-delete]", container).forEach((btn) => {
      btn.addEventListener("click", () => handleDelete(btn.getAttribute("data-doc-delete")));
    });
  }

  function renderAll() {
    container.innerHTML = loading ? loadingHtml() : notFound ? notFoundHtml() : contentHtml();
    wireEvents();
    hydrateIcons();
    wireImageFallbacks(container);
  }

  renderAll();

  if (!applicationId) {
    loading = false;
    notFound = true;
    renderAll();
    return;
  }

  api.getApplicationDetail(applicationId).then(async (result) => {
    if (!result || !result.success) {
      loading = false;
      notFound = true;
      renderAll();
      return;
    }
    app = result.application;

    const docsResult = await api.listApplicationDocuments(applicationId);
    documents = (docsResult && docsResult.documents) || [];

    loading = false;
    renderAll();
  });
}
