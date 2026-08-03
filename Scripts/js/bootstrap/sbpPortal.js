// External bootstrap module for Views/Sbp/Index.cshtml (SBP Admin Portal sync, Phase 1). Same
// shape as bootstrap/bankPortal.js: no internal hash sub-routes to start router.js for - all
// sub-view switching is local activeKey state inside js/pages/sbp/layout.js itself. This just
// re-hydrates js/state.js from the real backend and mounts the existing, unmodified layout.
import { loadCsrfToken, getCurrentUser } from "../api.js";
import { setUser } from "../state.js";
import * as sbpLayout from "../pages/sbp/layout.js";

await loadCsrfToken();

const current = await getCurrentUser();
if (current && current.authenticated) {
  setUser({ name: current.user.name, email: current.user.email, profilePictureUrl: current.user.profilePictureUrl });
}
// (If session isn't authenticated here, SbpController's [Authorize(Roles="SbpAdmin")] already
// redirected before this page could have rendered at all - this is just defensive, not a real
// path.)

sbpLayout.mount(document.getElementById("app"));
