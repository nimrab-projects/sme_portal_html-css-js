// 1:1 port of src/app/pages/sme/ApplicationSuccess.tsx
// This page previously showed fully hardcoded mock content, including a fixed "HBL" as the
// Assigned Bank right after a real submission - the same root-cause bug reported against My
// Applications/Application Details/Application Tracking (a hardcoded bank literal presented as
// fact, unrelated to anything the applicant actually chose). Now reads the just-submitted
// application from state.js (addApplication() in state.js prepends it, so it's always
// state.applications[0] immediately after a real submit) instead of a fixed DETAILS array -
// same markup/classes, real data. "What happens next" stays generic informational copy
// (no per-application facts) except the one line that named a specific bank.
import { state } from "../../state.js";
import { C } from "../../colors.js";
import { navigate } from "../../router.js";
import { icon, escapeHtml, hydrateIcons, wireImageFallbacks, qs, qsa } from "../../utils.js";

export function render(container) {
  const app = state.applications[0];

  // Single source of truth: the bank the applicant selected on their own Business Profile
  // (Business.Bank, returned here as app.bank - see ApplicationService.cs). There is no
  // separate "assigned bank" workflow in this system.
  const hasBank = app && app.bank && app.bank !== "Not Provided";
  const DETAILS = [
    { label: "Case ID", value: app?.caseId ?? "—", mono: true },
    { label: "Submission Date", value: app?.submittedDate ?? "—", mono: false },
    { label: "Assigned Bank", value: hasBank ? app.bank : "Not Provided", mono: false },
    { label: "Status", value: app ? "Submitted · Under Processing" : "—", mono: false },
  ];

  const NEXT_STEPS = [
    { step: "1", text: "Your bank will review your application and documents (2–3 days)" },
    { step: "2", text: "Credit assessment and verification will be conducted" },
    { step: "3", text: "You will receive a notification once an offer is issued" },
    { step: "4", text: "Accept the offer and complete legal documentation" },
  ];

  container.innerHTML = `
    <div class="min-h-full flex items-center justify-center px-6 py-12" style="background:${C.bg};">
      <div class="w-full max-w-lg text-center">
        <!-- Success icon -->
        <div class="relative inline-flex mb-6">
          <div class="w-20 h-20 rounded-full flex items-center justify-center" style="background:${C.greenLight};">
            ${icon("check-circle-2", { size: 40, color: C.green })}
          </div>
          <div class="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold" style="background:${C.green};">✓</div>
        </div>

        <h1 class="text-2xl font-extrabold mb-2" style="color:${C.text};">Application Submitted!</h1>
        <p class="text-sm mb-8" style="color:${C.textMuted};">
          Your SME financing application has been successfully submitted. The assigned bank will begin
          assessment within 2–3 business days.
        </p>

        <!-- Detail card -->
        <div class="rounded-2xl border text-left overflow-hidden mb-6" style="background:${C.surface};border:1.5px solid ${C.border};">
          <div class="px-5 py-3 border-b flex items-center justify-between" style="border-color:${C.border};background:${C.greenLight};">
            <span class="text-xs font-semibold uppercase tracking-wider" style="color:${C.green};font-family:var(--font-mono);">Application Reference</span>
            <button class="flex items-center gap-1 text-xs" style="color:${C.green};">
              ${icon("copy", { size: 14 })} Copy
            </button>
          </div>
          <div class="p-5 space-y-3">
            ${DETAILS.map(({ label, value, mono }) => `
              <div class="flex items-center justify-between py-1 border-b last:border-0" style="border-color:${C.border};">
                <span class="text-xs" style="color:${C.textMuted};">${escapeHtml(label)}</span>
                <span class="text-sm font-semibold" style="color:${C.text};${mono ? "font-family:var(--font-mono);" : ""}">${escapeHtml(value)}</span>
              </div>
            `).join("")}
          </div>
        </div>

        <!-- What's next -->
        <div class="rounded-2xl border p-5 text-left mb-6" style="background:${C.surface};border:1.5px solid ${C.border};">
          <h3 class="text-sm font-bold mb-3" style="color:${C.text};">What happens next?</h3>
          ${NEXT_STEPS.map(({ step, text }) => `
            <div class="flex items-start gap-3 mb-2 last:mb-0">
              <div class="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold text-white" style="background:${C.green};">${step}</div>
              <p class="text-xs leading-snug" style="color:${C.textMuted};">${text}</p>
            </div>
          `).join("")}
        </div>

        <div class="flex gap-3">
          <button data-track class="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold border transition-all hover:bg-gray-50" style="border:1.5px solid ${C.border};color:${C.text};">
            ${icon("map-pin", { size: 16 })} Track Application
          </button>
          <button data-dashboard class="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90" style="background:${C.green};">
            Back to Dashboard ${icon("arrow-right", { size: 16 })}
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
  qs("[data-track]", container).addEventListener("click", () => navigate(app ? `/sme/tracking/${app.id}` : "/sme/tracking"));
  qs("[data-dashboard]", container).addEventListener("click", () => navigate("/sme"));
}
