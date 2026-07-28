// Personal Profile - Edit (Phase 10). Only Full Name and Phone Number are editable, matching
// the spec exactly: Email is intentionally never editable here (no email-verification workflow
// exists yet to safely support changing it - see Services/UserService.cs). Reuses the same
// field/label markup style already established in js/pages/sme/businessSetup.js.
import { C } from "../../colors.js";
import { navigate } from "../../router.js";
import { icon, escapeHtml, hydrateIcons, wireImageFallbacks, qs } from "../../utils.js";
import * as api from "../../api.js";

function fieldHtml({ key, label, placeholder, type = "text", value, readOnly = false }) {
  return `
    <div>
      <label class="block text-sm font-medium mb-1.5" style="color:${C.text};">${escapeHtml(label)}</label>
      <input data-field="${key}" type="${type}" placeholder="${escapeHtml(placeholder ?? "")}" value="${escapeHtml(value)}"
        ${readOnly ? "disabled" : ""}
        class="w-full rounded-xl border text-sm outline-none transition-all field-input"
        style="padding:11px 14px;background:${readOnly ? C.bg : C.surface};border:1.5px solid ${C.border};color:${readOnly ? C.textMuted : C.text};" />
    </div>
  `;
}

export function render(container) {
  let loading = true;
  let profile = null;
  let form = { fullName: "", mobile: "" };
  let saveError = "";
  let saving = false;
  let showSuccess = false;

  function loadingHtml() {
    return `<div class="px-6 py-10 text-center text-sm" style="color:${C.textMuted};">Loading profile…</div>`;
  }

  function contentHtml() {
    return `
      <div class="px-6 py-6" style="font-family:var(--font-display);">
        <div class="flex items-center gap-3 mb-6">
          <button data-back class="p-2 rounded-xl hover:bg-white border" style="border:1.5px solid ${C.border};">
            ${icon("arrow-left", { size: 16, color: C.textMuted })}
          </button>
          <div>
            <h1 class="text-lg font-bold" style="color:${C.text};">Edit Profile</h1>
            <p class="text-xs" style="color:${C.textMuted};">Update your personal information</p>
          </div>
        </div>

        ${saveError ? `
          <div class="rounded-xl p-3 flex gap-2.5 mb-4 max-w-2xl" style="background:#FEE2E2;border:1.5px solid #DC2626;">
            ${icon("x-circle", { size: 16, color: "#DC2626", style: "margin-top:2px;" })}
            <p class="text-xs leading-relaxed" style="color:#DC2626;">${escapeHtml(saveError)}</p>
          </div>
        ` : ""}
        ${showSuccess ? `
          <div class="rounded-xl p-3 flex gap-2.5 mb-4 max-w-2xl" style="background:${C.greenLight};border:1.5px solid ${C.green};">
            ${icon("check-circle-2", { size: 16, color: C.green, style: "margin-top:2px;" })}
            <p class="text-xs leading-relaxed" style="color:${C.green};">Profile updated successfully.</p>
          </div>
        ` : ""}

        <div class="max-w-2xl rounded-2xl border p-6 space-y-4" style="background:${C.surface};border:1.5px solid ${C.border};">
          ${fieldHtml({ key: "fullName", label: "Full Name", placeholder: "Ahmed Khan", value: form.fullName })}
          ${fieldHtml({ key: "email", label: "Email Address", value: profile?.email ?? "", readOnly: true })}
          ${fieldHtml({ key: "mobile", label: "Phone Number", placeholder: "+92 300 0000000", value: form.mobile })}

          <div class="flex items-center justify-between pt-4 border-t" style="border-color:${C.border};">
            <button data-cancel class="px-5 py-2.5 rounded-xl border text-sm font-medium" style="border:1.5px solid ${C.border};color:${C.text};">
              Cancel
            </button>
            <button data-save ${saving ? "disabled" : ""} class="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40" style="background:${C.green};">
              ${saving ? "Saving…" : "Save Changes"} ${icon("check-circle-2", { size: 16, color: "#fff" })}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  function wireEvents() {
    qs("[data-back]", container)?.addEventListener("click", () => navigate("/sme/profile"));
    qs("[data-cancel]", container)?.addEventListener("click", () => navigate("/sme/profile"));

    const fullNameInput = qs('[data-field="fullName"]', container);
    fullNameInput?.addEventListener("input", (e) => { form.fullName = e.target.value; });
    const mobileInput = qs('[data-field="mobile"]', container);
    mobileInput?.addEventListener("input", (e) => { form.mobile = e.target.value; });

    qs("[data-save]", container)?.addEventListener("click", async () => {
      if (saving) return;
      saving = true;
      saveError = "";
      showSuccess = false;
      renderAll();

      const result = await api.updateProfile({ fullName: form.fullName, mobile: form.mobile });
      saving = false;
      if (!result || !result.success) {
        saveError = (result && result.message) || "Couldn't save your profile. Please try again.";
        renderAll();
        return;
      }

      profile = result.profile;
      form = { fullName: profile.fullName, mobile: profile.mobile };
      showSuccess = true;
      renderAll();
    });
  }

  function renderAll() {
    container.innerHTML = loading ? loadingHtml() : contentHtml();
    wireEvents();
    hydrateIcons();
    wireImageFallbacks(container);
  }

  renderAll();

  api.getMyProfile().then((result) => {
    loading = false;
    profile = (result && result.profile) || {};
    form = { fullName: profile.fullName || "", mobile: profile.mobile || "" };
    renderAll();
  });
}
