// External bootstrap module for Views/Home/Index.cshtml. Kept as its own file (not an inline
// <script type="module"> in the .cshtml) because the app's CSP header is script-src 'self' with
// no 'unsafe-inline' - an inline module script is silently blocked by the browser, which is
// exactly why intro.js was never being requested. External same-origin scripts are unaffected.
import { render } from "../pages/intro.js";

render(document.getElementById("app"));
