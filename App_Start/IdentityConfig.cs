using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNet.Identity;
using Microsoft.AspNet.Identity.EntityFramework;
using Microsoft.AspNet.Identity.Owin;
using Microsoft.Owin;
using Microsoft.Owin.Security;
using SmePortal.Web.DAL;
using SmePortal.Web.Models;

namespace SmePortal.Web
{
    public class ApplicationUserManager : UserManager<ApplicationUser, int>
    {
        public ApplicationUserManager(IUserStore<ApplicationUser, int> store) : base(store)
        {
        }

        public static ApplicationUserManager Create(
            IdentityFactoryOptions<ApplicationUserManager> options, IOwinContext context)
        {
            var db = context.Get<ApplicationDbContext>();
            var manager = new ApplicationUserManager(new UserStore<ApplicationUser, ApplicationRole, int,
                ApplicationUserLogin, ApplicationUserRole, ApplicationUserClaim>(db));

            manager.UserValidator = new UserValidator<ApplicationUser, int>(manager)
            {
                AllowOnlyAlphanumericUserNames = false,
                RequireUniqueEmail = true,
            };

            // Matches the hint text already rendered in auth.js's register form
            // ("Must contain uppercase, lowercase, number and special character").
            manager.PasswordValidator = new PasswordValidator
            {
                RequiredLength = 8,
                RequireNonLetterOrDigit = true,
                RequireDigit = true,
                RequireLowercase = true,
                RequireUppercase = true,
            };

            manager.UserLockoutEnabledByDefault = true;
            manager.MaxFailedAccessAttemptsBeforeLockout = 5;
            manager.DefaultAccountLockoutTimeSpan = TimeSpan.FromMinutes(15);

            var dataProtectionProvider = options.DataProtectionProvider;
            if (dataProtectionProvider != null)
            {
                // "Password reset ready" per Setup.md: the token provider exists and works;
                // no reset endpoints/UI are built in Phase 1 (see plan §Deliberately deferred).
                manager.UserTokenProvider =
                    new DataProtectorTokenProvider<ApplicationUser, int>(
                        dataProtectionProvider.Create("ASP.NET Identity"));
            }

            return manager;
        }
    }

    public class ApplicationSignInManager : SignInManager<ApplicationUser, int>
    {
        public ApplicationSignInManager(ApplicationUserManager userManager, IAuthenticationManager authenticationManager)
            : base(userManager, authenticationManager)
        {
        }

        public override Task<ClaimsIdentity> CreateUserIdentityAsync(ApplicationUser user)
        {
            return user.GenerateUserIdentityAsync((ApplicationUserManager)UserManager);
        }

        public static ApplicationSignInManager Create(
            IdentityFactoryOptions<ApplicationSignInManager> options, IOwinContext context)
        {
            return new ApplicationSignInManager(context.GetUserManager<ApplicationUserManager>(), context.Authentication);
        }
    }
}
