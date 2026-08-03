using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Data.Entity;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNet.Identity;
using Microsoft.AspNet.Identity.EntityFramework;

namespace SmePortal.Web.Models
{
    // Int-keyed IdentityUser mapped onto Setup.md's "Users" table shape. UserName is kept in
    // sync with Email at creation time (the app signs in by email, never a separate username).
    [Table("Users")]
    public class ApplicationUser : IdentityUser<int, ApplicationUserLogin, ApplicationUserRole, ApplicationUserClaim>
    {
        public string FullName { get; set; }

        [MaxLength(20)]
        public string Mobile { get; set; }

        // Nullable: Google-only accounts never set a password (base IdentityUser.PasswordHash
        // is already nullable at the storage level; this just documents the intent).
        public string GoogleId { get; set; }

        // Records how the account was originally created/signs in - see AuthProviders below.
        // Google is wired today (Controllers/AccountController.cs's GoogleCallback);
        // Microsoft/Apple are UI-only placeholders in auth.js (SSO_PROVIDERS) with no real
        // OAuth wired yet, but the column supports them for when that's built.
        [MaxLength(20)]
        public string AuthProvider { get; set; } = AuthProviders.Manual;

        public bool IsEmailVerified { get; set; }
        public bool IsMobileVerified { get; set; }
        public bool IsFirstLogin { get; set; } = true;
        public bool IsActive { get; set; } = true;

        // SBP Admin Portal sync (Phase 3 - User Management). Deliberately a separate flag from
        // IsActive rather than reusing it - the Admin's own 4 actions (Activate/Deactivate/
        // Block/Unblock) produce 3 distinct account states (Active/Inactive/Blocked), which one
        // boolean can't represent. Both flags are checked at every real login path (see
        // AccountController's LoginApi/VerifyOtp/bank-login/sbp-admin-login actions) - blocking
        // never deletes any data, only prevents future sign-in.
        public bool IsBlocked { get; set; }

        // Phase 13 (Bank Portal) - which bank this user represents, only ever set for accounts
        // in the "BankOfficer" role (null for Applicants). Matches Business.Bank's free-text
        // values exactly (e.g. "Habib Bank Limited (HBL)") - that's the only place a bank name
        // is ever stored, so "applications assigned to my bank" is just
        // Application.Business.Bank == officer.BankName, no separate Bank entity/table needed.
        [MaxLength(150)]
        public string BankName { get; set; }

        public DateTime CreatedOn { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedOn { get; set; }
        public DateTime? LastLogin { get; set; }

        // Admin Profile (SBP Admin Portal). Nullable/optional for every account - nothing sets
        // Department anywhere yet (shown as "Not Provided" until a future admin-provisioning
        // flow populates it; not fabricated, a real column with an honest empty value, same
        // convention as Bank.ContactPerson etc.). ProfilePictureUrl stores a small uploaded
        // image as a data: URL (validated/size-capped client + server side) rather than a
        // separate file-storage pipeline - reasonable for a small avatar, avoids a second
        // upload/serve endpoint duplicate of Services/DocumentService.cs's document pipeline.
        [MaxLength(100)]
        public string Department { get; set; }
        public string ProfilePictureUrl { get; set; }

        public async Task<ClaimsIdentity> GenerateUserIdentityAsync(UserManager<ApplicationUser, int> manager)
        {
            var userIdentity = await manager.CreateIdentityAsync(this, DbAuthenticationTypes.ApplicationCookie);
            return userIdentity;
        }
    }

    // Constant kept local to avoid a hard dependency on Microsoft.Owin.Security.Cookies from
    // the Models project layer; Startup.Auth.cs uses the same literal for its cookie options.
    internal static class DbAuthenticationTypes
    {
        public const string ApplicationCookie = "ApplicationCookie";
    }

    public static class AuthProviders
    {
        public const string Manual = "Manual";
        public const string Google = "Google";
        public const string Microsoft = "Microsoft";
        public const string Apple = "Apple";
        // Phase 13 (Bank Portal) - Bank Officer accounts never have a password; they sign in
        // via email + one-time passcode only (see AccountController's bank-login actions).
        public const string BankOtp = "BankOtp";
        // SBP Admin Portal sync - same OTP-only pattern as BankOtp above, distinct constant so
        // the two account types stay clearly distinguishable in the data even though neither
        // ever validates against a password.
        public const string SbpOtp = "SbpOtp";
    }
}
