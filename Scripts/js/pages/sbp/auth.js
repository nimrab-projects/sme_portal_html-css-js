// SBP Admin Portal sync (Phase 1). Previously 100% mock: 3 credential fields (email/password/
// admin key) that were never validated, followed by a 6-digit MFA step that accepted any code
// and logged in as a hardcoded fake user regardless of input. Now real email + OTP only - the
// exact same mechanism Bank Officer login already uses (Controllers/AccountController.cs's
// SbpAdminLoginRequestOtp/VerifyOtp), just a different role/purpose. The left panel's SBP
// Admin branding/copy/warnings are kept exactly as they were; only the actual form step changed
// from 3 fake fields to the one real field that matters.
import { navigate } from "../../router.js";
import { C } from "../../colors.js";
import { icon, hydrateIcons, wireImageFallbacks, escapeHtml, qs, qsa } from "../../utils.js";
import * as api from "../../api.js";

export function render(container) {
  let email = "";
  let step = "credentials"; // "credentials" | "otp"
  let otp = "";
  let sending = false;
  let verifying = false;
  let error = "";

  // This page's own bootstrap (bootstrap/home.js) mounts the public landing page, which never
  // calls loadCsrfToken() itself - this form's Send OTP/Verify calls are the first POSTs made
  // on it, so the token is fetched lazily, once, right before it's actually needed (same
  // reasoning as js/pages/bank/auth.js).
  let csrfReady = api.loadCsrfToken();

  async function handleSendOtp() {
    if (!email.trim() || sending) return;
    sending = true;
    error = "";
    otp = "";
    renderAll();

    await csrfReady;
    const result = await api.requestSbpAdminLoginOtp(email.trim());
    sending = false;

    if (!result || !result.success) {
      error = (result && result.message) || "Couldn't send an OTP for this account. Please check your email and try again.";
      renderAll();
      return;
    }

    step = "otp";
    renderAll();
  }

  async function handleVerify() {
    if (verifying) return;
    verifying = true;
    error = "";
    renderAll();

    const result = await api.verifySbpAdminLoginOtp(email.trim(), otp);
    verifying = false;

    if (!result || !result.success) {
      error = (result && result.message) || "That code didn't match. Please try again.";
      renderAll();
      return;
    }

    // Real MVC navigation (not router.js's hash navigate()) - /Sbp is a server-protected page
    // (SbpController's [Authorize(Roles="SbpAdmin")]), same reason Bank Portal's own
    // Verify & Enter does a real window.location.href instead of a hash change.
    window.location.href = "/Sbp";
  }

  function buildHtml() {
    return `
      <div class="min-h-screen flex" style="font-family:var(--font-display);">

        <!-- Left panel - orange/amber -->
        <div class="hidden lg:flex lg:w-[420px] flex-shrink-0 flex-col justify-between px-10 py-12 relative overflow-hidden"
          style="background:linear-gradient(160deg, #1C0A00 0%, #3A1200 70%, #3D1400 100%);">
          <div class="absolute inset-0 pointer-events-none overflow-hidden">
            <div class="absolute -bottom-24 -left-24 w-72 h-72 rounded-full opacity-10"
              style="background:radial-gradient(circle, #FB923C, transparent 70%);"></div>
          </div>

          <div class="relative z-10">
            <button data-nav-home class="flex items-center gap-2 mb-10 text-white transition-opacity hover:opacity-80 text-sm">
              ${icon("arrow-left", { size: 16 })} Back to Portal
            </button>

            <div class="w-16 h-16 rounded-2xl flex items-center justify-center mb-6" style="background:rgba(255,255,255,0.08);">
              <img data-fallback src="/Content/images/state_bank_of_pakistan_logo-1.png" alt="SBP" class="w-14 h-14 object-contain" style="filter:brightness(0) invert(1);" />
            </div>

            <div class="inline-block px-3 py-1 rounded-full text-xs font-semibold mb-4"
              style="background:rgba(251,146,60,0.15);color:#FB923C;font-family:var(--font-mono);">
              SBP Admin Portal
            </div>

            <h2 class="text-2xl font-extrabold text-white mb-2">Administrative Access</h2>
            <p class="text-white text-sm leading-relaxed mb-8">
              Restricted access for State Bank of Pakistan administrators and oversight personnel.
            </p>

            <div class="p-4 rounded-xl" style="background:rgba(251,146,60,0.1);border:1px solid rgba(251,146,60,0.2);">
              <div class="flex items-start gap-2 mb-2">
                ${icon("alert-triangle", { size: 16, color: "#FB923C", style: "margin-top:2px;" })}
                <p class="text-white text-xs font-semibold uppercase tracking-wider" style="font-family:var(--font-mono);">Restricted Access</p>
              </div>
              <p class="text-white text-xs leading-relaxed">
                This portal is restricted to authorized SBP personnel only. Multi-factor authentication
                is mandatory. All sessions are monitored and logged.
              </p>
            </div>
          </div>

          <div class="relative z-10 space-y-3">
            <div class="flex items-center gap-3">
              <div class="w-6 h-6 rounded-full flex items-center justify-center" style="background:rgba(251,146,60,0.15);">
                ${icon("shield-check", { size: 14, color: "#FB923C" })}
              </div>
              <span class="text-white text-xs">Two-factor authentication required</span>
            </div>
            <div class="flex items-center gap-3">
              <div class="w-6 h-6 rounded-full flex items-center justify-center" style="background:rgba(251,146,60,0.15);">
                ${icon("key-round", { size: 14, color: "#FB923C" })}
              </div>
              <span class="text-white text-xs">One-time passcode sent to your official email</span>
            </div>
          </div>
        </div>

        <!-- Right form -->
        <div class="flex-1 flex items-center justify-center px-6 py-12" style="background:${C.bg};">
          <div class="w-full max-w-md">
            <button data-nav-home class="lg:hidden flex items-center gap-2 mb-6 text-sm" style="color:${C.textMuted};">
              ${icon("arrow-left", { size: 16 })} Back
            </button>

            <div class="lg:hidden flex items-center gap-3 mb-8">
              <div class="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style="background:linear-gradient(160deg, #3A1200, #1C0A00);">
                <img data-fallback src="/Content/images/state_bank_of_pakistan_logo-1.png" alt="SBP" class="w-9 h-9 object-contain" style="filter:brightness(0) invert(1);" />
              </div>
              <div>
                <h2 class="text-base font-extrabold" style="color:${C.text};">SBP Admin Portal</h2>
                <p class="text-xs" style="color:${C.textMuted};">State Bank of Pakistan</p>
              </div>
            </div>

            ${step === "credentials" ? `
              <div class="rounded-2xl border p-6 md:p-8" style="border:1.5px solid ${C.border};background:${C.surface};">
                <div class="flex items-center gap-3 mb-6">
                  <div class="w-10 h-10 rounded-xl flex items-center justify-center" style="background:${C.orangeLight};">
                    ${icon("shield-check", { size: 20, color: C.orange })}
                  </div>
                  <div>
                    <h3 class="text-lg font-bold" style="color:${C.text};">SBP Admin Login</h3>
                    <p class="text-xs" style="color:${C.textMuted};">Enter your details to receive a one-time passcode</p>
                  </div>
                </div>

                <div class="space-y-4">
                  <div>
                    <label class="block text-sm font-medium mb-1.5" style="color:${C.text};">Official SBP Email</label>
                    <div class="relative">
                      <div class="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">${icon("mail", { size: 16, color: C.textMuted })}</div>
                      <input data-field="email" type="email" placeholder="name@sbp.org.pk" value="${escapeHtml(email)}"
                        class="w-full rounded-xl text-sm outline-none"
                        style="padding:12px 16px 12px 40px;background:${C.surface};border:1.5px solid ${C.border};color:${C.text};" />
                    </div>
                  </div>
                </div>

                ${error ? `
                  <div class="mt-4 p-3 rounded-xl flex gap-2.5" style="background:#FEE2E2;border:1.5px solid #DC2626;">
                    ${icon("x-circle", { size: 16, color: "#DC2626", style: "margin-top:2px;" })}
                    <p class="text-xs leading-relaxed" style="color:#DC2626;">${escapeHtml(error)}</p>
                  </div>
                ` : ""}

                <button data-action="send-otp" ${sending ? "disabled" : ""}
                  class="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm text-white transition-all hover:opacity-90 mt-6 disabled:opacity-60"
                  style="background:${C.orange};">
                  ${sending ? "Sending..." : "Send OTP"} ${icon("arrow-right", { size: 16 })}
                </button>

                <div class="mt-6 p-4 rounded-xl flex gap-3" style="background:${C.orangeLight};border:1.5px solid ${C.orange}20;">
                  ${icon("key-round", { size: 16, color: C.orange, style: "margin-top:2px;" })}
                  <p class="text-xs leading-relaxed" style="color:${C.orange};">
                    <span class="font-semibold">Authorized access only.</span> Unauthorized access attempts
                    are logged and reported to SBP compliance. Use your official institutional email.
                  </p>
                </div>
              </div>
            ` : `
              <div class="rounded-2xl border p-6 md:p-8" style="border:1.5px solid ${C.border};background:${C.surface};">
                <div class="flex items-center gap-3 mb-6">
                  <div class="w-10 h-10 rounded-xl flex items-center justify-center" style="background:${C.orangeLight};">
                    ${icon("shield-check", { size: 20, color: C.orange })}
                  </div>
                  <div>
                    <h3 class="text-lg font-bold" style="color:${C.text};">Two-Factor Authentication</h3>
                    <p class="text-xs" style="color:${C.textMuted};">Step 2 of 2 — MFA Verification</p>
                  </div>
                </div>

                <p class="text-sm mb-6" style="color:${C.textMuted};">
                  We've sent a 6-digit one-time passcode to <span class="font-semibold" style="color:${C.text};">${escapeHtml(email || "your registered email")}</span>.
                </p>

                <div class="flex justify-center gap-3 mb-8">
                  ${[0, 1, 2, 3, 4, 5].map((i) => `
                    <input data-otp-idx="${i}" id="sbp-otp-${i}" type="text" maxlength="1"
                      class="w-12 h-14 text-center text-xl font-bold rounded-xl border-2 outline-none otp-input"
                      style="border:2px solid ${C.border};color:${C.text};background:${C.surface};font-family:var(--font-mono);" />
                  `).join("")}
                </div>

                ${error ? `
                  <div class="mb-4 p-3 rounded-xl flex gap-2.5" style="background:#FEE2E2;border:1.5px solid #DC2626;">
                    ${icon("x-circle", { size: 16, color: "#DC2626", style: "margin-top:2px;" })}
                    <p class="text-xs leading-relaxed" style="color:#DC2626;">${escapeHtml(error)}</p>
                  </div>
                ` : ""}

                <button data-action="verify" ${verifying ? "disabled" : ""}
                  class="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm text-white transition-all hover:opacity-90 disabled:opacity-60"
                  style="background:${C.orange};">
                  ${verifying ? "Verifying..." : "Verify & Enter Admin Portal"} ${icon("arrow-right", { size: 16 })}
                </button>

                <button data-action="resend" class="w-full mt-3 text-xs font-medium" style="color:${C.orange};">Resend OTP</button>

                <button data-action="back-to-credentials" class="w-full mt-1 text-sm py-2" style="color:${C.textMuted};">
                  ← Back to credentials
                </button>
              </div>
            `}
          </div>
        </div>
      </div>

      <style>
        .otp-input:focus { border-color: ${C.orange} !important; }
      </style>
    `;
  }

  function wireEvents() {
    qsa("[data-nav-home]", container).forEach((btn) => btn.addEventListener("click", () => navigate("/")));

    const sendOtpBtn = qs('[data-action="send-otp"]', container);
    if (sendOtpBtn) sendOtpBtn.addEventListener("click", handleSendOtp);

    const verifyBtn = qs('[data-action="verify"]', container);
    if (verifyBtn) verifyBtn.addEventListener("click", handleVerify);

    const backBtn = qs('[data-action="back-to-credentials"]', container);
    if (backBtn) backBtn.addEventListener("click", () => { step = "credentials"; error = ""; renderAll(); });

    const resendBtn = qs('[data-action="resend"]', container);
    if (resendBtn) resendBtn.addEventListener("click", handleSendOtp);

    const emailInput = qs('[data-field="email"]', container);
    if (emailInput) emailInput.addEventListener("input", (e) => { email = e.target.value; });

    // OTP boxes are uncontrolled (no `value` prop) - otp is built by string concatenation on
    // every keystroke across any box, same convention as js/pages/bank/auth.js's own OTP boxes.
    qsa("[data-otp-idx]", container).forEach((input) => {
      input.addEventListener("input", (e) => {
        const idx = parseInt(input.getAttribute("data-otp-idx"), 10);
        const val = e.target.value;
        otp += val;
        if (val) {
          const next = document.getElementById(`sbp-otp-${idx + 1}`);
          if (next) next.focus();
        }
      });
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
