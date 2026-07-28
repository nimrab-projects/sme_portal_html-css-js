# SME Portal — Phase Checklist (Full Roadmap)

Legend: ✅ Completed &nbsp; 🟨 Partially Implemented &nbsp; ⬜ Pending

---

## Foundation

- ✅ Static frontend prototype (hash-routed SPA, mock in-memory data) — starting point, predates backend work
- ✅ ASP.NET MVC 5 / EF6 / SQL Server project scaffolding
- ✅ ASP.NET Identity (int-keyed users), OWIN cookie authentication pipeline
- ✅ Camel-case JSON API convention (`JsonNetResult`)
- ✅ CSRF double-submit token pattern for a JS-only frontend
- ✅ Global security headers, rate limiting, audit logging

## Phase 1 — Backend Scaffolding (Auth + Business Setup as JSON API)

- ✅ `Users` / `Roles` / `UserRoles` (ASP.NET Identity, int-keyed, renamed tables)
- ✅ `Business` / `Shareholder` / `AuditLog` / `EmailOtp` tables
- ✅ Register / Verify OTP / Login / Logout / Current User JSON endpoints
- ✅ Google OAuth wiring (inactive until real credentials supplied)
- ✅ Email OTP generation + hashed storage + dev-echo (real SMTP not implemented)

## Architectural Pivot — Real MVC Routing

- ✅ Decision: real bookmarkable MVC routes for Login/Setup/Dashboard; internal hash routing preserved only for the Dashboard's own sub-navigation
- ✅ "Bootstrap shell" pattern established (thin Razor view + external JS module)

## Phase 2 — Landing Page

- ✅ `HomeController` / `Views/Home/Index.cshtml` / `bootstrap/home.js`
- ✅ `/` served by MVC, not a static file

## Phase 3 — Login / Register Pages

- ✅ `Views/Account/Login.cshtml` / `bootstrap/login.js`
- ✅ Page action added to `AccountController`

## Phase 4 — Auth / Routing Integration

- ✅ Removed duplicate classic form-post auth actions
- ✅ Single JSON-only implementation of register/login (`RegisterApi`/`LoginApi`)

## Phase 5 — Business Setup + Database

- ✅ `Controllers/ApplicantController.cs`, `/Applicant/Setup`
- ✅ `Business` model extended to full form shape (Proprietorship/Partnership/Private Limited, shareholders)
- ✅ Live first-login-vs-dashboard redirect logic
- ✅ CSRF-priming bug found and fixed (non-blocking pattern)

## Phase 6 — Applicant Dashboard

- ✅ `/Applicant` dashboard page, real business list, real (zero-state) application list
- ✅ `Application` table (minimal shape)
- ✅ Dashboard stat cards backed by real data
- ✅ Verified: per-user data isolation, first-login/second-business/after-submission scenarios

## Phase 7 — SME Finance Application Module

- ✅ New Application wizard wired to `POST /api/applications/save`
- ✅ `Application` table extended (RequestedAmount, PurposeOfFinance, business snapshot fields)
- ✅ Sequential, collision-proof reference number (`SME-{year}-{id:D6}`)
- ✅ `ApplicationStatusHistory` table + initial "Application Submitted" row
- ✅ `/Application/Create` classic MVC entry point alongside the JSON path
- ✅ Business-ownership tamper protection on submit
- 🟨 Document Upload step of the wizard — UI existed, not yet wired (completed in Phase 9, but as part of Application Details, not the wizard itself)

## Phase 8 — My Applications, Application Details & Tracking

- ✅ `/Application` (list, renamed from a short-lived `MyApplications`), search/filter (reference, business, scheme, status, date range)
- ✅ `/Application/Details/{id}` — new page, real business/applicant/finance/timeline data
- ✅ `/Application/Tracking/{id}` — real status timeline (was previously 100% hardcoded)
- ✅ Router support for `:id` dynamic path segments
- ✅ Ownership-aware 404s (never distinguishes "not found" from "not yours")
- ✅ Dashboard "View all" / stat cards / recent-applications row wired to real navigation
- ✅ Bug fix: blank page after login (browser cache/bfcache → global `NoCacheAttribute`)
- ✅ Bug fix: New Application input losing focus after one keystroke

## Phase 9 — Application Document Upload & Document Management

- ✅ `ApplicationDocument` table
- ✅ Upload / Replace / Delete / Download, all ownership-checked
- ✅ File-type allow-list (PDF/JPG/JPEG/PNG), 10MB size cap, empty-file rejection, duplicate-per-type rejection
- ✅ Secure storage under `App_Data` (not web-servable), GUID stored filenames (path-traversal-proof by construction)
- ✅ Required/Uploaded/Missing document counts on Application Details
- ✅ Delete/Replace blocked once application status is `under_review` or later
- ✅ Bug fix: EF6 key-convention mismatch on `ApplicationDocument` (500 on every request)
- ✅ Bug fix: oversized upload leaking a raw ASP.NET error page instead of clean JSON
- ⬜ Document status transitions (`verified`/`rejected`) — column exists, no reviewer flow sets it yet
- ⬜ In-app document preview (currently opens in a new browser tab)
- ⬜ Upload progress bar (no such UI exists in the source frontend to wire up)

## Phase 10 — User Profile & Business Profile Management

- ✅ `Controllers/ProfileController.cs` — `/Profile`, `/Profile/Edit`, `/Profile/Business`, `/Profile/Business/Edit`, `/Profile/ChangePassword`
- ✅ Personal Profile: view + edit (name/mobile; email intentionally non-editable pending a future verification workflow)
- ✅ Business Profile: view + edit via `BusinessService.UpdateBusinessAsync` (updates the existing row in place — never creates a duplicate business)
- ✅ Bank Information shown read-only from the Business Profile (single source of truth — see the bank-data-consistency bug fix below)
- ✅ Shareholder CRUD reusing the existing Partnership-form UI; shareholder total validated as ≤ 100%
- ✅ Password change via ASP.NET Identity's own `UserManager.ChangePasswordAsync` (no custom password logic)
- ✅ Cross-user URL-tampering protection (editing another user's profile/business via manipulated URL/ID is blocked)
- ✅ Bug fix (data consistency): `Application.Bank` was a redundant, hardcoded-`"HBL"` column disconnected from the applicant's real selected bank — removed entirely; `Bank` is now always computed from `Application.Business.Bank` at read time, everywhere it's displayed

## Phase 11 — Notifications & Communication Module

- ✅ `Notification` table (`NotificationId`, `UserId`, `Title`, `Message`, `NotificationType`, `ReferenceId`, `ReferenceType`, `IsRead`, `CreatedOn`, `ReadOn`, `CreatedBy`)
- ✅ `Controllers/NotificationController.cs` — `/Notifications` page + JSON API (`mine`, `unread-count`, `{id}/read`, `read-all`)
- ✅ `NotificationService`/`NotificationRepository` (thin controller, business logic in the service layer, matching every other module)
- ✅ Notification Center page (`js/pages/sme/notifications.js`) — newest-first list, unread badges, Mark as Read (single + all), navigation to the source record
- ✅ Header bell dropdown (`layout.js`) reworked: no longer auto-marks-all-read on open; adds an explicit "Mark all read" control; each row is clickable (marks that one read + navigates); a "View All Notifications" footer link opens the full Notification Center
- ✅ Auto-created notifications wired into real trigger points: Registration Completed, Business Profile Created, Business Profile Updated, New Application Submitted, Document Uploaded, Password Changed
- ✅ Ownership security: a notification ID belonging to another user 404s (same pattern as Applications/Documents/Business), verified with a live cross-user test
- ✅ Unauthenticated access to any notification endpoint/page rejected (401 for the JSON API, 302 redirect to login for the page)
- 🟨 Application Status Changed, Document Verified, Offer Letter Generated/Accepted/Rejected — `CreateNotificationAsync` supports these event types, but no real trigger point exists yet (no reviewer/status-change workflow, no document-verification workflow, no Offer Letter backend) — infrastructure-ready, not yet wired to a real event

## Phase 12 — Multiple Business Management (Add Business)

- ✅ "Add Business" (My Businesses) now opens the exact same Business Profile form used after registration (`businessSetup.js`), mounted as a layout child at `#/sme/business-profile/add` instead of leaving the shell for the guarded, first-time-only `/Applicant/Setup` page — fixing a real bug where a user who already owned a business could never actually add a second one (Setup's own redirect guard sent them straight back to the Dashboard)
- ✅ Single reusable Business Profile form now supports three modes: `create` (first business, unchanged), `add` (a later business, returns to My Businesses), `edit` (updates one existing business, now parameterized by a specific business id instead of always "the primary one")
- ✅ `GET /api/business/{id}` and `DELETE /api/business/{id}` — ownership-checked, 404 for "doesn't exist or isn't yours" (same convention as every other module)
- ✅ My Businesses page: each card now shows Business Type, Bank, IBAN, Status, and Created Date, plus explicit View/Edit/Delete actions (previously only a whole-card "select as active business" click existed)
- ✅ Delete business rule: blocked (`delete_not_allowed`) if the business has any financing applications on record — Business→Application is a cascade-delete relationship, so deleting a business with real application history would silently destroy it too
- ✅ New Application's business selector already listed every one of the user's businesses (built that way since Phase 7) — verified it correctly includes newly-added businesses with no changes needed
- ✅ Verified: cross-user 404 on both `GET`/`DELETE` for another user's business id; adding/editing/deleting a business never affects another user's or another business's data

---

## Not Yet Started

- ⬜ Document Verification / Review workflow (bank or SBP staff marking documents Verified/Rejected with remarks)
- ⬜ Application Review Workflow (Under Review → Approval Committee → Approved/Rejected → Disbursed), with a matching UI for whoever performs the review
- ⬜ Offer Letter backend (accept/reject a real offer, currently `offerLetter.js` is fully hardcoded)
- ⬜ Participating Bank Portal backend (`js/pages/bank/*` — login, review queue, decisioning — currently mock-only)
- ⬜ SBP Administrator Portal backend (`js/pages/sbp/*` — oversight/reporting — currently mock-only)
- ⬜ Real SMTP email delivery (OTP dev-echo only today) — Notification module's "Communication" side is in-app only; no email/SMS delivery of notifications yet
- ⬜ Microsoft / Apple SSO (UI buttons exist, no OWIN middleware)
- ⬜ Password reset (token provider configured, no endpoints/UI)
- ⬜ Reporting / analytics module
- ⬜ Removal of legacy `Scripts/js/main.js`
- ⬜ Production deployment hardening (distributed rate limiting, HTTPS enforcement toggle already present but unused locally, real machine-key/data-protection key persistence across app-pool recycles)

---

## Final Deployment Readiness

- ⬜ Load/performance testing
- ⬜ Security review / penetration test
- ⬜ Production SQL Server + connection string, real Google OAuth credentials, real SMTP credentials
- ⬜ CI/CD pipeline
- ⬜ Go-live checklist for the two remaining portals (Bank, SBP)
