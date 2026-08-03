// External bootstrap module for Views/Bank/Index.cshtml (Phase 13). Kept external, not an
// inline <script>, for the same CSP reason as every other bootstrap/*.js file (script-src
// 'self', no 'unsafe-inline').
//
// Unlike the SME side, Bank has no internal hash sub-routes to start router.js for - all of
// its sub-view switching is local `activeKey` state inside js/pages/bank/layout.js itself (see
// that file's own comment). This just re-hydrates js/state.js from the real backend (the same
// "every MVC page is a fresh document load" reason bootstrap/dashboard.js does it) and mounts
// the existing, unmodified layout.
import { loadCsrfToken, getCurrentUser, getBankApplications } from "../api.js";
import { setUser, setBankApplications } from "../state.js";
import * as bankLayout from "../pages/bank/layout.js";

await loadCsrfToken();

const current = await getCurrentUser();
if (current && current.authenticated) {
  setUser({ name: current.user.name, email: current.user.email, bankName: current.user.bankName });

  const applicationsResult = await getBankApplications();
  setBankApplications((applicationsResult && applicationsResult.applications) || []);
}
// (If session isn't authenticated here, BankController's [Authorize(Roles="BankOfficer")]
// already redirected before this page could have rendered at all - this is just defensive,
// not a real path.)

bankLayout.mount(document.getElementById("app"));
