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

        public DateTime CreatedOn { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedOn { get; set; }
        public DateTime? LastLogin { get; set; }

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
    }
}
