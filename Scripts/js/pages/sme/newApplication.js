// 1:1 port of src/app/pages/sme/NewApplication.tsx
import { state, setSelectedBusiness, addApplication } from "../../state.js";
import { C } from "../../colors.js";
import { navigate } from "../../router.js";
import { icon, hydrateIcons, wireImageFallbacks, openModal, escapeHtml, qs, qsa } from "../../utils.js";
import * as api from "../../api.js";

const ALL_STEPS = [
  { key: "financing", label: "Financing", iconName: "banknote" },
  { key: "documents", label: "Documents", iconName: "file-up" },
  { key: "review", label: "Review", iconName: "clipboard-list" },
];

const UNDERTAKING_POINTS = [
  "I/We certify and undertake that the information furnished above is true to the best of my/our knowledge.",
  "I/We hereby authorize the bank to obtain information/data regarding my/our Allied Concern's financial and personal details from any credit bureau, agent, financial institutions, companies or from any other sources for the purposes of processing my/our facility application form and to monitor my/our facilities/accounts.",
  "I/We undertake that the loan will be utilized for the same purpose as specified above in the form.",
  "I/We agree that the submission of above information and facility application form is not the approval of finance and I shall have no right to claim for finance before any forum, if my request of finance declined by bank for any reasons.",
];

const FACILITY_TYPE_OPTIONS = [
  "Financing for Asset Purchase", "Term Finance", "Running Finance", "Over Draft", "Working Capital",
];

// Exported (Phase 9) so applicationDetails.js's real document-upload UI can reuse the exact
// same required-document checklist instead of duplicating it - this remains the one and only
// place these labels are defined; the server (DocumentType column) treats them as opaque
// strings and never re-declares its own copy of this list.
export const PROPRIETORSHIP_DOCS = [
  "CNIC of Owner",
  "Financial Statement(s)/ Projected Financial(s)",
  "Feasibility Report",
];
export const PARTNERSHIP_DOCS = [
  "CNIC of Borrower(s)",
  "Memorandum & Articles of Association",
  "Financial Statement(s)/Projected Financial(s)",
  "Feasibility Report",
];

// Local component state (mirrors the React useState hooks — module-scoped since this
// module has a single live instance of the page at a time, and must survive the shared
// SmeLayout re-rendering its outlet on unrelated global state changes, e.g. switching
// the active business via the header dropdown or reading notifications, without losing
// wizard progress — matching NewApplication.tsx staying mounted across those re-renders).
let step = 0;
let facilities = [{ type: FACILITY_TYPE_OPTIONS[0], amount: "", collateralType: "", collateralValue: "" }];
let agreedToUndertaking = false;
let lastBusinessStatus = null;
let docs = [];
let submitting = false;
let submitError = "";

export function requiredDocLabels(businessStatus) {
  return businessStatus === "Proprietorship" ? PROPRIETORSHIP_DOCS : PARTNERSHIP_DOCS;
}

function freshDocs(businessStatus) {
  return requiredDocLabels(businessStatus).map((label) => ({ label, file: null, fileUrl: null, required: true }));
}

// Mirrors the useEffect that resets `docs` whenever `businessStatus` changes
// (including on first mount, since lastBusinessStatus starts as null).
function syncDocsForBusinessStatus() {
  const businessStatus = state.selectedBusiness?.businessStatus ?? "Proprietorship";
  if (businessStatus !== lastBusinessStatus) {
    lastBusinessStatus = businessStatus;
    docs = freshDocs(businessStatus);
  }
}

function totalFacilityAmount() {
  return facilities.reduce((sum, f) => sum + (parseFloat(f.amount.replace(/,/g, "")) || 0), 0);
}

function reviewRowHtml(label, value) {
  return `
    <div class="flex items-start py-2 border-b" style="border-color:${C.border};">
      <span class="w-40 flex-shrink-0 text-xs font-medium" style="color:${C.textMuted};">${label}</span>
      <span class="text-sm flex-1" style="color:${C.text};">${value}</span>
    </div>
  `;
}

function businessSelectorHtml() {
  const sb = state.selectedBusiness;
  return `
    <div class="max-w-2xl rounded-2xl border p-5 mb-6" style="background:${C.surface};border:1.5px solid ${C.border};">
      <label class="flex items-center gap-2 text-sm font-medium mb-2" style="color:${C.text};">
        ${icon("building-2", { size: 16, color: C.green })}
        Applying For
      </label>
      <div class="relative">
        <select data-business-select class="w-full rounded-xl border text-sm outline-none appearance-none font-medium"
          style="padding:12px 40px 12px 14px;background:${C.greenLight};border:1.5px solid ${C.green}40;color:${C.greenDark};">
          ${state.businesses.length === 0 ? `<option value="">No businesses found</option>` : ""}
          ${state.businesses.map((b) => `<option value="${b.id}" ${sb?.id === b.id ? "selected" : ""}>${escapeHtml(b.name)}</option>`).join("")}
        </select>
        ${icon("chevron-down", { size: 16, color: C.green, className: "absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" })}
      </div>
      ${sb ? `
        <p class="text-xs mt-2" style="color:${C.textMuted};">
          ${escapeHtml(sb.nature)} · NTN ${escapeHtml(sb.ntn)} · ${escapeHtml(sb.address)}
        </p>` : ""}
    </div>
  `;
}

function stepperHtml() {
  return `
    <div class="relative flex items-center mb-8 overflow-x-auto">
      ${ALL_STEPS.map(({ label, iconName }, i) => {
        const iconColor = i <= step ? "white" : C.textMuted;
        return `
          <div class="flex items-center flex-shrink-0">
            <div class="flex flex-col items-center gap-1">
              <div class="w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all"
                style="background:${i <= step ? C.green : C.surface};border-color:${i <= step ? C.green : C.border};color:${iconColor};">
                ${i < step ? icon("check-circle-2", { size: 16, color: iconColor }) : icon(iconName, { size: 16, color: iconColor })}
              </div>
              <span class="text-xs font-medium whitespace-nowrap hidden sm:block"
                style="color:${i === step ? C.green : i < step ? C.greenDark : C.textMuted};">
                ${label}
              </span>
            </div>
            ${i < ALL_STEPS.length - 1 ? `
              <div class="w-12 md:w-16 h-0.5 mx-1 flex-shrink-0" style="background:${i < step ? C.green : C.border};"></div>
            ` : ""}
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function financingStepHtml() {
  return `
    <div>
      <h2 class="text-base font-bold mb-1" style="color:${C.text};">Financing Requirement</h2>

      <div class="flex items-center justify-between mb-1.5 mt-4">
        <label class="text-sm font-medium" style="color:${C.text};">Facility(ies) Requested</label>
        <button data-add-facility class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all hover:bg-gray-50"
          style="border:1.5px solid ${C.green};color:${C.green};">
          ${icon("plus", { size: 14, color: C.green })} Add Facility
        </button>
      </div>
      <p class="text-xs mb-3" style="color:${C.textMuted};">
        e.g. Financing for Asset Purchase, Term Finance, Running Finance, Over Draft, Working Capital etc.
      </p>

      <div class="space-y-4">
        ${facilities.map((f, i) => `
          <div class="p-4 rounded-xl border" style="border:1.5px solid ${C.border};background:${C.bg};">
            <div class="flex items-center justify-between mb-3">
              <span class="text-xs font-semibold" style="color:${C.textMuted};">FACILITY ${i + 1}</span>
              ${facilities.length > 1 ? `
                <button data-remove-facility="${i}" style="color:#DC2626;">${icon("trash-2", { size: 14, color: "#DC2626" })}</button>
              ` : ""}
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-sm font-medium mb-1.5" style="color:${C.text};">Type of Facility</label>
                <div class="relative">
                  <select data-facility-field="type" data-facility-index="${i}"
                    class="w-full rounded-xl border text-sm outline-none appearance-none"
                    style="padding:11px 36px 11px 14px;background:${C.surface};border:1.5px solid ${C.border};color:${C.text};">
                    ${FACILITY_TYPE_OPTIONS.map((t) => `<option ${f.type === t ? "selected" : ""}>${t}</option>`).join("")}
                  </select>
                  ${icon("chevron-down", { size: 16, color: C.textMuted, className: "absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" })}
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium mb-1.5" style="color:${C.text};">Amount (Rs.)</label>
                <input type="text" placeholder="e.g. 2,000,000" value="${escapeHtml(f.amount)}"
                  data-facility-field="amount" data-facility-index="${i}"
                  class="w-full rounded-xl border text-sm outline-none"
                  style="padding:11px 14px;background:${C.surface};border:1.5px solid ${C.border};color:${C.text};" />
              </div>
              <div>
                <label class="block text-sm font-medium mb-1.5" style="color:${C.text};">Collateral Type</label>
                <input type="text" placeholder="e.g. Land, Vehicle, Cash, Bond" value="${escapeHtml(f.collateralType)}"
                  data-facility-field="collateralType" data-facility-index="${i}"
                  class="w-full rounded-xl border text-sm outline-none"
                  style="padding:11px 14px;background:${C.surface};border:1.5px solid ${C.border};color:${C.text};" />
              </div>
              <div>
                <label class="block text-sm font-medium mb-1.5" style="color:${C.text};">Collateral Value (Rs.)</label>
                <input type="text" placeholder="e.g. 3,000,000" value="${escapeHtml(f.collateralValue)}"
                  data-facility-field="collateralValue" data-facility-index="${i}"
                  class="w-full rounded-xl border text-sm outline-none"
                  style="padding:11px 14px;background:${C.surface};border:1.5px solid ${C.border};color:${C.text};" />
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function documentsStepHtml() {
  return `
    <div>
      <h2 class="text-base font-bold mb-4" style="color:${C.text};">Document Upload</h2>
      <div class="border-2 border-dashed rounded-xl p-6 text-center mb-5 transition-all hover:border-green-400 cursor-pointer"
        style="border-color:${C.border};background:${C.bg};">
        ${icon("upload", { size: 32, color: C.textMuted, className: "mx-auto mb-2" })}
        <p class="text-sm font-medium" style="color:${C.text};">Drag &amp; drop files here</p>
        <p class="text-xs mt-1" style="color:${C.textMuted};">or click to browse — PDF, JPG, PNG up to 10MB each</p>
      </div>
      <div class="space-y-2">
        ${docs.map((doc, i) => `
          <div class="flex items-center gap-3 p-3 rounded-xl border"
            style="border:1.5px solid ${doc.file ? C.green + "40" : C.border};background:${doc.file ? C.greenLight : C.surface};">
            <div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style="background:${doc.file ? C.green : C.bg};">
              ${doc.file ? icon("check-circle-2", { size: 16, color: "#fff" }) : icon("file-up", { size: 16, color: C.textMuted })}
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium" style="color:${C.text};">${escapeHtml(doc.label)}</div>
              <div class="text-xs truncate" style="color:${C.textMuted};">
                ${doc.required ? "Required" : "Optional"} ${doc.file ? `· ${escapeHtml(doc.file.name)}` : ""}
              </div>
            </div>
            <label class="text-xs px-3 py-1.5 rounded-lg font-medium border transition-all cursor-pointer flex-shrink-0"
              style="border:1.5px solid ${doc.file ? C.green : C.border};color:${doc.file ? C.green : C.textMuted};background:${doc.file ? C.greenLight : C.surface};">
              <input type="file" class="hidden" accept=".pdf,.jpg,.jpeg,.png" data-doc-upload="${i}" />
              ${doc.file ? "Replace" : "Upload"}
            </label>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function reviewStepHtml() {
  const sb = state.selectedBusiness;
  return `
    <div>
      <h2 class="text-base font-bold mb-4" style="color:${C.text};">Review &amp; Submit</h2>
      <div class="space-y-5">
        <div>
          <h3 class="text-xs font-bold uppercase tracking-wider mb-2" style="color:${C.textMuted};font-family:var(--font-mono);">Business</h3>
          <div class="rounded-xl p-4" style="background:${C.bg};border:1.5px solid ${C.border};">
            <div class="ReviewRow">${reviewRowHtml("Business Name", escapeHtml(sb?.name ?? ""))}</div>
            ${reviewRowHtml("Nature", escapeHtml(sb?.nature ?? ""))}
            ${reviewRowHtml("NTN", escapeHtml(sb?.ntn ?? ""))}
          </div>
        </div>
        <div>
          <h3 class="text-xs font-bold uppercase tracking-wider mb-2" style="color:${C.textMuted};font-family:var(--font-mono);">Financing</h3>
          <div class="rounded-xl p-4" style="background:${C.bg};border:1.5px solid ${C.border};">
            ${facilities.map((f) => reviewRowHtml(
              escapeHtml(f.type),
              `PKR ${escapeHtml(f.amount || "0")}${f.collateralType ? ` · Collateral: ${escapeHtml(f.collateralType)} (PKR ${escapeHtml(f.collateralValue || "0")})` : ""}`
            )).join("")}
          </div>
        </div>
        <div>
          <h3 class="text-xs font-bold uppercase tracking-wider mb-2" style="color:${C.textMuted};font-family:var(--font-mono);">Documents</h3>
          <div class="rounded-xl p-4" style="background:${C.bg};border:1.5px solid ${C.border};">
            ${docs.map((doc) => reviewRowHtml(escapeHtml(doc.label), doc.file ? `✓ ${escapeHtml(doc.file.name)}` : "Not uploaded")).join("")}
          </div>
        </div>
      </div>
    </div>
  `;
}

function stepContentHtml() {
  const key = ALL_STEPS[step]?.key;
  if (key === "financing") return financingStepHtml();
  if (key === "documents") return documentsStepHtml();
  if (key === "review") return reviewStepHtml();
  return "";
}

function navHtml() {
  return `
    <div class="max-w-2xl flex items-center justify-between mt-5">
      <button data-prev class="flex items-center gap-2 px-5 py-2.5 rounded-xl border text-sm font-medium hover:bg-gray-50"
        style="border:1.5px solid ${C.border};color:${C.text};">
        ${icon("arrow-left", { size: 16, color: C.text })} ${step === 0 ? "Cancel" : "Previous"}
      </button>

      ${step < ALL_STEPS.length - 1 ? `
        <button data-next class="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90" style="background:${C.green};">
          Save &amp; Continue ${icon("arrow-right", { size: 16, color: "#fff" })}
        </button>
      ` : `
        <button data-submit class="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90" style="background:${C.green};">
          Submit Application ${icon("check-circle-2", { size: 16, color: "#fff" })}
        </button>
      `}
    </div>
  `;
}

export function render(container) {
  syncDocsForBusinessStatus();

  container.innerHTML = `
    <div class="px-6 py-6" style="font-family:var(--font-display);">
      <div class="flex items-center gap-3 mb-6">
        <button data-back class="p-2 rounded-xl hover:bg-white border" style="border:1.5px solid ${C.border};">
          ${icon("arrow-left", { size: 16, color: C.textMuted })}
        </button>
        <div>
          <h1 class="text-lg font-bold" style="color:${C.text};">New Financing Application</h1>
          <p class="text-xs" style="color:${C.textMuted};">${escapeHtml(state.selectedBusiness?.name ?? "")}</p>
        </div>
      </div>

      ${businessSelectorHtml()}

      ${stepperHtml()}

      <div class="max-w-2xl rounded-2xl border p-6" style="background:${C.surface};border:1.5px solid ${C.border};">
        ${stepContentHtml()}
      </div>

      ${navHtml()}
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
  qs("[data-back]", container)?.addEventListener("click", () => navigate("/sme"));

  const bizSelect = qs("[data-business-select]", container);
  if (bizSelect) {
    bizSelect.addEventListener("change", (e) => {
      const biz = state.businesses.find((b) => b.id === e.target.value);
      if (biz) setSelectedBusiness(biz);
      rerender(container);
    });
  }

  qs("[data-add-facility]", container)?.addEventListener("click", () => {
    facilities = [...facilities, { type: FACILITY_TYPE_OPTIONS[0], amount: "", collateralType: "", collateralValue: "" }];
    rerender(container);
  });

  qsa("[data-remove-facility]", container).forEach((btn) => {
    btn.addEventListener("click", () => {
      const i = Number(btn.getAttribute("data-remove-facility"));
      facilities = facilities.filter((_, idx) => idx !== i);
      rerender(container);
    });
  });

  qsa("[data-facility-field]", container).forEach((el) => {
    const field = el.getAttribute("data-facility-field");
    const i = Number(el.getAttribute("data-facility-index"));
    const evtName = el.tagName === "SELECT" ? "change" : "input";
    el.addEventListener(evtName, (e) => {
      facilities = facilities.map((row, idx) => (idx === i ? { ...row, [field]: e.target.value } : row));
      // No re-render here (unlike add/remove-facility, which change the number of facility
      // blocks and genuinely need one) - the native input/select already reflects the
      // keystroke/selection on its own. Rebuilding container.innerHTML on every keystroke was
      // destroying and recreating this exact <input> node each time, which drops focus after
      // one character - matches the same "no full re-render on keystroke" pattern already used
      // for text fields in auth.js/businessSetup.js.
    });
  });

  qsa("[data-doc-upload]", container).forEach((input) => {
    const i = Number(input.getAttribute("data-doc-upload"));
    input.addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) {
        docs = docs.map((d, idx) => (idx === i ? { ...d, file, fileUrl: URL.createObjectURL(file) } : d));
        rerender(container);
      }
    });
  });

  qs("[data-prev]", container)?.addEventListener("click", () => {
    if (step > 0) {
      step -= 1;
      rerender(container);
    } else {
      navigate("/sme");
    }
  });

  qs("[data-next]", container)?.addEventListener("click", () => {
    step += 1;
    rerender(container);
  });

  qs("[data-submit]", container)?.addEventListener("click", () => {
    openUndertakingModal();
  });
}

function openUndertakingModal() {
  openModal((overlay, close) => {
    function renderModal() {
      overlay.innerHTML = `
        <div class="bg-white rounded-2xl max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
          <div class="p-6">
            <h3 class="text-base font-bold mb-1" style="color:${C.text};">Undertaking</h3>
            <p class="text-xs mb-4" style="color:${C.textMuted};">
              Please read and confirm the undertaking below before your application is submitted.
            </p>
            <div class="rounded-xl p-4 mb-4" style="background:#FEF3C7;border:1.5px solid #D97706;">
              <ol class="list-decimal ml-4 space-y-2">
                ${UNDERTAKING_POINTS.map((point) => `<li class="text-xs leading-relaxed" style="color:#92400E;">${point}</li>`).join("")}
              </ol>
            </div>
            ${submitError ? `
              <div class="rounded-xl p-3 flex gap-2.5 mb-4" style="background:#FEE2E2;border:1.5px solid #DC2626;">
                ${icon("x-circle", { size: 16, color: "#DC2626", style: "margin-top:2px;" })}
                <p class="text-xs leading-relaxed" style="color:#DC2626;">${escapeHtml(submitError)}</p>
              </div>
            ` : ""}
            <label class="flex items-start gap-2.5 mb-5 cursor-pointer">
              <input type="checkbox" data-agree class="mt-0.5" ${agreedToUndertaking ? "checked" : ""} />
              <span class="text-sm font-medium" style="color:${C.text};">
                I/We agree to the above undertaking.
              </span>
            </label>
            <div class="flex gap-3">
              <button data-cancel class="flex-1 py-2.5 rounded-xl border text-sm font-medium" style="border:1.5px solid ${C.border};color:${C.text};">
                Cancel
              </button>
              <button data-agree-submit ${agreedToUndertaking && !submitting ? "" : "disabled"}
                class="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed"
                style="background:${C.green};">
                ${submitting ? "Submitting..." : "Agree &amp; Submit"} ${icon("check-circle-2", { size: 16, color: "#fff" })}
              </button>
            </div>
          </div>
        </div>
      `;

      qs("[data-cancel]", overlay).addEventListener("click", close);
      qs("[data-agree]", overlay).addEventListener("change", (e) => {
        agreedToUndertaking = e.target.checked;
        renderModal();
      });
      const submitBtn = qs("[data-agree-submit]", overlay);
      submitBtn.addEventListener("click", async () => {
        // Guards against a duplicate submission from a fast double-click while the first
        // request is still in flight (Phase 7's "duplicate submission rules").
        if (!agreedToUndertaking || submitting) return;
        submitting = true;
        submitError = "";
        renderModal();

        // "Assigned Bank" is decided later by a bank/SBP review workflow, never chosen by the
        // applicant here - the server always starts a new application as "Not Assigned"
        // (see ApplicationService.SubmitApplicationAsync), so nothing bank-related is sent.
        const result = await api.submitApplication({
          businessId: state.selectedBusiness?.id,
          requestedAmount: totalFacilityAmount(),
          purposeOfFinance: facilities.map((f) => f.type).join(", "),
        });

        submitting = false;
        if (!result || !result.success) {
          submitError = (result && result.message) || "Couldn't submit your application. Please try again.";
          renderModal();
          return;
        }

        // This Documents step only ever attached files in browser memory (docs[i].file) - no
        // upload endpoint call happened until now. Persisting them here, against the
        // just-created application's real id, is what makes the files the applicant just saw
        // "attached" in this wizard actually exist in the database - the same
        // /api/applications/{id}/documents endpoint Application Details' own upload UI uses, so
        // there is exactly one upload code path, not a second one. Best-effort: an application
        // is already successfully submitted at this point, so one file failing to upload must
        // not block navigation - the applicant can always add/replace it from Application
        // Details afterward.
        const filesToUpload = docs.filter((d) => d.file);
        await Promise.all(
          filesToUpload.map((d) => api.uploadApplicationDocument(result.application.id, d.label, d.file))
        );

        addApplication(result.application, filesToUpload.map((d) => ({ label: d.label, fileName: d.file.name, fileUrl: d.fileUrl })));
        close();
        navigate("/sme/success");
      });

      hydrateIcons();
    }

    renderModal();
  });
}
