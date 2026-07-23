// 1:1 port of src/app/pages/bank/BankLayout.tsx
//
// Unlike SmeLayout, Bank has only ONE index child route — all internal
// navigation between Dashboard/Application Queue/... happens via local
// `activeKey` state inside this layout, never touching the URL/hash.
// The sub-view content itself is rendered by pages/bank/portal.js, driven
// by that activeKey (plus a ctx object for cross-view "focus application" deep links).
import { state, subscribe, setUser } from "../../state.js";
import { C } from "../../colors.js";
import { navigate } from "../../router.js";
import { icon, hydrateIcons, wireImageFallbacks, openModal, qs, qsa } from "../../utils.js";
import { render as renderBankPortal } from "./portal.js";

const NAV = [
  { label: "Dashboard", iconName: "layout-dashboard", key: "dashboard" },
  { label: "Application Queue", iconName: "file-text", key: "queue" },
  { label: "Under Assessment", iconName: "clipboard-check", key: "assessment" },
  { label: "Offers Issued", iconName: "check-circle-2", key: "offers" },
  { label: "Offers Accepted by Applicant", iconName: "thumbs-up", key: "offers_accepted" },
  { label: "Offers Rejected by Applicant", iconName: "thumbs-down", key: "offers_rejected" },
];

// Pages reachable only via in-context actions (e.g. "Start assessment"), not a sidebar item
const HIDDEN_PAGE_TITLES = {
  reports: "Credit Assessment",
};

// BankLayout's SettingsModal merges profile (name/email) + notification toggles
// into ONE modal (unlike SmeLayout's separate Profile/Settings modals).
function openSettingsModal() {
  let name = state.user?.name ?? "";
  let email = state.user?.email ?? "";
  let notifyEmail = true;
  let notifyApp = true;
  let saved = false;

  openModal((overlay, close) => {
    // React's SettingsModal uses its own overlay tint (rgba(15,23,42,0.5))
    // instead of the shared .modal-overlay default (rgba(0,0,0,0.5)).
    overlay.style.background = "rgba(15,23,42,0.5)";

    function renderInner() {
      overlay.innerHTML = `
        <div class="w-full max-w-md rounded-2xl border" style="background:${C.surface};border:1.5px solid ${C.border};">
          <div class="flex items-start justify-between p-5 border-b" style="border-color:${C.border};">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style="background:${C.blueLight};">${icon("settings", { size: 18, color: C.blue })}</div>
              <h3 class="text-sm font-bold" style="color:${C.text};">Account Settings</h3>
            </div>
            <button data-close class="p-1 rounded-lg hover:bg-gray-100" style="color:${C.textMuted};">${icon("x", { size: 16 })}</button>
          </div>
          <div class="p-5 space-y-4">
            <div>
              <label class="block text-sm font-medium mb-1.5" style="color:${C.text};">Full Name</label>
              <div class="relative">
                <span class="absolute left-3.5 top-1/2 -translate-y-1/2">${icon("user", { size: 16, color: C.textMuted })}</span>
                <input data-name type="text" value="${name.replace(/"/g, "&quot;")}" class="w-full rounded-xl border text-sm outline-none" style="padding:10px 12px 10px 38px;border:1.5px solid ${C.border};background:${C.bg};color:${C.text};" />
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium mb-1.5" style="color:${C.text};">Email</label>
              <div class="relative">
                <span class="absolute left-3.5 top-1/2 -translate-y-1/2">${icon("mail", { size: 16, color: C.textMuted })}</span>
                <input data-email type="email" value="${email.replace(/"/g, "&quot;")}" class="w-full rounded-xl border text-sm outline-none" style="padding:10px 12px 10px 38px;border:1.5px solid ${C.border};background:${C.bg};color:${C.text};" />
              </div>
            </div>
            <div class="space-y-2 pt-1">
              <label class="flex items-center justify-between p-2.5 rounded-xl border cursor-pointer" style="border:1.5px solid ${C.border};">
                <span class="text-sm" style="color:${C.text};">Email notifications</span>
                <input data-notify-email type="checkbox" class="rounded" ${notifyEmail ? "checked" : ""} />
              </label>
              <label class="flex items-center justify-between p-2.5 rounded-xl border cursor-pointer" style="border:1.5px solid ${C.border};">
                <span class="text-sm" style="color:${C.text};">In-app notifications</span>
                <input data-notify-app type="checkbox" class="rounded" ${notifyApp ? "checked" : ""} />
              </label>
            </div>
            ${saved ? `
              <div class="rounded-xl p-3 flex gap-2.5" style="background:${C.greenLight};border:1.5px solid ${C.green};">
                ${icon("check-circle-2", { size: 16, color: C.green, style: "margin-top:2px;" })}
                <p class="text-xs leading-relaxed" style="color:${C.green};">Settings saved.</p>
              </div>` : ""}
          </div>
          <div class="flex gap-3 p-5 border-t" style="border-color:${C.border};">
            <button data-close class="flex-1 py-2.5 rounded-xl text-sm font-semibold border" style="border:1.5px solid ${C.border};color:${C.text};">Close</button>
            <button data-save class="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style="background:${C.blue};">Save Changes</button>
          </div>
        </div>
      `;
      qsa("[data-close]", overlay).forEach((b) => b.addEventListener("click", close));
      qs("[data-name]", overlay).addEventListener("input", (e) => { name = e.target.value; saved = false; });
      qs("[data-email]", overlay).addEventListener("input", (e) => { email = e.target.value; saved = false; });
      qs("[data-notify-email]", overlay).addEventListener("change", (e) => { notifyEmail = e.target.checked; saved = false; renderInner(); });
      qs("[data-notify-app]", overlay).addEventListener("change", (e) => { notifyApp = e.target.checked; saved = false; renderInner(); });
      qs("[data-save]", overlay).addEventListener("click", () => {
        setUser({ name: name.trim() || "Bank Officer", email: email.trim() });
        saved = true;
        renderInner();
      });
      hydrateIcons();
    }
    renderInner();
  });
}

export function mount(container) {
  let sidebarOpen = false;
  let activeKey = "dashboard";
  let focusApplicationId = null;

  // Passed to portal.js so it can switch the layout's activeKey (and re-render
  // the shell so nav highlighting updates) and consume one-shot deep links.
  const ctx = {
    setActiveKey(key) {
      activeKey = key;
      renderShell();
    },
    // Not in the original written contract, but required for functional parity:
    // BankPortal's queue/assessment views need a way to *set* the pending focus
    // application id (e.g. "View" on a queue row jumps to Under Assessment
    // focused on that application) before consumeFocusApplicationId() reads it.
    setFocusApplicationId(id) {
      focusApplicationId = id;
      renderShell();
    },
    consumeFocusApplicationId() {
      const id = focusApplicationId;
      focusApplicationId = null;
      return id;
    },
  };

  function sidebarHtml() {
    return `
      <div class="flex flex-col h-full" style="background:#ffffff;border-right:1.5px solid ${C.border};">
        <div class="px-5 py-5 flex items-center gap-3 border-b" style="border-color:${C.border};">
          <div class="w-9 h-9 rounded-xl flex items-center justify-center" style="background:${C.blueLight};border:1px solid ${C.blue}30;">
            <img data-fallback src="assets/state_bank_of_pakistan_logo-1.png" alt="SBP" class="w-8 h-8 object-contain" />
          </div>
          <div class="min-w-0">
            <div class="font-bold text-xs leading-tight truncate" style="color:${C.text};">SBP SME Portal</div>
            <div class="text-xs" style="font-family:var(--font-mono);font-size:10px;color:${C.textMuted};">Bank Portal</div>
          </div>
        </div>

        <div class="px-3 py-2 mx-3 mt-3 rounded-xl" style="background:${C.blueLight};border:1px solid ${C.blue}25;">
          <div class="text-xs font-semibold" style="color:${C.blue};">HBL — SME Finance</div>
          <div class="text-xs" style="color:${C.textMuted};">Karachi Region</div>
        </div>

        <nav class="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          ${NAV.map(({ label, iconName, key }) => {
            const active = activeKey === key;
            return `
              <button data-nav-key="${key}" class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-left"
                style="background:${active ? C.blueLight : "transparent"};color:${active ? C.blue : C.textMuted};border-left:${active ? `3px solid ${C.blue}` : "3px solid transparent"};">
                ${icon(iconName, { size: 16 })}
                ${label}
              </button>
            `;
          }).join("")}
        </nav>

        <div class="px-3 py-4 border-t" style="border-color:${C.border};">
          <button data-signout class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-left hover:bg-gray-50" style="color:${C.textMuted};">
            ${icon("log-out", { size: 16 })}
            Sign Out
          </button>
          <div class="flex items-center gap-3 px-3 pt-3 mt-2 border-t" style="border-color:${C.border};">
            <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style="background:${C.blue};">${state.user?.name?.[0] ?? "B"}</div>
            <div class="min-w-0 flex-1">
              <div class="text-xs font-semibold truncate" style="color:${C.text};">${state.user?.name ?? "Bank Officer"}</div>
              <div class="text-xs truncate" style="font-size:10px;color:${C.textMuted};">${state.user?.email ?? ""}</div>
            </div>
            <button data-open-settings class="p-1 rounded-lg hover:bg-gray-100 flex-shrink-0">${icon("settings", { size: 14, color: C.textMuted })}</button>
          </div>
        </div>
      </div>
    `;
  }

  function renderShell() {
    const activeNav = NAV.find((n) => n.key === activeKey);
    const headerTitle = activeNav?.label ?? HIDDEN_PAGE_TITLES[activeKey] ?? "Dashboard";

    container.innerHTML = `
      <div class="flex h-screen overflow-hidden" style="font-family:'Manrope',sans-serif;background:${C.bg};">
        <div class="hidden lg:flex w-[240px] flex-shrink-0 flex-col h-full">
          ${sidebarHtml()}
        </div>
        ${sidebarOpen ? `
          <div class="lg:hidden fixed inset-0 z-50 flex">
            <div class="w-64 flex-shrink-0 h-full">${sidebarHtml()}</div>
            <div data-close-sidebar class="flex-1" style="background:rgba(0,0,0,0.5);"></div>
          </div>` : ""}
        <div class="flex-1 flex flex-col overflow-hidden">
          <header class="h-14 flex items-center px-5 gap-4 flex-shrink-0 border-b" style="background:${C.surface};border-color:${C.border};">
            <button data-open-sidebar class="lg:hidden p-1">${icon("menu", { size: 20, color: C.textMuted })}</button>
            <div class="flex-1">
              <div class="text-sm font-semibold capitalize" style="color:${C.text};">${headerTitle}</div>
            </div>
            <button class="relative p-2 rounded-lg hover:bg-gray-100 transition-all" style="color:${C.textMuted};">
              ${icon("bell", { size: 16 })}
              <span class="absolute top-1 right-1 w-2 h-2 rounded-full" style="background:${C.orange};"></span>
            </button>
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style="background:${C.blue};">${state.user?.name?.[0] ?? "B"}</div>
              <span class="hidden md:block text-sm font-medium" style="color:${C.text};">${(state.user?.name ?? "Officer").split(" ")[0]}</span>
            </div>
          </header>
          <main id="bank-outlet" class="flex-1 overflow-y-auto"></main>
        </div>
      </div>
    `;

    wireShellEvents();
    hydrateIcons();
    wireImageFallbacks(container);

    const outlet = qs("#bank-outlet", container);
    if (outlet) renderBankPortal(outlet, activeKey, ctx);
  }

  function wireShellEvents() {
    qsa("[data-nav-key]", container).forEach((btn) => {
      btn.addEventListener("click", () => {
        activeKey = btn.getAttribute("data-nav-key");
        sidebarOpen = false;
        renderShell();
      });
    });
    qsa("[data-signout]", container).forEach((btn) => btn.addEventListener("click", () => navigate("/")));
    qsa("[data-close-sidebar]", container).forEach((el) => el.addEventListener("click", () => { sidebarOpen = false; renderShell(); }));
    qsa("[data-open-sidebar]", container).forEach((btn) => btn.addEventListener("click", () => { sidebarOpen = true; renderShell(); }));
    qsa("[data-open-settings]", container).forEach((btn) => btn.addEventListener("click", openSettingsModal));
  }

  const unsubscribe = subscribe(renderShell);
  renderShell();

  return {
    renderOutlet(renderFn) {
      // Bank has only one router-level child (index route); its actual sub-view
      // rendering is driven by local activeKey state, not by router-supplied
      // renderers. We accept renderFn to satisfy router.js's call contract but
      // intentionally ignore it — the shell always renders via renderBankPortal().
      renderShell();
    },
    destroy() {
      unsubscribe();
    },
  };
}
