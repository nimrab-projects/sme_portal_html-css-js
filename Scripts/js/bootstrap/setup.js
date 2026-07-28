// External bootstrap module for Views/Applicant/Setup.cshtml (see Scripts/js/bootstrap/home.js
// for why this must be an external file, not an inline <script> - CSP's script-src 'self'
// with no 'unsafe-inline' silently blocks inline module scripts).
import { loadCsrfToken } from "../api.js";
import { render } from "../pages/sme/businessSetup.js";

// Same pattern as Scripts/js/bootstrap/login.js: render immediately, fetch the CSRF token
// in the background rather than gating the form behind it.
render(document.getElementById("app"));
loadCsrfToken();
