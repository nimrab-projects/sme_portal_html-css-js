// External bootstrap module for Views/Account/Login.cshtml (see Scripts/js/bootstrap/home.js
// for why this must be an external file and not an inline <script> - CSP's script-src 'self'
// with no 'unsafe-inline' silently blocks inline module scripts).
import { loadCsrfToken } from "../api.js";
import { render } from "../pages/sme/auth.js";

// render() runs immediately, synchronously - the form always shows right away, with no
// dependency on the network call below. loadCsrfToken() is fired in the background (not
// awaited) to cache the token auth.js's login/register/OTP calls need as X-CSRF-TOKEN; it
// only needs to finish before the user's first submit, which is always at least a few
// seconds away since they have to type something first.
render(document.getElementById("app"));
loadCsrfToken();
