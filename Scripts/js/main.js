// Entry point: wires the route table (1:1 port of src/app/routes.tsx) and starts the router.
import { start } from "./router.js";
import { bootstrapSession } from "./api.js";
import { setUser, setBusinesses, setApplications, setNotifications } from "./state.js";

import * as intro from "./pages/intro.js";

import * as smeAuth from "./pages/sme/auth.js";
import * as smeBusinessSetup from "./pages/sme/businessSetup.js";
import * as smeLayout from "./pages/sme/layout.js";
import * as smeDashboard from "./pages/sme/dashboard.js";
import * as smeMyBusinesses from "./pages/sme/myBusinesses.js";
import * as smeMyApplications from "./pages/sme/myApplications.js";
import * as smeNewApplication from "./pages/sme/newApplication.js";
import * as smeApplicationSuccess from "./pages/sme/applicationSuccess.js";
import * as smeApplicationTracking from "./pages/sme/applicationTracking.js";
import * as smeOfferLetter from "./pages/sme/offerLetter.js";

import * as bankAuth from "./pages/bank/auth.js";
import * as bankLayout from "./pages/bank/layout.js";

import * as sbpAuth from "./pages/sbp/auth.js";
import * as sbpLayout from "./pages/sbp/layout.js";

// Bank/SBP layouts ignore the renderFn router.js passes to renderOutlet() —
// their real sub-view dispatch is driven by internal activeKey, not router
// children — so this is just a placeholder satisfying the route table shape.
function noop() {}

// Re-hydrates state from the real backend on every page load (a plain reload otherwise loses
// the in-memory mock state, per state.js's own comment). Never blocks/throws - a logged-out or
// failed session just leaves the app on its existing seed data, same as before this existed.
const session = await bootstrapSession();
if (session.authenticated) {
  setUser(session.user);
  if (session.businesses && session.businesses.length) {
    setBusinesses(session.businesses, session.businesses[0]);
  }
  setApplications(session.applications || []);
  setNotifications(session.notifications || []);
}

start([
  { path: "/", render: intro.render },

  { path: "/sme/login", render: smeAuth.render },
  { path: "/sme/setup", render: smeBusinessSetup.render },
  {
    path: "/sme",
    layoutKey: "sme",
    layout: smeLayout,
    children: [
      { index: true, render: smeDashboard.render },
      { path: "businesses", render: smeMyBusinesses.render },
      { path: "applications", render: smeMyApplications.render },
      { path: "apply", render: smeNewApplication.render },
      { path: "success", render: smeApplicationSuccess.render },
      { path: "tracking", render: smeApplicationTracking.render },
      { path: "tracking/:id", render: smeApplicationTracking.render },
      { path: "offer", render: smeOfferLetter.render },
      { path: "offer/:id", render: smeOfferLetter.render },
    ],
  },

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
