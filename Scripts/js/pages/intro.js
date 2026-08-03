// 1:1 port of src/app/pages/Intro.tsx
import { setRole } from "../state.js";
import { navigate } from "../router.js";
import { icon, hydrateIcons, wireReveals, wireImageFallbacks, qs, qsa } from "../utils.js";

const G = {
  green: "#006838", greenDark: "#004F2A", greenLight: "#EAF6EF",
  blue: "#1D4ED8", blueLight: "#EFF6FF",
  orange: "#EA580C", orangeLight: "#FFF7ED",
  text: "#1F2937", textMuted: "#6B7280",
  border: "#E5E7EB", bg: "#FFFFFF", surface: "#FFFFFF",
};

const NAV_LINKS = ["Home", "About", "How It Works", "FAQ", "Contact"];

const HERO = {
  image: "/Content/images/sbp-building-hero.jpg",
  eyebrow: "State Bank of Pakistan — Digital Initiative",
  heading: ["Financing Growth.", "Empowering SMEs."],
  body: "Pakistan's national digital platform connecting small businesses with SBP-regulated banks for concessional financing — transparent, fast, and fully secure.",
  ctaLabel: "Apply Now",
  overlay: "linear-gradient(100deg, rgba(6,20,15,0.92) 0%, rgba(6,20,15,0.78) 32%, rgba(6,20,15,0.45) 60%, rgba(6,20,15,0.15) 100%)",
};

const ROLES = [
  {
    id: "sme", title: "SME Applicant", titleUrdu: "درخواست گزار",
    // Real MVC page (AccountController.Login()), not a SPA hash route - this page's own
    // bootstrap (bootstrap/home.js) never starts router.js's hash router, so a plain
    // navigate() here silently changed the URL hash with nothing on screen reacting to it.
    // Matches the Hero "Apply Now" button (#hero-cta below), which already does this correctly.
    tagline: "Apply & Track", path: "/Account/Login", iconName: "store",
    accent: "#22C55E", accentDim: "rgba(34,197,94,0.12)",
    border: "rgba(34,197,94,0.25)",
    features: ["6-step digital wizard", "Multi-business profiles", "Offer acceptance flow"],
    stat: { value: "1.2M+", label: "Active Borrowers" },
    desc: "Apply for concessional financing, manage multiple business profiles, and track every stage of your application in real time.",
  },
  {
    id: "bank", title: "Participating Bank", titleUrdu: "بینک پورٹل",
    tagline: "Assess & Approve", path: "/bank/login", iconName: "landmark",
    accent: "#60A5FA", accentDim: "rgba(96,165,250,0.12)",
    border: "rgba(96,165,250,0.25)",
    features: ["Application queue", "Credit assessment tools", "Offer generation"],
    stat: { value: "32", label: "Partner Banks" },
    desc: "Manage your SME application queue, conduct credit assessments, generate conditional offers and process disbursements.",
  },
  {
    id: "sbp", title: "SBP Administrator", titleUrdu: "ریاستی بینک",
    tagline: "Monitor & Report", path: "/sbp/login", iconName: "shield-check",
    accent: "#FB923C", accentDim: "rgba(251,146,60,0.12)",
    border: "rgba(251,146,60,0.25)",
    features: ["Executive KPI dashboard", "Bank & user management", "Audit trail"],
    stat: { value: "PKR 340B", label: "Total Disbursed" },
    desc: "Oversee the entire financing ecosystem with executive dashboards, manage participating banks, users, and generate compliance reports.",
  },
];

const CORE_FUNCTIONS = [
  { iconName: "banknote", title: "SME Financing", desc: "Collateral-free concessional loans for eligible small businesses.", accent: G.green },
  { iconName: "landmark", title: "Bank Assessment", desc: "Credit evaluation and approval through 32 partner banks.", accent: G.blue },
  { iconName: "map-pin", title: "Application Tracking", desc: "Real-time visibility into every stage of your application.", accent: G.orange },
  { iconName: "upload", title: "Digital Documentation", desc: "Secure, paperless submission of all required documents.", accent: G.green },
  { iconName: "shield-check", title: "Regulatory Oversight", desc: "Full compliance and audit trail under SBP supervision.", accent: G.blue },
];

const FEATURES = [
  { iconName: "file-text", title: "Loan Applications", desc: "Submit financing applications end-to-end through a guided 6-step digital wizard.", color: G.green, bg: G.greenLight },
  { iconName: "map-pin", title: "Application Tracking", desc: "Monitor every stage in real time with live status updates and interactive timelines.", color: G.blue, bg: G.blueLight },
  { iconName: "clipboard-check", title: "Eligibility Check", desc: "Instantly verify your eligibility for SBP concessional schemes before submitting.", color: G.orange, bg: G.orangeLight },
  { iconName: "upload", title: "Secure Document Upload", desc: "Upload required documents through a fully encrypted, SBP-compliant document vault.", color: G.green, bg: G.greenLight },
  { iconName: "building-2", title: "Bank Integration", desc: "Connect seamlessly with 32 SBP-regulated partner banks for assessment and disbursement.", color: G.blue, bg: G.blueLight },
  { iconName: "bell", title: "Notifications", desc: "Receive instant alerts at every decision point — application received, assessed, or approved.", color: G.orange, bg: G.orangeLight },
];

const HOW_STEPS = [
  { n: "01", title: "Register & Verify", desc: "Create your account, verify CNIC and business registration through SBP's secure digital KYC." },
  { n: "02", title: "Complete Application", desc: "Fill the guided wizard: business info, shareholders, financing need, bank selection, documents." },
  { n: "03", title: "Bank Assessment", desc: "Your chosen bank reviews the application, conducts credit assessment and issues a conditional offer." },
  { n: "04", title: "Accept & Disburse", desc: "Accept the offer, submit post-approval legal documents, and receive disbursement to your account." },
];

const ANNOUNCEMENTS = [
  { date: "July 15, 2026", tag: "Scheme Launch", title: "SBP Expands Rozgar Scheme Financing Limit to PKR 10 Million", tagColor: G.green },
  { date: "July 09, 2026", tag: "Policy Update", title: "Revised Eligibility Criteria for Women Entrepreneurs Fund Effective Aug 2026", tagColor: G.blue },
  { date: "July 02, 2026", tag: "Notification", title: "New Agricultural Credit Now Available Through 8 Additional Partner Banks", tagColor: G.orange },
  { date: "June 28, 2026", tag: "Circular", title: "SBP Issues Guidelines on Digital Documentation for SME Applications", tagColor: G.green },
];

const FAQS = [
  { q: "Who is eligible to apply for SME financing through this portal?", a: "Any registered business with a valid CNIC, NTN, and business registration certificate operating in Pakistan's SME sector. Use the Eligibility Check feature before applying." },
  { q: "How long does the financing approval process take?", a: "Average approval is 7 working days from complete submission. This depends on the bank's internal assessment and completeness of submitted documents." },
  { q: "Which banks are available on the portal?", a: "32 SBP-regulated commercial and microfinance banks are integrated, including HBL, MCB, UBL, NBP, Allied Bank, Meezan Bank, Bank Alfalah, and more." },
  { q: "Is my data secure on this platform?", a: "All data is 256-bit encrypted, stored in SBP-compliant data centres, and subject to Pakistan's data protection guidelines. Regular security audits are conducted." },
  { q: "What documents are required for the application?", a: "Core documents: CNIC, business registration, NTN certificate, 2 years of audited financials, and 6-month bank statements. Additional docs may be required per scheme." },
];

function gradientBoxStyle(accent, extra = "") {
  return `--gb-a1:${accent}40;--gb-a2:${accent}0A;--gb-a1-hover:${accent}80;--gb-a2-hover:${accent}35;${extra}`;
}

function scrollToId(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

export function render(container) {
  container.innerHTML = `
    <div class="flex flex-col bg-white" style="font-family:'Manrope',sans-serif;">
      <div class="h-[3px]" style="background:linear-gradient(90deg, ${G.green}, #3B82F6 50%, ${G.orange});"></div>

      <header id="intro-header" class="sticky top-0 z-30 bg-white" style="border-bottom:1px solid ${G.border};">
        <div class="max-w-7xl mx-auto px-6 lg:px-10 h-[66px] flex items-center justify-between gap-8">
          <div class="flex items-center gap-3 flex-shrink-0">
            <img data-fallback src="/Content/images/state_bank_of_pakistan_logo-2.png" alt="SBP" class="w-11 h-11 object-contain" />
            <div>
              <div class="font-black text-xs uppercase tracking-widest" style="color:${G.green};letter-spacing:0.1em;">State Bank of Pakistan</div>
              <div class="text-xs" style="color:${G.textMuted};font-family:var(--font-mono);font-size:9px;">SME Elevate Portal — بینک دولت پاکستان</div>
            </div>
          </div>
          <nav class="hidden lg:flex items-center gap-7">
            ${NAV_LINKS.map((link, i) => `
              <button data-scroll-to="${link.toLowerCase().replace(/\s+/g, "-")}" class="text-xs font-bold uppercase transition-colors"
                style="color:${i === 0 ? G.green : G.text};letter-spacing:0.08em;border-bottom:${i === 0 ? `2px solid ${G.green}` : "2px solid transparent"};padding-bottom:3px;">
                ${link}
              </button>
            `).join("")}
          </nav>

          <button data-login-cta class="hidden sm:flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold text-white hover:opacity-90 active:scale-[0.97] transition-all flex-shrink-0" style="background:${G.blue};">
            Login / Sign Up ${icon("arrow-right", { size: 14 })}
          </button>

          <button id="mobile-nav-toggle" class="lg:hidden p-2 rounded-lg flex-shrink-0" style="color:${G.text};" aria-label="Toggle navigation menu">
            ${icon("menu", { size: 20 })}
          </button>
        </div>

        <div id="mobile-nav-panel" class="hidden lg:hidden px-6 py-4 border-t" style="border-color:${G.border};background:#fff;">
          <nav class="flex flex-col gap-1 mb-4">
            ${NAV_LINKS.map((link, i) => `
              <button data-scroll-to="${link.toLowerCase().replace(/\s+/g, "-")}" data-close-mobile-nav class="text-sm py-2.5 px-2 rounded-lg text-left transition-colors"
                style="color:${i === 0 ? G.green : G.text};font-weight:${i === 0 ? 700 : 500};background:${i === 0 ? G.greenLight : "transparent"};">
                ${link}
              </button>
            `).join("")}
          </nav>
          <button data-login-cta data-close-mobile-nav class="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-lg text-sm font-bold text-white hover:opacity-90 active:scale-[0.97] transition-all" style="background:${G.blue};">
            Login / Sign Up ${icon("arrow-right", { size: 14 })}
          </button>
        </div>
      </header>

      <section id="home" class="relative overflow-hidden bg-black">
        <div class="relative" style="height:min(600px, 78vh);">
          <img data-fallback src="${HERO.image}" alt="State Bank of Pakistan head office" class="absolute inset-0 w-full h-full object-cover" />
          <div class="absolute inset-0" style="background:${HERO.overlay};"></div>

          <div class="relative z-10 h-full max-w-7xl mx-auto px-6 lg:px-10 flex items-center">
            <div class="max-w-xl">
              <span class="block text-xs font-black uppercase tracking-[0.22em] text-white/90 mb-4">${HERO.eyebrow}</span>
              <h1 class="mb-5" style="line-height:1.08;letter-spacing:-0.02em;">
                <span style="display:block;font-family:'Manrope',sans-serif;font-weight:800;font-size:clamp(2rem,3.6vw,3.1rem);color:#fff;text-shadow:0 2px 16px rgba(0,0,0,0.4);">${HERO.heading[0]}</span>
                <span style="display:block;font-family:'Manrope',sans-serif;font-weight:900;font-size:clamp(2rem,3.6vw,3.1rem);background:linear-gradient(110deg, #FCD34D 0%, #A7F3D0 55%, #93C5FD 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;padding-bottom:6px;">${HERO.heading[1]}</span>
              </h1>
              <p class="mb-8 text-[15px] leading-relaxed text-white/90" style="max-width:460px;text-shadow:0 1px 8px rgba(0,0,0,0.35);">${HERO.body}</p>
              <button id="hero-cta" class="flex items-center gap-2 px-7 py-3.5 rounded-full text-sm font-bold text-white hover:opacity-90 active:scale-[0.97] transition-all" style="background:${G.green};">
                ${HERO.ctaLabel} ${icon("arrow-right", { size: 16 })}
              </button>
            </div>
          </div>
        </div>

        <div class="relative z-10 bg-white" style="border-bottom:1.5px solid ${G.border};">
          <div class="max-w-5xl mx-auto px-6 lg:px-10 grid grid-cols-3">
            ${[
              { val: "1.2M+", label: "Registered SMEs", dot: G.green },
              { val: "PKR 340B", label: "Disbursed", dot: G.blue },
              { val: "32", label: "Partner Banks", dot: G.orange },
            ].map(({ val, label, dot }, i) => `
              <div class="flex items-center justify-center gap-2.5 py-5" style="border-left:${i > 0 ? `1.5px solid ${G.border}` : "none"};">
                <div class="w-2 h-2 rounded-full flex-shrink-0" style="background:${dot};"></div>
                <div>
                  <div style="font-family:var(--font-mono);font-size:14px;font-weight:700;color:#0A0A0A;">${val}</div>
                  <div style="font-size:10px;color:${G.textMuted};">${label}</div>
                </div>
              </div>
            `).join("")}
          </div>
        </div>
      </section>

      <section id="about" class="scroll-mt-24" style="background:#fff;border-bottom:1.5px solid ${G.border};">
        <div class="max-w-5xl mx-auto px-6 lg:px-10 py-20 text-center">
          <div class="reveal">
            <div class="flex items-center justify-center gap-3 mb-8">
              <div class="h-px w-16 rounded-full" style="background:${G.border};"></div>
              <span class="text-base font-black uppercase tracking-[0.28em]" style="color:${G.green};font-family:var(--font-mono);">Our Mission</span>
              <div class="h-px w-16 rounded-full" style="background:${G.border};"></div>
            </div>
            <blockquote style="font-family:'Manrope',sans-serif;font-weight:800;font-size:clamp(1.4rem,2.8vw,2.2rem);color:#0A0A0A;line-height:1.25;letter-spacing:-0.025em;" class="mb-12">
              "Pakistan's 5.2 million small businesses deserve fast, fair, and fully digital access to financing — backed by the full authority of the State Bank."
            </blockquote>
          </div>

          <div class="reveal" style="--reveal-delay:150ms;">
            <div class="grid grid-cols-2 md:grid-cols-4 gap-px overflow-hidden rounded-2xl" style="border:1.5px solid ${G.border};">
              ${[
                { val: "5.2M", sub: "SMEs in Pakistan", accent: G.green },
                { val: "PKR 340B", sub: "Total disbursed", accent: G.blue },
                { val: "32", sub: "Regulated partner banks", accent: G.orange },
                { val: "7 Days", sub: "Avg. approval time", accent: G.green },
              ].map(({ val, sub, accent }) => `
                <div class="py-8 px-4 text-center bg-white hover:bg-gray-50 transition-colors">
                  <div style="font-family:'Manrope',sans-serif;font-weight:800;font-size:clamp(1.4rem,2.5vw,2rem);color:${accent};line-height:1;letter-spacing:-0.03em;">${val}</div>
                  <div class="text-xs font-semibold mt-2.5" style="color:${G.textMuted};">${sub}</div>
                </div>
              `).join("")}
            </div>
          </div>
        </div>
      </section>

      <section style="background:${G.bg};border-bottom:1.5px solid ${G.border};">
        <div class="max-w-7xl mx-auto px-6 lg:px-10 py-16">
          <div class="reveal">
            <div class="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12">
              <div>
                <div class="flex items-center gap-2 mb-3">
                  <div class="h-[2px] w-6 rounded-full" style="background:${G.green};"></div>
                  <span class="text-xs font-black uppercase tracking-[0.2em]" style="color:${G.green};font-family:var(--font-mono);">Platform Capabilities</span>
                </div>
                <h2 style="font-family:'Manrope',sans-serif;font-weight:900;font-size:clamp(1.6rem,2.5vw,2.1rem);color:#0A0A0A;letter-spacing:-0.025em;line-height:1.1;">
                  Everything you need,<br />built into one portal.
                </h2>
              </div>
              <div class="flex flex-wrap gap-0 overflow-hidden rounded-xl" style="border:1.5px solid ${G.border};background:#fff;">
                ${[
                  { val: "1.2M+", label: "Registered SMEs", accent: G.green },
                  { val: "PKR 340B", label: "Disbursed", accent: G.blue },
                  { val: "32", label: "Partner Banks", accent: G.orange },
                ].map(({ val, label, accent }, i) => `
                  <div class="px-6 py-4 flex flex-col items-center justify-center" style="border-left:${i > 0 ? `1px solid ${G.border}` : "none"};min-width:110px;">
                    <span style="font-family:'Manrope',sans-serif;font-weight:900;font-size:1.3rem;color:${accent};letter-spacing:-0.03em;line-height:1;">${val}</span>
                    <span class="text-[10px] font-semibold mt-1 text-center" style="color:${G.textMuted};">${label}</span>
                  </div>
                `).join("")}
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div class="lg:col-span-2 grid grid-cols-2 gap-3 sm:gap-4">
              ${FEATURES.slice(0, 4).map(({ iconName, title, desc, color, bg }, i) => `
                <div class="reveal h-full" style="--reveal-delay:${i * 80}ms;">
                  <div class="gradient-box" style="${gradientBoxStyle(color)}">
                    <div class="hover-card h-full rounded-2xl p-3 sm:p-6 flex flex-col gap-2 sm:gap-4 cursor-default" style="--hover-shadow:${color}22;">
                      <div class="flex items-center justify-between">
                        <div class="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center" style="background:${bg};">
                          ${icon(iconName, { size: 16, color })}
                        </div>
                        <span style="font-family:var(--font-mono);font-size:11px;font-weight:700;color:${color}55;">0${i + 1}</span>
                      </div>
                      <div>
                        <div class="text-xs sm:text-sm font-bold mb-1 sm:mb-1.5" style="color:#0A0A0A;">${title}</div>
                        <p class="text-[11px] sm:text-xs leading-relaxed" style="color:${G.textMuted};">${desc}</p>
                      </div>
                    </div>
                  </div>
                </div>
              `).join("")}
            </div>

            <div class="grid grid-cols-2 lg:flex lg:flex-col gap-3 sm:gap-4">
              ${FEATURES.slice(4).map(({ iconName, title, desc, color, bg }, i) => {
                const idx = i + 4;
                return `
                  <div class="reveal flex-1" style="--reveal-delay:${idx * 80}ms;">
                    <div class="gradient-box" style="${gradientBoxStyle(color)}">
                      <div class="hover-card h-full rounded-2xl p-3 sm:p-6 flex flex-col gap-2 sm:gap-4 cursor-default" style="--hover-shadow:${color}22;">
                        <div class="flex items-center justify-between">
                          <div class="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center" style="background:${bg};">
                            ${icon(iconName, { size: 16, color })}
                          </div>
                          <span style="font-family:var(--font-mono);font-size:11px;font-weight:700;color:${color}55;">0${idx + 1}</span>
                        </div>
                        <div>
                          <div class="text-xs sm:text-sm font-bold mb-1 sm:mb-1.5" style="color:#0A0A0A;">${title}</div>
                          <p class="text-[11px] sm:text-xs leading-relaxed" style="color:${G.textMuted};">${desc}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                `;
              }).join("")}
            </div>
          </div>
        </div>
      </section>

      <section style="background:#FFFFFF;border-bottom:1.5px solid ${G.border};">
        <div class="max-w-7xl mx-auto px-6 lg:px-10 py-16">
          <div class="reveal">
            <div class="text-center mb-12">
              <h2 class="mb-2" style="font-family:'Manrope',sans-serif;font-weight:900;font-size:clamp(1.8rem,3vw,2.4rem);color:#0A0A0A;line-height:1.1;letter-spacing:-0.03em;">Core Functions</h2>
              <p class="text-sm" style="color:${G.textMuted};">Explore our roles and responsibilities</p>
            </div>
          </div>

          <div class="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            ${CORE_FUNCTIONS.map(({ iconName, title, desc, accent }, i) => `
              <div class="reveal h-full" style="--reveal-delay:${i * 80}ms;">
                <div class="gradient-box" style="${gradientBoxStyle(accent)}">
                  <button data-scroll-to="access-portal" class="hover-card-lift w-full h-full text-left rounded-2xl p-3 sm:p-6 flex flex-col gap-2 sm:gap-4 transition-all duration-200" style="background:#FAFBFB;box-shadow:0 1px 8px rgba(0,0,0,0.03);">
                    <div class="w-9 h-9 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center" style="background:${accent}18;">
                      ${icon(iconName, { size: 20, color: accent })}
                    </div>
                    <div>
                      <div class="text-xs sm:text-sm font-bold mb-1 sm:mb-1.5" style="color:#0A0A0A;">${title}</div>
                      <p class="text-[11px] sm:text-xs leading-relaxed" style="color:${G.textMuted};">${desc}</p>
                    </div>
                    <div class="flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold mt-auto pt-2" style="color:${accent};">
                      View more ${icon("arrow-right", { size: 12 })}
                    </div>
                  </button>
                </div>
              </div>
            `).join("")}
          </div>
        </div>
      </section>

      <section id="how-it-works" class="bg-white scroll-mt-24" style="border-bottom:1.5px solid ${G.border};">
        <div class="max-w-7xl mx-auto px-6 lg:px-10 py-16">
          <div class="reveal">
            <div class="text-center mb-14">
              <h2 style="font-family:'Manrope',sans-serif;font-weight:900;font-size:clamp(1.5rem,2.5vw,2rem);color:#0A0A0A;letter-spacing:-0.025em;">How It Works</h2>
            </div>
          </div>

          <div class="grid grid-cols-4 gap-0 relative">
            <div class="absolute top-[16px] sm:top-[22px] left-[12.5%] right-[12.5%] h-px" style="background:linear-gradient(90deg, ${G.green}00, ${G.green}40 20%, ${G.green}40 80%, ${G.green}00);"></div>
            ${HOW_STEPS.map(({ n, title, desc }, i) => `
              <div class="reveal" style="--reveal-delay:${i * 100}ms;">
                <div class="relative flex flex-col items-center text-center px-1 sm:px-4">
                  <div class="relative z-10 mb-2 sm:mb-6 flex flex-col items-center gap-2">
                    <div class="w-8 h-8 sm:w-11 sm:h-11 rounded-full flex items-center justify-center text-xs sm:text-sm font-black flex-shrink-0"
                      style="background:${i === 0 ? G.green : "#fff"};border:2px solid ${G.green};color:${i === 0 ? "#fff" : G.green};font-family:var(--font-mono);">
                      ${n}
                    </div>
                  </div>
                  <div class="text-[11px] sm:text-sm font-bold mb-1 sm:mb-2 leading-tight" style="color:${G.text};">${title}</div>
                  <p class="hidden sm:block text-xs leading-relaxed" style="color:${G.textMuted};">${desc}</p>
                </div>
              </div>
            `).join("")}
          </div>
        </div>
      </section>

      <section id="access-portal" style="background:${G.bg};border-bottom:1.5px solid ${G.border};">
        <div class="max-w-7xl mx-auto px-6 lg:px-10 py-14">
          <div class="reveal">
            <div class="text-center mb-10">
              <h2 style="font-family:'Manrope',sans-serif;font-weight:900;font-size:clamp(1.5rem,2.5vw,2rem);color:#0A0A0A;letter-spacing:-0.02em;" class="mb-2">Access the Portal</h2>
              <p class="text-xs font-semibold tracking-[0.25em] uppercase mt-3" style="color:${G.textMuted};font-family:var(--font-mono);">Select your role to continue</p>
            </div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            ${ROLES.map((role, i) => `
              <div class="reveal h-full" style="--reveal-delay:${i * 100}ms;">
                <div class="gradient-box" style="${gradientBoxStyle(role.accent)}">
                  <button data-role-id="${role.id}" data-role-path="${role.path}" class="role-card w-full h-full relative text-left rounded-2xl overflow-hidden"
                    style="--role-accent:${role.accent};--role-accent-dim:${role.accentDim};--role-border:${role.border};--role-hover-shadow:0 20px 60px ${role.accent}22,0 4px 20px rgba(0,0,0,0.08);">
                    <div class="role-topbar absolute top-0 left-0 right-0 h-[3px]" style="background:linear-gradient(90deg,${role.accent},${role.accent}88);"></div>
                    <div class="relative z-10 p-7">
                      <div class="flex items-start justify-between mb-6">
                        <div class="role-icon-wrap w-14 h-14 rounded-2xl flex items-center justify-center">
                          ${icon(role.iconName, { size: 24, color: role.accent })}
                        </div>
                        <div class="text-right">
                          <div class="text-xl font-bold leading-none" style="color:#000;font-family:var(--font-mono);">${role.stat.value}</div>
                          <div class="text-xs mt-0.5" style="color:${G.textMuted};">${role.stat.label}</div>
                        </div>
                      </div>
                      <h3 class="text-xl font-extrabold leading-tight mb-0.5" style="color:#000;">${role.title}</h3>
                      <div class="text-xs font-bold uppercase tracking-wider mb-0.5" style="color:${role.accent};font-family:var(--font-mono);">${role.tagline}</div>
                      <div class="text-xs mb-3" style="color:${G.textMuted};">${role.titleUrdu}</div>
                      <p class="text-sm leading-relaxed mb-5" style="color:${G.textMuted};">${role.desc}</p>
                      <div class="space-y-2 mb-6">
                        ${role.features.map((f) => `
                          <div class="flex items-center gap-2">
                            ${icon("check-circle-2", { size: 14, color: role.accent })}
                            <span class="text-xs" style="color:${G.textMuted};">${f}</span>
                          </div>
                        `).join("")}
                      </div>
                      <div class="role-footer-border flex items-center justify-between pt-4">
                        <span class="text-sm font-bold" style="color:#000;">Enter Portal</span>
                        <div class="role-arrow-wrap w-9 h-9 rounded-full flex items-center justify-center">
                          <span class="role-arrow-icon" style="display:flex;">${icon("arrow-up-right", { size: 16 })}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            `).join("")}
          </div>
        </div>
      </section>

      <section style="background:${G.bg};border-bottom:1.5px solid ${G.border};">
        <div class="max-w-7xl mx-auto px-6 lg:px-10 py-12">
          <div class="reveal">
            <div class="flex items-center justify-between mb-8">
              <div>
                <h2 style="font-family:'Manrope',sans-serif;font-weight:900;font-size:clamp(1.4rem,2.5vw,1.9rem);color:#0A0A0A;letter-spacing:-0.02em;">Latest Announcements</h2>
                <p class="text-sm mt-1" style="color:${G.textMuted};">Circulars, scheme updates and SBP notifications</p>
              </div>
              <button class="hidden sm:flex items-center gap-1.5 text-sm font-semibold hover:opacity-80 transition-all" style="color:${G.green};">
                View All ${icon("arrow-right", { size: 14 })}
              </button>
            </div>
          </div>
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            ${ANNOUNCEMENTS.map(({ date, tag, title, tagColor }, i) => `
              <div class="reveal h-full" style="--reveal-delay:${i * 80}ms;">
                <div class="gradient-box" style="${gradientBoxStyle(tagColor)}">
                  <div class="hover-card-lift h-full rounded-2xl p-3 sm:p-5 bg-white flex flex-col gap-2 sm:gap-3 transition-all cursor-pointer" style="box-shadow:0 2px 10px rgba(0,0,0,0.04);">
                    <span class="text-[11px] sm:text-xs" style="color:${G.textMuted};">${date}</span>
                    <span class="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-2 sm:px-2.5 py-1 rounded-full w-fit" style="background:${tagColor}18;color:${tagColor};border:1px solid ${tagColor}30;">${tag}</span>
                    <p class="text-xs sm:text-sm font-semibold leading-snug" style="color:${G.green};">${title}</p>
                  </div>
                </div>
              </div>
            `).join("")}
          </div>
        </div>
      </section>

      <section id="faq" class="bg-white scroll-mt-24" style="border-bottom:1.5px solid ${G.border};">
        <div class="max-w-3xl mx-auto px-6 lg:px-10 py-14">
          <div class="reveal">
            <div class="text-center mb-10">
              <h2 style="font-family:'Manrope',sans-serif;font-weight:900;font-size:clamp(1.5rem,2.5vw,2rem);color:#0A0A0A;letter-spacing:-0.02em;" class="mb-2">Frequently Asked Questions</h2>
              <p class="text-sm" style="color:${G.textMuted};">Common questions about eligibility, process, and documentation</p>
            </div>
          </div>
          <div class="space-y-3" id="faq-list">
            ${FAQS.map(({ q, a }, i) => `
              <div class="reveal" style="--reveal-delay:${i * 60}ms;">
                <div class="faq-item rounded-2xl overflow-hidden" data-faq-index="${i}">
                  <button data-faq-toggle="${i}" class="w-full flex items-center justify-between px-5 py-4 text-left gap-4">
                    <span class="text-sm font-semibold" style="color:${G.text};">${q}</span>
                    <span data-faq-chevron="${i}">${icon("chevron-down", { size: 16, color: G.textMuted })}</span>
                  </button>
                  <div data-faq-body="${i}" class="px-5 pb-4" style="display:none;">
                    <p class="text-sm leading-relaxed" style="color:${G.textMuted};">${a}</p>
                  </div>
                </div>
              </div>
            `).join("")}
          </div>
        </div>
      </section>

      <footer id="contact" class="scroll-mt-24" style="background:#FFFFFF;border-top:1.5px solid ${G.border};">
        <div class="max-w-7xl mx-auto px-6 lg:px-10 py-12">
          <div class="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
            <div class="md:col-span-1">
              <div class="flex items-center gap-3 mb-4">
                <img data-fallback src="/Content/images/state_bank_of_pakistan_logo-2.png" alt="SBP" class="w-10 h-10 object-contain" />
                <div>
                  <div class="font-bold text-xs uppercase tracking-widest" style="color:${G.green};">State Bank</div>
                  <div class="font-bold text-xs uppercase tracking-widest" style="color:${G.green};">of Pakistan</div>
                </div>
              </div>
              <p class="text-xs leading-relaxed" style="color:${G.textMuted};">SME Elevate Portal — Pakistan's national digital platform for SME concessional financing.</p>
            </div>
            ${[
              { heading: "Portal", links: ["SME Applicant", "Participating Bank", "SBP Administrator", "Register Now"], accent: G.green },
              { heading: "Resources", links: ["Eligibility Criteria", "Required Documents", "Financing Schemes", "Help Center"], accent: G.blue },
              { heading: "Legal", links: ["Privacy Policy", "Terms of Use", "Data Protection", "Cookie Policy"], accent: G.orange },
            ].map(({ heading, links, accent }) => `
              <div>
                <div class="text-xs font-bold uppercase tracking-widest mb-4" style="color:${accent};">${heading}</div>
                <ul class="space-y-2.5">
                  ${links.map((l) => `<li><a href="#" class="text-xs transition-colors" style="color:${G.textMuted};">${l}</a></li>`).join("")}
                </ul>
              </div>
            `).join("")}
          </div>

          <div class="flex flex-wrap gap-5 pb-8 mb-6" style="border-bottom:1px solid ${G.border};">
            ${[
              { iconName: "phone", text: "111-727-273 (Helpline)", accent: G.green },
              { iconName: "mail", text: "smefinance@sbp.org.pk", accent: G.blue },
              { iconName: "globe", text: "www.sbp.org.pk", accent: G.orange },
            ].map(({ iconName, text, accent }) => `
              <div class="flex items-center gap-2">
                ${icon(iconName, { size: 14, color: accent })}
                <span class="text-xs" style="color:${G.textMuted};">${text}</span>
              </div>
            `).join("")}
          </div>

          <div class="flex flex-col sm:flex-row items-center justify-between gap-3">
            <p class="text-xs" style="color:${G.textMuted};">© 2025 State Bank of Pakistan · بینک دولت پاکستان · All rights reserved</p>
            <div class="flex items-center gap-1.5">
              <div class="w-1.5 h-1.5 rounded-full animate-pulse" style="background:${G.green};"></div>
              <span class="text-xs" style="color:${G.textMuted};font-family:var(--font-mono);">SYSTEM OPERATIONAL</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  `;

  wireEvents(container);
  hydrateIcons();
  wireReveals(container);
  wireImageFallbacks(container);
}

function wireEvents(container) {
  qsa("[data-scroll-to]", container).forEach((el) => {
    el.addEventListener("click", () => scrollToId(el.getAttribute("data-scroll-to")));
  });

  const mobileToggle = qs("#mobile-nav-toggle", container);
  const mobilePanel = qs("#mobile-nav-panel", container);
  let mobileOpen = false;
  mobileToggle.addEventListener("click", () => {
    mobileOpen = !mobileOpen;
    mobilePanel.classList.toggle("hidden", !mobileOpen);
    mobileToggle.innerHTML = mobileOpen ? icon("x", { size: 20 }) : icon("menu", { size: 20 });
    hydrateIcons();
  });
  qsa("[data-close-mobile-nav]", container).forEach((el) => {
    el.addEventListener("click", () => {
      mobileOpen = false;
      mobilePanel.classList.add("hidden");
      mobileToggle.innerHTML = icon("menu", { size: 20 });
      hydrateIcons();
    });
  });

  // Real MVC navigation (Phase 2): the SPA hash router no longer owns top-level routing -
  // Login now lives at a real page, /Account/Login (AccountController.Login()).
  qs("#hero-cta", container).addEventListener("click", () => { window.location.href = "/Account/Login"; });
  // Header "Login / Sign Up" (desktop + mobile) previously only scrolled down to the role
  // cards, requiring a second click on "SME Applicant" to actually reach the sign-in/sign-up
  // form - now goes straight there, same as the Hero CTA above.
  qsa("[data-login-cta]", container).forEach((btn) => {
    btn.addEventListener("click", () => { window.location.href = "/Account/Login"; });
  });

  qsa("[data-role-id]", container).forEach((btn) => {
    btn.addEventListener("click", () => {
      setRole(btn.getAttribute("data-role-id"));
      const path = btn.getAttribute("data-role-path");
      // A real MVC page (e.g. SME's /Account/Login) needs a real browser navigation - this
      // page's bootstrap (bootstrap/home.js) never starts the SPA hash router, so navigate()
      // (a hash-only change) would silently do nothing. Bank/SBP don't have a real backend
      // login page yet, so they keep the original hash-based navigate().
      if (path.startsWith("/Account")) window.location.href = path;
      else navigate(path);
    });
  });

  qsa("[data-faq-toggle]", container).forEach((btn) => {
    const i = btn.getAttribute("data-faq-toggle");
    btn.addEventListener("click", () => {
      const item = qs(`[data-faq-index="${i}"]`, container);
      const body = qs(`[data-faq-body="${i}"]`, container);
      const chevron = qs(`[data-faq-chevron="${i}"]`, container);
      const isOpen = item.classList.contains("open");
      // Close all (matches original: openFaq is a single index, not multi-open)
      qsa(".faq-item", container).forEach((el) => el.classList.remove("open"));
      qsa("[data-faq-body]", container).forEach((el) => (el.style.display = "none"));
      qsa("[data-faq-chevron]", container).forEach(
        (el) => (el.innerHTML = icon("chevron-down", { size: 16, color: G.textMuted }))
      );
      if (!isOpen) {
        item.classList.add("open");
        body.style.display = "block";
        chevron.innerHTML = icon("chevron-up", { size: 16, color: G.green });
      }
      hydrateIcons();
    });
  });
}
