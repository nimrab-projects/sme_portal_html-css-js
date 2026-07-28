// External bootstrap module for Views/Application/Tracking.cshtml. Identical to bootstrap/
// applicationDetails.js except it defaults to #/sme/tracking/{id} - see that file's comments
// for why the {id} is parsed from window.location.pathname instead of an inline script.
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

const idMatch = window.location.pathname.match(/\/Application\/Tracking\/(\d+)/i);
const applicationId = idMatch ? idMatch[1] : "";

if (!window.location.hash || window.location.hash === "#/") {
  window.location.hash = `#/sme/tracking/${applicationId}`;
}

start([{ path: "/sme", layoutKey: "sme", layout: smeLayout, children: smeChildren() }]);
