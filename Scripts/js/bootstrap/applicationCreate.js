// External bootstrap module for Views/Application/Create.cshtml - identical to bootstrap/
// dashboard.js except the router defaults to #/sme/apply instead of #/sme, so this page is a
// real, dedicated URL straight into the existing, unmodified New Application wizard
// (js/pages/sme/newApplication.js).
import { start } from "../router.js";
import { smeLayout, smeChildren, hydrateSmeSession } from "./smeAppRoutes.js";

const session = await hydrateSmeSession();

if (!window.location.hash || window.location.hash === "#/") {
  window.location.hash = "#/sme/apply";
}

start([{ path: "/sme", layoutKey: "sme", layout: smeLayout, children: smeChildren() }]);
