// External bootstrap module for Views/Application/Details.cshtml. Identical to bootstrap/
// dashboard.js except the router defaults to #/sme/application-details/{id} - the {id} comes
// from the real MVC URL path (/Application/Details/42), read here via window.location.pathname
// rather than an inline script (this app's CSP has no 'unsafe-inline', so server data can't be
// embedded as an inline <script>).
import { start } from "../router.js";
import { smeLayout, smeChildren, hydrateSmeSession } from "./smeAppRoutes.js";

const session = await hydrateSmeSession();

const idMatch = window.location.pathname.match(/\/Application\/Details\/(\d+)/i);
const applicationId = idMatch ? idMatch[1] : "";

if (!window.location.hash || window.location.hash === "#/") {
  window.location.hash = `#/sme/application-details/${applicationId}`;
}

start([{ path: "/sme", layoutKey: "sme", layout: smeLayout, children: smeChildren() }]);
