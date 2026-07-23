// 1:1 port of src/app/pages/sbp/SbpLayout.tsx
//
// Like Bank, SBP has only ONE index child route — all internal navigation
// between Executive Dashboard/Applications/... happens via local `activeKey`
// state inside this layout, never touching the URL/hash. SbpPortal's sub-views
// are fully static/hardcoded and never navigate each other, so unlike Bank
// there is no ctx object passed through — just the activeKey.
import { state, subscribe } from "../../state.js";
import { C } from "../../colors.js";
import { navigate } from "../../router.js";
import { icon, hydrateIcons, wireImageFallbacks, qs, qsa } from "../../utils.js";
import { render as renderSbpPortal } from "./portal.js";

const NAV = [
  { label: "Executive Dashboard", iconName: "layout-dashboard", key: "dashboard" },
  { label: "Applications", iconName: "scroll-text", key: "applications" },
  { label: "User Management", iconName: "users", key: "users" },
  { label: "Bank Management", iconName: "building-2", key: "banks" },
  { label: "Reports", iconName: "bar-chart-2", key: "reports" },
  { label: "Audit Trail", iconName: "shield-check", key: "audit" },
];

export function mount(container) {
  let sidebarOpen = false;
  let activeKey = "dashboard";

  function sidebarHtml() {
    return `
      <div class="flex flex-col h-full" style="background:#ffffff;border-right:1.5px solid ${C.border};">
        <div class="px-5 py-5 flex items-center gap-3 border-b" style="border-color:${C.border};">
          <div class="w-9 h-9 rounded-xl flex items-center justify-center" style="background:${C.orangeLight};border:1px solid ${C.orange}30;">
            <img data-fallback src="assets/state_bank_of_pakistan_logo-1.png" alt="SBP" class="w-8 h-8 object-contain" />
          </div>
          <div class="min-w-0">
            <div class="font-bold text-xs leading-tight truncate" style="color:${C.text};">SBP SME Portal</div>
            <div class="text-xs" style="font-family:var(--font-mono);font-size:10px;color:${C.textMuted};">Administrator</div>
          </div>
        </div>

        <div class="px-3 py-2 mx-3 mt-3 rounded-xl flex items-center gap-2" style="background:${C.orangeLight};border:1px solid ${C.orange}25;">
          ${icon("shield-check", { size: 14, color: C.orange })}
          <div>
            <div class="text-xs font-semibold" style="color:${C.orange};">SBP Admin</div>
            <div class="text-xs" style="color:${C.textMuted};">Elevated Privileges</div>
          </div>
        </div>

        <nav class="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          ${NAV.map(({ label, iconName, key }) => {
            const active = activeKey === key;
            return `
              <button data-nav-key="${key}" class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-left"
                style="background:${active ? C.orangeLight : "transparent"};color:${active ? C.orange : C.textMuted};border-left:${active ? `3px solid ${C.orange}` : "3px solid transparent"};">
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
            <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style="background:${C.orange};">${state.user?.name?.[0] ?? "A"}</div>
            <div class="min-w-0 flex-1">
              <div class="text-xs font-semibold truncate" style="color:${C.text};">${state.user?.name ?? "SBP Admin"}</div>
              <div class="text-xs truncate" style="font-size:10px;color:${C.textMuted};">${state.user?.email ?? ""}</div>
            </div>
            ${icon("settings", { size: 14, color: C.textMuted })}
          </div>
        </div>
      </div>
    `;
  }

  function renderShell() {
    const activeNav = NAV.find((n) => n.key === activeKey);
    const headerTitle = activeNav?.label ?? "Dashboard";

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
              <div class="text-sm font-semibold" style="color:${C.text};">${headerTitle}</div>
            </div>
            <button class="relative p-2 rounded-lg hover:bg-gray-100 transition-all" style="color:${C.textMuted};">
              ${icon("bell", { size: 16 })}
            </button>
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style="background:${C.orange};">${state.user?.name?.[0] ?? "A"}</div>
              <span class="hidden md:block text-sm font-medium" style="color:${C.text};">${(state.user?.name ?? "Admin").split(" ")[0]}</span>
            </div>
          </header>
          <main id="sbp-outlet" class="flex-1 overflow-y-auto"></main>
        </div>
      </div>
    `;

    wireShellEvents();
    hydrateIcons();
    wireImageFallbacks(container);

    const outlet = qs("#sbp-outlet", container);
    if (outlet) renderSbpPortal(outlet, activeKey);
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
  }

  const unsubscribe = subscribe(renderShell);
  renderShell();

  return {
    renderOutlet(renderFn) {
      // SBP has only one router-level child (index route); its sub-view
      // rendering is driven by local activeKey state, not by router-supplied
      // renderers. We accept renderFn to satisfy router.js's call contract but
      // intentionally ignore it — the shell always renders via renderSbpPortal().
      renderShell();
    },
    destroy() {
      unsubscribe();
    },
  };
}
