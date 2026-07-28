# SME Portal Setup.md

## Objective
Implement the existing **SME-portal-Static** frontend **without changing UI, fonts, CSS, JavaScript or functionality** in **ASP.NET MVC 5 (.NET Framework 4.8)** using **SQL Server**.

## Technology
- ASP.NET MVC 5
- .NET Framework 4.8
- SQL Server
- Entity Framework 6 (Code First)
- ASP.NET Identity
- Google OAuth
- Bootstrap (existing)
- Existing HTML/CSS/JS assets

## Rules
1. Reuse existing frontend exactly.
2. Do not redesign UI.
3. Keep routing matching current frontend:
   - `/`
   - `/sme/login`
   - `/sme/setup`
   - `/sme`
3. Implement backend phase-wise.

# Phase 1 – Applicant

Flow:

Landing Page
-> Apply Now
-> Login/Register

Register:
- Full Name
- Email
- Mobile
- Password
- Confirm Password

Sign In:
- Email
- Password
- Google Sign In

After successful registration/login:
- If first login:
  -> SME Setup page
- Else:
  -> Dashboard

## Database

### Users
- UserId (PK)
- FullName
- Email (Unique)
- Mobile
- PasswordHash
- GoogleId
- IsEmailVerified
- IsMobileVerified
- IsFirstLogin
- IsActive
- CreatedOn
- UpdatedOn
- LastLogin

### ApplicantProfile
- ProfileId
- UserId (FK)
- CNIC
- BusinessName
- NTN
- STRN
- BusinessType
- Province
- City
- Address
- PostalCode
- Website
- CreatedOn

### Roles
- RoleId
- Name

### UserRoles
- UserRoleId
- UserId
- RoleId

### AuditLog
- AuditId
- UserId
- Action
- IPAddress
- Browser
- CreatedOn

## Security

Implement:
- ASP.NET Identity
- Password hashing
- CSRF protection
- XSS prevention
- SQL Injection prevention
- CSP headers
- Secure Cookies
- SameSite cookies
- HTTPS only
- Input validation
- Server-side validation
- Client-side validation
- Rate limiting for login
- Account lockout
- Google OAuth
- Email verification ready
- Password reset ready
- Audit logging

## Validation

Email
Mobile
CNIC masking
Password policy
Duplicate email/mobile checks
Length validation
Regex validation

## Project Structure

Controllers
Models
ViewModels
Services
Repositories
DAL
Helpers
Filters
Views
Scripts
Content

## Deliverables

Phase 1 should include:
- SQL database
- Entity Framework migrations
- Login
- Register
- Google authentication
- First login detection
- Setup page
- Dashboard redirection
- Full database integration
- Repository pattern
- Clean architecture
- Production-ready code

Future phases:
- Applicant profile
- Applications
- Documents
- Notifications
- Workflow
- Admin
- Reports
- Settings
