// External bootstrap module for Views/Application/Index.cshtml - identical to bootstrap/
// dashboard.js except the router defaults to #/sme/applications instead of #/sme, so this page
// is a real, dedicated URL straight into the existing, unmodified My Applications list
// (js/pages/sme/myApplications.js).
import { start } from "../router.js";
import { smeLayout, smeChildren, hydrateSmeSession } from "./smeAppRoutes.js";

const session = await hydrateSmeSession();

if (!window.location.hash || window.location.hash === "#/") {
  window.location.hash = "#/sme/applications";
}

start([{ path: "/sme", layoutKey: "sme", layout: smeLayout, children: smeChildren() }]);
