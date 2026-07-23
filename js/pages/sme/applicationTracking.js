// 1:1 port of src/app/pages/sme/ApplicationTracking.tsx
// UI only, fully static/hardcoded — does NOT read from state.js.
import { C } from "../../colors.js";
import { navigate } from "../../router.js";
import { icon, hydrateIcons, wireImageFallbacks, qs, qsa } from "../../utils.js";

const STAGES = [
  {
    label: "Application Submitted",
    desc: "Your application has been received and assigned a case ID.",
    done: true, active: false,
  },
  {
    label: "Referred to Bank",
    desc: "Application has been forwarded to HBL SME Finance Division for assessment.",
    done: true, active: false,
  },
  {
    label: "Under Assessment",
    desc: "HBL is conducting credit bureau check, AML screening and due diligence.",
    done: false, active: true,
  },
  {
    label: "Offer Issued",
    desc: "A conditional financing offer will be generated upon successful assessment.",
    done: false, active: false,
  },
  {
    label: "Offer Accepted",
    desc: "Accept the conditional offer to proceed with legal documentation.",
    done: false, active: false,
  },
  {
    label: "Disbursed",
    desc: "Financing amount credited to your nominated bank account.",
    done: false, active: false,
  },
];

const CASE_SUMMARY = [
  { label: "Case ID", value: "SBP-SME-2025-00142", mono: true },
  { label: "Scheme", value: "SME Asaan Finance (SAAF)", mono: false },
  { label: "Amount Requested", value: "PKR 8,500,000", mono: true },
  { label: "Assigned Bank", value: "HBL SME Finance", mono: false },
  { label: "Submission Date", value: "June 12, 2025", mono: false },
  { label: "Current Stage", value: "Under Assessment (3/6)", mono: false },
];

function stageIconHtml(done, active) {
  if (done) return icon("check-circle-2", { size: 16, color: "#FFFFFF" });
  if (active) return icon("clock", { size: 16, color: "#D97706" });
  return icon("circle", { size: 16, color: C.border });
}

export function render(container) {
  container.innerHTML = `
    <div class="px-6 py-6" style="font-family:var(--font-display);">
      <div class="flex items-center gap-3 mb-6">
        <button data-back class="p-2 rounded-xl hover:bg-white border" style="border:1.5px solid ${C.border};">
          ${icon("arrow-left", { size: 16, color: C.textMuted })}
        </button>
        <div>
          <h1 class="text-lg font-bold" style="color:${C.text};">Application Tracking</h1>
          <p class="text-xs" style="color:${C.textMuted};">SME Asaan Finance — ABC Traders</p>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <!-- Timeline -->
        <div class="lg:col-span-2">
          <div class="rounded-2xl border overflow-hidden" style="background:${C.surface};border:1.5px solid ${C.border};">
            <div class="px-5 py-4 border-b flex items-center justify-between" style="border-color:${C.border};">
              <h2 class="text-sm font-semibold" style="color:${C.text};">Application Journey</h2>
              <span class="text-xs px-3 py-1 rounded-full font-semibold" style="background:#FEF3C7;color:#D97706;">Under Assessment</span>
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
                      ${label}
                      ${active ? `<span class="ml-2 text-xs px-2 py-0.5 rounded-full" style="background:#FEF3C7;color:#D97706;">In Progress</span>` : ""}
                    </h3>
                    <p class="text-xs leading-snug" style="color:${done || active ? C.textMuted : "#CBD5E1"};">${desc}</p>
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
                  <span class="text-xs" style="color:${C.textMuted};">${label}</span>
                  <span class="text-sm font-semibold" style="color:${C.text};${mono ? "font-family:var(--font-mono);" : ""}">${value}</span>
                </div>
              `).join("")}
            </div>
          </div>

          <div class="rounded-2xl border p-5" style="background:${C.surface};border:1.5px solid ${C.border};">
            <h2 class="text-sm font-semibold mb-3" style="color:${C.text};">Assigned Bank</h2>
            <div class="flex items-center gap-3 mb-3">
              <div class="w-10 h-10 rounded-xl flex items-center justify-center" style="background:${C.blueLight};">
                ${icon("building-2", { size: 20, color: C.blue })}
              </div>
              <div>
                <div class="text-sm font-bold" style="color:${C.text};">HBL</div>
                <div class="text-xs" style="color:${C.textMuted};">Habib Bank Limited</div>
              </div>
            </div>
            <div class="text-xs leading-snug" style="color:${C.textMuted};">
              SME Finance Division<br />
              I.I. Chundrigar Road, Karachi<br />
              Contact: 021-111-425-888
            </div>
          </div>

          <button data-view-offer class="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white" style="background:${C.green};">
            View Offer Letter ${icon("arrow-right", { size: 16 })}
          </button>
        </div>
      </div>
    </div>
  `;

  wireEvents(container);
  hydrateIcons();
  wireImageFallbacks(container);
}

function wireEvents(container) {
  qs("[data-back]", container).addEventListener("click", () => navigate("/sme"));
  qs("[data-view-offer]", container).addEventListener("click", () => navigate("/sme/offer"));
}
