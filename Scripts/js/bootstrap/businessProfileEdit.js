// External bootstrap module for Views/Profile/BusinessEdit.cshtml - identical to bootstrap/
// dashboard.js except the router defaults to #/sme/business-profile/edit, which mounts
// js/pages/sme/businessSetup.js in its edit mode (see smeAppRoutes.js).
import { start } from "../router.js";
import { smeLayout, smeChildren, hydrateSmeSession } from "./smeAppRoutes.js";

const session = await hydrateSmeSession();

if (!window.location.hash || window.location.hash === "#/") {
  window.location.hash = "#/sme/business-profile/edit";
}

start([{ path: "/sme", layoutKey: "sme", layout: smeLayout, children: smeChildren() }]);
