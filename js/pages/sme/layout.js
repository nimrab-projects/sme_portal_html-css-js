// 1:1 port of src/app/pages/sme/SmeLayout.tsx
import { state, subscribe, setSelectedBusiness, setUser, markNotificationsRead } from "../../state.js";
import { C } from "../../colors.js";
import { navigate, getCurrentPath } from "../../router.js";
import { icon, hydrateIcons, wireImageFallbacks, openModal, qs, qsa } from "../../utils.js";

const NAV = [
  { label: "Dashboard", iconName: "layout-dashboard", path: "/sme", color: C.green },
  { label: "My Businesses", iconName: "building-2", path: "/sme/businesses", color: C.blue },
  { label: "New Application", iconName: "plus-circle", path: "/sme/apply", color: C.orange },
  { label: "My Applications", iconName: "file-text", path: "/sme/applications", color: C.blue },
  { label: "Track Application", iconName: "map-pin", path: "/sme/tracking", color: C.green },
];

function openProfileModal() {
  let name = state.user?.name ?? "";
  let email = state.user?.email ?? "";
  let saved = false;

  openModal((overlay, close) => {
    function renderInner() {
      overlay.innerHTML = `
        <div class="w-full max-w-md rounded-2xl border" style="background:${C.surface};border:1.5px solid ${C.border};">
          <div class="flex items-start justify-between p-5 border-b" style="border-color:${C.border};">
            <div class="flex items-center gap-3">
              <div class="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0" style="background:${C.green};">${(state.user?.name?.[0] ?? "A")}</div>
              <div>
                <h3 class="text-sm font-bold" style="color:${C.text};">My Profile</h3>
                <p class="text-xs" style="color:${C.textMuted};">SME Applicant</p>
              </div>
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
            <div class="rounded-xl p-3" style="background:${C.bg};border:1.5px solid ${C.border};">
              <div class="flex items-center justify-between text-xs">
                <span style="color:${C.textMuted};">Registered Businesses</span>
                <span class="font-semibold" style="color:${C.text};">${state.businesses.length}</span>
              </div>
            </div>
            ${saved ? `
              <div class="rounded-xl p-3 flex gap-2.5" style="background:${C.greenLight};border:1.5px solid ${C.green};">
                ${icon("check-circle-2", { size: 16, color: C.green, style: "margin-top:2px;" })}
                <p class="text-xs leading-relaxed" style="color:${C.green};">Profile updated.</p>
              </div>` : ""}
          </div>
          <div class="flex gap-3 p-5 border-t" style="border-color:${C.border};">
            <button data-close class="flex-1 py-2.5 rounded-xl text-sm font-semibold border" style="border:1.5px solid ${C.border};color:${C.text};">Close</button>
            <button data-save class="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style="background:${C.green};">Save Changes</button>
          </div>
        </div>
      `;
      qsa("[data-close]", overlay).forEach((b) => b.addEventListener("click", close));
      qs("[data-name]", overlay).addEventListener("input", (e) => { name = e.target.value; saved = false; });
      qs("[data-email]", overlay).addEventListener("input", (e) => { email = e.target.value; saved = false; });
      qs("[data-save]", overlay).addEventListener("click", () => {
        setUser({ name: name.trim() || "Applicant", email: email.trim() });
        saved = true;
        renderInner();
      });
      hydrateIcons();
    }
    renderInner();
  });
}

function openSettingsModal() {
  let notifyEmail = true;
  let notifyApp = true;
  let saved = false;

  openModal((overlay, close) => {
    function renderInner() {
      overlay.innerHTML = `
        <div class="w-full max-w-md rounded-2xl border" style="background:${C.surface};border:1.5px solid ${C.border};">
          <div class="flex items-start justify-between p-5 border-b" style="border-color:${C.border};">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style="background:${C.greenLight};">${icon("settings", { size: 18, color: C.green })}</div>
              <h3 class="text-sm font-bold" style="color:${C.text};">Settings</h3>
            </div>
            <button data-close class="p-1 rounded-lg hover:bg-gray-100" style="color:${C.textMuted};">${icon("x", { size: 16 })}</button>
          </div>
          <div class="p-5 space-y-2">
            <label class="flex items-center justify-between p-2.5 rounded-xl border cursor-pointer" style="border:1.5px solid ${C.border};">
              <span class="text-sm" style="color:${C.text};">Email notifications</span>
              <input data-notify-email type="checkbox" class="rounded" ${notifyEmail ? "checked" : ""} />
            </label>
            <label class="flex items-center justify-between p-2.5 rounded-xl border cursor-pointer" style="border:1.5px solid ${C.border};">
              <span class="text-sm" style="color:${C.text};">In-app notifications</span>
              <input data-notify-app type="checkbox" class="rounded" ${notifyApp ? "checked" : ""} />
            </label>
            ${saved ? `
              <div class="rounded-xl p-3 flex gap-2.5 mt-2" style="background:${C.greenLight};border:1.5px solid ${C.green};">
                ${icon("check-circle-2", { size: 16, color: C.green, style: "margin-top:2px;" })}
                <p class="text-xs leading-relaxed" style="color:${C.green};">Settings saved.</p>
              </div>` : ""}
          </div>
          <div class="flex gap-3 p-5 border-t" style="border-color:${C.border};">
            <button data-close class="flex-1 py-2.5 rounded-xl text-sm font-semibold border" style="border:1.5px solid ${C.border};color:${C.text};">Close</button>
            <button data-save class="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style="background:${C.green};">Save Changes</button>
          </div>
        </div>
      `;
      qsa("[data-close]", overlay).forEach((b) => b.addEventListener("click", close));
      qs("[data-notify-email]", overlay).addEventListener("change", (e) => { notifyEmail = e.target.checked; saved = false; renderInner(); });
      qs("[data-notify-app]", overlay).addEventListener("change", (e) => { notifyApp = e.target.checked; saved = false; renderInner(); });
      qs("[data-save]", overlay).addEventListener("click", () => { saved = true; renderInner(); });
      hydrateIcons();
    }
    renderInner();
  });
}

export function mount(container) {
  let sidebarOpen = false;
  let bizDropdown = false;
  let notifOpen = false;
  let outletRender = null;

  function isActive(path) {
    const current = getCurrentPath();
    return path === "/sme" ? current === "/sme" : current.startsWith(path);
  }

  function sidebarHtml() {
    return `
      <div class="flex flex-col h-full" style="background:#ffffff;border-right:1.5px solid ${C.border};">
        <div class="px-5 py-5 flex items-center gap-3 border-b" style="border-color:${C.border};">
          <div class="w-9 h-9 rounded-xl flex items-center justify-center" style="background:${C.greenLight};border:1px solid ${C.green}30;">
            <img data-fallback src="assets/state_bank_of_pakistan_logo-1.png" alt="SBP" class="w-8 h-8 object-contain" />
          </div>
          <div class="min-w-0">
            <div class="font-bold text-xs leading-tight truncate" style="color:${C.text};">SBP SME Portal</div>
            <div class="text-xs" style="font-family:var(--font-mono);font-size:10px;color:${C.textMuted};">Applicant</div>
          </div>
        </div>
        <nav class="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <div class="px-3 mb-3 flex items-center gap-2">
            <div class="w-1 h-3.5 rounded-full" style="background:${C.green};"></div>
            <span class="text-xs font-extrabold uppercase tracking-widest" style="font-family:var(--font-mono);font-size:11px;color:${C.green};">Main Menu</span>
          </div>
          ${NAV.map(({ label, iconName, path, color }) => {
            const active = isActive(path);
            return `
              <button data-nav-path="${path}" class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-left"
                style="background:${active ? `${color}15` : "transparent"};color:${active ? color : C.text};border-left:${active ? `3px solid ${color}` : "3px solid transparent"};">
                <div class="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style="background:${active ? color : `${color}15`};">
                  ${icon(iconName, { size: 16, color: active ? "#FFFFFF" : color })}
                </div>
                ${label}
              </button>
            `;
          }).join("")}
        </nav>
        <div class="px-3 py-4 border-t" style="border-color:${C.border};">
          <button data-home class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-left hover:bg-gray-50 mb-1" style="color:${C.text};">
            <div class="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style="background:${C.gold}18;">${icon("home", { size: 16, color: C.gold })}</div>
            Home Page
          </button>
          <button data-signout class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-left hover:bg-gray-50" style="color:${C.textMuted};">
            ${icon("log-out", { size: 16 })}
            Sign Out
          </button>
          <div class="flex items-center gap-2 px-3 pt-3 mt-2 border-t" style="border-color:${C.border};">
            <button data-open-profile class="flex items-center gap-3 flex-1 min-w-0 text-left rounded-lg hover:bg-gray-50 p-1 -m-1">
              <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style="background:${C.green};">${state.user?.name?.[0] ?? "A"}</div>
              <div class="min-w-0 flex-1">
                <div class="text-xs font-semibold truncate" style="color:${C.text};">${state.user?.name ?? "User"}</div>
                <div class="text-xs truncate" style="font-size:10px;color:${C.textMuted};">${state.user?.email ?? ""}</div>
              </div>
            </button>
            <button data-open-settings class="p-1 rounded-lg hover:bg-gray-100 flex-shrink-0">${icon("settings", { size: 14, color: C.textMuted })}</button>
          </div>
        </div>
      </div>
    `;
  }

  function renderShell() {
    const unreadCount = state.notifications.filter((n) => !n.read).length;
    const activeNav = NAV.find((n) => isActive(n.path));

    container.innerHTML = `
      <div class="flex h-screen overflow-hidden" style="font-family:'Manrope',sans-serif;background:${C.bg};">
        <div class="hidden lg:flex w-[240px] flex-shrink-0 flex-col h-full" style="background:#ffffff;">
          ${sidebarHtml()}
        </div>
        ${sidebarOpen ? `
          <div class="lg:hidden fixed inset-0 z-50 flex">
            <div class="w-64 flex-shrink-0 h-full">${sidebarHtml()}</div>
            <div data-close-sidebar class="flex-1" style="background:rgba(0,0,0,0.5);"></div>
          </div>` : ""}
        <div class="flex-1 flex flex-col overflow-hidden">
          <header class="h-auto min-h-14 flex flex-wrap items-center px-3 sm:px-5 py-2 gap-2 sm:gap-3 flex-shrink-0 border-b" style="background:${C.surface};border-color:${C.border};">
            <button data-open-sidebar class="lg:hidden p-1 flex-shrink-0" style="color:${C.textMuted};">${icon("menu", { size: 20 })}</button>
            <div class="hidden xl:block pr-4 mr-1 border-r flex-shrink-0" style="border-color:${C.border};">
              <div class="text-sm font-bold leading-tight" style="color:${C.text};">${activeNav?.label ?? "Dashboard"}</div>
              <div class="text-xs" style="color:${C.textMuted};font-family:var(--font-mono);font-size:10px;">SME Applicant Portal</div>
            </div>
            <div class="relative flex-shrink-0 min-w-0">
              <button data-toggle-biz class="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg border text-sm font-medium min-w-0" style="border:1.5px solid ${C.border};color:${C.text};background:${C.bg};">
                ${icon("building-2", { size: 14, color: C.green })}
                <span class="max-w-[90px] sm:max-w-[140px] truncate">${state.selectedBusiness?.name ?? ""}</span>
                ${icon("chevron-down", { size: 14, color: C.textMuted })}
              </button>
              ${bizDropdown ? `
                <div class="absolute top-full left-0 mt-1 w-56 max-w-[85vw] rounded-xl border shadow-lg overflow-hidden z-10" style="background:${C.surface};border:1.5px solid ${C.border};">
                  ${state.businesses.map((b) => `
                    <button data-select-biz="${b.id}" class="w-full text-left px-4 py-2.5 text-sm flex items-center justify-between hover:bg-gray-50" style="color:${C.text};background:${state.selectedBusiness?.id === b.id ? C.greenLight : "transparent"};">
                      <div>
                        <div class="font-medium text-xs">${b.name}</div>
                        <div class="text-xs" style="color:${C.textMuted};">${b.nature}</div>
                      </div>
                      ${state.selectedBusiness?.id === b.id ? icon("chevron-right", { size: 12, color: C.green }) : ""}
                    </button>
                  `).join("")}
                  <div class="border-t" style="border-color:${C.border};">
                    <button data-add-business class="w-full text-left px-4 py-2.5 text-sm font-medium flex items-center gap-2 hover:bg-gray-50" style="color:${C.green};">
                      ${icon("plus-circle", { size: 14 })} Add New Business
                    </button>
                  </div>
                </div>` : ""}
            </div>
            <div class="hidden md:flex relative flex-1 min-w-[100px] max-w-xs">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">${icon("search", { size: 14, color: C.textMuted })}</span>
              <input type="text" placeholder="Search applications, businesses..." class="w-full rounded-lg border text-xs outline-none" style="padding:8px 12px 8px 30px;border:1.5px solid ${C.border};background:${C.bg};color:${C.text};" />
            </div>
            <div class="hidden md:block flex-1"></div>
            <div class="relative flex-shrink-0 ml-auto md:ml-0">
              <button data-toggle-notif class="relative p-2 rounded-lg hover:bg-gray-100" style="color:${C.textMuted};">
                ${icon("bell", { size: 16 })}
                ${unreadCount > 0 ? `<span class="absolute top-1 right-1 w-2 h-2 rounded-full" style="background:${C.orange};"></span>` : ""}
              </button>
              ${notifOpen ? `
                <div class="absolute right-0 top-full mt-1 w-72 max-w-[90vw] rounded-xl border shadow-lg z-10" style="background:${C.surface};border:1.5px solid ${C.border};">
                  <div class="px-4 py-3 border-b flex items-center justify-between" style="border-color:${C.border};">
                    <span class="text-sm font-semibold" style="color:${C.text};">Notifications</span>
                    ${unreadCount > 0 ? `<span class="text-xs px-2 py-0.5 rounded-full font-semibold" style="background:${C.orangeLight};color:${C.orange};">${unreadCount} New</span>` : ""}
                  </div>
                  <div class="max-h-80 overflow-y-auto">
                    ${state.notifications.length === 0
                      ? `<p class="px-4 py-6 text-xs text-center" style="color:${C.textMuted};">No notifications yet</p>`
                      : state.notifications.map(({ id, title, desc, time, dot, read }) => `
                        <div class="px-4 py-3 border-b hover:bg-gray-50 cursor-pointer" style="border-color:${C.border};background:${read ? "transparent" : C.blueLight};">
                          <div class="flex items-start gap-3">
                            <div class="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style="background:${dot};"></div>
                            <div class="flex-1 min-w-0">
                              <p class="text-xs font-semibold" style="color:${C.text};">${title}</p>
                              <p class="text-xs leading-snug mt-0.5" style="color:${C.textMuted};">${desc}</p>
                              <p class="text-xs mt-1" style="color:${C.textMuted};font-size:10px;">${time}</p>
                            </div>
                          </div>
                        </div>
                      `).join("")}
                  </div>
                </div>` : ""}
            </div>
            <div class="flex items-center gap-2 flex-shrink-0">
              <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style="background:${C.green};">${state.user?.name?.[0] ?? "A"}</div>
              <span class="hidden lg:block text-sm font-medium" style="color:${C.text};">${(state.user?.name ?? "User").split(" ")[0]}</span>
            </div>
          </header>
          <main id="sme-outlet" class="flex-1 overflow-y-auto"></main>
        </div>
      </div>
    `;

    wireShellEvents();
    hydrateIcons();
    wireImageFallbacks(container);

    const outlet = qs("#sme-outlet", container);
    if (outletRender && outlet) outletRender(outlet);
  }

  function wireShellEvents() {
    qsa("[data-nav-path]", container).forEach((btn) => {
      btn.addEventListener("click", () => {
        sidebarOpen = false;
        navigate(btn.getAttribute("data-nav-path"));
      });
    });
    qsa("[data-home]", container).forEach((btn) => btn.addEventListener("click", () => { sidebarOpen = false; navigate("/"); }));
    qsa("[data-signout]", container).forEach((btn) => btn.addEventListener("click", () => navigate("/")));
    qsa("[data-close-sidebar]", container).forEach((el) => el.addEventListener("click", () => { sidebarOpen = false; renderShell(); }));
    qsa("[data-open-sidebar]", container).forEach((btn) => btn.addEventListener("click", () => { sidebarOpen = true; renderShell(); }));
    qsa("[data-toggle-biz]", container).forEach((btn) => btn.addEventListener("click", () => { bizDropdown = !bizDropdown; notifOpen = false; renderShell(); }));
    qsa("[data-select-biz]", container).forEach((btn) => {
      btn.addEventListener("click", () => {
        const b = state.businesses.find((x) => x.id === btn.getAttribute("data-select-biz"));
        if (b) setSelectedBusiness(b);
        bizDropdown = false;
        renderShell();
      });
    });
    qsa("[data-add-business]", container).forEach((btn) => btn.addEventListener("click", () => { bizDropdown = false; navigate("/sme/setup"); }));
    qsa("[data-toggle-notif]", container).forEach((btn) => {
      btn.addEventListener("click", () => {
        notifOpen = !notifOpen;
        bizDropdown = false;
        if (notifOpen) markNotificationsRead();
        else renderShell();
      });
    });
    qsa("[data-open-profile]", container).forEach((btn) => btn.addEventListener("click", openProfileModal));
    qsa("[data-open-settings]", container).forEach((btn) => btn.addEventListener("click", openSettingsModal));
  }

  const unsubscribe = subscribe(renderShell);
  renderShell();

  return {
    renderOutlet(renderFn) {
      outletRender = renderFn;
      renderShell();
    },
    destroy() {
      unsubscribe();
    },
  };
}
