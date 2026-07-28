# SME Portal — System Architecture

## 1. Layered Request Architecture

Every real read/write operation in the SME Applicant portal — the only portal with a backend today — flows through the same fixed set of layers, with no shortcuts:

```
User (Browser)
   │
   ▼
JavaScript Page Module (Scripts/js/pages/sme/*.js)
   │  fetch() via Scripts/js/api.js
   ▼
ASP.NET MVC Routing (App_Start/RouteConfig.cs)
   │
   ▼
Controller  (thin — parses request, calls one service method, shapes the response)
   │
   ▼
Service     (all business logic: ownership checks, validation, snapshotting,
   │          reference-number generation, file storage rules, status rules)
   ▼
Repository  (pure EF6 queries — no business rules)
   │
   ▼
Entity Framework 6 (ApplicationDbContext, Code First, automatic migrations)
   │
   ▼
SQL Server  (SmePortalDb, .\SQLEXPRESS)
```

Controllers **never** call a repository directly, and services **never** touch `HttpContext`/`Request`/`Response`. A service may call another service (e.g. `DocumentService` calls `IApplicationService` to reuse its ownership check) but never bypasses the repository interface to reach EF6 directly.

Two independent client surfaces sit above the controller layer:

- **Real MVC page routes** (`/`, `/Account/Login`, `/Applicant`, `/Applicant/Setup`, `/Application`, `/Application/Details/{id}`, `/Application/Tracking/{id}`, `/Application/Create`, `/Profile`, `/Profile/Edit`, `/Profile/Business`, `/Profile/Business/Edit`, `/Profile/ChangePassword`, `/Notifications`) — each a thin Razor "bootstrap shell" that loads one JS module and otherwise renders nothing server-side.
- **A JSON API** (everything under `/api/*`) — the only thing the JavaScript ever actually calls for data.

---

## 2. Authentication Flow

```
Browser                        OWIN / Identity                     Database
  │                                  │                                 │
  │ POST /api/account/register ─────▶│                                 │
  │                                  │  create ApplicationUser ───────▶│ Users
  │                                  │  assign "Applicant" role ──────▶│ UserRoles
  │                                  │  generate + hash OTP ──────────▶│ EmailOtp
  │◀──────────── devOtp (dev only) ─┤                                 │
  │                                  │                                 │
  │ POST /api/account/verify-otp ───▶│                                 │
  │                                  │  verify hash, mark verified ───▶│ Users
  │                                  │  SignInManager.SignInAsync()    │
  │◀────── ApplicationCookie set ────┤                                 │
  │                                  │                                 │
  │ (any later request) ────────────▶│  [Authorize] reads the cookie   │
  │                                  │  User.Identity.GetUserId()      │
```

- **Cookie-based**, not token-based: `ApplicationCookie`, `HttpOnly`, `SameSite=Lax`, 14-day sliding expiration.
- **Unauthenticated access**: a real page (`[Authorize]` on `ApplicantController`/`ApplicationController`/`DocumentController`) redirects to `/Account/Login`; an `/api/*` call instead gets a plain **401** — the OWIN cookie provider explicitly distinguishes the two (`OnApplyRedirect` skips the HTML redirect for API paths).
- **CSRF**: since the frontend has no server-rendered forms to carry `@Html.AntiForgeryToken()`, a double-submit token is fetched once (`GET /api/account/csrf-token`) and echoed back as an `X-CSRF-TOKEN` header on every mutating call.
- **Google OAuth** is fully wired at the OWIN-middleware level but only *activates* once real `Auth:Google:ClientId`/`ClientSecret` values are placed in `Web.config` — until then `/api/account/google-login` 404s, by design (the middleware is conditionally registered).

---

## 3. Application (Financing Request) Flow

```
Dashboard ──▶ New Application (3-step wizard, JS-only state until final submit)
   Step 1: Financing Requirement (facility type, amount, collateral)
   Step 2: Document Upload (client-only preview at this stage — no ApplicationId exists yet)
   Step 3: Review & Submit ──▶ Undertaking modal ──▶ Agree & Submit
                                       │
                                       ▼
                        POST /api/applications/save
                                       │
                        ApplicationService.SubmitApplicationAsync
                          1. Resolve & verify the Business belongs to the caller
                          2. Validate RequestedAmount > 0
                          3. Snapshot Business.Nature/YearEstablished/AnnualSales/Employees
                          4. Insert Application (Status = "submitted")
                          5. Derive CaseId from the new identity value  →  SME-{year}-{id:D6}
                          6. Insert the first ApplicationStatusHistory row
                                       │
                                       ▼
                        Application Submitted page ──▶ Track Application / Back to Dashboard
```

Once an application exists, it can be reached independently through:

```
My Applications (search/filter) ──▶ View Details ──▶ Application Details
                                 └─▶ Track          ──▶ Application Tracking

Application Details ──▶ Documents card ──▶ Upload / Replace / Delete / Download
                     └─▶ Track Application button ──▶ Application Tracking
```

---

## 4. Document Upload Flow

```
Application Details page
   │  fetch required-document checklist (js/pages/sme/newApplication.js's exported lists,
   │  keyed by the application's Business Status)
   │  fetch GET /api/applications/{id}/documents  → which slots are already filled
   ▼
User picks a file for an empty/filled slot
   │
   ▼
POST /api/applications/{id}/documents            (new slot)
   or
POST /api/applications/{id}/documents/{docId}/replace   (existing slot)
   │
   ▼
DocumentService
   1. Verify the Application belongs to the caller (reuses ApplicationService)
   2. Validate: non-empty, ≤10MB, extension ∈ {pdf,jpg,jpeg,png}, not a duplicate type
   3. Write the file under App_Data/Uploads/ApplicationDocuments/{CaseId}/{new-guid}.ext
   4. (Replace only) delete the previous physical file
   5. Insert/update the ApplicationDocument row (Status = "pending_verification")
   ▼
Documents card re-fetches the list → counts (Required/Uploaded/Missing) update live
```

`App_Data` is the load-bearing security detail here: unlike `Content/` and `Scripts/`, IIS/ASP.NET never serves it as a static file, so the only way to ever read an uploaded document back is through the ownership-checked `Download` action.

---

## 5. Dashboard Flow

```
GET /Applicant
   │  [Authorize] → redirect to /Applicant/Setup if the user owns 0 businesses
   ▼
bootstrap/dashboard.js
   │  bootstrapSession() = GET current-user + GET business/my + GET applications/mine
   ▼
state.js populated with real data (never the original mock seed, once authenticated)
   ▼
Dashboard render()
   - Stat cards (Draft/Submitted/Under Review/Approved/Rejected/Disbursed) computed by
     counting state.applications by status — all six cards navigate to My Applications
   - Recent Applications table — each row navigates to Application Details with a real ID
   - Business snapshot card — reflects the currently-selected business
```

---

## 6. Notification Flow (Phase 11)

```
A real event happens:  registration verified · business created/updated ·
                        application submitted · document uploaded · password changed
   │
   ▼
The owning service (AuthController/BusinessService/ApplicationService/DocumentService/
ProfileController) calls NotificationService.CreateNotificationAsync(userId, title,
message, notificationType, referenceId?, referenceType?, createdBy?)
   │
   ▼
Notification row inserted (IsRead = false, CreatedOn = now)
   │
   ▼
Next time the browser talks to the server (any bootstrap page load, or the header
bell's own periodic-free "open dropdown"/"view all" fetch), GET /api/notifications/mine
and GET /api/notifications/unread-count return the new row — newest first
   │
   ▼
User clicks the notification (bell dropdown or Notification Center)
   │
   ▼
POST /api/notifications/{id}/read  (ownership-checked; 404 if not the caller's own)
   │
   ▼
Client navigates using referenceType/referenceId (computed client-side, never a
server-supplied URL):  Application → Application Details · Business → Business Profile ·
OfferLetter → Offer Letter page
```

The server never tells the client *where* to navigate — only *what happened* (`referenceType`/`referenceId`). This mirrors the existing status-to-color convention (`STATUS_CONFIG` in `myApplications.js`/`dashboard.js`/etc.): presentation and navigation decisions are always made client-side from raw facts, never dictated by the API response shape.

`ApplicationStatusChanged`, `DocumentVerified`, and the three `OfferLetter*` notification types are valid inputs to `CreateNotificationAsync` today, but nothing in the codebase calls it with them yet — see §8 below, these are exactly the events the not-yet-built Bank Reviewer/Offer Letter workflows would need to announce.

---

## 7. Multiple Business Management Flow (Phase 12)

```
My Businesses (#/sme/businesses) - lists every business the caller owns
   │
   ├─▶ Add Business ──▶ #/sme/business-profile/add
   │      │  same businessSetup.js form as the registration-time Setup page (mode="add"
   │      │  instead of "create") - same fields, same POST /api/business/save, same
   │      │  validation. Never touches /Applicant/Setup (which would redirect away once
   │      │  the user already has ≥1 business - see Backend-Implementation-Guide.md §9).
   │      ▼
   │  Save ──▶ addBusiness(result) ──▶ back to My Businesses
   │
   ├─▶ View (a specific card) ──▶ #/sme/business-profile/view/{id}
   │      │  GET /api/business/{id} (ownership-checked) - the same read-only view page
   │      │  Profile's "Business Profile" uses for the primary business, parameterized
   │      ▼
   │  Edit Business ──▶ #/sme/business-profile/edit/{id}
   │
   ├─▶ Edit (a specific card) ──▶ #/sme/business-profile/edit/{id}
   │      │  same businessSetup.js form (mode="edit"), loads THIS business via
   │      │  GET /api/business/{id} instead of always "the primary one"
   │      ▼
   │  Save ──▶ POST /api/business/update ──▶ back to My Businesses
   │
   └─▶ Delete (a specific card) ──▶ window.confirm() ──▶ DELETE /api/business/{id}
          │  BusinessService.DeleteBusinessAsync checks CountByBusinessIdAsync first -
          │  blocked (delete_not_allowed) if this business has any Application rows,
          │  since that FK cascade-deletes and would silently destroy real application
          │  history along with it
          ▼
   removeBusinessFromState(id) ──▶ card disappears, no page reload
```

New Application's business selector (`js/pages/sme/newApplication.js`) already listed every business in `state.businesses` since Phase 7 - adding a business here makes it immediately selectable there too, with no changes needed to that page.

---

## 8. Future Module Flow (Not Yet Implemented)

The schema and service layer are already shaped to receive the following without structural rework — none of it exists today:

```
[NOT IMPLEMENTED] Bank Reviewer logs in (no Bank role/backend exists)
   │
   ▼
[NOT IMPLEMENTED] Review queue reads Application rows where Status = "submitted"
   │
   ▼
[NOT IMPLEMENTED] Reviewer changes Status → "under_review" → "approved" | "rejected"
   │  each transition would append a new ApplicationStatusHistory row
   │  (the table already supports an arbitrary-length timeline — see Database-Documentation.md)
   │  → would call CreateNotificationAsync(..., "ApplicationStatusChanged", ...) [infrastructure ready]
   ▼
[NOT IMPLEMENTED] Reviewer marks each ApplicationDocument.Status → "verified" | "rejected"
   │  (the column already exists and defaults to "pending_verification")
   │  → would call CreateNotificationAsync(..., "DocumentVerified", ...) [infrastructure ready]
   ▼
[NOT IMPLEMENTED] Offer Letter generated → Applicant Accept/Reject (offerLetter.js is currently
   100% hardcoded mock content with no backing table)
   │  → would call CreateNotificationAsync(..., "OfferLetterGenerated/Accepted/Rejected", ...) [infrastructure ready]
   ▼
[NOT IMPLEMENTED] Status → "disbursed"
```

The **SBP Administrator portal** (`js/pages/sbp/*`) has no backend or planned schema yet beyond "oversight/reporting over whatever the Bank portal produces" — it is the least-defined remaining module.

---

## 9. Why This Shape

- **Thin controllers / fat services** — every business rule (ownership, snapshotting, reference-number generation, file-storage security, status-lock rules) lives in exactly one place, testable independently of HTTP.
- **Repository interfaces everywhere** — no service ever holds a concrete `ApplicationDbContext` reference or a concrete repository type, only the interface, constructed fresh per request in the controller.
- **"Bootstrap shell" pages** — lets every original hand-authored HTML/CSS/JS page module be reused byte-for-byte, with the backend integration living entirely in how data reaches `state.js`, never in the markup itself.
- **BusinessId-based ownership, not a duplicated UserId** — a single, consistently-applied rule (`Application` has no `UserId`; `ApplicationDocument`/`ApplicationStatusHistory` have no `UserId` either) that every service in the Application/Document chain relies on identically, rather than each layer inventing its own ownership check. `Notification` (Phase 11) is the one exception with its own direct `UserId` column — it belongs to the user directly, with no owning Business/Application to derive it from — but the *effect* is identical: every repository/service method takes the caller's `UserId` and scopes the query by it, so a foreign ID still resolves to "not found," never a cross-user read or write.
- **The persistent shell re-renders the whole page on any global state change** — `layout.js` subscribes to every `state.js` mutation and, on each one, re-invokes the *currently active outlet page's* `render(container)` completely fresh (not a targeted re-render). This is what lets the header bell/sidebar reflect a change made anywhere, but it means a page's own data-fetch must never unconditionally call a global state setter from inside its own `.then()` — doing so recreates the exact same fetch on the very next fresh `render()` call, forever. (Caught in Phase 11's Notification Center page before it shipped; see Project-Progress.md.)
