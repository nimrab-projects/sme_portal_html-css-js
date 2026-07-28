// Shared SME route table (Phase 10 refactor). Every real MVC page under the SME Applicant
// portal (Dashboard, New Application, My Applications, Application Details/Tracking, and now
// Profile/Business Profile/Change Password) mounts the exact same persistent sidebar shell
// (layout.js) with the exact same internal hash-routed children - only the page-specific
// bootstrap script differs in which default hash it lands on. Before this refactor, each of
// those bootstrap files duplicated this entire import list + children array verbatim (5
// files, soon to be 10) - centralizing it here means adding a route once instead of once per
// entry-point file, and was worth doing now rather than copy-pasting it a sixth through tenth
// time for this phase's five new pages.
import * as smeLayout from "../pages/sme/layout.js";
import * as smeDashboard from "../pages/sme/dashboard.js";
import * as smeMyBusinesses from "../pages/sme/myBusinesses.js";
import * as smeMyApplications from "../pages/sme/myApplications.js";
import * as smeNewApplication from "../pages/sme/newApplication.js";
import * as smeApplicationSuccess from "../pages/sme/applicationSuccess.js";
import * as smeApplicationTracking from "../pages/sme/applicationTracking.js";
import * as smeApplicationDetails from "../pages/sme/applicationDetails.js";
import * as smeOfferLetter from "../pages/sme/offerLetter.js";
import * as smeNotifications from "../pages/sme/notifications.js";
import * as smeProfile from "../pages/sme/profile.js";
import * as smeProfileEdit from "../pages/sme/profileEdit.js";
import * as smeBusinessProfile from "../pages/sme/businessProfile.js";
import * as smeBusinessSetup from "../pages/sme/businessSetup.js";
import * as smeChangePassword from "../pages/sme/changePassword.js";

export { smeLayout };

export function smeChildren() {
  return [
    { index: true, render: smeDashboard.render },
    { path: "businesses", render: smeMyBusinesses.render },
    { path: "applications", render: smeMyApplications.render },
    { path: "apply", render: smeNewApplication.render },
    { path: "success", render: smeApplicationSuccess.render },
    // Bare "tracking" (no id) stays valid for callers that don't have a specific application in
    // hand (sidebar nav, dashboard quick action) - applicationTracking.js falls back to the
    // applicant's most recent application in that case (see that file).
    { path: "tracking", render: smeApplicationTracking.render },
    { path: "tracking/:id", render: smeApplicationTracking.render },
    { path: "application-details/:id", render: smeApplicationDetails.render },
    { path: "offer", render: smeOfferLetter.render },
    // Phase 11 - Notifications & Communication Module.
    { path: "notifications", render: smeNotifications.render },
    // Phase 10 - Profile & Business Profile Management.
    { path: "profile", render: smeProfile.render },
    { path: "profile/edit", render: smeProfileEdit.render },
    { path: "business-profile", render: smeBusinessProfile.render },
    // Reuses businessSetup.js itself for editing (params.mode "edit") rather than a second,
    // near-duplicate form module - see that file's own comment.
    { path: "business-profile/edit", render: (c, params) => smeBusinessSetup.render(c, { ...params, mode: "edit" }) },
    // Phase 12 (Multiple Business Management) - My Businesses' Add/Edit/View actions. "Add"
    // reuses the exact same businessSetup.js form as the routes above (params.mode "add");
    // "Edit"/"View" by :id reuse the same edit/view routes above, just parameterized to a
    // specific business instead of always the primary one - see businessSetup.js's and
    // businessProfile.js's own comments.
    { path: "business-profile/add", render: (c, params) => smeBusinessSetup.render(c, { ...params, mode: "add" }) },
    { path: "business-profile/edit/:id", render: (c, params) => smeBusinessSetup.render(c, { ...params, mode: "edit" }) },
    { path: "business-profile/view/:id", render: smeBusinessProfile.render },
    { path: "change-password", render: smeChangePassword.render },
  ];
}
