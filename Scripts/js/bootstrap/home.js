// External bootstrap module for Views/Home/Index.cshtml. Kept as its own file (not an inline
// <script type="module"> in the .cshtml) because the app's CSP header is script-src 'self' with
// no 'unsafe-inline' - an inline module script is silently blocked by the browser, which is
// exactly why intro.js was never being requested. External same-origin scripts are unaffected.
//
// Bank/SBP have no real backend yet (mock-only, per the original build plan), so unlike SME -
// which now has real MVC pages (bootstrap/dashboard.js etc.) - their login/portal flow only
// ever exists as client-side hash routes. Before this, home.js just called intro.render() once
// with no router running at all, so the Bank/SBP "Enter Portal" cards' navigate("/bank/login")/
// navigate("/sbp/login") silently changed the URL hash with nothing on screen reacting to it -
// clicking them did nothing. Starting the same hash router main.js used to run (before the SME
// side moved to real MVC pages) restores that, scoped to exactly the three sections that still
// live here: Intro itself, Bank, and SBP.
import { start } from "../router.js";
import * as intro from "../pages/intro.js";
import * as bankAuth from "../pages/bank/auth.js";
import * as bankLayout from "../pages/bank/layout.js";
import * as sbpAuth from "../pages/sbp/auth.js";
import * as sbpLayout from "../pages/sbp/layout.js";

// Bank/SBP layouts ignore the renderFn router.js passes to renderOutlet() - their real
// sub-view dispatch is driven by internal activeKey, not router children - so this is just a
// placeholder satisfying the route table shape (same as main.js's old one).
function noop() {}

start([
  { path: "/", render: intro.render },

  { path: "/bank/login", render: bankAuth.render },
  {
    path: "/bank",
    layoutKey: "bank",
    layout: bankLayout,
    children: [{ index: true, render: noop }],
  },

  { path: "/sbp/login", render: sbpAuth.render },
  {
    path: "/sbp",
    layoutKey: "sbp",
    layout: sbpLayout,
    children: [{ index: true, render: noop }],
  },
]);
