// External bootstrap module for Views/Application/Details.cshtml. Identical to bootstrap/
// dashboard.js except the router defaults to #/sme/application-details/{id} - the {id} comes
// from the real MVC URL path (/Application/Details/42), read here via window.location.pathname
// rather than an inline script (this app's CSP has no 'unsafe-inline', so server data can't be
// embedded as an inline <script>).
import { bootstrapSession } from "../api.js";
import { setUser, setBusinesses, setApplications, setNotifications } from "../state.js";
import { start } from "../router.js";
import { smeLayout, smeChildren } from "./smeAppRoutes.js";

const session = await bootstrapSession();
if (session.authenticated) {
  setUser(session.user);
  if (session.businesses && session.businesses.length) {
    setBusinesses(session.businesses, session.businesses[0]);
  }
  setApplications(session.applications || []);
  setNotifications(session.notifications || []);
}

const idMatch = window.location.pathname.match(/\/Application\/Details\/(\d+)/i);
const applicationId = idMatch ? idMatch[1] : "";

if (!window.location.hash || window.location.hash === "#/") {
  window.location.hash = `#/sme/application-details/${applicationId}`;
}

start([{ path: "/sme", layoutKey: "sme", layout: smeLayout, children: smeChildren() }]);
