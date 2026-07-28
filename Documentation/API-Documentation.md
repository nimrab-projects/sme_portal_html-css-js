# SME Portal — API Documentation

> All JSON endpoints return camelCase (via `JsonNetResult`). Every mutating JSON endpoint requires the `X-CSRF-TOKEN` header (see `GET /api/account/csrf-token`) validated against the antiforgery cookie by `ValidateAjaxAntiForgeryTokenAttribute`; failure returns **HTTP 200** with `{success:false, error:"csrf_validation_failed"}` and status code set to 403 on the response (a JSON body accompanies the 403). Every response also carries `Cache-Control: no-cache, no-store` (global `NoCacheAttribute`). Unless noted otherwise, error responses use HTTP 200 with a `{success:false, ...}` body — the two deliberate exceptions are noted explicitly below (Application Detail/Document endpoints, which return a real 404).

---

## Account (`AccountController`, prefix `api/account`)

### `GET /Account/Login`
- **Type:** Page (not JSON)
- **Auth:** Anonymous
- **Response:** Renders the Login/Register/OTP page (JS-driven)

### `GET /api/account/csrf-token`
- **Auth:** Anonymous
- **Response 200:** `{ token: string }` — also sets the antiforgery cookie
- **Business logic:** Must be called once per page load before any mutating call; `js/api.js` caches the token

### `POST /api/account/register`
- **Auth:** Anonymous
- **Filters:** `RateLimit(10, 60s)` per IP, CSRF
- **Request:** `{ fullName, email, mobile, password, confirmPassword }`
- **Validation:** all fields required; email format (`MailAddress` round-trip); Pakistani mobile `^(\+92|0)?3\d{9}$`; email/mobile must not already exist; password policy enforced by Identity (8+ chars, upper/lower/digit/special)
- **Business logic:** creates `ApplicationUser`, assigns `Applicant` role, generates + hashes + stores a 6-digit OTP (10 min expiry), audit-logs `Register`
- **Response 200 (success):** `{ success: true, userId, devOtp? }` — `devOtp` only present when `Otp:DevEchoEnabled=true` (Web.config)
- **Response 200 (failure):** `{ success:false, error, message }` — `error` ∈ `missing_fields | invalid_email | invalid_mobile | email_taken | mobile_taken | password_policy`
- **Status codes:** 200 always; 429 if rate-limited (`{success:false, error:"rate_limited", retryAfterSeconds}`)

### `POST /api/account/verify-otp`
- **Auth:** Anonymous
- **Filters:** CSRF
- **Request:** `{ email, otp }`
- **Validation:** both required; user must exist; OTP must match the latest unused/unexpired hash for that user; max 5 attempts
- **Business logic:** on success, marks `IsEmailVerified=true`, `IsFirstLogin=false`, signs the user in (cookie issued), audit-logs `VerifyOtp`
- **Response 200 (success):** `{ success:true, user: {id,name,email,mobile}, isFirstLogin }`
- **Response 200 (failure):** `{ success:false, error }` — `error` ∈ `missing_fields | not_found | invalid | expired | too_many_attempts`

### `POST /api/account/login`
- **Auth:** Anonymous
- **Filters:** `RateLimit(10, 60s)` per IP, CSRF
- **Request:** `{ email, password, rememberMe }`
- **Business logic:** `SignInManager.PasswordSignInAsync` with lockout enabled (5 failed attempts → 15 min lock); audit-logs `Login`/`LoginFailed`/`LoginLockedOut`
- **Response 200 (success):** `{ success:true, user, isFirstLogin }`
- **Response 200 (failure):** `{ success:false, error }` — `error` ∈ `missing_fields | invalid_credentials | locked` (locked includes `retryAfterMinutes:15`)

### `GET /api/account/google-login`
- **Auth:** Anonymous
- **Business logic:** issues an OWIN challenge to Google; **404s** if `Auth:Google:ClientId/ClientSecret` are empty (middleware not registered)
- **Response:** 302 redirect to Google's consent screen

### `GET /api/account/google-callback`
- **Auth:** Anonymous (this *is* the auth step)
- **Business logic:** creates-or-links a user by GoogleId/email, signs in, audit-logs `RegisterGoogle`/`LoginGoogle`
- **Response:** 302 redirect to `/Applicant/Setup` (first login) or `/Applicant`

### `POST /api/account/logout`
- **Auth:** Any (works whether authenticated or not)
- **Filters:** CSRF
- **Business logic:** signs out of the `ApplicationCookie` auth type, audit-logs `Logout`
- **Response 200:** `{ success:true }`

### `GET /api/account/current-user`
- **Auth:** Anonymous (returns `authenticated:false` rather than 401)
- **Response 200:** `{ authenticated, user?, isFirstLogin? }`

---

## Business (`BusinessController`, prefix `api/business`, class-level `[Authorize]`)

### `POST /api/business/save`
- **Auth:** Required (401 if not authenticated)
- **Filters:** CSRF
- **Request:** full business form payload + `shareholders[]` (see `SaveBusinessRequestViewModel`)
- **Validation:** business name required (server explicit check); full data-annotation validation also available via `ModelState` (used by the classic form-post path in `ApplicantController.Setup`)
- **Business logic:** creates `Business` (+ `Shareholder` rows if `BusinessStatus != "Proprietorship"`), marks the user's `IsFirstLogin` complete
- **Response 200 (success):** `{ success:true, business }`
- **Response 200 (failure):** `{ success:false, error:"missing_fields", message }`

### `GET /api/business/my`
- **Auth:** Required
- **Response 200:** `{ businesses: [...] }` — every business owned by the caller, each including its `shareholders[]`

### `GET /api/business/{id:int}` (Phase 12)
- **Auth:** Required
- **Authorization:** ownership-checked
- **Status codes:** **404** if the business doesn't exist *or* belongs to another user (never distinguished, same convention as Application/Document/Notification)
- **Response 200:** `{ business }` — backs My Businesses' View/Edit-by-id actions (any one of the caller's businesses, not just the primary one `GET /api/profile/business` returns)

### `DELETE /api/business/{id:int}` (Phase 12)
- **Filters:** CSRF
- **Authorization:** ownership-checked
- **Business rule:** blocked if the business has any Application rows on record — `{success:false, error:"delete_not_allowed", message}`
- **Status codes:** 404 if not found/not owned
- **Response 200 (success):** `{ success:true }`

---

## Applicant Pages (`ApplicantController`, class-level `[Authorize]`)

### `GET /Applicant/Setup`
- **Auth:** Required
- **Business logic:** if the user already owns ≥1 business, **redirects** to `/Applicant` (cannot revisit Setup)
- **Response:** the Setup page (JS-driven) or a 302 redirect

### `POST /Applicant/Setup`
- **Auth:** Required
- **Filters:** classic `[ValidateAntiForgeryToken]` (a secondary, classic form-post entry point into the same `IBusinessService.SaveBusinessAsync` the JSON `Save` action uses — not a duplicate implementation)
- **Response:** redirects to `/Applicant` on success, or re-renders the view with `ModelState` errors

### `GET /Applicant`
- **Auth:** Required
- **Business logic:** if the user owns 0 businesses, **redirects** to `/Applicant/Setup`
- **Response:** the Dashboard shell page (JS-driven)

---

## Application (`ApplicationController`, JSON prefix `api/applications`, class-level `[Authorize]`)

### `GET /api/applications/mine`
- **Response 200:** `{ applications: [...] }` — every application belonging to the caller's businesses (resolved via Business, never a direct per-user column), each row shaped per `ApplicationResponseViewModel` (id, caseId, businessName, scheme, amount, status, bank, submittedDate, lastUpdatedDate, stage, purposeOfFinance, businessSector, businessAge, monthlyTurnover, employees)

### `GET /api/applications/{id:int}`
- **Auth:** Required
- **Authorization:** ownership-checked — the application's Business must belong to the caller
- **Status codes:** **404 (real HTTP status, not a 200-with-error-body)** if the application doesn't exist *or* belongs to another user — these two cases are **never distinguished**, by design, to avoid leaking which IDs exist
- **Response 200:** `{ application: ApplicationDetailViewModel }` — full finance/business/applicant detail + `timeline[]` (status, remarks, updatedBy, date, time) + `documents[]` (currently always `[]` at this route; real documents come from the Document endpoints below)

### `POST /api/applications/save`
- **Filters:** CSRF
- **Request:** `{ businessId, requestedAmount, purposeOfFinance, ... }` — no `bank` field: "Assigned Bank" is never applicant input on submission, it's always inherited from the selected Business (see the Database Documentation's Application data-consistency note)
- **Validation:** `businessId` required; `requestedAmount` required, must be > 0; `purposeOfFinance` required, max 300 chars — enforced by both data annotations and `ModelState.IsValid`
- **Authorization:** the referenced Business must belong to the caller (client-supplied `businessId` is never trusted alone)
- **Business logic:** creates the `Application` row (Status=`submitted`, snapshot fields computed from the Business), generates the sequential `CaseId`, inserts the initial `ApplicationStatusHistory` row
- **Response 200 (success):** `{ success:true, application }`
- **Response 200 (failure):** `{ success:false, error, message }` — `error` ∈ `missing_fields | invalid_business`

### `GET /Application/Create`
- **Business logic:** redirects to `/Applicant/Setup` if the user has no business yet
- **Response:** the New Application wizard page (JS-driven — same wizard as the internal `#/sme/apply` hash route)

### `POST /Application/Create`
- **Filters:** classic `[ValidateAntiForgeryToken]`
- **Business logic:** a secondary, working classic form-post entry point into the same `SubmitApplicationAsync`; covers only the core required fields (the wizard's multi-step client-only state — facilities list, document previews, the undertaking modal — has no classic-form equivalent)
- **Response:** redirects to `/Applicant` on success, or re-renders with `ModelState`/`ViewBag.SaveError`

### `GET /Application`
- **Business logic:** redirects to `/Applicant/Setup` if the user has no business yet
- **Response:** the My Applications list page (JS-driven)

### `GET /Application/Details/{id:int}`
- **Authorization:** ownership-checked (same rule as the JSON Detail endpoint)
- **Status codes:** 404 if not found/not owned
- **Response:** the Application Details page (JS-driven; fetches the same `GET /api/applications/{id}` client-side)

### `GET /Application/Tracking/{id:int}`
- **Authorization:** ownership-checked
- **Status codes:** 404 if not found/not owned
- **Response:** the Application Tracking page (JS-driven)

---

## Document (`DocumentController`, prefix `api/applications/{applicationId:int}/documents`, class-level `[Authorize]`)

### `GET /api/applications/{applicationId}/documents`
- **Authorization:** ownership-checked via the parent application
- **Status codes:** 404 if the application doesn't exist/isn't owned by the caller
- **Response 200:** `{ documents: ApplicationDocumentViewModel[] }` (id, documentType, originalFileName, contentType, fileSize, uploadedOn, status, remarks)

### `POST /api/applications/{applicationId}/documents`
- **Filters:** CSRF
- **Request:** `multipart/form-data` — `documentType` (text field) + `file`
- **Validation:** file required and non-empty; ≤10MB (also enforced at the `httpRuntime` level — an oversized request returns a clean `413` with `{success:false, error:"file_too_large"}` via a dedicated `Global.asax.Application_Error` handler, before this action even runs); extension ∈ `.pdf/.jpg/.jpeg/.png`; **no duplicate** — a document of the same `documentType` must not already exist for this application (use Replace instead)
- **Authorization:** ownership-checked
- **Business logic:** stores the file under `App_Data/Uploads/ApplicationDocuments/{CaseId}/{guid}.ext`; inserts an `ApplicationDocument` row with `Status="pending_verification"`
- **Response 200 (success):** `{ success:true, document }`
- **Response 200/400-style (failure):** `{ success:false, error:"invalid_upload", message }`; 404 if the application isn't found/owned

### `POST /api/applications/{applicationId}/documents/{id}/replace`
- **Filters:** CSRF
- **Request:** `multipart/form-data` — `file` only (document type is fixed to the existing row's type)
- **Validation:** same file-type/size rules as Upload
- **Business rule:** blocked (`InvalidOperationException` → `{success:false, error:"delete_not_allowed"...}`-style message) once the parent application's `Status` is `under_review` or later
- **Business logic:** writes the new file, deletes the old physical file (best-effort), updates the existing row's metadata and resets `Status` to `pending_verification`
- **Response 200 (success):** `{ success:true, document }`
- **Status codes:** 404 if the application or the specific document isn't found/owned

### `DELETE /api/applications/{applicationId}/documents/{id}`
- **Filters:** CSRF
- **Business rule:** blocked once the parent application's `Status` is `under_review` or later — `{success:false, error:"delete_not_allowed", message}`
- **Business logic:** deletes the physical file (best-effort) and the metadata row
- **Response 200 (success):** `{ success:true }`
- **Status codes:** 404 if not found/owned

### `GET /api/applications/{applicationId}/documents/{id}/download`
- **Authorization:** ownership-checked
- **Status codes:** **404** if not found/owned, or if the physical file is unexpectedly missing on disk
- **Response 200:** the raw file stream, `Content-Type` from the stored (validated) content type, `Content-Disposition: attachment; filename="<original name>"` — the browser's own PDF/image viewer handles inline preview; there is no custom in-app viewer

---

## Profile (`ProfileController`, class-level `[Authorize]`)

### `GET /Profile`, `GET /Profile/Edit`, `GET /Profile/ChangePassword`
- **Response:** thin bootstrap-shell pages (JS-driven — `js/pages/sme/profile.js`, `profileEdit.js`, `changePassword.js`)

### `GET /Profile/Business`, `GET /Profile/Business/Edit`
- **Business logic:** redirects to `/Applicant/Setup` if the user has no business yet (same guard as `ApplicantController.Index`)
- **Response:** thin bootstrap-shell pages (`js/pages/sme/businessProfile.js`; Edit reuses `businessSetup.js` in edit mode)

### `GET /api/profile/me`
- **Response 200:** `{ profile: UserProfileViewModel }` — fullName, email, mobile, cnic, roles, registrationDate, lastLogin, accountStatus
- **Status codes:** 404 if the profile can't be resolved (defensive; not a real path for an authenticated user)

### `GET /api/profile/business`
- **Business logic:** returns the caller's primary (first-created) business — what Profile's Business view/edit always operate on, not a client-guessed array index
- **Response 200:** `{ business }`
- **Status codes:** 404 if the caller has no business yet

### `POST /api/profile/update`
- **Filters:** CSRF
- **Request:** `{ fullName, mobile }` — email is intentionally not editable here (no email-verification workflow exists yet to safely support changing it)
- **Response 200 (success):** `{ success:true, profile }`
- **Response 200 (failure):** `{ success:false, error:"missing_fields" | "invalid_profile", message }`

### `POST /api/profile/change-password`
- **Filters:** CSRF
- **Request:** `{ currentPassword, newPassword, confirmPassword }`
- **Business logic:** delegates entirely to `UserManager.ChangePasswordAsync` (ASP.NET Identity validates the current password and applies the existing password policy to the new one — no custom password logic); on success, creates a "Password Changed" notification
- **Response 200 (success):** `{ success:true }`
- **Response 200 (failure):** `{ success:false, error:"missing_fields" | "passwords_mismatch" | "change_password_failed", message }`

Business Profile **create/update** stay on `BusinessController` (`POST /api/business/save`, `POST /api/business/update`) — Profile's Business pages call those endpoints rather than duplicating business logic here. `POST /api/business/update` (added alongside Profile) updates the caller's existing business in place by `businessId` — ownership-checked, 404 if not found/not owned, never creates a second row.

---

## Notification (`NotificationController`, class-level `[Authorize]`)

### `GET /Notifications`
- **Response:** the Notification Center bootstrap-shell page (JS-driven — `js/pages/sme/notifications.js`)

### `GET /api/notifications/mine`
- **Response 200:** `{ notifications: NotificationViewModel[] }` — id, title, desc, date, time, read, notificationType, referenceId, referenceType; newest-first (`OrderByDescending(CreatedOn)`)

### `GET /api/notifications/unread-count`
- **Response 200:** `{ count }`

### `POST /api/notifications/{id:int}/read`
- **Filters:** CSRF
- **Authorization:** ownership-checked inside the service (scoped by the caller's `UserId`, not just the raw id)
- **Business logic:** idempotent — marking an already-read notification is a no-op (doesn't overwrite `ReadOn`)
- **Status codes:** **404** if the notification doesn't exist *or* belongs to another user (never distinguished, same pattern as Application/Document)
- **Response 200 (success):** `{ success:true }`

### `POST /api/notifications/read-all`
- **Filters:** CSRF
- **Business logic:** marks every one of the caller's own unread notifications as read; never touches another user's rows
- **Response 200:** `{ success:true }`

**Auto-creation (no dedicated endpoint — a side effect of other actions):** `NotificationService.CreateNotificationAsync` is called from `AccountController.VerifyOtp` (RegistrationCompleted), `BusinessService.SaveBusinessAsync`/`UpdateBusinessAsync` (BusinessCreated/BusinessUpdated), `ApplicationService.SubmitApplicationAsync` (ApplicationSubmitted), `DocumentService.UploadAsync` (DocumentUploaded), and `ProfileController.ChangePasswordApi` (PasswordChanged). `ApplicationStatusChanged`, `DocumentVerified`, and the three `OfferLetter*` event types are supported by the service signature but have **no real trigger point yet** (no reviewer/status-change workflow, no document-verification workflow, no Offer Letter backend) — infrastructure-ready, not fabricated.

---

## Summary of Non-Standard Status Codes

| Endpoint family | Normal error shape | Deliberate exception |
|---|---|---|
| Account, Business, Application Save, Profile Update/Change-Password | HTTP 200, `{success:false,...}` | CSRF failure → HTTP 403 with JSON body; rate limit → HTTP 429 |
| Application Detail/Tracking/Details pages, all Document endpoints, Profile Business/Business-Edit pages, Notification Mark-as-Read, Business Get/Delete-by-id | — | **HTTP 404** on any ownership/not-found failure — deliberately not a 200-with-error-body, and deliberately not distinguishing "doesn't exist" from "not yours" |
| Document Upload/Replace (oversized file) | — | **HTTP 413**, clean JSON, via a dedicated `Application_Error` handler (the framework's own `maxRequestLength` check fires before MVC action selection, so the usual exception filter can't reach it) |
