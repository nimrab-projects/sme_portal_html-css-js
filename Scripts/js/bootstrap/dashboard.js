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
import { start } from "../router.js";
import { smeLayout, smeChildren, hydrateSmeSession } from "./smeAppRoutes.js";

// Every MVC page is a fresh document load, so js/state.js's module-level store always starts
// back at its mock seed data - hydrateSmeSession() re-hydrates it from the real backend (the
// same thing js/main.js used to do once for the whole app, now also restoring whichever
// business the header switcher had active rather than always resetting to the first one -
// see smeAppRoutes.js) before the shell renders, so the Dashboard shows the actual signed-in
// user and their real saved business(es), not sample data.
const session = await hydrateSmeSession();
// (If session isn't authenticated here, ApplicantController's [Authorize] already redirected
// before this page could have rendered at all - this is just defensive, not a real path.)

if (!window.location.hash || window.location.hash === "#/") {
  window.location.hash = "#/sme";
}

start([{ path: "/sme", layoutKey: "sme", layout: smeLayout, children: smeChildren() }]);
