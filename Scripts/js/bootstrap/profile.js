// External bootstrap module for Views/Profile/Index.cshtml - identical to bootstrap/
// dashboard.js except the router defaults to #/sme/profile.
import { start } from "../router.js";
import { smeLayout, smeChildren, hydrateSmeSession } from "./smeAppRoutes.js";

const session = await hydrateSmeSession();

if (!window.location.hash || window.location.hash === "#/") {
  window.location.hash = "#/sme/profile";
}

start([{ path: "/sme", layoutKey: "sme", layout: smeLayout, children: smeChildren() }]);
