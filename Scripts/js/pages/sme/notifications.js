// Notification Center (Phase 11) - a genuinely new page. Built from the same visual
// primitives already used throughout this app (colors.js's C tokens, utils.js's
// icon()/escapeHtml(), the same "rounded-2xl border" card style used in profile.js) - not a
// new design language. Reuses layout.js's own dot-color/navigation mapping approach (the
// server only returns raw notificationType/referenceType/referenceId facts, never a frontend
// URL - see that file's comment) since a page-scoped module can't import from the layout shell
// without a circular dependency, matching how STATUS_CONFIG is already duplicated per-page
// (myApplications.js, applicationDetails.js, dashboard.js, applicationTracking.js) rather than
// centralized.
import { markOneNotificationRead, markNotificationsRead } from "../../state.js";
import { C } from "../../colors.js";
import { navigate } from "../../router.js";
import { icon, escapeHtml, hydrateIcons, wireImageFallbacks, qs, qsa } from "../../utils.js";
import * as api from "../../api.js";

const NOTIFICATION_DOT_COLORS = {
  RegistrationCompleted: C.green,
  BusinessCreated: C.green,
  BusinessUpdated: C.blue,
  ApplicationSubmitted: C.blue,
  ApplicationStatusChanged: C.orange,
  DocumentUploaded: C.blue,
  DocumentVerified: C.green,
  OfferLetterGenerated: C.gold,
  OfferLetterAccepted: C.green,
  OfferLetterRejected: C.orange,
  PasswordChanged: C.textMuted,
};

function notificationDotColor(notificationType) {
  return NOTIFICATION_DOT_COLORS[notificationType] || C.blue;
}

// Document-related notifications use ReferenceType "Application" (not "Document") - there is no
// standalone document details page in this frontend; documents live on the Application Details
// page's Documents card.
function notificationNavPath(referenceType, referenceId) {
  if (!referenceId) return null;
  switch (referenceType) {
    case "Application": return `/sme/application-details/${referenceId}`;
    case "Business": return "/sme/business-profile";
    case "OfferLetter": return "/sme/offer";
    default: return null;
  }
}

export function render(container) {
  let loading = true;
  // Kept local (not read from global state.notifications) so this page's own initial fetch
  // never itself triggers state.js's notify() - layout.js's persistent shell re-invokes this
  // exact render(container) fresh on every global state mutation (see layout.js's own
  // notification-dropdown comment), so calling a global setter from inside this unconditional
  // fetch would recreate the exact same fetch->notify->remount->fetch cycle forever. Mark-as-
  // read actions below still call the global setters (markOneNotificationRead/
  // markNotificationsRead) - once, in response to a real user click, not a loop - so the
  // header's unread badge stays in sync.
  let notifications = [];

  function loadingHtml() {
    return `<div class="px-6 py-10 text-center text-sm" style="color:${C.textMuted};">Loading notifications…</div>`;
  }

  function rowHtml(n) {
    const { id, title, desc, date, time, read, notificationType, referenceId, referenceType } = n;
    return `
      <div data-notif-row data-notif-id="${id}" data-ref-type="${referenceType ?? ""}" data-ref-id="${referenceId ?? ""}"
        class="px-5 py-4 border-b last:border-0 hover:bg-gray-50 cursor-pointer" style="border-color:${C.border};background:${read ? "transparent" : C.blueLight};">
        <div class="flex items-start gap-3">
          <div class="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0" style="background:${notificationDotColor(notificationType)};"></div>
          <div class="flex-1 min-w-0">
            <div class="flex items-start justify-between gap-3">
              <p class="text-sm font-semibold" style="color:${C.text};">${escapeHtml(title)}</p>
              ${!read ? `<span class="text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0" style="background:${C.orangeLight};color:${C.orange};">New</span>` : ""}
            </div>
            <p class="text-sm leading-snug mt-1" style="color:${C.textMuted};">${escapeHtml(desc)}</p>
            <p class="text-xs mt-1.5" style="color:${C.textMuted};font-size:11px;">${escapeHtml(date ?? "")}${date && time ? " · " : ""}${escapeHtml(time ?? "")}</p>
          </div>
        </div>
      </div>
    `;
  }

  function contentHtml() {
    const unreadCount = notifications.filter((n) => !n.read).length;
    return `
      <div class="px-6 py-6" style="font-family:var(--font-display);">
        <div class="flex items-center gap-3 mb-6">
          <button data-back class="p-2 rounded-xl hover:bg-white border" style="border:1.5px solid ${C.border};">
            ${icon("arrow-left", { size: 16, color: C.textMuted })}
          </button>
          <div class="flex-1 min-w-0">
            <h1 class="text-lg font-bold" style="color:${C.text};">Notifications</h1>
            <p class="text-xs" style="color:${C.textMuted};">${unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}</p>
          </div>
          ${unreadCount > 0 ? `
            <button data-mark-all-read class="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white" style="background:${C.green};">
              ${icon("check-check", { size: 14, color: "#fff" })} Mark All Read
            </button>` : ""}
        </div>

        <div class="rounded-2xl border overflow-hidden max-w-3xl" style="background:${C.surface};border:1.5px solid ${C.border};">
          ${notifications.length === 0
            ? `<p class="px-5 py-10 text-sm text-center" style="color:${C.textMuted};">No notifications yet</p>`
            : notifications.map(rowHtml).join("")}
        </div>
      </div>
    `;
  }

  function wireEvents() {
    qs("[data-back]", container)?.addEventListener("click", () => navigate("/sme"));
    qs("[data-mark-all-read]", container)?.addEventListener("click", async () => {
      await api.markAllNotificationsRead();
      notifications = notifications.map((n) => ({ ...n, read: true }));
      markNotificationsRead();
      renderAll();
    });
    qsa("[data-notif-row]", container).forEach((row) => {
      row.addEventListener("click", async () => {
        const id = row.getAttribute("data-notif-id");
        const path = notificationNavPath(row.getAttribute("data-ref-type"), row.getAttribute("data-ref-id"));
        await api.markNotificationRead(id);
        notifications = notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
        markOneNotificationRead(id);
        if (path) navigate(path);
        else renderAll();
      });
    });
  }

  function renderAll() {
    container.innerHTML = loading ? loadingHtml() : contentHtml();
    wireEvents();
    hydrateIcons();
    wireImageFallbacks(container);
  }

  renderAll();

  api.listMyNotifications().then((result) => {
    loading = false;
    notifications = (result && result.notifications) || [];
    renderAll();
  });
}
