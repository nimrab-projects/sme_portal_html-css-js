// 1:1 port of src/app/pages/bank/BankAuth.tsx
import { setUser } from "../../state.js";
import { navigate } from "../../router.js";
import { C } from "../../colors.js";
import { icon, hydrateIcons, wireImageFallbacks, escapeHtml, qs, qsa } from "../../utils.js";

const GOOGLE_LOGO_SVG = `<svg width="18" height="18" viewBox="0 0 18 18" fill="none">
  <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
  <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
  <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
</svg>`;

const MICROSOFT_LOGO_SVG = `<svg width="18" height="18" viewBox="0 0 18 18" fill="none">
  <rect x="0" y="0" width="8.5" height="8.5" fill="#F25022"/>
  <rect x="9.5" y="0" width="8.5" height="8.5" fill="#7FBA00"/>
  <rect x="0" y="9.5" width="8.5" height="8.5" fill="#00A4EF"/>
  <rect x="9.5" y="9.5" width="8.5" height="8.5" fill="#FFB900"/>
</svg>`;

const APPLE_LOGO_SVG = `<svg width="18" height="18" viewBox="0 0 814 1000" fill="currentColor">
  <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.3-161-39.3c-73.3 0-98.7 40.1-167.4 40.1s-107.9-58.7-155.5-127.5c-55.1-77.7-98.5-209.5-98.5-334.6 0-197.5 133.2-302 264.7-302 70.2 0 128.7 45.7 172.3 45.7 41.7 0 107.4-48.1 185.5-48.1 29.6 0 108.2 2.6 168.4 101zM541.9 58.4c26.7-30.7 45.7-73.3 45.7-115.9 0-6.4-.6-12.9-1.9-18.1-44.5 1.9-98.7 30.1-131.5 63.5-24.8 26.7-47.5 69.9-47.5 113.1 0 7 1.3 14 1.9 16.4 2.6.6 7 1.3 11.3 1.3 40.1 0 91.4-26.8 121.9-60.3z"/>
</svg>`;

const SSO_PROVIDERS = [
  { label: "Continue with Google", provider: "Google", logo: GOOGLE_LOGO_SVG },
  { label: "Continue with Microsoft", provider: "Microsoft", logo: MICROSOFT_LOGO_SVG },
  { label: "Continue with Apple", provider: "Apple", logo: APPLE_LOGO_SVG },
];

const BANKS = ["HBL", "UBL", "MCB", "NBP", "Allied Bank", "Meezan Bank", "Bank Alfalah", "Faysal Bank"];

function ssoIconRowHtml() {
  return `
    <div class="flex items-center justify-center gap-3">
      ${SSO_PROVIDERS.map(({ label, provider, logo }) => `
        <button type="button" data-sso="${provider}" aria-label="${label}" title="${label}"
          class="flex items-center justify-center w-12 h-12 rounded-xl border transition-all hover:bg-gray-50 active:scale-[0.98]"
          style="border:1.5px solid ${C.border};background:#fff;">
          ${logo}
        </button>
      `).join("")}
    </div>
  `;
}

export function render(container) {
  let email = "";
  let bankCode = "";
  let step = "credentials"; // "credentials" | "otp"
  let otp = "";

  function handleSendOtp() {
    step = "otp";
    renderAll();
  }

  function handleVerify() {
    setUser({ name: "Bilal Raza — HBL Credit", email: email || "bilal.raza@hbl.com" });
    navigate("/bank");
  }

  function handleSso(provider) {
    setUser({ name: "Bilal Raza — HBL Credit", email: `bilal.raza@${provider.toLowerCase()}.com` });
    navigate("/bank");
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
                  <label class="block text-sm font-medium mb-1.5" style="color:${C.text};">Bank Code</label>
                  <div class="relative">
                    <div class="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                      ${icon("building-2", { size: 16, color: C.textMuted })}
                    </div>
                    <select data-field="bankCode" class="w-full rounded-xl border text-sm outline-none appearance-none"
                      style="padding:12px 40px 12px 40px;background:${C.surface};border:1.5px solid ${C.border};color:${C.text};">
                      <option value="" ${bankCode === "" ? "selected" : ""}>Select your bank</option>
                      ${BANKS.map((b) => `<option value="${b}" ${bankCode === b ? "selected" : ""}>${b}</option>`).join("")}
                    </select>
                    <div class="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                      ${icon("chevron-down", { size: 16, color: C.textMuted })}
                    </div>
                  </div>
                </div>

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

              <button data-action="send-otp"
                class="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm text-white transition-all hover:opacity-90 mt-6"
                style="background:${C.blue};">
                Send OTP ${icon("arrow-right", { size: 16 })}
              </button>

              <div class="mt-6">
                ${ssoIconRowHtml()}
              </div>

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

              <button data-action="verify"
                class="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm text-white transition-all hover:opacity-90"
                style="background:${C.blue};">
                Verify & Sign In ${icon("arrow-right", { size: 16 })}
              </button>

              <button class="w-full mt-3 text-xs font-medium" style="color:${C.blue};">Resend OTP</button>

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

    qsa("[data-sso]", container).forEach((btn) => {
      btn.addEventListener("click", () => handleSso(btn.getAttribute("data-sso")));
    });

    const sendOtpBtn = qs('[data-action="send-otp"]', container);
    if (sendOtpBtn) sendOtpBtn.addEventListener("click", handleSendOtp);

    const verifyBtn = qs('[data-action="verify"]', container);
    if (verifyBtn) verifyBtn.addEventListener("click", handleVerify);

    const backBtn = qs('[data-action="back-to-credentials"]', container);
    if (backBtn) backBtn.addEventListener("click", () => { step = "credentials"; renderAll(); });

    const emailInput = qs('[data-field="email"]', container);
    if (emailInput) emailInput.addEventListener("input", (e) => { email = e.target.value; });

    const bankSelect = qs('[data-field="bankCode"]', container);
    if (bankSelect) bankSelect.addEventListener("change", (e) => { bankCode = e.target.value; });

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
