// External bootstrap module for Views/Notification/Index.cshtml - identical to bootstrap/
// dashboard.js except the router defaults to #/sme/notifications.
import { start } from "../router.js";
import { smeLayout, smeChildren, hydrateSmeSession } from "./smeAppRoutes.js";

const session = await hydrateSmeSession();

if (!window.location.hash || window.location.hash === "#/") {
  window.location.hash = "#/sme/notifications";
}

start([{ path: "/sme", layoutKey: "sme", layout: smeLayout, children: smeChildren() }]);
