// 1:1 port of src/app/pages/bank/BankAuth.tsx
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
  // calls loadCsrfToken() itself (its own buttons are all real navigations, never POSTs) - this
  // form's Send OTP/Verify calls are the first POSTs made on it, so the token is fetched lazily,
  // once, right before it's actually needed.
  let csrfReady = api.loadCsrfToken();

  async function handleSendOtp() {
    if (!email.trim() || sending) return;
    sending = true;
    error = "";
    otp = "";
    renderAll();

    await csrfReady;
    const result = await api.requestBankLoginOtp(email.trim());
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

    const result = await api.verifyBankLoginOtp(email.trim(), otp);
    verifying = false;

    if (!result || !result.success) {
      error = (result && result.message) || "That code didn't match. Please try again.";
      renderAll();
      return;
    }

    // Real MVC navigation (not router.js's hash navigate()) - /Bank is a server-protected page
    // (BankController's [Authorize(Roles="BankOfficer")]), the same reason the SME side's
    // Login/Setup success paths also do a real window.location.href instead of a hash change.
    window.location.href = "/Bank";
  }

  function buildHtml() {
    return `
      <div class="min-h-screen flex items-center justify-center px-6 py-12" style="font-family:var(--font-display);background:${C.bg};">
        <div class="w-full max-w-md">
          <button data-nav-home class="flex items-center gap-2 mb-6 text-sm" style="color:${C.textMuted};">
            ${icon("arrow-left", { size: 16 })} Back
          </button>

          <div class="flex items-center gap-3 mb-8">
            <div class="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style="background:linear-gradient(160deg, #1D4ED8, #1E3A8A);">
              <img data-fallback src="/Content/images/state_bank_of_pakistan_logo-1.png" alt="SBP" class="w-9 h-9 object-contain" style="filter:brightness(0) invert(1);" />
            </div>
            <div>
              <h2 class="text-base font-extrabold" style="color:${C.text};">Participating Bank Portal</h2>
              <p class="text-xs" style="color:${C.textMuted};">State Bank of Pakistan</p>
            </div>
          </div>

          ${step === "credentials" ? `
            <div class="rounded-2xl border p-6 md:p-8" style="border:1.5px solid ${C.border};background:${C.surface};">
              <h3 class="text-2xl font-bold mb-1" style="color:${C.text};">Bank Officer Sign In</h3>
              <p class="text-sm mb-8" style="color:${C.textMuted};">Enter your details to receive a one-time passcode</p>

              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium mb-1.5" style="color:${C.text};">Officer Email</label>
                  <div class="relative">
                    <div class="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                      ${icon("mail", { size: 16, color: C.textMuted })}
                    </div>
                    <input data-field="email" type="email" placeholder="officer@bank.com" value="${escapeHtml(email)}"
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
                style="background:${C.blue};">
                ${sending ? "Sending..." : "Send OTP"} ${icon("arrow-right", { size: 16 })}
              </button>

              <div class="mt-6 p-4 rounded-xl flex gap-3" style="background:${C.blueLight};border:1.5px solid ${C.blue}20;">
                ${icon("key-round", { size: 16, color: C.blue, style: "margin-top:2px;" })}
                <p class="text-xs leading-relaxed" style="color:${C.blue};">
                  <span class="font-semibold">Authorized access only.</span> Unauthorized access attempts
                  are logged and reported to SBP compliance. Use your official institutional credentials.
                </p>
              </div>
            </div>
          ` : `
            <div class="rounded-2xl border p-6 md:p-8" style="border:1.5px solid ${C.border};background:${C.surface};">
              <div class="flex items-center gap-3 mb-6">
                <div class="w-10 h-10 rounded-xl flex items-center justify-center" style="background:${C.blueLight};">
                  ${icon("shield-check", { size: 20, color: C.blue })}
                </div>
                <div>
                  <h3 class="text-lg font-bold" style="color:${C.text};">Enter OTP</h3>
                  <p class="text-xs" style="color:${C.textMuted};">Step 2 of 2 — Verification</p>
                </div>
              </div>

              <p class="text-sm mb-6" style="color:${C.textMuted};">
                We've sent a 6-digit one-time passcode to <span class="font-semibold" style="color:${C.text};">${escapeHtml(email || "your registered email")}</span>.
              </p>

              <div class="flex justify-center gap-3 mb-8">
                ${[0, 1, 2, 3, 4, 5].map((i) => `
                  <input data-otp-idx="${i}" id="bank-otp-${i}" type="text" maxlength="1"
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
                style="background:${C.blue};">
                ${verifying ? "Verifying..." : "Verify & Sign In"} ${icon("arrow-right", { size: 16 })}
              </button>

              <button data-action="resend" class="w-full mt-3 text-xs font-medium" style="color:${C.blue};">Resend OTP</button>

              <button data-action="back-to-credentials" class="w-full mt-1 text-sm py-2" style="color:${C.textMuted};">
                ← Back
              </button>
            </div>
          `}
        </div>
      </div>

      <style>
        .otp-input:focus { border-color: ${C.blue} !important; }
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

    // OTP boxes are uncontrolled in the source (no `value` prop) — the app-level
    // `otp` variable is built by string concatenation on every keystroke across
    // any box, regardless of index, and is never cleared on delete. Replicated
    // exactly rather than "fixed" into a proper per-box array.
    qsa("[data-otp-idx]", container).forEach((input) => {
      input.addEventListener("input", (e) => {
        const idx = parseInt(input.getAttribute("data-otp-idx"), 10);
        const val = e.target.value;
        otp += val;
        if (val) {
          const next = document.getElementById(`bank-otp-${idx + 1}`);
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
