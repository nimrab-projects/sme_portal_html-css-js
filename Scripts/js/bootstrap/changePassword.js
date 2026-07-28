// External bootstrap module for Views/Profile/ChangePassword.cshtml - identical to bootstrap/
// dashboard.js except the router defaults to #/sme/change-password.
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

if (!window.location.hash || window.location.hash === "#/") {
  window.location.hash = "#/sme/change-password";
}

start([{ path: "/sme", layoutKey: "sme", layout: smeLayout, children: smeChildren() }]);
