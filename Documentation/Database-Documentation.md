# SME Portal — Database Documentation

> Database: SQL Server Express, catalog `SmePortalDb` (`.\SQLEXPRESS`). Schema is entirely EF6 Code-First **automatic migrations** — there are no hand-written `.sql` scripts; every table below is created/altered purely from the C# model classes in `Models/` via `DAL/ApplicationDbContext.cs`. Table names are the *renamed* Identity tables (see `OnModelCreating`), not EF's defaults.

---

## Users

**Purpose:** ASP.NET Identity's user store, extended with application-specific profile fields. Every applicant account is a row here regardless of sign-in method (manual, Google).

**Table name override:** `AspNetUsers` → `Users` (via `.ToTable("Users")` in `OnModelCreating`).

| Column | Type | Notes |
|---|---|---|
| Id | int, PK, identity | Inherited from `IdentityUser<int,...>` |
| UserName | nvarchar | Kept equal to Email at creation |
| Email | nvarchar | **Unique index** `IX_Users_Email` |
| PasswordHash | nvarchar, nullable | Null for Google-only accounts |
| SecurityStamp | nvarchar | Identity-managed |
| PhoneNumber, PhoneNumberConfirmed, TwoFactorEnabled, LockoutEndDateUtc, LockoutEnabled, AccessFailedCount | — | Identity-managed (lockout: 5 failed attempts → 15 min, `IdentityConfig.cs`) |
| FullName | nvarchar | App field |
| Mobile | nvarchar(20) | **Unique index** `IX_Users_Mobile`; validated `^(\+92|0)?3\d{9}$` |
| GoogleId | nvarchar, nullable | Set on first Google sign-in |
| AuthProvider | nvarchar(20) | `Manual` \| `Google` \| `Microsoft` \| `Apple` (only Manual/Google are actually reachable today) |
| IsEmailVerified | bit | Set true after OTP verification |
| IsMobileVerified | bit | Column exists; nothing sets it true yet (no mobile-OTP flow implemented) |
| IsFirstLogin | bit, default true | Flipped false on first successful OTP verification/login; **the actual Setup-vs-Dashboard redirect decision is computed live** from business count, not read from this column directly |
| IsActive | bit, default true | No deactivation flow implemented yet — always true today |
| CreatedOn | datetime | UTC |
| UpdatedOn | datetime, nullable | UTC |
| LastLogin | datetime, nullable | UTC |

**Relationships:** 1 → ∞ `Business`, 1 → ∞ `EmailOtp`, 1 → ∞ `AuditLog` (nullable FK), ∞ ↔ ∞ `Roles` via `UserRoles`.

**Business rules:** Email and Mobile must be globally unique (enforced by both a repository pre-check and a DB unique index — the index is the actual race-condition-safe guarantee). Password policy: 8+ characters, requires uppercase, lowercase, digit, and a non-alphanumeric character.

---

## Roles / UserRoles / UserClaims / UserLogins

**Purpose:** Standard ASP.NET Identity role/claim/external-login tables, renamed to match the project's own naming (`AspNetRoles`→`Roles`, `AspNetUserRoles`→`UserRoles`, `AspNetUserClaims`→`UserClaims`, `AspNetUserLogins`→`UserLogins`).

- **Roles**: one seeded row, `Applicant` (`DAL/Migrations/Configuration.cs Seed()`). No other roles exist yet (no Bank/Admin roles — those portals have no backend).
- **UserRoles**: composite primary key `(UserId, RoleId)` — a deliberate, documented deviation from a surrogate `UserRoleId` PK, since Identity's own composite-key plumbing is idiomatic here and prevents duplicate role assignments.
- **UserClaims / UserLogins**: present (Identity requires them, and `UserLogins` backs the Google external-login link), but unused beyond what Identity itself needs — no custom claims are issued anywhere in this codebase.

---

## Business

**Purpose:** One business profile owned by one user. A user may own multiple businesses (created via Setup, or "Add New Business" from the dashboard).

| Column | Type | Notes |
|---|---|---|
| BusinessId | int, PK, identity | |
| UserId | int, FK → Users, required | |
| Name | nvarchar(200), required | |
| OwnerCnic | nvarchar(15) | Format `XXXXX-XXXXXXX-X` |
| Ntn | nvarchar(20) | |
| Strn, Province, City, PostalCode, Website | various, nullable | Kept for spec parity with an earlier "ApplicantProfile" design; **not collected by the current form** — always null in practice |
| ContactPerson | nvarchar(150) | |
| CellLandline | nvarchar(30) | |
| Email | nvarchar(150) | |
| Address | nvarchar(max) | |
| AnnualSales | nvarchar(30) | Stored as text (matches the form's raw numeric-string input); parsed to decimal where needed (e.g. Application's MonthlyTurnover snapshot) |
| YearEstablished | nvarchar(10) | Stored as text; parsed to int where needed (e.g. Application's BusinessAge snapshot) |
| Employees | nvarchar(10) | Stored as text; parsed to int where needed |
| Premise | nvarchar(20) | `Owned` \| `Rented` |
| Nature | nvarchar(50) | `Manufacturing` \| `Services` \| `Trading` \| `Agri-SME` |
| BusinessStatus | nvarchar(50) | `Proprietorship` \| `Partnership` \| `Private Limited Company` — drives whether Shareholders are collected |
| Registration | nvarchar(5) | `Yes` \| `No` |
| RegistrationNumber, RegistrationAuthority | nvarchar, nullable | Only populated when Registration = Yes |
| Description | nvarchar(max) | |
| Bank, Iban | nvarchar, nullable | Optional bank-detail section of the form |
| Status | nvarchar(20), default `Active` | No lifecycle beyond this yet (no suspend/close flow) |
| CreatedOn | datetime | UTC |
| UpdatedOn | datetime, nullable | UTC |

**Relationships:** ∞ ← 1 Users; 1 → ∞ Shareholder (cascade delete); 1 → ∞ Application (cascade delete).

**Business rules:** Shareholders are only collected/shown when `BusinessStatus != "Proprietorship"`. `Role` on a shareholder is only meaningful when `BusinessStatus == "Partnership"`. One user may own many Business rows (Phase 12 formalized "Add Business" as a first-class action, but this was already the schema's shape since Phase 1 - `UserId` was never unique). A business may be deleted (`DELETE /api/business/{id}`) only if it has zero Application rows - enforced in `BusinessService.DeleteBusinessAsync`, not the database, since the FK itself is a cascade-delete relationship that would otherwise silently destroy real application history along with the business.

---

## Shareholder

**Purpose:** A shareholder/partner row attached to a Partnership or Private Limited Company business.

| Column | Type | Notes |
|---|---|---|
| ShareholderId | int, PK, identity | |
| BusinessId | int, FK → Business, required | Cascade delete |
| Name | nvarchar(150) | |
| Cnic | nvarchar(15) | |
| Phone | nvarchar(30) | |
| Email | nvarchar(150) | |
| SharePercentage | decimal, nullable | |
| Role | nvarchar(100), nullable | Only meaningful for Partnership |

**Relationships:** ∞ ← 1 Business.

---

## AuditLog

**Purpose:** Security/activity event trail — register, login (success/failure/lockout), logout, Google login/register.

| Column | Type | Notes |
|---|---|---|
| AuditId | int, PK, identity | |
| UserId | int, FK → Users, **nullable** | Null when a failed login doesn't resolve to a known user |
| Action | nvarchar(100), required | e.g. `Register`, `Login`, `LoginFailed`, `LoginLockedOut`, `Logout`, `VerifyOtp`, `RegisterGoogle`, `LoginGoogle` |
| IPAddress | nvarchar(64) | From `X-Forwarded-For` or `Request.UserHostAddress` |
| Browser | nvarchar(300) | User-Agent string |
| CreatedOn | datetime | UTC |

**Relationships:** ∞ ← 1 Users (nullable).

---

## EmailOtp

**Purpose:** One-time codes for email verification during registration.

| Column | Type | Notes |
|---|---|---|
| OtpId | int, PK, identity | |
| UserId | int, FK → Users, required | |
| OtpCodeHash | nvarchar(200), required | Hashed with Identity's own `PasswordHasher` — no separate crypto dependency |
| Purpose | nvarchar(50), default `EmailVerification` | Only purpose in use today |
| ExpiresOn | datetime | `CreatedOn + Otp:ExpiryMinutes` (Web.config, default 10) |
| IsUsed | bit | |
| Attempts | int | Max 5 (`OtpService.MaxAttempts`) before `too_many_attempts` |
| CreatedOn | datetime | UTC |

**Relationships:** ∞ ← 1 Users.

**Business rules:** Only the **latest unused, unexpired** row for `(UserId, Purpose)` is considered valid (`GetLatestActiveAsync`). The plaintext code is never stored — only ever returned in the API response when `Otp:DevEchoEnabled=true` (dev/testing only; real SMTP delivery is not implemented).

---

## Application

**Purpose:** One SME financing application submitted against one Business.

| Column | Type | Notes |
|---|---|---|
| ApplicationId | int, PK, identity | |
| BusinessId | int, FK → Business, required | Cascade delete. **There is no `UserId` column** — ownership is always resolved via Business.UserId |
| CaseId | nvarchar(30), required | The public reference number, e.g. `SME-2026-000002` — derived from `ApplicationId` after the first save, so uniqueness is guaranteed by the database identity column, not a random number |
| Scheme | nvarchar(150) | Mirrors `PurposeOfFinance` (the wizard has no separate scheme-selection field yet) |
| Amount | nvarchar(30) | Display-formatted string, e.g. `"PKR 2,500,000"` |
| RequestedAmount | decimal | The validated numeric source of truth (must be > 0) |
| PurposeOfFinance | nvarchar(300) | From the wizard's "Type of Facility" selection(s) |
| Status | nvarchar(30), required, default `submitted` | `draft` \| `submitted` \| `under_review` \| `approved` \| `rejected` \| `disbursed` — no workflow currently moves it past `submitted` |
| Stage | int, default 1 | Numeric stage counter, currently always 1 |
| BusinessSector | nvarchar(50) | **Snapshot** of Business.Nature at submission time |
| BusinessAge | int | **Snapshot**: submission year − Business.YearEstablished |
| MonthlyTurnover | decimal | **Snapshot**: Business.AnnualSales ÷ 12 |
| Employees | int | **Snapshot** of Business.Employees |
| SubmittedByUserId | int | Audit-only — **never used for ownership queries**, only for display/audit |
| SubmittedOn | datetime, nullable | UTC |
| CreatedOn | datetime | UTC |
| UpdatedOn | datetime, nullable | UTC |

**Relationships:** ∞ ← 1 Business; 1 → ∞ ApplicationStatusHistory (cascade delete); 1 → ∞ ApplicationDocument (cascade delete).

**Business rules:** "My applications" is always computed as *my Business IDs → applications where BusinessId is in that set* — never a direct per-user query. Business-context fields (Sector/Age/Turnover/Employees) are snapshotted at submission so a later edit to the Business profile never silently rewrites historical application data.

**Data-consistency fix (post-Phase 9):** `Application` originally had its own `Bank` column, populated by a hardcoded `"HBL"` literal in the frontend wizard — completely disconnected from the applicant's real selected bank. This column has been **removed entirely** (a real EF6 automatic-migration schema drop). There is now a single source of truth: `Bank` is always computed at read time from `Application.Business.Bank` (the value the applicant actually selected during Business Profile setup/edit), in `ApplicationResponseViewModel` and `ApplicationDetailViewModel`.

---

## ApplicationStatusHistory

**Purpose:** Append-only audit trail of an application's status changes. Backs the Application Tracking timeline.

| Column | Type | Notes |
|---|---|---|
| ApplicationStatusHistoryId | int, PK, identity | |
| ApplicationId | int, FK → Application, required | Cascade delete |
| Status | nvarchar(30), required | Same vocabulary as Application.Status |
| Note | nvarchar(300), nullable | Free-text remark (e.g. "Application Submitted") |
| ChangedByUserId | int | Whoever's action created this row — today, always the applicant themselves (no reviewer flow exists yet) |
| CreatedOn | datetime | UTC |

**Relationships:** ∞ ← 1 Application.

**Business rules:** Exactly one row is inserted today, at submission time (`Status="submitted"`, `Note="Application Submitted"`). The table is ready for a future review workflow to append further rows (e.g. `under_review`, `approved`) without any schema change.

---

## ApplicationDocument

**Purpose:** One uploaded supporting file against a specific application.

| Column | Type | Notes |
|---|---|---|
| DocumentId | int, PK (explicit `[Key]` — see note below) | |
| ApplicationId | int, FK → Application, required | Cascade delete |
| DocumentType | nvarchar(150), required | Free-form string matching the existing frontend's required-document checklist labels (e.g. "CNIC of Owner", "Financial Statement(s)/ Projected Financial(s)", "Feasibility Report", "Memorandum & Articles of Association", "CNIC of Borrower(s)") — **not** a fixed enum/lookup table |
| OriginalFileName | nvarchar(260), required | Sanitized (path stripped, unsafe characters removed) but display-only — never used to build a filesystem path |
| StoredFileName | nvarchar(260), required | Always a server-generated GUID + validated extension, e.g. `6f0c840f8a334ac1a3d44f3108c48628.pdf` |
| ContentType | nvarchar(150), required | Derived from the validated extension, not trusted from the client |
| FileSize | bigint | Bytes |
| StoragePath | nvarchar(500), required | Relative to `App_Data/Uploads`, e.g. `ApplicationDocuments/SME-2026-000002/6f0c840f...pdf` |
| UploadedByUserId | int | Audit only |
| UploadedOn | datetime | UTC |
| Status | nvarchar(30), required, default `pending_verification` | `pending_verification` \| `verified` \| `rejected` — no reviewer flow sets this away from the default yet |
| Remarks | nvarchar(500), nullable | |

**Relationships:** ∞ ← 1 Application.

**Constraints/indexes note:** `DocumentId` required an explicit `[Key]` attribute because EF6's key-by-convention only recognizes `Id` or `{ClassName}Id` (which would be `ApplicationDocumentId` for this class name) — this was a real bug found and fixed during Phase 9.

**Business rules:** At most one document per `(ApplicationId, DocumentType)` at a time (a second upload of the same type is rejected — use Replace). Delete/Replace are blocked once the parent Application's `Status` is `under_review` or later. Allowed file types: PDF, JPG, JPEG, PNG only (matches the frontend's own `accept` attribute). Maximum 10MB (matches the frontend's own advertised copy; also enforced by `httpRuntime maxRequestLength` in Web.config).

---

## Notification

**Purpose:** One in-app notification for one user, auto-created by the relevant service whenever a real, implemented event occurs (registration, business create/update, application submit, document upload, password change).

| Column | Type | Notes |
|---|---|---|
| NotificationId | int, PK (explicit `[Key]`, defensive habit after the Phase 9 `ApplicationDocument.DocumentId` bug — the name already matches convention) | |
| UserId | int, FK → Users, required | Cascade delete |
| Title | nvarchar(200), required | e.g. "New Application Submitted" |
| Message | nvarchar(500), required | e.g. "Your financing application SME-2026-000009 has been submitted." |
| NotificationType | nvarchar(50), required | e.g. `RegistrationCompleted`, `BusinessCreated`, `BusinessUpdated`, `ApplicationSubmitted`, `DocumentUploaded`, `PasswordChanged` (plus `ApplicationStatusChanged`, `DocumentVerified`, `OfferLetterGenerated/Accepted/Rejected` — supported by the service but not yet triggered by any real workflow) |
| ReferenceId | int, nullable | The related record's ID (e.g. an ApplicationId) — never a frontend URL |
| ReferenceType | nvarchar(50), nullable | `Application` \| `Business` \| `OfferLetter` — the frontend, not the server, maps this to a hash route. Document-related notifications use `Application` (not `Document`) since there is no standalone document-details page — documents live on the Application Details page |
| IsRead | bit, default false | |
| CreatedOn | datetime | UTC |
| ReadOn | datetime, nullable | Set the first time `IsRead` flips true; idempotent — re-marking an already-read notification is a no-op |
| CreatedBy | int, nullable | Audit only — whose action created this row (usually the notified user themself) |

**Relationships:** ∞ ← 1 Users (cascade delete).

**Business rules:** A notification is only ever readable/writable by its own `UserId` — every repository/service method takes `userId` and scopes the query by it, so an ID belonging to another user resolves to "not found" (translated to an HTTP 404 by the controller), never a cross-user read or write. Newest-first ordering (`OrderByDescending(CreatedOn)`) everywhere the list is returned.

---

## Future Tables (Not Yet Implemented)

These do not exist in the database today and are listed here only as anticipated future work implied by the pending modules:

- **BankUser / BankReview** — a bank-side reviewer identity and their decision/remarks on an application (would append to `ApplicationStatusHistory`, not replace it).
- **OfferLetter** — currently 100% hardcoded mock content in `offerLetter.js`; no table exists.
- **Scheme** (a real financing-scheme catalog) — the wizard currently uses free-text "Type of Facility" instead of a scheme lookup; introducing a real catalog would mean adding a `SchemeId` FK to `Application` and is explicitly out of scope until the frontend gains a real scheme-selection UI.
