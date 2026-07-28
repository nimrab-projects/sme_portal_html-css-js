// External bootstrap module for Views/Applicant/Index.cshtml (see Scripts/js/bootstrap/home.js
// for why this must be an external file, not an inline <script>).
//
// Unlike the other bootstrap modules, this one still uses the internal hash router (start()
// from router.js) - but now scoped to just this one real MVC page, not the whole app. The
// persistent sidebar shell (layout.js) and its sub-views switch via a hash fragment (e.g.
// #/sme/businesses) exactly as they did before the MVC conversion, with no full page reload -
// that's the existing frontend's own mechanism for this persistent-shell UX, unchanged. Only
// the paths that actually exit this page (Home, Sign Out, Add New Business -> Setup) use real
// MVC navigation - see js/pages/sme/layout.js and js/pages/sme/myBusinesses.js.
import { bootstrapSession } from "../api.js";
import { setUser, setBusinesses, setApplications, setNotifications } from "../state.js";
import { start } from "../router.js";
import { smeLayout, smeChildren } from "./smeAppRoutes.js";

// Every MVC page is a fresh document load, so js/state.js's module-level store always starts
// back at its mock seed data - this re-hydrates it from the real backend (the same thing
// js/main.js used to do once for the whole app) before the shell renders, so the Dashboard
// shows the actual signed-in user and their real saved business(es), not sample data.
const session = await bootstrapSession();
if (session.authenticated) {
  setUser(session.user);
  if (session.businesses && session.businesses.length) {
    setBusinesses(session.businesses, session.businesses[0]);
  }
  // Always replace the mock SAMPLE_APPS seed, including with an empty array - a brand-new
  // applicant with zero real applications must show "0"/"no applications yet" everywhere,
  // never the seed data's fake rows.
  setApplications(session.applications || []);
  setNotifications(session.notifications || []);
}
// (If session isn't authenticated here, ApplicantController's [Authorize] already redirected
// before this page could have rendered at all - this is just defensive, not a real path.)

if (!window.location.hash || window.location.hash === "#/") {
  window.location.hash = "#/sme";
}

start([{ path: "/sme", layoutKey: "sme", layout: smeLayout, children: smeChildren() }]);
