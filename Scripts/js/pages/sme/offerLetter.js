// Conditional Offer Letter (Phase 14). Previously 100% hardcoded/decorative (fixed case ID,
// business name, bank, and terms; Accept/Decline buttons did nothing but close a modal) - now
// loads the real offer a Bank Officer actually issued (Controllers/ApplicationController.cs's
// Offer action, via js/api.js's getApplicationOffer()) and Accept/Decline call the real
// decision endpoint (OfferDecision), which is what finally sets the application's real Status
// to approved/rejected. The HTML structure/classes below are the same shape as before - only
// the data feeding them, and what the buttons actually do, are now real.
import { state, setApplications } from "../../state.js";
import { C } from "../../colors.js";
import { navigate } from "../../router.js";
import { icon, hydrateIcons, wireImageFallbacks, escapeHtml, qs, qsa } from "../../utils.js";
import * as api from "../../api.js";

// Local component state (mirrors the original module-scoped state).
let showConfirm = false;
let pendingDecision = null; // "accept" | "decline" | null
let rejectReason = "";
let submitting = false;
let error = "";

function detailsFor(offer) {
  const rows = [
    { label: "Approved Amount", value: offer.approvedAmountDisplay, highlight: true },
  ];
  if (offer.markupRate) rows.push({ label: "Markup Rate", value: offer.markupRate });
  if (offer.tenor) rows.push({ label: "Tenor", value: offer.tenor });
  if (offer.monthlyInstallment) rows.push({ label: "Monthly Installment", value: offer.monthlyInstallment });
  if (offer.processingFee) rows.push({ label: "Processing Fee", value: offer.processingFee });
  if (offer.expiryDate) rows.push({ label: "Offer Expiry Date", value: offer.expiryDate });
  if (offer.disbursementTimeline) rows.push({ label: "Disbursement Timeline", value: offer.disbursementTimeline });
  return rows;
}

function emptyStateHtml(message) {
  return `
    <div class="px-6 py-10 text-center">
      <button data-back class="mb-4 p-2 rounded-xl hover:bg-white border" style="border:1.5px solid ${C.border};">
        ${icon("arrow-left", { size: 16, color: C.textMuted })}
      </button>
      <p class="text-sm" style="color:${C.textMuted};">${escapeHtml(message)}</p>
    </div>
  `;
}

function decisionSidebarHtml(offer) {
  if (offer.status === "offer_issued") {
    return `
      <div class="rounded-2xl border p-5" style="background:${C.surface};border:1.5px solid ${C.border};">
        <h2 class="text-sm font-bold mb-1" style="color:${C.text};">Your Decision</h2>
        <p class="text-xs mb-4" style="color:${C.textMuted};">
          ${offer.expiryDate ? `This offer expires on <strong>${escapeHtml(offer.expiryDate)}</strong>. ` : ""}Review carefully before accepting.
        </p>
        ${error ? `
          <div class="rounded-xl p-3 mb-3 flex gap-2.5" style="background:#FEE2E2;border:1.5px solid #DC2626;">
            ${icon("x-circle", { size: 16, color: "#DC2626", style: "margin-top:2px;" })}
            <p class="text-xs leading-relaxed" style="color:#DC2626;">${escapeHtml(error)}</p>
          </div>
        ` : ""}
        <div class="flex flex-col gap-3">
          <button data-accept ${submitting ? "disabled" : ""} class="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-60" style="background:${C.green};">
            ${icon("check-circle-2", { size: 16 })} Accept Offer
          </button>
          <button data-decline ${submitting ? "disabled" : ""} class="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold border transition-all hover:bg-red-50 disabled:opacity-60" style="border:1.5px solid #DC2626;color:#DC2626;">
            ${icon("x", { size: 16 })} Decline Offer
          </button>
        </div>
      </div>

      <div class="rounded-2xl border p-4 flex gap-3" style="background:#FEF3C7;border:1.5px solid #D97706;">
        ${icon("alert-triangle", { size: 16, color: "#D97706", style: "margin-top:2px;" })}
        <p class="text-xs leading-relaxed" style="color:#92400E;">
          Accepting this offer is legally binding. Ensure you have read all terms and conditions before proceeding.
        </p>
      </div>
    `;
  }

  const accepted = offer.status === "approved";
  const resolved = accepted || offer.status === "rejected";
  if (!resolved) return "";

  return `
    <div class="rounded-2xl border p-5 text-center" style="background:${accepted ? C.greenLight : "#FEE2E2"};border:1.5px solid ${accepted ? C.green : "#DC2626"};">
      ${accepted
        ? icon("check-circle-2", { size: 40, color: C.green, className: "mx-auto mb-3" })
        : icon("x", { size: 40, color: "#DC2626", className: "mx-auto mb-3" })}
      <h3 class="font-bold text-base mb-1" style="color:${accepted ? C.green : "#DC2626"};">
        ${accepted ? "Offer Accepted!" : "Offer Declined"}
      </h3>
      <p class="text-xs" style="color:${C.textMuted};">
        ${accepted
          ? `${escapeHtml(offer.bank)} will proceed with legal documentation. You will receive further instructions via email.`
          : "The offer has been declined. You may apply again with a different bank."}
      </p>
    </div>
  `;
}

function confirmModalHtml(offer) {
  if (!showConfirm) return "";
  return `
    <div class="fixed inset-0 z-50 flex items-center justify-center px-4" style="background:rgba(0,0,0,0.4);" data-modal-overlay>
      <div class="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
        <h3 class="text-base font-bold mb-2" style="color:${C.text};">
          ${pendingDecision === "accept" ? "Confirm Offer Acceptance" : "Confirm Decline"}
        </h3>
        <p class="text-sm mb-4" style="color:${C.textMuted};">
          ${pendingDecision === "accept"
            ? `Are you sure you want to accept this financing offer of ${escapeHtml(offer.approvedAmountDisplay)} from ${escapeHtml(offer.bank)}?`
            : "Are you sure you want to decline this offer? This action cannot be undone."}
        </p>
        ${pendingDecision === "decline" ? `
          <textarea data-reject-reason rows="2" placeholder="Reason for declining (optional)"
            class="w-full rounded-xl border text-sm mb-4 resize-none outline-none"
            style="padding:10px 12px;border:1.5px solid ${C.border};color:${C.text};">${escapeHtml(rejectReason)}</textarea>
        ` : ""}
        <div class="flex gap-3">
          <button data-cancel-confirm ${submitting ? "disabled" : ""} class="flex-1 py-2.5 rounded-xl border text-sm font-medium disabled:opacity-60" style="border:1.5px solid ${C.border};color:${C.text};">Cancel</button>
          <button data-confirm-decision ${submitting ? "disabled" : ""} class="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60" style="background:${pendingDecision === "accept" ? C.green : "#DC2626"};">
            ${submitting ? "Submitting..." : pendingDecision === "accept" ? "Yes, Accept" : "Yes, Decline"}
          </button>
        </div>
      </div>
    </div>
  `;
}

export function render(container, params) {
  const requestedId = params && params.id;
  // Same business-switcher scoping as applicationTracking.js's bare-route fallback (see its own
  // comment) - without this, the bare "/sme/offer" (e.g. Dashboard's "View Offer Letter" quick
  // action) always resolved to the same one application regardless of which business was
  // currently selected in the header switcher.
  const selectedBusiness = state.selectedBusiness;
  const viewAllBusinesses = state.viewAllBusinesses;
  const scopedApplications = selectedBusiness && !viewAllBusinesses
    ? state.applications.filter((a) => a.businessId === selectedBusiness.id)
    : state.applications;
  const effectiveId = requestedId
    || scopedApplications.find((a) => a.status === "offer_issued")?.id
    || scopedApplications[0]?.id;

  showConfirm = false;
  pendingDecision = null;
  rejectReason = "";
  submitting = false;
  error = "";

  if (!effectiveId) {
    container.innerHTML = emptyStateHtml("You have no applications yet.");
    wireBackOnly(container);
    return;
  }

  container.innerHTML = emptyStateHtml("Loading your conditional offer…");
  wireBackOnly(container);

  api.getApplicationOffer(effectiveId).then((result) => {
    if (!result || !result.success) {
      container.innerHTML = emptyStateHtml("No conditional offer has been issued for this application yet.");
      wireBackOnly(container);
      return;
    }
    renderOffer(container, effectiveId, result.offer);
  });
}

function wireBackOnly(container) {
  qs("[data-back]", container)?.addEventListener("click", () => navigate("/sme"));
}

function renderOffer(container, applicationId, offer) {
  const downloadUrl = offer.documentId ? api.applicationDocumentDownloadUrl(applicationId, offer.documentId) : null;

  container.innerHTML = `
    <div class="px-6 py-6" style="font-family:var(--font-display);">
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-3">
          <button data-back class="p-2 rounded-xl hover:bg-white border" style="border:1.5px solid ${C.border};">
            ${icon("arrow-left", { size: 16, color: C.textMuted })}
          </button>
          <div>
            <h1 class="text-lg font-bold" style="color:${C.text};">Conditional Offer Letter</h1>
            <p class="text-xs" style="color:${C.textMuted};">Case: ${escapeHtml(offer.caseId)} · ${escapeHtml(offer.businessName)}</p>
          </div>
        </div>
        ${downloadUrl ? `
          <a href="${downloadUrl}" target="_blank" rel="noopener noreferrer" class="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border hover:bg-gray-50" style="border:1.5px solid ${C.border};color:${C.text};">
            ${icon("download", { size: 16 })} Download PDF
          </a>
        ` : ""}
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <!-- Offer details -->
        <div class="lg:col-span-2 space-y-4">
          <!-- Offer header card -->
          <div class="rounded-2xl overflow-hidden" style="border:1.5px solid ${C.green};">
            <div class="px-5 py-3 flex items-center justify-between" style="background:${C.green};">
              <div class="flex items-center gap-2">
                ${icon("file-text", { size: 16, color: "#fff" })}
                <span class="text-sm font-bold text-white">Financing Offer — ${escapeHtml(offer.bank)}</span>
              </div>
              ${offer.status === "offer_issued" ? `
                <span class="text-xs px-2.5 py-1 rounded-full font-semibold" style="background:rgba(255,255,255,0.15);color:white;">
                  AWAITING YOUR DECISION
                </span>
              ` : ""}
            </div>
            <div class="p-5 bg-white">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                ${detailsFor(offer).map(({ label, value, highlight }) => `
                  <div class="rounded-xl p-3 ${highlight ? "sm:col-span-2" : ""}"
                    style="background:${highlight ? C.greenLight : C.bg};border:1.5px solid ${highlight ? C.green + "40" : C.border};">
                    <div class="text-xs mb-1" style="color:${C.textMuted};">${escapeHtml(label)}</div>
                    <div class="font-bold ${highlight ? "text-xl" : "text-sm"}" style="color:${highlight ? C.green : C.text};font-family:var(--font-mono);">
                      ${escapeHtml(value)}
                    </div>
                  </div>
                `).join("")}
              </div>
            </div>
          </div>

          ${!downloadUrl ? `
            <div class="rounded-xl p-3 flex gap-2.5" style="background:${C.bg};border:1.5px solid ${C.border};">
              ${icon("info", { size: 16, color: C.textMuted, style: "margin-top:2px;" })}
              <p class="text-xs leading-relaxed" style="color:${C.textMuted};">No signed offer document was attached to this offer.</p>
            </div>
          ` : ""}
        </div>

        <!-- Actions sidebar -->
        <div class="space-y-4">
          ${decisionSidebarHtml(offer)}
        </div>
      </div>

      ${confirmModalHtml(offer)}
    </div>
  `;

  wireEvents(container, applicationId, offer);
  hydrateIcons();
  wireImageFallbacks(container);
}

function wireEvents(container, applicationId, offer) {
  qs("[data-back]", container).addEventListener("click", () => navigate("/sme"));

  const acceptBtn = qs("[data-accept]", container);
  if (acceptBtn) acceptBtn.addEventListener("click", () => {
    pendingDecision = "accept";
    showConfirm = true;
    renderOffer(container, applicationId, offer);
  });

  const declineBtn = qs("[data-decline]", container);
  if (declineBtn) declineBtn.addEventListener("click", () => {
    pendingDecision = "decline";
    showConfirm = true;
    renderOffer(container, applicationId, offer);
  });

  const cancelBtn = qs("[data-cancel-confirm]", container);
  if (cancelBtn) cancelBtn.addEventListener("click", () => {
    showConfirm = false;
    renderOffer(container, applicationId, offer);
  });

  const rejectTextarea = qs("[data-reject-reason]", container);
  if (rejectTextarea) rejectTextarea.addEventListener("input", (e) => { rejectReason = e.target.value; });

  const confirmBtn = qs("[data-confirm-decision]", container);
  if (confirmBtn) confirmBtn.addEventListener("click", async () => {
    if (submitting) return;
    submitting = true;
    error = "";
    renderOffer(container, applicationId, offer);

    const result = await api.decideApplicationOffer(applicationId, pendingDecision, rejectReason.trim());
    submitting = false;

    if (!result || !result.success) {
      error = (result && result.message) || "Couldn't record your decision. Please try again.";
      renderOffer(container, applicationId, offer);
      return;
    }

    showConfirm = false;
    const refreshedOffer = { ...offer, status: pendingDecision === "accept" ? "approved" : "rejected" };

    // Real applications list (Dashboard/My Applications) needs to reflect this decision
    // immediately too, not just this page - re-fetch rather than patching state locally.
    const applicationsResult = await api.listMyApplications();
    setApplications((applicationsResult && applicationsResult.applications) || state.applications);

    renderOffer(container, applicationId, refreshedOffer);
  });
}
