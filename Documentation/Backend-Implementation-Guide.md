# SME Portal — Backend Implementation Guide

> Audience: a developer joining this project cold. This document explains what exists today, why it's built the way it is, and how to keep extending it. It reflects the actual code in the repository as of the current state (through Phase 12 — Multiple Business Management).

---

## 1. Project Overview

The **SME Financing Digital Portal** is a State Bank of Pakistan (SBP) web application that lets SME (Small & Medium Enterprise) owners register, create business profiles, and submit financing applications to participating banks, then track those applications through to a decision.

The project started as a **100% static, client-side prototype**: a vanilla-JS single-page app (SPA) with a hash router (`#/sme/...`) and an in-memory mock data store (`js/state.js`) that reset on every page reload. There was no server, no database, and no real network calls anywhere.

It has since been converted, phase by phase, into a real **ASP.NET MVC 5 (.NET Framework 4.8)** application backed by **Entity Framework 6 Code-First** and **SQL Server**, while deliberately preserving the original HTML/CSS/JS **pixel-for-pixel and behavior-for-behavior** wherever that frontend already existed. Only the *data layer* changed — mock arrays became real HTTP calls to a real database.

Three portals exist in the original design (SME Applicant, Participating Bank, SBP Administrator), but **only the SME Applicant portal has a real backend today**. The Bank and SBP portals (`js/pages/bank/*`, `js/pages/sbp/*`) remain frontend-only mock UI with no server integration — see §16 Pending Modules.

---

## 2. Technology Stack

| Layer | Technology |
|---|---|
| Framework | ASP.NET MVC 5.2.9, .NET Framework 4.8 |
| ORM | Entity Framework 6.5.1 (Code First, automatic migrations) |
| Database | SQL Server Express (`.\SQLEXPRESS`, database `SmePortalDb`) |
| Authentication | ASP.NET Identity 2.2.3 (int-keyed users) + OWIN cookie middleware |
| External auth | Google OAuth2 (Microsoft.Owin.Security.Google 4.2.2) — wired, inactive until credentials are supplied |
| JSON serialization | Newtonsoft.Json 13.0.3 via a custom `JsonNetResult` (camelCase) |
| Frontend | Hand-written vanilla JavaScript (ES modules), no build step, no framework, no npm |
| CSS | Pre-generated Tailwind output (`Content/css/tailwind.generated.css`) + `app.css`/`fonts.css` |
| Icons | lucide.min.js (vendored, `Scripts/vendor/`) |
| PDF | jspdf.umd.min.js (vendored, unused by any wired feature yet) |
| Dev/host | IIS Express, Visual Studio 2022, packages.config-based NuGet |

There is no client-side build pipeline: every `.js` file is served as-is and loaded via `<script type="module">`.

---

## 3. Folder Structure

```
SME-portal-Static/
├── Controllers/            MVC + JSON API controllers
├── Models/                 EF6 Code-First entities (+ ASP.NET Identity entities)
├── ViewModels/              DTOs for requests/responses (never expose entities directly)
├── Repositories/            Pure data-access layer (EF6 queries only)
├── Services/                Business logic layer
├── DAL/                     ApplicationDbContext + Migrations/Configuration.cs
├── Filters/                 Cross-cutting MVC filters (CSRF, rate limit, error handling, caching)
├── Helpers/                 Small static helpers (validation, IP address, camelCase JSON result)
├── App_Start/               RouteConfig, FilterConfig, IdentityConfig
├── App_Data/                Uploads/ApplicationDocuments/{CaseId}/ — private file storage (Phase 9)
├── Views/                   Razor views — almost all are thin "bootstrap shells" (see §13)
├── Content/                 Static CSS + images (served directly by IIS)
├── Scripts/
│   ├── js/                  All application JavaScript
│   │   ├── bootstrap/       One tiny script per real MVC page — mounts the real JS page module
│   │   ├── pages/sme/       The SME Applicant portal's page modules (the real, wired UI)
│   │   ├── pages/bank/      Bank portal — mock only, not wired to a backend
│   │   ├── pages/sbp/       SBP portal — mock only, not wired to a backend
│   │   ├── state.js         In-memory client state store (still used as the page's local store)
│   │   ├── api.js           fetch() wrapper for every backend JSON endpoint
│   │   ├── router.js        Vanilla hash router (used *inside* each MVC page, see §12)
│   │   ├── colors.js        Shared color token constants
│   │   ├── utils.js         icon()/escapeHtml()/qs()/modal helpers shared by every page
│   │   └── main.js          LEGACY — the original full-SPA entry point, no longer referenced
│   └── vendor/               lucide, jspdf
├── Global.asax.cs           App startup, security headers, error handling for oversized uploads
├── Startup.cs / Startup.Auth.cs   OWIN pipeline + cookie/Google auth configuration
└── Web.config                Connection string, request limits, security headers
```

---

## 4. MVC Architecture

Two very different kinds of controllers coexist:

1. **Page-serving controllers** (`HomeController`, `AccountController`'s `Login()`, `ApplicantController`, and the page actions on `ApplicationController`/`DocumentController`) — these return a Razor `View()` that is almost entirely empty. Their only real job is authorization/redirect guards (e.g. "you have no business yet, go to Setup") plus rendering `Views/Shared/_Layout.cshtml`'s shell, which loads one small JS **bootstrap** file.
2. **JSON API controllers** (`AccountController`, `BusinessController`, `ApplicationController`, `DocumentController` — all attribute-routed under `/api/*`) — these are what the JS actually talks to for every read/write operation. They return camelCase JSON via `JsonNetResult`.

The layering is always:

```
Controller → Service (interface) → Repository (interface) → EF6 DbContext → SQL Server
```

Controllers are intentionally **thin**: they parse the request, call one service method, and shape the result into JSON or a redirect. All business rules (ownership checks, validation, status transitions, file storage) live in the `Services/` layer. All EF6 querying lives in `Repositories/`. This split exists specifically so business rules can be unit-tested and reused without touching HTTP concerns, and so a repository swap (e.g. a different ORM) would never require touching a service.

Every service/repository is constructed **per-request, on demand**, as a computed property on the controller (no DI container is used anywhere in this project):

```csharp
private IApplicationService ApplicationService =>
    new ApplicationService(new ApplicationRepository(Db), new BusinessRepository(Db), new UserRepository(Db));
```

`Db` itself comes from `ApiControllerBase.Initialize()`, which resolves the OWIN-context-scoped `ApplicationDbContext` (one instance per HTTP request, shared with ASP.NET Identity) — controllers must never `new ApplicationDbContext()` directly.

---

## 5. Entity Framework Architecture

- **Code First**, **automatic migrations** (`DAL/Migrations/Configuration.cs`, `AutomaticMigrationsEnabled = true`, `AutomaticMigrationDataLossAllowed = true`). There are no hand-scaffolded `Add-Migration` files — the schema is inferred entirely from the C# model classes and applied via `Database.SetInitializer(new MigrateDatabaseToLatestVersion<ApplicationDbContext, Configuration>())` in `Global.asax.Application_Start`. This was a deliberate choice for an environment without an interactive Visual Studio/Package Manager Console session; a real team can switch to explicit `Add-Migration` at any time without restructuring anything.
- `ApplicationDbContext : IdentityDbContext<ApplicationUser, ApplicationRole, int, ApplicationUserLogin, ApplicationUserRole, ApplicationUserClaim>` — extends ASP.NET Identity's own context rather than using a separate context, so Identity tables and application tables share one `DbContext`/one transaction scope.
- `OnModelCreating` always calls `base.OnModelCreating(modelBuilder)` **first** (Identity's own Fluent mappings must run before any override), then:
  - Renames Identity's default `AspNetUsers/AspNetRoles/AspNetUserRoles/AspNetUserClaims/AspNetUserLogins` to `Users/Roles/UserRoles/UserClaims/UserLogins` via explicit `.ToTable(...)` calls (Fluent API wins over `[Table]` attributes in EF6).
  - Adds unique indexes on `Users.Email` and `Users.Mobile`.
  - Declares every one-to-many relationship explicitly (`Business→Shareholder`, `Application→ApplicationStatusHistory`, `Application→ApplicationDocument`), each `WillCascadeOnDelete(true)`.
- The seed method (`Configuration.Seed`) inserts one row: the `Applicant` role.
- See **Database-Documentation.md** for the full table-by-table breakdown.

---

## 6. SQL Server Structure

Connection string (`Web.config`):
```
Data Source=.\SQLEXPRESS;Initial Catalog=SmePortalDb;Integrated Security=True;MultipleActiveResultSets=True
```

Tables that exist today (all created by EF6 automatic migrations, no manual SQL): `Users`, `Roles`, `UserRoles`, `UserClaims`, `UserLogins`, `Business`, `Shareholder`, `AuditLog`, `EmailOtp`, `Application`, `ApplicationStatusHistory`, `ApplicationDocument`, `Notification`, plus EF's own `__MigrationHistory`. (`Application.Bank` existed briefly in Phase 7 but was later dropped entirely — see Database-Documentation.md's data-consistency note.)

---

## 7. Authentication Flow

- **Scheme**: OWIN cookie authentication (`Startup.Auth.cs`), cookie name `ApplicationCookie`, `HttpOnly`, `SameSite=Lax`, 14-day sliding expiration. `CookieSecure` is `SameAsRequest` locally and forced `Always` when `Security:ForceHttps=true`.
- **Registration**: `POST /api/account/register` → creates an `ApplicationUser` via `ApplicationUserManager` (PBKDF2 password hashing, policy: 8+ chars, upper/lower/digit/special char required, enforced by `PasswordValidator` in `IdentityConfig.cs`) → assigns the `Applicant` role → generates a 6-digit OTP (hashed with Identity's own `PasswordHasher`, 10-minute expiry, `EmailOtp` table) → real SMTP delivery is **stubbed**: when `Otp:DevEchoEnabled=true` (Web.config), the plaintext code is returned in the JSON response (`devOtp`) and traced, purely for manual testing without a mail server.
- **OTP verification**: `POST /api/account/verify-otp` → validates against the hash, marks `IsEmailVerified`/flips `IsFirstLogin`, signs the user in via `SignInManager.SignInAsync`.
- **Login**: `POST /api/account/login` → `SignInManager.PasswordSignInAsync` with `shouldLockout: true` (5 failed attempts → 15-minute lockout, both from `IdentityConfig.cs`).
- **Google OAuth**: `GET /api/account/google-login` challenges the Google OWIN middleware; `GET /api/account/google-callback` creates-or-links a user by `GoogleId`/email and signs in. The middleware is only registered if `Auth:Google:ClientId`/`ClientSecret` (Web.config) are non-empty — until real credentials are supplied, `google-login` simply 404s. Microsoft/Apple SSO are **UI-only stubs** in `auth.js` (no OWIN middleware wired).
- **CSRF for the JSON API**: since `index.html`-style static pages don't exist anymore but the JS still can't embed `@Html.AntiForgeryToken()` into an external script, this app uses a **double-submit token** pattern: `GET /api/account/csrf-token` calls `AntiForgery.GetTokens`, sets the antiforgery cookie, and returns the form token as JSON. `js/api.js` caches that token and sends it back as an `X-CSRF-TOKEN` header on every mutating call; `Filters/ValidateAjaxAntiForgeryTokenAttribute.cs` validates header-against-cookie and returns a JSON 403 (`csrf_validation_failed`) on failure, rather than the ASP.NET default HTML error page.
- **Authorization for real pages**: `[Authorize]` on `ApplicantController`/`ApplicationController`/`DocumentController`. Unauthenticated access to a page redirects to `/Account/Login` (real MVC redirect); unauthenticated access to `/api/*` gets a plain **401** instead (`CookieAuthenticationProvider.OnApplyRedirect` explicitly skips the HTML redirect for API paths — `auth.js`/`api.js` never expect a redirect for a fetch call).
- **Logout**: `POST /api/account/logout` signs out of the `ApplicationCookie` authentication type and audit-logs the event.

---

## 8. User Journey

```
Landing Page (/)
   → "Apply Now" → /Account/Login (Login / Register / Verify OTP, all one JS-rendered page)
      → first-time user  → /Applicant/Setup   (Business Profile form)
      → returning user   → /Applicant          (Dashboard)

/Applicant (persistent sidebar shell, internal hash sub-routes: #/sme/...)
   ├── Dashboard              (#/sme)              — live stat cards, recent applications
   ├── My Businesses          (#/sme/businesses)    — switch/add business
   ├── New Application        (#/sme/apply)         — 3-step wizard → POST /api/applications/save
   ├── My Applications        (#/sme/applications)  — filterable/searchable list, real data
   ├── Application Details    (#/sme/application-details/{id})  — full record + Documents
   ├── Application Tracking   (#/sme/tracking/{id}) — real status timeline
   ├── Offer Letter           (#/sme/offer)         — MOCK, not wired to any backend
   ├── Notifications          (#/sme/notifications) — Notification Center, real data (Phase 11)
   ├── Profile                (#/sme/profile, /edit) — personal info view/edit (Phase 10)
   ├── Business Profile       (#/sme/business-profile, /edit) — real data, shareholder CRUD (Phase 10)
   └── Change Password        (#/sme/change-password) — via ASP.NET Identity (Phase 10)
```

Every one of the SME-portal pages above also has a **dedicated, bookmarkable real MVC URL** (`/Applicant`, `/Applicant/Setup`, `/Application`, `/Application/Details/{id}`, `/Application/Tracking/{id}`, `/Application/Create`, `/Profile`, `/Profile/Edit`, `/Profile/Business`, `/Profile/Business/Edit`, `/Profile/ChangePassword`, `/Notifications`) that lands on the exact same JS-rendered content — see §12. A header notification bell (real unread badge, mark-as-read, "View All Notifications") is part of the persistent sidebar shell itself, so it's present on every one of these pages, not just the Notification Center.

---

## 9. Business Logic

- **One user → many businesses.** A business is created once via Setup (the first one, during registration) or "Add Business" on the My Businesses page (any later one, Phase 12 — reuses the exact same form/service, just returns to My Businesses instead of the Dashboard). Each can be viewed, edited, or deleted independently; delete is blocked if the business has any applications on record (cascade-delete would otherwise silently destroy that application history along with it).
- **`/Applicant/Setup`'s "already have a business? redirect to Dashboard" guard (Phase 5) is unrelated to "Add Business."** That guard only stops a user from pointlessly *revisiting* the first-time setup page by typing its URL - it deliberately isn't touched or weakened by Phase 12. "Add Business" instead reuses `businessSetup.js` as a persistent-shell layout child (`#/sme/business-profile/add`), the same mechanism `/sme/business-profile/edit` already used since Phase 10, so it never reaches `/Applicant/Setup` or its guard at all.
- **One business → many applications.** Applications are always looked up by resolving *the user's business IDs first*, then querying applications for those IDs — **there is no `Application.UserId` column**. This was an explicit, repeated design decision across phases: "ownership" for an application always means "the Business it points to belongs to me."
- **Application submission**: a business + amount + purpose(from the wizard's "Type of Facility" field) → `Application` row with `Status="submitted"`, a snapshot of the business's Sector/Age/MonthlyTurnover/Employees at that moment (so historical data survives a later business-profile edit), and a sequential, collision-proof reference number derived from the database identity column: `SME-{year}-{ApplicationId:D6}`.
- **Status vocabulary** (used everywhere, never redesigned): `draft`, `submitted`, `under_review`, `approved`, `rejected`, `disbursed`. No workflow currently transitions an application past `submitted` — that requires a bank/reviewer-side module that doesn't exist yet (see §16).
- **Document rules**: one file per required document type per application (duplicate rejected; use Replace); PDF/JPG/JPEG/PNG only, ≤10MB; delete/replace blocked once status reaches `under_review` or later.

---

## 10. Database Relationships

```
Users (1) ──< (∞) Business
Business (1) ──< (∞) Shareholder
Business (1) ──< (∞) Application            [Application has NO direct UserId]
Application (1) ──< (∞) ApplicationStatusHistory
Application (1) ──< (∞) ApplicationDocument
Users (1) ──< (∞) EmailOtp
Users (1) ──< (∞) AuditLog   (UserId nullable — a failed login with an unknown email has no user row)
Users (1) ──< (∞) Notification
Users (∞) ──< >── (∞) Roles   via UserRoles (composite key)
```

Full column-level detail: **Database-Documentation.md**.

---

## 11. Services

| Service | Responsibility |
|---|---|
| `AuthService` | Email/mobile-exists checks, computing "is this a first login" (= does the user own zero businesses), mapping `ApplicationUser` → `UserResponseViewModel` |
| `OtpService` | Generate + hash + store a 6-digit OTP; verify with attempt-limiting (5 tries) |
| `AuditService` | Write one `AuditLog` row per security-relevant event (register/login/lockout/logout, success and failure) |
| `BusinessService` | Save a business (+ its shareholders), **update an existing business in place** (`UpdateBusinessAsync`, Phase 10 — never creates a duplicate row), list a user's businesses, get the primary (first-created) one or any specific one by id (`GetBusinessByIdAsync`, Phase 12), delete a business (`DeleteBusinessAsync`, Phase 12 — blocked if it has applications on record), `HasAnyBusinessAsync` (drives the Setup-vs-Dashboard redirect) |
| `ApplicationService` | Submit an application (ownership check, snapshotting, reference-number generation, initial status-history row), list "my applications", get one application's full detail (ownership-checked; returns `null` for both "not found" and "not yours" — never distinguishes, to avoid leaking which IDs exist) |
| `DocumentService` | Upload/replace/delete/download a document against an application; all file-type/size/duplicate validation; physical storage under `App_Data/Uploads` |
| `NotificationService` (Phase 11) | Create a notification for a user (called from the services/controllers above at each real event); list a user's notifications (newest-first); get unread count; mark one/all as read — every read/write scoped to the caller's own `UserId`, so a foreign ID resolves to "not found" the same way Application/Document ownership does |

`BusinessService`, `ApplicationService`, and `DocumentService` each take an `INotificationService` as a constructor dependency (Phase 11) and call `CreateNotificationAsync` at the end of their respective real-event method — this is the one place a service depends on another *sibling* service purely to create a side-effect notification, not to re-derive its own core logic.

Every service depends only on repository **interfaces** (never a concrete repository, never `ApplicationDbContext` directly), and services may depend on *other* services (e.g. `DocumentService` depends on `IApplicationService` purely to reuse its ownership-check + reference-number lookup, rather than re-deriving the same Business→User join).

---

## 12. Repositories

Pure EF6 data access — no business rules, no validation, no HTTP concerns. One interface + one implementation per aggregate: `IUserRepository`, `IBusinessRepository` (Phase 12 added `DeleteAsync`), `IApplicationRepository` (Phase 12 added `CountByBusinessIdAsync`, backing the business-delete rule), `IDocumentRepository`, `IOtpRepository`, `IAuditLogRepository`, `INotificationRepository` (Phase 11 — `GetByUserIdAsync`, `GetUnreadCountAsync`, `GetByIdAsync(userId, notificationId)` scoped to the user as defense in depth, `AddAsync`, `MarkAllAsReadAsync`). Every repository takes the shared `ApplicationDbContext` in its constructor and is otherwise stateless.

---

## 13. Controllers

| Controller | Type | Routes |
|---|---|---|
| `HomeController` | Page | `GET /` |
| `AccountController` | Page + JSON | `GET /Account/Login`; JSON under `/api/account/*` (csrf-token, register, verify-otp, login, google-login, google-callback, logout, current-user) |
| `ApplicantController` | Page | `GET/POST /Applicant/Setup`, `GET /Applicant` |
| `BusinessController` | JSON | `/api/business/save`, `/api/business/my`, `/api/business/update`, `/api/business/{id:int}` (GET, DELETE — Phase 12) |
| `ApplicationController` | Page + JSON | Page: `GET /Application` (list), `GET/POST /Application/Create`, `GET /Application/Details/{id}`, `GET /Application/Tracking/{id}`. JSON: `/api/applications/mine`, `/api/applications/save`, `/api/applications/{id}` |
| `DocumentController` | JSON | `/api/applications/{applicationId}/documents` (GET list, POST upload), `/{id}/replace` (POST), `/{id}` (DELETE), `/{id}/download` (GET) |
| `ProfileController` (Phase 10) | Page + JSON | Page: `GET /Profile`, `/Profile/Edit`, `/Profile/Business`, `/Profile/Business/Edit`, `/Profile/ChangePassword`. JSON: `/api/profile/me`, `/api/profile/business`, `/api/profile/update`, `/api/profile/change-password` |
| `NotificationController` (Phase 11) | Page + JSON | Page: `GET /Notifications`. JSON: `/api/notifications/mine`, `/api/notifications/unread-count`, `/api/notifications/{id}/read`, `/api/notifications/read-all` |

`ApplicationController` deliberately hosts **both** the JSON API and several page actions — this mirrors the pattern established for Business/Applicant in earlier phases (a classic form-post entry point living alongside the JSON path the JS actually uses) rather than splitting into more controllers than necessary.

Full request/response contracts: **API-Documentation.md**.

---

## 14. Views

Views fall into exactly two categories:

1. **`Views/Shared/_Layout.cshtml`** — the one shared HTML shell (`<div id="app">`, `<div id="modal-root">`, CSS links, vendor scripts, `@RenderBody()` + `@RenderSection("scripts")`). Every page inherits this via `Views/_ViewStart.cshtml`.
2. **Every other view** (`Home/Index`, `Account/Login`, `Applicant/Setup`, `Applicant/Index`, `Application/Index`, `Application/Details`, `Application/Tracking`, `Application/Create`, `Profile/Index`, `Profile/Edit`, `Profile/Business`, `Profile/BusinessEdit`, `Profile/ChangePassword`, `Notification/Index`) is a **near-empty wrapper**: a comment explaining the page, occasionally a hidden `@Html.AntiForgeryToken()` form (for a classic form-post fallback), and one `<script type="module" src="...">` tag pointing at a dedicated bootstrap file. There is **no server-rendered markup for the actual UI anywhere** — everything visible is built by JavaScript.

Bootstrap scripts must be external files, never inline `<script>` blocks — the app's CSP (`script-src 'self'`, no `'unsafe-inline'`) silently blocks inline module scripts.

---

## 15. JavaScript Modules

- **`Scripts/js/api.js`** — the only file allowed to call `fetch()`. Exports one function per backend endpoint; caches the CSRF token; `bootstrapSession()` re-hydrates `state.js` from the real backend on every fresh page load (since a full MVC page load always resets the in-memory store).
- **`Scripts/js/state.js`** — a plain module-scoped object + `subscribe()/notify()` pub-sub (a hand-rolled React-Context replacement). Still seeded with mock data for anything not yet wired to a backend (`bankApplications`, `offerDocument`). `notifications` is real as of Phase 11 (`setNotifications()` bulk-hydrates from the backend at boot, replacing the old `SAMPLE_NOTIFICATIONS` mock array). **Caution for anyone adding a new page:** every global `notify()` call causes the persistent shell (`layout.js`) to re-invoke the *current* outlet page's `render(container)` completely fresh — a page that does its own data fetch inside `render()` must therefore call any global state setter only in response to a real user action (a click), never unconditionally inside that fetch's own `.then()`, or it will re-trigger itself in an infinite fetch→notify→remount→fetch loop (a real instance of this was caught and fixed in `notifications.js` during Phase 11 — see Project-Progress.md).
- **`Scripts/js/router.js`** — a vanilla hash router. Supports plain paths and, since Phase 8, a single `:param` dynamic segment per child route (e.g. `tracking/:id`) — added specifically so Application Tracking/Details could carry a real per-record ID through internal navigation, and fully backward-compatible with every route registered before that.
- **`Scripts/js/pages/sme/*.js`** — one render module per page, each exporting `render(container, params?)`. These are 1:1 ports of an original React component tree; markup/classes are untouched, only data sourcing changed from mock arrays to `api.js` calls.
- **`Scripts/js/bootstrap/*.js`** — one tiny script per real MVC page. Each: calls `bootstrapSession()`, seeds `state.js`, sets the initial hash (reading an `{id}` out of `window.location.pathname` for Details/Tracking, since CSP blocks passing server data via an inline script), then calls `router.js`'s `start()` with the SME route table.
- **`Scripts/js/main.js` is legacy/unused** — it's the original full-SPA entry point (hash routes for `/`, `/sme/login`, `/bank/*`, `/sbp/*` all in one page). No `.cshtml` view references it anymore since every page now has its own bootstrap script. It is a candidate for deletion but has not been removed (flagged, not yet actioned).

---

## 16. Routing

- **Attribute routing** (`routes.MapMvcAttributeRoutes()`) is registered **first**, so every `[Route]`-decorated JSON/page action wins over the catch-all.
- **Conventional route** (`{controller}/{action}/{id}`, default `Home/Index`) handles everything else.
- Route-template `:int` constraints (e.g. `{id:int}`) are used wherever an ID segment could otherwise ambiguously match a literal route like `mine`/`save`.
- Client-side, `router.js`'s hash routing is **internal to a single already-loaded MVC page** — it never causes a real navigation/page reload; it only swaps content inside the persistent sidebar shell (`layout.js`).

---

## 17. Security

- Global response headers (`Global.asax.Application_PreSendRequestHeaders`, fires for static files too): `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: same-origin`, a strict CSP (`style-src` allows `'unsafe-inline'` only because `auth.js`/`businessSetup.js` inject dynamic `<style>` blocks — flagged, not fixed).
- Global `NoCacheAttribute` (an MVC result filter) puts `Cache-Control: no-cache, no-store` / `Pragma: no-cache` / `Expires: -1` on every controller response, so a browser can never silently replay a stale page (bfcache) after login/logout.
- CSRF: see §7.
- Ownership checks are never trusted from the client: every mutating/reading action re-derives "does this record belong to the caller" server-side from the `Business.UserId`/`Application.BusinessId` chain, never from a client-supplied ID alone.
- File upload security (Phase 9): allow-list only (PDF/JPG/JPEG/PNG), 10MB cap enforced both by `httpRuntime maxRequestLength` (Web.config) *and* the service layer, stored filenames are always a fresh server-generated GUID (user input never touches a filesystem path — this is what actually prevents path traversal, not string sanitization), files live under `App_Data` (never web-servable by IIS, unlike `Content`/`Scripts`), and every download/delete/replace is ownership-checked.
- Rate limiting: in-memory, per-IP, on `register`/`login` (`RateLimitAttribute`) — flagged as not surviving an app-pool recycle or scaling to multiple servers; acceptable for the current single-instance deployment.

---

## 18. Validation

- **Server-side is always authoritative.** Data annotations on ViewModels (`[Required]`, `[MaxLength]`, `[Range]`, `[RegularExpression]`) drive `ModelState.IsValid` for classic form-post actions; JSON actions repeat the same checks explicitly (since `ModelState` binding still applies to JSON-bound models too, but error responses need custom shaping).
- Regexes are centralized in `Helpers/ValidationHelper.cs` (email via `MailAddress`, Pakistani mobile `^(\+92|0)?3\d{9}$`, CNIC `^\d{5}-\d{7}-\d{1}$`) — never duplicated inline.
- Business-rule validation (duplicate document upload, requested amount > 0, delete-blocked-by-status) lives in the service layer and throws `InvalidOperationException`, which controllers translate into a JSON `{success:false, error, message}` body.

---

## 19. Development Workflow

1. Ensure SQL Server Express is running and reachable at `.\SQLEXPRESS`.
2. Build (`MSBuild SME-Portal.sln /t:Build /p:Configuration=Debug`, or F5 in Visual Studio 2022) — no manual `Update-Database` step is needed; `MigrateDatabaseToLatestVersion` applies pending model changes automatically on first request.
3. Run via IIS Express.
4. Register a new applicant; if `Otp:DevEchoEnabled=true`, the OTP is returned directly in the register response (no real email is ever sent).
5. Any new EF model change is picked up automatically on the next request/app-pool recycle — no migration files to author.

---

## 20. Pending Modules

Explicitly **not implemented** yet (do not assume otherwise):

- **Bank portal** (`js/pages/bank/*`) and **SBP Admin portal** (`js/pages/sbp/*`) — frontend mock UI only, zero backend, zero database tables.
- **Bank-side application review workflow** — nothing currently transitions an `Application.Status` past `submitted`, or appends a second `ApplicationStatusHistory` row, or sets an `ApplicationDocument.Status` to `verified`/`rejected`. All of that infrastructure exists and is ready to receive such a workflow, but no reviewer UI/role/endpoint exists yet. `NotificationService.CreateNotificationAsync` already supports `ApplicationStatusChanged`/`DocumentVerified` notification types for whenever this workflow lands — it just has no caller yet.
- **Offer Letter** (`offerLetter.js`) — fully hardcoded mock content, no backend. `NotificationService` already supports `OfferLetterGenerated`/`Accepted`/`Rejected` notification types for the same reason.
- **Real SMTP email delivery** — OTP delivery is stubbed/dev-echoed only; notifications (Phase 11) are in-app only, with no email/SMS delivery of their content either.
- **Microsoft/Apple SSO** — UI buttons exist, no OWIN middleware wired.
- **Password reset** — the Identity token provider is configured and ready; no endpoints or UI exist.
- **Document preview/progress bar** — downloads open in a new tab (the browser's native PDF/image viewer); no custom in-app preview or upload-progress UI exists in the frontend to wire up.
- **`Scripts/js/main.js`** — legacy dead code, not deleted yet.
