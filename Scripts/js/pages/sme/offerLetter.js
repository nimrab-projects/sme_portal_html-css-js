// 1:1 port of src/app/pages/sme/OfferLetter.tsx
import { state } from "../../state.js";
import { C } from "../../colors.js";
import { navigate } from "../../router.js";
import { icon, hydrateIcons, wireImageFallbacks, escapeHtml, qs, qsa } from "../../utils.js";

const DETAILS = [
  { label: "Approved Amount", value: "PKR 8,000,000", highlight: true },
  { label: "Markup Rate", value: "9.5% per annum (Fixed)", highlight: false },
  { label: "Tenor", value: "3 Years (36 Months)", highlight: false },
  { label: "Monthly Installment", value: "PKR 254,800 (approx.)", highlight: false },
  { label: "Processing Fee", value: "0.5% of approved amount", highlight: false },
  { label: "Offer Expiry Date", value: "July 30, 2025", highlight: false },
  { label: "Disbursement Timeline", value: "5–7 business days post acceptance", highlight: false },
];

const TERMS = [
  "Financing is subject to satisfactory completion of legal documentation.",
  "The applicant must maintain a current account with HBL for disbursement.",
  "Security / collateral as required by the bank must be provided before disbursement.",
  "The applicant must remain compliant with SBP prudential regulations throughout the tenor.",
  "Any false declaration will result in immediate cancellation of the facility.",
  "This offer is valid for 14 calendar days from the issuance date.",
];

// Local component state (mirrors the React useState hooks — module-scoped since
// this module has a single live instance of the page at a time).
let decision = null; // "accept" | "reject" | null
let showConfirm = false;
let rejectReason = "";

function handleDownloadPdf() {
  const doc = new window.jspdf.jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(0, 104, 56);
  doc.rect(0, 0, pageWidth, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Conditional Offer Letter — HBL", 14, 17);

  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("XYZ Foods Pvt. Ltd.", 14, 42);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text("Case: SBP-SME-2025-00098", 14, 49);

  let y = 62;
  DETAILS.forEach(({ label, value }, i) => {
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
    doc.text(String(value), 100, y);
    y += 10;
  });

  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(20, 20, 20);
  doc.text("Terms & Conditions", 14, y);
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  TERMS.forEach((t, i) => {
    const lines = doc.splitTextToSize(`${i + 1}. ${t}`, pageWidth - 32);
    doc.text(lines, 18, y);
    y += lines.length * 5 + 2;
  });

  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(`Generated ${new Date().toLocaleString()}`, 14, 287);

  doc.save("SBP-SME-2025-00098-Offer-Letter.pdf");
}

function decisionSidebarHtml() {
  if (!decision) {
    return `
      <div class="rounded-2xl border p-5" style="background:${C.surface};border:1.5px solid ${C.border};">
        <h2 class="text-sm font-bold mb-1" style="color:${C.text};">Your Decision</h2>
        <p class="text-xs mb-4" style="color:${C.textMuted};">
          This offer expires on <strong>July 30, 2025</strong>. Review carefully before accepting.
        </p>
        <div class="flex flex-col gap-3">
          <button data-accept class="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90" style="background:${C.green};">
            ${icon("check-circle-2", { size: 16 })} Accept Offer
          </button>
          <button data-decline class="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold border transition-all hover:bg-red-50" style="border:1.5px solid #DC2626;color:#DC2626;">
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

  return `
    <div class="rounded-2xl border p-5 text-center" style="background:${decision === "accept" ? C.greenLight : "#FEE2E2"};border:1.5px solid ${decision === "accept" ? C.green : "#DC2626"};">
      ${decision === "accept"
        ? icon("check-circle-2", { size: 40, color: C.green, className: "mx-auto mb-3" })
        : icon("x", { size: 40, color: "#DC2626", className: "mx-auto mb-3" })}
      <h3 class="font-bold text-base mb-1" style="color:${decision === "accept" ? C.green : "#DC2626"};">
        ${decision === "accept" ? "Offer Accepted!" : "Offer Declined"}
      </h3>
      <p class="text-xs" style="color:${C.textMuted};">
        ${decision === "accept"
          ? "HBL will proceed with legal documentation. You will receive further instructions via email."
          : "The offer has been declined. You may apply again with a different bank."}
      </p>
    </div>
  `;
}

function confirmModalHtml() {
  if (!showConfirm) return "";
  return `
    <div class="fixed inset-0 z-50 flex items-center justify-center px-4" style="background:rgba(0,0,0,0.4);" data-modal-overlay>
      <div class="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
        <h3 class="text-base font-bold mb-2" style="color:${C.text};">
          ${decision === "accept" ? "Confirm Offer Acceptance" : "Confirm Decline"}
        </h3>
        <p class="text-sm mb-4" style="color:${C.textMuted};">
          ${decision === "accept"
            ? "Are you sure you want to accept this financing offer of PKR 8,000,000 from HBL?"
            : "Are you sure you want to decline this offer? This action cannot be undone."}
        </p>
        ${decision === "reject" ? `
          <textarea data-reject-reason rows="2" placeholder="Reason for declining (optional)"
            class="w-full rounded-xl border text-sm mb-4 resize-none outline-none"
            style="padding:10px 12px;border:1.5px solid ${C.border};color:${C.text};">${escapeHtml(rejectReason)}</textarea>
        ` : ""}
        <div class="flex gap-3">
          <button data-cancel-confirm class="flex-1 py-2.5 rounded-xl border text-sm font-medium" style="border:1.5px solid ${C.border};color:${C.text};">Cancel</button>
          <button data-confirm-decision class="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style="background:${decision === "accept" ? C.green : "#DC2626"};">
            ${decision === "accept" ? "Yes, Accept" : "Yes, Decline"}
          </button>
        </div>
      </div>
    </div>
  `;
}

export function render(container) {
  container.innerHTML = `
    <div class="px-6 py-6" style="font-family:var(--font-display);">
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-3">
          <button data-back class="p-2 rounded-xl hover:bg-white border" style="border:1.5px solid ${C.border};">
            ${icon("arrow-left", { size: 16, color: C.textMuted })}
          </button>
          <div>
            <h1 class="text-lg font-bold" style="color:${C.text};">Conditional Offer Letter</h1>
            <p class="text-xs" style="color:${C.textMuted};">Case: SBP-SME-2025-00098 · XYZ Foods Pvt. Ltd.</p>
          </div>
        </div>
        <button data-download-pdf class="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border hover:bg-gray-50" style="border:1.5px solid ${C.border};color:${C.text};">
          ${icon("download", { size: 16 })} Download PDF
        </button>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <!-- Offer details -->
        <div class="lg:col-span-2 space-y-4">
          ${state.offerDocument ? `
            <a href="${state.offerDocument.fileUrl}" target="_blank" rel="noopener noreferrer" data-offer-doc-link
              class="flex items-center gap-3 rounded-xl p-3.5 transition-all hover:opacity-90"
              style="background:${C.greenLight};border:1.5px solid ${C.green}40;">
              <div class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style="background:${C.green};">
                ${icon("paperclip", { size: 16, color: "#fff" })}
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-xs font-semibold" style="color:${C.green};">Offer document from ${state.offerDocument.bank}</p>
                <p class="text-xs truncate" style="color:${C.textMuted};">${state.offerDocument.fileName}</p>
              </div>
              ${icon("download", { size: 16, color: C.green, className: "flex-shrink-0" })}
            </a>
          ` : ""}

          <!-- Offer header card -->
          <div class="rounded-2xl overflow-hidden" style="border:1.5px solid ${C.green};">
            <div class="px-5 py-3 flex items-center justify-between" style="background:${C.green};">
              <div class="flex items-center gap-2">
                ${icon("file-text", { size: 16, color: "#fff" })}
                <span class="text-sm font-bold text-white">Financing Offer — HBL</span>
              </div>
              <span class="text-xs px-2.5 py-1 rounded-full font-semibold" style="background:rgba(255,255,255,0.15);color:white;">
                OFFER VALID · 14 DAYS
              </span>
            </div>
            <div class="p-5 bg-white">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                ${DETAILS.map(({ label, value, highlight }) => `
                  <div class="rounded-xl p-3 ${highlight ? "sm:col-span-2" : ""}"
                    style="background:${highlight ? C.greenLight : C.bg};border:1.5px solid ${highlight ? C.green + "40" : C.border};">
                    <div class="text-xs mb-1" style="color:${C.textMuted};">${label}</div>
                    <div class="font-bold ${highlight ? "text-xl" : "text-sm"}" style="color:${highlight ? C.green : C.text};font-family:var(--font-mono);">
                      ${value}
                    </div>
                  </div>
                `).join("")}
              </div>
            </div>
          </div>

          <!-- Terms -->
          <div class="rounded-2xl border p-5" style="background:${C.surface};border:1.5px solid ${C.border};">
            <h2 class="text-sm font-bold mb-3" style="color:${C.text};">Terms & Conditions</h2>
            <div class="space-y-2">
              ${TERMS.map((t, i) => `
                <div class="flex items-start gap-2">
                  <span class="text-xs font-bold mt-0.5 w-5 flex-shrink-0" style="color:${C.textMuted};font-family:var(--font-mono);">${i + 1}.</span>
                  <p class="text-xs leading-relaxed" style="color:${C.textMuted};">${t}</p>
                </div>
              `).join("")}
            </div>
          </div>
        </div>

        <!-- Actions sidebar -->
        <div class="space-y-4">
          ${decisionSidebarHtml()}
        </div>
      </div>

      ${confirmModalHtml()}
    </div>
  `;

  wireEvents(container);
  hydrateIcons();
  wireImageFallbacks(container);
}

function rerender(container) {
  render(container);
}

function wireEvents(container) {
  qs("[data-back]", container).addEventListener("click", () => navigate("/sme"));
  qs("[data-download-pdf]", container).addEventListener("click", handleDownloadPdf);

  const acceptBtn = qs("[data-accept]", container);
  if (acceptBtn) acceptBtn.addEventListener("click", () => { decision = "accept"; showConfirm = true; rerender(container); });

  const declineBtn = qs("[data-decline]", container);
  if (declineBtn) declineBtn.addEventListener("click", () => { decision = "reject"; showConfirm = true; rerender(container); });

  const cancelBtn = qs("[data-cancel-confirm]", container);
  if (cancelBtn) cancelBtn.addEventListener("click", () => { showConfirm = false; rerender(container); });

  const confirmBtn = qs("[data-confirm-decision]", container);
  if (confirmBtn) {
    // Matches the source exactly: this only closes the modal. It never calls
    // any state.js mutator or otherwise persists the decision anywhere.
    confirmBtn.addEventListener("click", () => { showConfirm = false; rerender(container); });
  }

  const rejectTextarea = qs("[data-reject-reason]", container);
  if (rejectTextarea) rejectTextarea.addEventListener("input", (e) => { rejectReason = e.target.value; });
}
