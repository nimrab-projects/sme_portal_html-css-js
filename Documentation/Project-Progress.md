# SME Portal — Project Progress

> Reconstructed from the actual commit-by-commit implementation history of this engagement, not written in advance. Every phase below reflects work that has actually been completed and verified in the current codebase.

---

## Starting Point (Pre-Phase 1)

The project began as `SME-portal-Static`: a static HTML/CSS/JS SPA (originally ported from a React source tree — every JS page module still carries a `// 1:1 port of src/app/...` comment) with a hash router (`js/router.js`) and an in-memory mock store (`js/state.js`, `SAMPLE_BUSINESSES`/`SAMPLE_APPS`/etc.). No server, no database, no network calls existed anywhere.

---

## Phase 1 — Backend Scaffolding & Initial Plan (JSON API only)

**Objective:** Stand up an ASP.NET MVC 5 / EF6 / SQL Server backend implementing Applicant registration, login, Google OAuth, first-login detection, and business setup, as a pure JSON API layered underneath the still-100%-static frontend.

**Features implemented:** Project scaffolding (MVC5, Individual Accounts template pruned down), Identity model (`ApplicationUser`/`ApplicationRole`/`ApplicationUserRole`, int-keyed), `Business`/`Shareholder`/`AuditLog`/`EmailOtp` tables, OWIN cookie + Google auth pipeline, CSRF double-submit pattern, rate limiting, camelCase JSON serialization.

**Files created:** `Controllers/AccountController.cs`, `Controllers/BusinessController.cs`; `Models/ApplicationUser.cs`, `ApplicationRole.cs`, `ApplicationUserRole.cs`, `ApplicationUserLogin.cs`, `ApplicationUserClaim.cs`, `Business.cs`, `Shareholder.cs`, `AuditLog.cs`, `EmailOtp.cs`; `DAL/ApplicationDbContext.cs`, `DAL/Migrations/Configuration.cs`; `Services/*` (Auth, Otp, Business, Audit) + interfaces; `Repositories/*` (User, Business, Otp, AuditLog) + interfaces; `ViewModels/*` (Register/Login/VerifyOtp/SaveBusiness/Shareholder/User/CurrentUser/Business/ApiError); `Filters/ValidateAjaxAntiForgeryTokenAttribute.cs`, `RateLimitAttribute.cs`; `Helpers/ValidationHelper.cs`, `IpAddressHelper.cs`, `JsonNetResult.cs`; `App_Start/IdentityConfig.cs`; `Startup.cs`, `Startup.Auth.cs`.

**Database changes:** Created `Users`, `Roles`, `UserRoles`, `Business`, `Shareholder`, `AuditLog`, `EmailOtp` (via EF6 automatic migrations).

**Services added:** `AuthService`, `OtpService`, `BusinessService`, `AuditService`.

**Controllers added:** `AccountController` (JSON), `BusinessController` (JSON).

**Views added:** none yet — the frontend was still 100% static at this point; `js/api.js` was added so the existing JS could call the new endpoints.

**JavaScript changes:** `js/api.js` created; `js/main.js` updated to call `bootstrapSession()`; `js/state.js` gained `setBusinesses()`; `js/pages/sme/auth.js`/`businessSetup.js` became async and called the real API instead of only mutating local mock state.

**Security improvements:** PBKDF2 password hashing, account lockout (5 attempts / 15 min), CSRF double-submit, per-IP rate limiting on login/register, security response headers.

**Validation added:** Email/mobile/CNIC regex validation, duplicate email/mobile checks, password policy.

**Bugs fixed:** N/A (initial build).

**Testing performed:** Manual end-to-end via curl/browser: register → OTP → login → save business.

**Current status:** Superseded in scope by the pivot below (routing model changed), but every table/service/repository from this phase is still in production use today, unchanged in structure.

**Pending work at end of phase:** Real page routing (the frontend was still hash-only against a single static `/`).

---

## Architectural Pivot — Full MVC Conversion Decision

**Objective:** Convert the SPA's hash-only routing into real, bookmarkable MVC routes (`/Account/Login`, `/Applicant/Setup`, `/Applicant`) while keeping the Dashboard's internal sub-navigation (My Businesses/Apply/etc.) as hash routing inside one persistent shell — an explicit, confirmed decision, not an oversight.

**Key architectural pattern established here (used in every phase since):** every real MVC page is a thin Razor "bootstrap shell" — `<div id="app">` + one `<script type="module">` tag loading a dedicated file under `Scripts/js/bootstrap/` — which imports the **unmodified** existing page-render JS module and mounts it. Must be an external file because CSP (`script-src 'self'`, no `'unsafe-inline'`) silently blocks inline module scripts (a real bug found and fixed at this stage).

---

## Phase 2 — Landing Page

**Objective:** Convert the static landing page (`index.html` + `js/pages/intro.js`) into a real MVC page at `/`.

**Files created:** `Controllers/HomeController.cs`, `Views/Home/Index.cshtml`, `Views/Shared/_Layout.cshtml`, `Views/_ViewStart.cshtml`, `Scripts/js/bootstrap/home.js`.

**Files modified:** `App_Start/RouteConfig.cs` (default route now resolves `/` to `HomeController.Index()` instead of a static `index.html`).

**Database changes:** none.

**JavaScript changes:** none to `intro.js` itself — reused exactly.

**Bugs fixed:** inline `<script>` bootstrap blocked by CSP → moved to an external module file (the pattern every later bootstrap file follows).

**Current status:** Complete. Landing page is a real MVC page, pixel-identical to the original.

---

## Phase 3 — Login / Register Pages

**Objective:** Convert the Login/Register/OTP UI into a real MVC page at `/Account/Login`.

**Files created:** `Views/Account/Login.cshtml`, `Scripts/js/bootstrap/login.js`.

**Files modified:** `Controllers/AccountController.cs` (added the page-serving `Login()` action alongside the existing JSON actions).

**Bugs fixed / notable event:** a classic form-post `Register`/`Login` action pair was briefly added here with the same names as the JSON actions, colliding with them — resolved in Phase 4 by removing the classic duplicates and renaming the JSON actions to `RegisterApi`/`LoginApi`.

**Current status:** Superseded by Phase 4's cleanup, but the page itself has been stable since.

---

## Phase 4 — Auth / Routing Integration

**Objective:** Resolve the Phase 3 naming collision and make the JSON API the single, non-duplicated implementation of login/register.

**Files modified:** `Controllers/AccountController.cs` — removed the classic form-post placeholder actions; renamed the JSON actions to `RegisterApi`/`LoginApi` (routes unchanged: `api/account/register`, `api/account/login`, so `js/api.js` needed no changes); `Views/Account/Login.cshtml` — removed a now-dead `@Html.AntiForgeryToken()` left over from the removed classic actions.

**Security improvements:** confirmed CSRF flow works end-to-end for the JSON-only path.

**Bugs fixed:** the duplicate-implementation risk from Phase 3 (two parallel, divergent login/register code paths) was eliminated by design, not patched around.

**Current status:** Complete. This is the auth architecture still in production today (§7 of the Backend Implementation Guide).

---

## Phase 5 — Business Setup + Database

**Objective:** Convert the Business Setup form into a real MVC page (`/Applicant/Setup`) and extend the minimal `ApplicantProfile` concept into the full `Business`/`Shareholder` schema the existing form actually collects.

**Files created:** `Controllers/ApplicantController.cs`, `Views/Applicant/Setup.cshtml`, `Scripts/js/bootstrap/setup.js`.

**Files modified:** `Models/Business.cs` (extended with every field `businessSetup.js` collects: ContactPerson, CellLandline, Email, AnnualSales, YearEstablished, Employees, Premise, Nature, BusinessStatus, Registration(+Number/Authority), Description, Bank, Iban), `Services/BusinessService.cs`, `js/pages/sme/businessSetup.js` (save handler now posts to the API and calls `addBusiness()` with the real response).

**Database changes:** `Business` table extended to its current full shape; `Shareholder` table's FK/cascade-delete relationship established.

**Business logic:** first-login redirect is **computed live** (`BusinessService.HasAnyBusinessAsync`) rather than trusted from the `Users.IsFirstLogin` column alone — avoids a dead end where a user who abandons Setup without saving would otherwise be routed to an empty Dashboard on their next login.

**Bugs fixed:** confirm-password field / "Something went wrong" on Create Account — a real CSRF-token-priming bug (the Setup/Login pages' bootstrap script wasn't fetching the CSRF token before the first POST). Fixed, regressed once when reverted per explicit user instruction ("undo the changes, the form was showing"), then re-fixed with a **non-blocking pattern**: `render()` runs synchronously first (so the form always appears immediately, with zero dependency on the network), and `loadCsrfToken()` fires afterward without being awaited.

**Testing performed:** full curl simulation of load → background token fetch → submit; verified success.

**Current status:** Complete and stable.

---

## Phase 6 — Applicant Dashboard (Business & Application Logic)

**Objective:** Make the Dashboard load live data from SQL Server — real per-user businesses, real (initially zero) applications, real stat counts — with no fake/demo data.

**Files created:** `Views/Applicant/Index.cshtml`, `Scripts/js/bootstrap/dashboard.js`; `Models/Application.cs` (new — minimal at this point: Id, BusinessId FK, CaseId, Scheme, Amount, Bank, Status, Stage, SubmittedOn, CreatedOn, UpdatedOn); `Repositories/IApplicationRepository.cs`/`ApplicationRepository.cs`; `Services/IApplicationService.cs`/`ApplicationService.cs`; `Controllers/ApplicationController.cs` (JSON only at this point: `mine`, `save`); `ViewModels/ApplicationResponseViewModel.cs`, `SubmitApplicationRequestViewModel.cs`.

**Files modified:** `Controllers/ApplicantController.cs` (added `Index()` action with a redirect-to-Setup guard for users with zero businesses), `DAL/ApplicationDbContext.cs` (added `Applications` DbSet + FK mapping), `Scripts/js/api.js` (`listMyApplications`, `submitApplication`, `bootstrapSession()` now also hydrates applications), `Scripts/js/state.js` (`setApplications()`).

**Database changes:** created `Application` table.

**Business logic / architectural rule established here (held ever since):** Applications are always loaded by first resolving the user's Business IDs, then querying by those IDs — **there is deliberately no `Application.UserId` column.**

**Testing performed:** verified all three of the phase's worked examples via direct API calls (first login → 1 business/0 apps; second business → 2 businesses/0 apps; after submission → 2 businesses/1 app) plus a cross-user data-isolation regression check.

**Bugs fixed:** none new (a suspected "second business" during regression testing turned out to be a test-script false positive — a shareholder's name field being matched by an overly broad grep, not an actual bug).

**Current status:** Complete. Dashboard shows live data.

**Pending work at end of phase:** the New Application wizard's actual submit button still only updated client-side mock state — not yet wired to `POST /api/applications/save` (explicitly flagged as deferred to the next phase).

---

## Phase 7 — SME Finance Application Module

**Objective:** Make the existing 3-step New Application wizard actually submit to the database, and add a real, working classic-MVC entry point alongside the JS-driven one.

**Files created:** `Views/Application/Create.cshtml`, `Scripts/js/bootstrap/applicationCreate.js`.

**Files modified:** `Models/Application.cs` (added `RequestedAmount`, `PurposeOfFinance`, `BusinessSector`, `BusinessAge`, `MonthlyTurnover`, `Employees`, `SubmittedByUserId` — the last four are a **snapshot** of the business's profile at submission time, so historical data survives a later profile edit); `Services/ApplicationService.cs` (`SubmitApplicationAsync` rewritten: ownership check, snapshot computation, **sequential reference number** derived from the database identity column — `SME-{year}-{ApplicationId:D6}` — replacing the earlier random-number `CaseId`, plus an initial `ApplicationStatusHistory` row); `Controllers/ApplicationController.cs` (added `Create()` GET/POST page actions, route-overridden with `~/` since the class-level `RoutePrefix` is `api/applications`); `Scripts/js/pages/sme/newApplication.js` (the "Agree & Submit" handler now calls `api.submitApplication()` for real, with a duplicate-submit guard and an inline error banner); `Scripts/js/state.js` (`addApplication()` reworked to accept the server's already-complete response object instead of generating its own mock ID/CaseId).

**Database changes:** new `ApplicationStatusHistory` table (StatusHistoryId, ApplicationId FK, Status, Note, ChangedByUserId, CreatedOn).

**Services added:** none new; `ApplicationService` extended.

**Security improvements:** business-ownership tamper check on submit (a client-supplied `BusinessId` for another user's business is rejected).

**Validation added:** required fields, `RequestedAmount > 0`, max lengths — all via `SubmitApplicationRequestViewModel` data annotations + a service-level re-check.

**Testing performed:** full curl + real-browser (headless Chrome via CDP) run of register → OTP → Setup → Apply wizard → Submit → Dashboard, plus ownership-tamper and validation-failure checks.

**Current status:** Complete. The wizard is fully wired.

**Pending work at end of phase:** document upload (the wizard's Documents step) remained client-only/mock (explicitly flagged); `applicationTracking.js`/`applicationSuccess.js` remained fully hardcoded.

---

## Phase 8 — My Applications, Application Details & Application Tracking

**Objective:** Give every submitted application a real "view details"/"track" experience with real per-record IDs, replacing the previous behavior where every row's "track" action landed on the same static mock page regardless of which application was clicked.

**Files created:** `Views/Application/Index.cshtml` (renamed from a short-lived `MyApplications.cshtml`), `Details.cshtml`, `Tracking.cshtml`; `Scripts/js/bootstrap/applicationDetails.js`, `applicationTrackingPage.js`; `Scripts/js/pages/sme/applicationDetails.js` (a genuinely new page — no such component existed anywhere in the original design — built entirely from the app's existing visual primitives, not a new design language); `ViewModels/ApplicationDetailViewModel.cs`, `ApplicationStatusHistoryViewModel.cs`.

**Files modified:** `Controllers/ApplicationController.cs` (renamed `MyApplications()`→`Index()` for the spec's canonical `GET /Application`; added `Details/{id}`, `Tracking/{id}` page actions and `GET api/applications/{id:int}` — the latter returns a **real HTTP 404**, not the API's usual `{success:false}`-with-200 body, specifically because ownership failures must never be distinguishable from "doesn't exist"); `Services/ApplicationService.cs`/`IApplicationService.cs` (`GetApplicationDetailAsync`, returns `null` for both "not found" and "not yours"); `Repositories/IApplicationRepository.cs`/`.cs`, `IUserRepository.cs`/`.cs` (`GetByIdAsync` additions); `Scripts/js/router.js` + `pages/sme/layout.js` (added `:id`-style dynamic path-segment support — fully backward compatible with every route registered before this phase); `Scripts/js/pages/sme/applicationTracking.js` (rewritten from 100%-hardcoded mock content to a real fetch-and-render of the application + its status history, same HTML/classes); `Scripts/js/pages/sme/myApplications.js` (added Business/Scheme/Date-range filters, split the single row action into "View Details" + "Track Application"); `Scripts/js/pages/sme/dashboard.js` (wired the previously-dead "View all" button; fixed stat cards and the recent-applications row to navigate with a real application ID instead of nowhere/a fixed mock page).

**Database changes:** none — `ApplicationStatusHistory` (Phase 7) reused as-is for the timeline.

**Security improvements:** the 404-for-both-cases convention above; re-verified via manually guessing another user's application ID against both the page routes and the JSON endpoint.

**Bugs fixed (reported separately, same period):**
- *Browser blank page after login* — root cause was **not** application code; MVC responses had no `Cache-Control` headers, so a browser could silently replay a stale cached/bfcache page snapshot instead of the current one. Fixed with a new global `Filters/NoCacheAttribute.cs` (`no-cache, no-store` on every MVC response).
- *New Application input loses focus after one keystroke* — the facility-field text inputs (Requested Amount, Collateral Type/Value) called a full `container.innerHTML` re-render on every keystroke, destroying and recreating the input node each time. Fixed by removing the unnecessary re-render (matching the "no re-render on keystroke" pattern already used elsewhere in the codebase).

**Testing performed:** full browser-driven verification of the list/filter/details/tracking flow, plus per-keystroke focus verification via real CDP key events (not a bulk value-set, which would not have reproduced the bug).

**Current status:** Complete.

**Pending work at end of phase:** document upload still entirely client-only; no document metadata persisted anywhere.

---

## Phase 9 — Application Document Upload & Document Management

**Objective:** Let applicants upload, view, replace, delete, and download real supporting documents against a specific, already-submitted application.

**Files created:** `Models/ApplicationDocument.cs`; `Repositories/IDocumentRepository.cs`/`DocumentRepository.cs`; `Services/IDocumentService.cs`/`DocumentService.cs`; `Controllers/DocumentController.cs`; `ViewModels/ApplicationDocumentViewModel.cs`.

**Files modified:** `Models/Application.cs`/`DAL/ApplicationDbContext.cs` (added the `Documents` navigation + FK mapping); `Scripts/js/pages/sme/newApplication.js` (exported its required-document-type lists so the Details page could reuse them instead of duplicating); `Scripts/js/api.js` (upload/replace/delete/download/list functions); `Scripts/js/pages/sme/applicationDetails.js` (the Documents card became a real upload/replace/delete/download UI with required/uploaded/missing counts, built from the same visual primitives as the rest of the app); `Global.asax.cs` (see bug fix below).

**Database changes:** created `ApplicationDocument` table (DocumentId, ApplicationId FK, DocumentType, OriginalFileName, StoredFileName, ContentType, FileSize, StoragePath, UploadedByUserId, UploadedOn, Status, Remarks).

**Services added:** `DocumentService` (validation: allow-listed file types matching the existing UI's own `accept` attribute, 10MB cap matching the existing UI's own advertised copy, empty-file rejection, duplicate-type rejection, status-locked delete/replace rejection; secure storage: server-generated GUID filenames under `App_Data/Uploads/ApplicationDocuments/{CaseId}/`, never web-servable, never derived from user input).

**Security improvements:** file type/size/emptiness validation; path-traversal prevention by construction (stored filenames are never user-derived); `App_Data` storage (not the spec-suggested `/Uploads` at the site root, which would have been directly web-servable in this project, bypassing every ownership check); per-document ownership verification on every operation including download.

**Bugs fixed (found during this phase's own verification, not pre-existing):**
- EF6 didn't recognize `DocumentId` as the primary key for a class named `ApplicationDocument` (convention expects `Id` or `ApplicationDocumentId`) — caused a 500 on every request. Fixed with an explicit `[Key]` attribute.
- An upload over the 10MB limit threw before MVC action-selection ever ran, so the existing JSON-exception filter never got a chance to produce clean JSON — the raw ASP.NET error page leaked instead. Fixed with a narrowly-scoped `Application_Error` handler in `Global.asax.cs` that only intercepts that one exception on `/api/*` paths.

**Testing performed:** full curl matrix (upload, duplicate-type rejection, invalid extension rejection, empty-file rejection, >10MB rejection, download byte-for-byte verification, replace with old-file cleanup verification, delete with physical-file cleanup verification, cross-user 404 on both list and a guessed document ID, status-locked delete blocked then allowed again after reverting status) plus a real-browser file-input upload via CDP.

**Current status:** Complete.

**Pending work at end of phase:** document status (`verified`/`rejected`) has no reviewer flow to ever set it away from `pending_verification`; no in-app document preview (opens in a new browser tab); no upload progress bar (none exists in the source UI to wire up).

---

## Data Consistency Fix — Bank Information Single Source of Truth (between Phase 9 and Phase 10)

**Objective:** Fix a reported bug: after selecting Meezan Bank during Business Profile setup, "Assigned Bank" still displayed as "HBL" on Dashboard/My Applications/Application Details/Application Tracking.

**Root cause:** `Application` had its own `Bank` column, populated by a hardcoded `"HBL"` literal in the New Application wizard's submit payload — completely disconnected from the applicant's real selected bank (`Business.Bank`).

**Investigation note:** an initial fix interpreted "Assigned Bank" as a future bank-workflow-assignment concept (defaulting to "Not Assigned"). The user explicitly corrected this: at the current stage of the project there is **no separate Assigned Bank workflow** — the only bank that exists anywhere in the system is the one the applicant selected during Business Profile setup, and it must be treated as the single source of truth.

**Fix:** Removed `Application.Bank` entirely (a real EF6 automatic-migration schema drop, confirmed via `sqlcmd` against `INFORMATION_SCHEMA.COLUMNS`/`__MigrationHistory`). `ApplicationResponseViewModel` and `ApplicationDetailViewModel` now always compute `Bank` from `application.Business.Bank` at read time, so a later edit to the Business's bank immediately shows up everywhere the application's bank is displayed — no duplicate field, no duplicate logic.

**Files modified:** `Models/Application.cs` (removed `Bank` column), `Services/ApplicationService.cs` (`Map()` computes `Bank` from `Business.Bank`), `Scripts/js/pages/sme/newApplication.js` (removed the hardcoded `bank: "HBL"` submit-payload literal), `ViewModels/SubmitApplicationRequestViewModel.cs` (no `Bank` property — was never applicant input), `Scripts/js/pages/sme/applicationTracking.js`/`applicationSuccess.js` (removed HBL-specific fabricated address/contact boilerplate, always show the real `Business.Bank` value or "Not Provided").

**Testing performed:** curl verification that changing a business's bank is immediately reflected in that business's already-submitted applications' list/detail responses; confirmed the schema drop directly against SQL Server.

**Current status:** Complete. Single source of truth established and documented as a standing principle for any future bank-related display.

---

## Phase 10 — User Profile & Business Profile Management

**Objective:** Give applicants a real Profile section — view/edit personal info, view/edit their Business Profile (including Bank Information, now correctly sourced per the fix above), manage shareholders, and change their password — reusing the existing frontend exactly.

**Files created:** `Controllers/ProfileController.cs`; `Views/Profile/Index.cshtml`, `Edit.cshtml`, `Business.cshtml`, `BusinessEdit.cshtml`, `ChangePassword.cshtml`; `Scripts/js/bootstrap/profile.js`, `profileEdit.js`, `businessProfile.js`, `businessProfileEdit.js`, `changePassword.js`; `Scripts/js/pages/sme/profile.js`, `profileEdit.js`, `changePassword.js` (genuinely new pages — no such components existed in the original design, built from the app's existing visual primitives); `ViewModels/UpdateProfileRequestViewModel.cs`, `ChangePasswordRequestViewModel.cs`, `UserProfileViewModel.cs`, `UpdateBusinessRequestViewModel.cs`.

**Files modified:** `Services/BusinessService.cs` (added `UpdateBusinessAsync` — ownership-checked, updates the existing row in place, never creates a duplicate business; `GetPrimaryBusinessAsync`; shared `BuildShareholders()`/`ValidateShareholderTotal()` helpers reused by both Save and Update); `Controllers/BusinessController.cs` (added `POST /api/business/update`); `Scripts/js/pages/sme/businessSetup.js` (reused for both create and edit, gated by a `mode` param, rather than a second near-duplicate form); `Scripts/js/bootstrap/smeAppRoutes.js` (new shared route-table module — centralizes the SME layout's children list, created specifically because 5+ bootstrap files were duplicating the identical import list + children array; every bootstrap file now imports this instead).

**Database changes:** none new (Business/Shareholder already existed; no duplicate profile tables created, per the explicit instruction not to).

**Business rules:** Email is intentionally non-editable (no email-verification workflow exists yet to safely support changing it); shareholder percentages must total ≤100% (not required to total exactly 100%); Business Profile update always mutates the existing row identified by `BusinessId`, never appends a new one.

**Security improvements:** cross-user URL-tampering protection — editing another user's profile or business via a manipulated URL/ID is blocked (ownership re-checked server-side, not trusted from the page having loaded); password change delegates entirely to ASP.NET Identity's own `UserManager.ChangePasswordAsync` (no custom password system, per explicit instruction).

**Bugs fixed:** a missing `using System.Web;` in `ProfileController.cs` (`HttpContext.GetOwinContext()` wasn't resolving) — added, matching what `AccountController.cs` already had.

**Testing performed:** curl + real-browser verification of profile view/edit, business profile view/edit (including a Partnership scenario with shareholders), shareholder-percentage-over-100 rejection, password change success/failure, and cross-user tamper attempts (403/404 as appropriate).

**Current status:** Complete.

---

## Phase 11 — Notifications & Communication Module

**Objective:** Give applicants a real Notification Center and header notification bell backed by SQL Server, auto-creating notifications at every real, implemented event in the system, replacing the previous `SAMPLE_NOTIFICATIONS` mock data in `state.js`.

**Files created:** `Models/Notification.cs`; `Repositories/INotificationRepository.cs`/`NotificationRepository.cs`; `Services/INotificationService.cs`/`NotificationService.cs`; `Controllers/NotificationController.cs`; `ViewModels/NotificationViewModel.cs`; `Views/Notification/Index.cshtml`; `Scripts/js/bootstrap/notifications.js`; `Scripts/js/pages/sme/notifications.js` (a genuinely new Notification Center page, built from the app's existing visual primitives).

**Files modified:** `DAL/ApplicationDbContext.cs` (added `Notifications` DbSet + FK mapping); `Services/BusinessService.cs`, `ApplicationService.cs`, `DocumentService.cs` (each gained an `INotificationService` constructor parameter and now creates a notification at the end of their respective real-event method — `SaveBusinessAsync`/`UpdateBusinessAsync`/`SubmitApplicationAsync`/`UploadAsync`); `Controllers/AccountController.cs` (`VerifyOtp` creates a "Registration Completed" notification), `Controllers/ProfileController.cs` (`ChangePasswordApi` creates a "Password Changed" notification); every controller that constructs `BusinessService`/`ApplicationService`/`DocumentService` (`AccountController`, `ApplicantController`, `ApplicationController`, `BusinessController`, `DocumentController`, `ProfileController`) updated to pass the new `INotificationService` argument; `Scripts/js/api.js` (`listMyNotifications`, `getUnreadNotificationCount`, `markNotificationRead`, `markAllNotificationsRead`, `bootstrapSession()` now also hydrates notifications); `Scripts/js/state.js` (`setNotifications()`, `markOneNotificationRead()`); `Scripts/js/pages/sme/layout.js` (header bell dropdown reworked — see below); `Scripts/js/bootstrap/smeAppRoutes.js` (added the `notifications` child route) and all 10 real-MVC-page bootstrap files (added notification hydration alongside the existing business/application hydration).

**Database changes:** created `Notification` table (NotificationId, UserId FK, Title, Message, NotificationType, ReferenceId, ReferenceType, IsRead, CreatedOn, ReadOn, CreatedBy).

**Business rules established:** the server only ever returns raw `notificationType`/`referenceId`/`referenceType` facts — never a frontend URL; the dot color and hash-route destination are computed client-side (`layout.js`/`notifications.js`), the same layering already used for status-to-color maps elsewhere in this app. Document-related notifications use `referenceType="Application"` (not "Document") since there is no standalone document-details page — documents live on the Application Details page's Documents card.

**UX changes to the existing header bell (behavior change, explicitly required by the spec):** opening the bell dropdown **no longer auto-marks every notification as read** (the previous mock behavior); an explicit "Mark all read" control was added; each row is individually clickable (marks that one notification read, then navigates to its source record); a "View All Notifications" footer link opens the full Notification Center.

**Security improvements:** every notification read/write is scoped to the caller's own `UserId` inside the service — an ID belonging to another user resolves to HTTP 404 (never a cross-user read, write, or existence leak), matching the exact pattern already established for Applications/Documents/Business. Unauthenticated access to any notification endpoint or the `/Notifications` page is rejected (401 for the JSON API, 302 redirect to login for the page).

**Bugs fixed (found during this phase's own implementation, not pre-existing):** the Notification Center page's initial code called the global `setNotifications()` state setter directly from inside its own unconditional data-fetch — since the persistent Dashboard shell re-invokes the *entire* current page's `render()` function fresh on every global state mutation (by design, for the header/sidebar to reflect the change), this would have created a self-sustaining fetch → notify → full-page-remount → fetch loop. Fixed before it ever shipped by keeping the page's own list in a page-local variable (the same pattern already used by `profile.js`) and only touching the global store in response to a real user click (mark-as-read/mark-all).

**Testing performed:** full curl matrix (registration → RegistrationCompleted; business save → BusinessCreated; business update → BusinessUpdated; application submit → ApplicationSubmitted; document upload → DocumentUploaded; password change → PasswordChanged; newest-first ordering; mark-one idempotency; mark-all; non-existent-ID handling); cross-user security test (a second user cannot read, enumerate, or mark-as-read the first user's notifications — confirmed 404 and confirmed the first user's data was untouched afterward); unauthenticated-access test (401 for the API, 302 for the page); real-browser (headless Chrome via CDP) verification of the Notification Center page rendering all 6 real notifications, mark-one-as-read updating the badge live, "Mark All Read" zeroing the badge, "View All Notifications" navigating correctly, and clicking Application-referencing and Business-referencing notifications navigating to the correct Application Details / Business Profile page — zero console errors/exceptions across every page visited.

**Current status:** Complete for every event with a real trigger point in the current codebase. `ApplicationStatusChanged`, `DocumentVerified`, and the three `OfferLetter*` event types are supported by `CreateNotificationAsync`'s signature but have no real trigger point yet — flagged as infrastructure-ready rather than fabricated, since no reviewer/status-change workflow, document-verification workflow, or Offer Letter backend exists in this codebase.

---

## Phase 12 — Multiple Business Management (Add Business)

**Objective:** Let an applicant who already owns a business add another one, using the exact same Business Profile form shown right after registration — no second form, no duplicated validation/services.

**Root cause of the gap this phase fixed:** My Businesses' "Add Business" button already existed and pointed at `/Applicant/Setup`, but `ApplicantController.Setup()`'s GET action redirects any user who already owns ≥1 business straight back to the Dashboard (a guard from Phase 5, meant to stop a user from pointlessly *revisiting* the first-time setup page). For a user adding a *second* business, this guard fired every time, silently sending them back to the Dashboard instead of showing the form — "Add Business" was effectively broken for exactly the users who'd want to use it. Fixed not by weakening that guard (which is still correct for its original purpose) but by routing "Add Business" a different way entirely: it now reuses `businessSetup.js` as a layout child (`#/sme/business-profile/add`), the same mechanism Phase 10's "Edit Business Profile" already used, which never touches `/Applicant/Setup` or its guard at all.

**Files created:** none — by design, per the phase's explicit "only one Business Profile form" requirement.

**Files modified:** `Services/IBusinessService.cs`/`BusinessService.cs` (added `GetBusinessByIdAsync` and `DeleteBusinessAsync`, both ownership-checked, 4th constructor dependency `IApplicationRepository`); `Repositories/IApplicationRepository.cs`/`ApplicationRepository.cs` (`CountByBusinessIdAsync`, backs the delete-block rule); `Repositories/IBusinessRepository.cs`/`BusinessRepository.cs` (`DeleteAsync`); `Controllers/BusinessController.cs` (`GET`/`DELETE /api/business/{id}`) and the 4 other controllers that construct `BusinessService` (`AccountController`, `ApplicantController`, `ApplicationController`, `ProfileController`) updated for the new constructor parameter; `ViewModels/BusinessResponseViewModel.cs` (`CreatedOn`, needed for My Businesses' new "Created Date" column); `Scripts/js/api.js` (`getBusinessById`, `deleteBusiness`); `Scripts/js/state.js` (`removeBusinessFromState`); `Scripts/js/pages/sme/businessSetup.js` (third mode `"add"`; `"edit"` mode now accepts an optional specific business id instead of always loading the primary business); `Scripts/js/pages/sme/businessProfile.js` (same "view a specific business by id, or the primary one" generalization, for My Businesses' "View" action); `Scripts/js/bootstrap/smeAppRoutes.js` (three new child routes: `business-profile/add`, `business-profile/edit/:id`, `business-profile/view/:id`); `Scripts/js/pages/sme/myBusinesses.js` (each card now shows Business Type/Bank/IBAN/Status/Created Date and has explicit View/Edit/Delete buttons, restructured from a single whole-card button to a non-button wrapper + an actions row, since a `<button>` can't validly contain nested `<button>`s).

**Database changes:** none (the `Business` table already supported one user owning many rows since Phase 1 — this phase only added application-layer support for actually managing that).

**Business rules:** a business may not be deleted while it has any Application rows on record (Business→Application is a cascade-delete FK relationship; without this check, deleting a business would silently wipe real submitted-application history too).

**Security improvements:** `GET`/`DELETE /api/business/{id}` both ownership-checked with the same 404-for-both-cases convention used everywhere else; verified live with a second user attempting both against the first user's business id.

**Bugs fixed:** the "Add Business always redirects to Dashboard" bug described in Root Cause above.

**Testing performed:** curl matrix — create a second business via the real Add-Business path, `GET`/`UPDATE`/`DELETE` by id, delete blocked while an application exists against that business, delete succeeds once there are no applications, cross-user 404 on `GET` and `DELETE`. Real-browser (headless Chrome via CDP): My Businesses page rendering Business Type/IBAN/Created Date and the three action buttons; clicking "Add Business" landing on the same Business Profile form (confirmed via the form's own left-panel copy) and successfully creating a business that returns to My Businesses; clicking "View" on a specific business showing the correct record; clicking "Edit" from there pre-filling the correct business's data and saving it back to My Businesses (not Profile's primary-business view); the New Application business selector listing both businesses by name — zero console errors throughout.

**Current status:** Complete.

---

## Completed Percentage

Estimated **~65–70%** of the full three-portal SBP SME Financing Portal vision (SME Applicant + Participating Bank + SBP Administrator), and **effectively 100% of the SME Applicant portal's core "register → apply → track → document → manage profile → get notified" loop** as it exists in the current frontend.

## Remaining Modules

- Participating Bank portal backend (review queue, approve/reject, offer issuance)
- SBP Administrator portal backend (oversight, reporting)
- Application status-transition workflow (review → approve/reject → disburse) and document verification workflow — the Notification module is ready to announce these the moment either workflow exists
- Offer Letter (accept/reject) backend
- Real SMTP/email or SMS delivery of notifications (in-app only today)
- Real SMTP email delivery (OTP dev-echo only)
- Microsoft/Apple SSO
- Password reset UI/endpoints
- Document preview/upload-progress UI
- Removal of legacy `Scripts/js/main.js`

## Current Project Status

The SME Applicant portal builds and runs successfully end-to-end: registration, email OTP verification, Google SSO, business profile creation (Proprietorship/Partnership/Private Limited, with shareholders), full multi-business management (add/view/edit/delete any number of businesses per user, the delete blocked once a business has real applications on record), a live dashboard, a fully wired financing-application wizard that lets the applicant choose which of their businesses to apply for, a searchable/filterable application list, per-application details and status tracking, per-application document upload/replace/delete/download, personal/business profile view-and-edit with shareholder management and Identity-backed password change, and a real Notification Center with a live header badge — all backed by real SQL Server data with no mock/demo data remaining anywhere in that flow.
