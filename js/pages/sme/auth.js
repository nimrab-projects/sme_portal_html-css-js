// 1:1 port of src/app/pages/sme/SmeAuth.tsx
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

const OBJECTIVES = [
  { iconName: "target", text: "Provide easy, collateral-free business loans to eligible SMEs.", color: "#4ADE80", bg: "rgba(74,222,128,0.15)" },
  { iconName: "workflow", text: "Simplify and speed up the financing application process.", color: "#FB923C", bg: "rgba(251,146,60,0.15)" },
  { iconName: "link-2", text: "Connect eligible businesses with multiple participating banks.", color: "#4ADE80", bg: "rgba(74,222,128,0.15)" },
  { iconName: "shield-check", text: "Promote inclusive growth for underserved and women-led SMEs.", color: "#FB923C", bg: "rgba(251,146,60,0.15)" },
];

function ssoButtonsHtml() {
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

function formFieldHtml({ id, label, type = "text", placeholder, iconName, value, hint }) {
  const isPassword = type === "password";
  return `
    <div>
      <label class="block text-sm font-medium mb-1.5" style="color:${C.text};">${label}</label>
      <div class="relative">
        ${iconName ? `<div class="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">${icon(iconName, { size: 16, color: C.textMuted })}</div>` : ""}
        <input data-field="${id}" type="${isPassword ? "password" : type}" placeholder="${escapeHtml(placeholder)}" value="${escapeHtml(value)}"
          class="w-full rounded-xl border text-sm outline-none transition-all auth-input"
          style="padding:${iconName ? "12px 16px 12px 40px" : "12px 16px"};background:${C.surface};border:1.5px solid ${C.border};color:${C.text};padding-right:${isPassword ? "44px" : "16px"};" />
        ${isPassword ? `
          <button type="button" data-toggle-password="${id}" class="absolute right-3.5 top-1/2 -translate-y-1/2" style="color:${C.textMuted};">
            ${icon("eye", { size: 16 })}
          </button>` : ""}
      </div>
      ${hint ? `<p class="text-xs mt-1" style="color:${C.textMuted};">${hint}</p>` : ""}
    </div>
  `;
}

export function render(container) {
  let mode = "login"; // "login" | "register" | "otp"
  let email = "";
  let password = "";
  let name = "";
  let phone = "";
  let otp = ["", "", "", "", "", ""];

  function handleLogin() {
    setUser({ name: "Ahmed Khan", email: email || "ahmed.khan@abctraders.com" });
    navigate("/sme/setup");
  }

  function handleSso(provider) {
    setUser({ name: "Ahmed Khan", email: `ahmed.khan@${provider.toLowerCase()}.com` });
    navigate("/sme/setup");
  }

  function handleRegister() {
    mode = "otp";
    renderAll();
  }

  function handleOtp() {
    setUser({ name: name || "Ahmed Khan", email: email || "ahmed.khan@abctraders.com" });
    navigate("/sme/setup");
  }

  function buildHtml() {
    return `
      <div class="min-h-screen flex" style="font-family:var(--font-display);">

        <!-- Left brand panel -->
        <div class="hidden lg:flex lg:w-[400px] xl:w-[460px] flex-shrink-0 flex-col justify-between px-10 py-12 relative overflow-hidden"
          style="background:linear-gradient(160deg, #042614 0%, #063D1C 70%, #083E1C 100%);">
          <div class="absolute inset-0 pointer-events-none overflow-hidden">
            <div class="absolute -bottom-24 -left-24 w-72 h-72 rounded-full opacity-10"
              style="background:radial-gradient(circle, #4ADE80, transparent 70%);"></div>
          </div>

          <div class="relative z-10">
            <button data-nav-home class="flex items-center gap-2 mb-10 text-white/60 hover:text-white transition-colors text-sm">
              ${icon("arrow-left", { size: 16 })} Back to Portal
            </button>

            <div class="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 mx-auto"
              style="background:linear-gradient(160deg, rgba(255,255,255,0.14), rgba(255,255,255,0.04));border:1px solid rgba(255,255,255,0.18);box-shadow:0 0 24px rgba(74,222,128,0.25);">
              <img data-fallback src="assets/state_bank_of_pakistan_logo-1.png" alt="SBP" class="w-14 h-14 object-contain" style="filter:brightness(0) invert(1);" />
            </div>

            <h2 class="text-2xl font-extrabold text-white mb-2">SME Applicant Portal</h2>
            <p class="text-white text-xs leading-relaxed mb-8">
              Access Pakistan's central SME financing platform backed by the State Bank of Pakistan.
            </p>

            <h3 class="text-white text-base font-bold mb-3">Our Objective</h3>
            <div class="space-y-2">
              ${OBJECTIVES.map(({ iconName, text, color, bg }) => `
                <div class="flex items-center gap-3 p-2.5 rounded-xl transition-all"
                  style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.08);">
                  <div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style="background:${bg};">
                    ${icon(iconName, { size: 16, color })}
                  </div>
                  <span class="text-white text-xs leading-snug">${text}</span>
                </div>
              `).join("")}
            </div>
          </div>

          <div class="relative z-10">
            <div class="rounded-xl p-4" style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.08);">
              <p class="text-white/40 text-xs leading-relaxed">
                This portal is operated under the regulatory oversight of the State Bank of Pakistan.
                All data is encrypted and stored securely in compliance with Pakistan's data protection framework.
              </p>
            </div>
          </div>
        </div>

        <!-- Right form panel -->
        <div class="flex-1 flex items-center justify-center px-6 py-12" style="background:${C.bg};">
          <div class="w-full max-w-md">

            <button data-nav-home class="lg:hidden flex items-center gap-2 mb-6 text-sm" style="color:${C.textMuted};">
              ${icon("arrow-left", { size: 16 })} Back
            </button>

            <div class="lg:hidden flex items-center gap-3 mb-8">
              <div class="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style="background:linear-gradient(160deg, ${C.green}, ${C.greenDark});">
                <img data-fallback src="assets/state_bank_of_pakistan_logo-1.png" alt="SBP" class="w-9 h-9 object-contain" style="filter:brightness(0) invert(1);" />
              </div>
              <div>
                <h2 class="text-base font-extrabold" style="color:${C.text};">SME Applicant Portal</h2>
                <p class="text-xs" style="color:${C.textMuted};">State Bank of Pakistan</p>
              </div>
            </div>

            ${mode === "login" ? `
              <div class="rounded-2xl border p-6 md:p-8" style="border:1.5px solid ${C.border};background:${C.surface};">
                <h3 class="text-2xl font-bold mb-1" style="color:${C.text};">Welcome back</h3>
                <p class="text-sm mb-8" style="color:${C.textMuted};">Sign in to your SME applicant account</p>

                <div class="space-y-4">
                  ${formFieldHtml({ id: "email", label: "Email Address", type: "email", placeholder: "ahmed@company.com", iconName: "mail", value: email })}
                  ${formFieldHtml({ id: "password", label: "Password", type: "password", placeholder: "Enter your password", iconName: "lock", value: password })}
                </div>

                <div class="flex items-center justify-between mt-3 mb-6">
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" class="rounded" />
                    <span class="text-xs" style="color:${C.textMuted};">Remember me</span>
                  </label>
                  <button class="text-xs font-medium" style="color:${C.green};">Forgot Password?</button>
                </div>

                <button data-action="login"
                  class="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm text-white transition-all hover:opacity-90"
                  style="background:${C.green};">
                  Sign In ${icon("arrow-right", { size: 16 })}
                </button>

                <div class="flex items-center gap-3 my-5">
                  <div class="flex-1 h-px" style="background:${C.border};"></div>
                  <span class="text-xs" style="color:${C.textMuted};">or continue with</span>
                  <div class="flex-1 h-px" style="background:${C.border};"></div>
                </div>

                ${ssoButtonsHtml()}

                <p class="text-center text-sm mt-6" style="color:${C.textMuted};">
                  Don't have an account?
                  <button data-set-mode="register" class="font-semibold" style="color:${C.green};">Sign Up</button>
                </p>
              </div>
            ` : ""}

            ${mode === "register" ? `
              <div class="rounded-2xl border p-6 md:p-8" style="border:1.5px solid ${C.border};background:${C.surface};">
                <h3 class="text-2xl font-bold mb-1" style="color:${C.text};">Create Account</h3>
                <p class="text-sm mb-8" style="color:${C.textMuted};">Register as an SME applicant</p>

                <div class="space-y-4">
                  ${formFieldHtml({ id: "name", label: "Full Name", placeholder: "Ahmed Khan", iconName: "user", value: name })}
                  ${formFieldHtml({ id: "phone", label: "Mobile Number", placeholder: "+92 300 0000000", iconName: "phone", value: phone })}
                  ${formFieldHtml({ id: "email", label: "Email Address", type: "email", placeholder: "ahmed@company.com", iconName: "mail", value: email })}
                  ${formFieldHtml({ id: "password", label: "Password", type: "password", placeholder: "Min. 8 characters", iconName: "lock", value: password, hint: "Must contain uppercase, lowercase, number and special character" })}
                  ${formFieldHtml({ id: "confirm-password", label: "Confirm Password", type: "password", placeholder: "Re-enter your password", iconName: "lock", value: "" })}
                </div>

                <div class="mt-4 mb-6">
                  <label class="flex items-start gap-2 cursor-pointer">
                    <input type="checkbox" class="mt-0.5 rounded" />
                    <span class="text-xs leading-snug" style="color:${C.textMuted};">
                      I agree to the
                      <a href="#" class="underline" style="color:${C.green};">Terms of Service</a>
                      and
                      <a href="#" class="underline" style="color:${C.green};">Privacy Policy</a>
                    </span>
                  </label>
                </div>

                <button data-action="register"
                  class="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm text-white transition-all hover:opacity-90"
                  style="background:${C.green};">
                  Create Account ${icon("arrow-right", { size: 16 })}
                </button>

                <p class="text-center text-sm mt-6" style="color:${C.textMuted};">
                  Already have an account?
                  <button data-set-mode="login" class="font-semibold" style="color:${C.green};">Sign In</button>
                </p>
              </div>
            ` : ""}

            ${mode === "otp" ? `
              <div class="text-center rounded-2xl border p-6 md:p-8" style="border:1.5px solid ${C.border};background:${C.surface};">
                <div class="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6" style="background:${C.greenLight};">
                  ${icon("mail", { size: 28, color: C.green })}
                </div>
                <h3 class="text-2xl font-bold mb-2" style="color:${C.text};">Verify Your Email</h3>
                <p class="text-sm mb-2" style="color:${C.textMuted};">We sent a 6-digit code to</p>
                <p class="font-semibold text-sm mb-8" style="color:${C.text};">${escapeHtml(email || "ahmed@company.com")}</p>

                <div class="flex justify-center gap-3 mb-8">
                  ${otp.map((digit, idx) => `
                    <input data-otp-idx="${idx}" id="otp-${idx}" type="text" maxlength="1" value="${escapeHtml(digit)}"
                      class="w-12 h-14 text-center text-xl font-bold rounded-xl border-2 outline-none transition-all otp-input"
                      style="border:2px solid ${digit ? C.green : C.border};color:${C.text};background:${digit ? C.greenLight : C.surface};" />
                  `).join("")}
                </div>

                <button data-action="otp"
                  class="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm text-white mb-4 transition-all hover:opacity-90"
                  style="background:${C.green};">
                  Verify Code ${icon("arrow-right", { size: 16 })}
                </button>

                <button class="flex items-center justify-center gap-1.5 mx-auto text-sm" style="color:${C.textMuted};">
                  ${icon("refresh-cw", { size: 14 })}
                  Resend code in <span class="font-medium" style="color:${C.green};">00:58</span>
                </button>
              </div>
            ` : ""}
          </div>
        </div>
      </div>

      <style>
        .auth-input:focus { border-color: ${C.green} !important; box-shadow: 0 0 0 3px ${C.green}18; }
        .otp-input:focus { border-color: ${C.green} !important; box-shadow: 0 0 0 3px ${C.green}18; }
      </style>
    `;
  }

  function wireEvents() {
    qsa("[data-nav-home]", container).forEach((btn) => btn.addEventListener("click", () => navigate("/")));

    qsa("[data-set-mode]", container).forEach((btn) => {
      btn.addEventListener("click", () => {
        mode = btn.getAttribute("data-set-mode");
        renderAll();
      });
    });

    const actionBtn = qs("[data-action]", container);
    if (actionBtn) {
      const action = actionBtn.getAttribute("data-action");
      actionBtn.addEventListener("click", () => {
        if (action === "login") handleLogin();
        else if (action === "register") handleRegister();
        else if (action === "otp") handleOtp();
      });
    }

    qsa("[data-sso]", container).forEach((btn) => {
      btn.addEventListener("click", () => handleSso(btn.getAttribute("data-sso")));
    });

    // Text field bindings (no full re-render on keystroke, to preserve focus).
    const emailInput = qs('[data-field="email"]', container);
    if (emailInput) emailInput.addEventListener("input", (e) => { email = e.target.value; });
    const passwordInput = qs('[data-field="password"]', container);
    if (passwordInput) passwordInput.addEventListener("input", (e) => { password = e.target.value; });
    const nameInput = qs('[data-field="name"]', container);
    if (nameInput) nameInput.addEventListener("input", (e) => { name = e.target.value; });
    const phoneInput = qs('[data-field="phone"]', container);
    if (phoneInput) phoneInput.addEventListener("input", (e) => { phone = e.target.value; });
    // Confirm Password mirrors the source's broken controlled input: value is
    // always tied to a constant "" with a no-op onChange, so typed characters
    // never stick.
    const confirmInput = qs('[data-field="confirm-password"]', container);
    if (confirmInput) confirmInput.addEventListener("input", (e) => { e.target.value = ""; });

    qsa("[data-toggle-password]", container).forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-toggle-password");
        const input = qs(`[data-field="${id}"]`, container);
        const willShow = input.type === "password";
        input.type = willShow ? "text" : "password";
        btn.innerHTML = icon(willShow ? "eye-off" : "eye", { size: 16 });
        hydrateIcons();
      });
    });

    qsa("[data-otp-idx]", container).forEach((input) => {
      input.addEventListener("input", (e) => {
        const idx = parseInt(input.getAttribute("data-otp-idx"), 10);
        const val = e.target.value;
        if (val.length > 1) {
          e.target.value = otp[idx] || "";
          return;
        }
        otp[idx] = val;
        input.style.border = `2px solid ${val ? C.green : C.border}`;
        input.style.background = val ? C.greenLight : C.surface;
        if (val && idx < 5) {
          const next = document.getElementById(`otp-${idx + 1}`);
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
