// External bootstrap module for Views/Profile/Edit.cshtml - identical to bootstrap/
// dashboard.js except the router defaults to #/sme/profile/edit.
import { start } from "../router.js";
import { smeLayout, smeChildren, hydrateSmeSession } from "./smeAppRoutes.js";

const session = await hydrateSmeSession();

if (!window.location.hash || window.location.hash === "#/") {
  window.location.hash = "#/sme/profile/edit";
}

start([{ path: "/sme", layoutKey: "sme", layout: smeLayout, children: smeChildren() }]);
