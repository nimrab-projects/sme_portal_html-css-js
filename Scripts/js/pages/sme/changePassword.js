// Change Password (Phase 10). Reuses ASP.NET Identity end-to-end (Controllers/
// ProfileController.cs's change-password action calls UserManager.ChangePasswordAsync
// directly) - no custom password logic anywhere in this page or the backend. Same visual
// pattern as the rest of this app's forms (js/pages/sme/businessSetup.js's field style).
import { C } from "../../colors.js";
import { navigate } from "../../router.js";
import { icon, escapeHtml, hydrateIcons, wireImageFallbacks, qs } from "../../utils.js";
import * as api from "../../api.js";

function passwordFieldHtml(key, label) {
  return `
    <div>
      <label class="block text-sm font-medium mb-1.5" style="color:${C.text};">${label}</label>
      <input data-field="${key}" type="password" placeholder="••••••••"
        class="w-full rounded-xl border text-sm outline-none transition-all field-input"
        style="padding:11px 14px;background:${C.surface};border:1.5px solid ${C.border};color:${C.text};" />
    </div>
  `;
}

export function render(container) {
  let form = { currentPassword: "", newPassword: "", confirmPassword: "" };
  let saveError = "";
  let saving = false;
  let showSuccess = false;

  function buildHtml() {
    return `
      <div class="px-6 py-6" style="font-family:var(--font-display);">
        <div class="flex items-center gap-3 mb-6">
          <button data-back class="p-2 rounded-xl hover:bg-white border" style="border:1.5px solid ${C.border};">
            ${icon("arrow-left", { size: 16, color: C.textMuted })}
          </button>
          <div>
            <h1 class="text-lg font-bold" style="color:${C.text};">Change Password</h1>
            <p class="text-xs" style="color:${C.textMuted};">Update your account password</p>
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
            <p class="text-xs leading-relaxed" style="color:${C.green};">Password changed successfully.</p>
          </div>
        ` : ""}

        <div class="max-w-2xl rounded-2xl border p-6 space-y-4" style="background:${C.surface};border:1.5px solid ${C.border};">
          ${passwordFieldHtml("currentPassword", "Current Password")}
          ${passwordFieldHtml("newPassword", "New Password")}
          ${passwordFieldHtml("confirmPassword", "Confirm New Password")}
          <p class="text-xs" style="color:${C.textMuted};">Must contain uppercase, lowercase, number and special character (min. 8 characters).</p>

          <div class="flex items-center justify-between pt-4 border-t" style="border-color:${C.border};">
            <button data-cancel class="px-5 py-2.5 rounded-xl border text-sm font-medium" style="border:1.5px solid ${C.border};color:${C.text};">
              Cancel
            </button>
            <button data-save ${saving ? "disabled" : ""} class="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40" style="background:${C.green};">
              ${saving ? "Saving…" : "Change Password"} ${icon("check-circle-2", { size: 16, color: "#fff" })}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  function wireEvents() {
    qs("[data-back]", container)?.addEventListener("click", () => navigate("/sme/profile"));
    qs("[data-cancel]", container)?.addEventListener("click", () => navigate("/sme/profile"));

    ["currentPassword", "newPassword", "confirmPassword"].forEach((key) => {
      qs(`[data-field="${key}"]`, container)?.addEventListener("input", (e) => { form[key] = e.target.value; });
    });

    qs("[data-save]", container)?.addEventListener("click", async () => {
      if (saving) return;
      saveError = "";
      showSuccess = false;

      if (form.newPassword !== form.confirmPassword) {
        saveError = "New password and confirmation do not match.";
        renderAll();
        return;
      }

      saving = true;
      renderAll();

      const result = await api.changePassword(form);
      saving = false;
      if (!result || !result.success) {
        saveError = (result && result.message) || "Couldn't change your password. Please try again.";
        renderAll();
        return;
      }

      form = { currentPassword: "", newPassword: "", confirmPassword: "" };
      showSuccess = true;
      renderAll();
    });
  }

  function renderAll() {
    container.innerHTML = buildHtml();
    wireEvents();
    hydrateIcons();
    wireImageFallbacks(container);
  }

  renderAll();
}
