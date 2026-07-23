// 1:1 port of src/app/pages/sme/MyBusinesses.tsx
import { state, setSelectedBusiness } from "../../state.js";
import { C } from "../../colors.js";
import { navigate } from "../../router.js";
import { icon, hydrateIcons, wireImageFallbacks, qs, qsa } from "../../utils.js";

export function render(container) {
  const { businesses, selectedBusiness } = state;

  container.innerHTML = `
    <div class="px-6 py-6">
      <div class="flex items-start justify-between mb-6">
        <div>
          <h1 class="text-xl font-bold" style="color:${C.text};">My Businesses</h1>
          <p class="text-sm mt-0.5" style="color:${C.textMuted};">Manage the business profiles linked to your account</p>
        </div>
        <button data-add-business class="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
          style="background:${C.green};">
          ${icon("plus-circle", { size: 16 })} Add Business
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        ${businesses.map((biz) => {
          const active = selectedBusiness?.id === biz.id;
          return `
            <button data-biz-id="${biz.id}" class="text-left rounded-2xl border p-5 transition-all hover:shadow-md"
              style="background:${C.surface};border:1.5px solid ${active ? C.green : C.border};${active ? `box-shadow:0 0 0 3px ${C.green}18;` : ""}">
              <div class="flex items-start justify-between mb-3">
                <div class="w-10 h-10 rounded-xl flex items-center justify-center" style="background:${C.greenLight};">
                  ${icon("building-2", { size: 20, color: C.green })}
                </div>
                ${active ? `
                  <span class="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full" style="background:${C.greenLight};color:${C.green};">
                    ${icon("check-circle-2", { size: 12 })} Active
                  </span>
                ` : ""}
              </div>

              <h2 class="text-base font-bold mb-0.5" style="color:${C.text};">${biz.name}</h2>
              <p class="text-xs mb-3" style="color:${C.textMuted};">${biz.nature}</p>

              <div class="space-y-1.5">
                <div class="flex items-center gap-2 text-xs" style="color:${C.textMuted};">
                  ${icon("hash", { size: 14, className: "flex-shrink-0" })}
                  <span>NTN: ${biz.ntn || "—"}</span>
                </div>
                <div class="flex items-start gap-2 text-xs" style="color:${C.textMuted};">
                  ${icon("map-pin", { size: 14, className: "flex-shrink-0 mt-0.5" })}
                  <span class="leading-snug">${biz.address || "—"}</span>
                </div>
              </div>

              <div class="mt-4 pt-3 border-t flex items-center justify-between" style="border-color:${C.border};">
                <span class="text-xs font-semibold px-2.5 py-1 rounded-full" style="background:${C.greenLight};color:${C.green};">${biz.status}</span>
                ${!active ? `<span class="text-xs font-medium" style="color:${C.green};">Select →</span>` : ""}
              </div>
            </button>
          `;
        }).join("")}
      </div>

      ${businesses.length === 0 ? `
        <div class="rounded-2xl border p-10 text-center" style="background:${C.surface};border:1.5px solid ${C.border};">
          ${icon("building-2", { size: 40, color: C.textMuted, className: "mx-auto mb-3 opacity-30" })}
          <p class="text-sm" style="color:${C.textMuted};">No businesses added yet.</p>
        </div>
      ` : ""}
    </div>
  `;

  wireEvents(container);
  hydrateIcons();
  wireImageFallbacks(container);
}

function wireEvents(container) {
  qs("[data-add-business]", container)?.addEventListener("click", () => navigate("/sme/setup"));

  qsa("[data-biz-id]", container).forEach((btn) => {
    btn.addEventListener("click", () => {
      const biz = state.businesses.find((b) => b.id === btn.getAttribute("data-biz-id"));
      if (biz) setSelectedBusiness(biz);
    });
  });
}
