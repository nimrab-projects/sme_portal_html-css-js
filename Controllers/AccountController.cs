using System;
using System.Threading.Tasks;
using System.Web;
using System.Web.Mvc;
using Microsoft.AspNet.Identity;
using Microsoft.AspNet.Identity.Owin;
using Microsoft.Owin.Security;
using Microsoft.Owin.Security.Google;
using SmePortal.Web.DAL;
using SmePortal.Web.Filters;
using SmePortal.Web.Helpers;
using SmePortal.Web.Models;
using SmePortal.Web.Repositories;
using SmePortal.Web.Services;
using SmePortal.Web.ViewModels;

namespace SmePortal.Web.Controllers
{
    [RoutePrefix("api/account")]
    public class AccountController : ApiControllerBase
    {
        // Db (from ApiControllerBase) is only populated once Initialize() has run, so these
        // are computed lazily per access rather than built in a constructor - cheap, stateless
        // wrappers, no meaningful cost to recreating them across the handful of calls per action.
        private IUserRepository UserRepository => new UserRepository(Db);
        private INotificationService NotificationService => new NotificationService(new NotificationRepository(Db));
        private IBusinessService BusinessServiceInstance => new BusinessService(new BusinessRepository(Db), UserRepository, NotificationService, new ApplicationRepository(Db));
        private IAuthService AuthService => new AuthService(UserRepository, BusinessServiceInstance);
        private IOtpService OtpService => new OtpService(new OtpRepository(Db));
        private IAuditService AuditService => new AuditService(new AuditLogRepository(Db));

        private ApplicationUserManager UserManager => HttpContext.GetOwinContext().GetUserManager<ApplicationUserManager>();
        private ApplicationSignInManager SignInManager => HttpContext.GetOwinContext().Get<ApplicationSignInManager>();
        private IAuthenticationManager AuthenticationManager => HttpContext.GetOwinContext().Authentication;

        // Page-serving action for Views/Account/Login.cshtml, which mounts js/pages/sme/auth.js
        // unchanged. auth.js posts JSON directly to LoginApi/RegisterApi/VerifyOtp below via
        // js/api.js - that JSON path is the only implementation of login/register (Phase 4:
        // the classic form-post placeholder actions from Phase 3 were removed here, since
        // keeping them would have meant two parallel, divergent auth implementations).
        [HttpGet]
        public ActionResult Login()
        {
            return View();
        }

        [Route("csrf-token")]
        [HttpGet]
        public ActionResult CsrfToken()
        {
            // AntiForgery.GetTokens only returns the new cookie value (when one is needed) -
            // unlike the Razor @Html.AntiForgeryToken() helper, it does NOT set the response
            // cookie itself, so that's done explicitly here.
            System.Web.Helpers.AntiForgery.GetTokens(null, out var cookieToken, out var formToken);
            if (cookieToken != null)
            {
                Response.Cookies.Add(new HttpCookie(System.Web.Helpers.AntiForgeryConfig.CookieName, cookieToken)
                {
                    HttpOnly = true,
                    Secure = Request.IsSecureConnection,
                });
            }
            return JsonCamel(new { token = formToken });
        }

        // Named RegisterApi (not Register) since Phase 3 briefly had a conventional-routed,
        // classic form-post "Register" action here too (same name+signature would have
        // collided); that placeholder was removed in Phase 4 in favor of this single JSON
        // implementation, but the rename stuck since it's a clearer name anyway. Route stays
        // "api/account/register" via the explicit [Route] attribute - js/api.js unaffected.
        [Route("register")]
        [HttpPost]
        [RateLimit(maxRequests: 10, windowSeconds: 60)]
        [ValidateAjaxAntiForgeryToken]
        public async Task<ActionResult> RegisterApi(RegisterRequestViewModel model)
        {
            if (model == null || string.IsNullOrWhiteSpace(model.FullName) ||
                string.IsNullOrWhiteSpace(model.Email) || string.IsNullOrWhiteSpace(model.Mobile) ||
                string.IsNullOrWhiteSpace(model.Password))
            {
                return JsonCamel(new ApiErrorViewModel { Error = "missing_fields", Message = "All fields are required." });
            }

            if (!ValidationHelper.IsValidEmail(model.Email))
                return JsonCamel(new ApiErrorViewModel { Error = "invalid_email", Message = "Enter a valid email address." });

            if (!ValidationHelper.IsValidMobile(model.Mobile))
                return JsonCamel(new ApiErrorViewModel { Error = "invalid_mobile", Message = "Enter a valid Pakistani mobile number." });

            if (await AuthService.EmailExistsAsync(model.Email))
                return JsonCamel(new ApiErrorViewModel { Error = "email_taken", Message = "This email is already registered." });

            if (await AuthService.MobileExistsAsync(model.Mobile))
                return JsonCamel(new ApiErrorViewModel { Error = "mobile_taken", Message = "This mobile number is already registered." });

            var user = new ApplicationUser
            {
                UserName = model.Email,
                Email = model.Email,
                FullName = model.FullName,
                Mobile = ValidationHelper.NormalizeMobile(model.Mobile),
                IsFirstLogin = true,
                IsActive = true,
                AuthProvider = AuthProviders.Manual,
            };

            var createResult = await UserManager.CreateAsync(user, model.Password);
            if (!createResult.Succeeded)
            {
                return JsonCamel(new ApiErrorViewModel
                {
                    Error = "password_policy",
                    Message = string.Join(" ", createResult.Errors),
                });
            }

            await UserManager.AddToRoleAsync(user.Id, "Applicant");
            await AuditService.LogAsync(user.Id, "Register", Request);

            var code = await OtpService.GenerateAndStoreOtpAsync(user.Id);
            var devEcho = string.Equals(
                System.Configuration.ConfigurationManager.AppSettings["Otp:DevEchoEnabled"], "true",
                StringComparison.OrdinalIgnoreCase);

            if (devEcho)
            {
                System.Diagnostics.Trace.TraceInformation($"[DEV] Email OTP for {user.Email}: {code}");
            }

            return JsonCamel(new
            {
                success = true,
                userId = user.Id.ToString(),
                devOtp = devEcho ? code : null,
            });
        }

        [Route("verify-otp")]
        [HttpPost]
        [ValidateAjaxAntiForgeryToken]
        public async Task<ActionResult> VerifyOtp(VerifyOtpRequestViewModel model)
        {
            if (model == null || string.IsNullOrWhiteSpace(model.Email) || string.IsNullOrWhiteSpace(model.Otp))
                return JsonCamel(new ApiErrorViewModel { Error = "missing_fields" });

            var user = await UserManager.FindByEmailAsync(model.Email);
            if (user == null)
                return JsonCamel(new ApiErrorViewModel { Error = "not_found" });

            var verification = await OtpService.VerifyOtpAsync(user.Id, model.Otp);
            if (!verification.Success)
                return JsonCamel(new ApiErrorViewModel { Error = verification.Error });

            user.IsEmailVerified = true;
            user.IsFirstLogin = false;
            user.LastLogin = DateTime.UtcNow;
            user.UpdatedOn = DateTime.UtcNow;
            await UserManager.UpdateAsync(user);

            await SignInManager.SignInAsync(user, isPersistent: false, rememberBrowser: false);
            await AuditService.LogAsync(user.Id, "VerifyOtp", Request);
            await NotificationService.CreateNotificationAsync(
                user.Id, "Registration Completed", "Your account has been successfully verified and activated.",
                "RegistrationCompleted", createdBy: user.Id);

            var isFirstLogin = await AuthService.ComputeIsFirstLoginAsync(user.Id);
            return JsonCamel(new
            {
                success = true,
                user = AuthService.ToUserResponse(user),
                isFirstLogin,
            });
        }

        // Renamed from Login -> LoginApi in Phase 3 for the same reason as RegisterApi above.
        // Route stays "api/account/login" - unaffected for js/api.js.
        [Route("login")]
        [HttpPost]
        [RateLimit(maxRequests: 10, windowSeconds: 60)]
        [ValidateAjaxAntiForgeryToken]
        public async Task<ActionResult> LoginApi(LoginRequestViewModel model)
        {
            if (model == null || string.IsNullOrWhiteSpace(model.Email) || string.IsNullOrWhiteSpace(model.Password))
                return JsonCamel(new ApiErrorViewModel { Error = "missing_fields" });

            var status = await SignInManager.PasswordSignInAsync(
                model.Email, model.Password, model.RememberMe, shouldLockout: true);

            var user = await UserManager.FindByEmailAsync(model.Email);

            switch (status)
            {
                case SignInStatus.Success:
                    user.LastLogin = DateTime.UtcNow;
                    user.UpdatedOn = DateTime.UtcNow;
                    await UserManager.UpdateAsync(user);
                    await AuditService.LogAsync(user.Id, "Login", Request);

                    var isFirstLogin = await AuthService.ComputeIsFirstLoginAsync(user.Id);
                    return JsonCamel(new
                    {
                        success = true,
                        user = AuthService.ToUserResponse(user),
                        isFirstLogin,
                    });

                case SignInStatus.LockedOut:
                    await AuditService.LogAsync(user?.Id, "LoginLockedOut", Request);
                    return JsonCamel(new ApiErrorViewModel { Error = "locked", RetryAfterMinutes = 15 });

                default:
                    await AuditService.LogAsync(user?.Id, "LoginFailed", Request);
                    return JsonCamel(new ApiErrorViewModel { Error = "invalid_credentials" });
            }
        }

        [Route("google-login")]
        [HttpGet]
        public ActionResult GoogleLogin()
        {
            var properties = new AuthenticationProperties { RedirectUri = "/api/account/google-callback" };
            AuthenticationManager.Challenge(properties, "Google");
            return new HttpUnauthorizedResult();
        }

        [Route("google-callback")]
        [HttpGet]
        public async Task<ActionResult> GoogleCallback()
        {
            var loginInfo = await AuthenticationManager.GetExternalLoginInfoAsync();
            if (loginInfo == null)
                return Redirect("/Account/Login");

            var googleId = loginInfo.ExternalIdentity.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            var email = loginInfo.Email;
            var name = loginInfo.ExternalIdentity.FindFirst(System.Security.Claims.ClaimTypes.Name)?.Value ?? email;

            var user = await UserRepository.GetByGoogleIdAsync(googleId) ??
                       await UserManager.FindByEmailAsync(email);

            if (user == null)
            {
                user = new ApplicationUser
                {
                    UserName = email,
                    Email = email,
                    FullName = name,
                    GoogleId = googleId,
                    IsEmailVerified = true,
                    IsActive = true,
                    IsFirstLogin = true,
                    AuthProvider = AuthProviders.Google,
                };
                var createResult = await UserManager.CreateAsync(user);
                if (!createResult.Succeeded)
                    return Redirect("/Account/Login");

                await UserManager.AddToRoleAsync(user.Id, "Applicant");
                await AuditService.LogAsync(user.Id, "RegisterGoogle", Request);
            }
            else if (string.IsNullOrEmpty(user.GoogleId))
            {
                user.GoogleId = googleId;
                await UserManager.UpdateAsync(user);
            }

            user.LastLogin = DateTime.UtcNow;
            await UserManager.UpdateAsync(user);

            await SignInManager.SignInAsync(user, isPersistent: false, rememberBrowser: false);
            await AuditService.LogAsync(user.Id, "LoginGoogle", Request);

            var isFirstLogin = await AuthService.ComputeIsFirstLoginAsync(user.Id);
            return Redirect(isFirstLogin ? "/Applicant/Setup" : "/Applicant");
        }

        [Route("logout")]
        [HttpPost]
        [ValidateAjaxAntiForgeryToken]
        public async Task<ActionResult> Logout()
        {
            var userId = User?.Identity?.IsAuthenticated == true ? (int?)Convert.ToInt32(User.Identity.GetUserId()) : null;
            AuthenticationManager.SignOut(Startup.ApplicationCookieAuthenticationType);
            await AuditService.LogAsync(userId, "Logout", Request);
            return JsonCamel(new { success = true });
        }

        [Route("current-user")]
        [HttpGet]
        public async Task<ActionResult> CurrentUser()
        {
            if (User?.Identity?.IsAuthenticated != true)
                return JsonCamel(new CurrentUserResponseViewModel { Authenticated = false });

            var userId = Convert.ToInt32(User.Identity.GetUserId());
            var user = await UserManager.FindByIdAsync(userId);
            if (user == null)
                return JsonCamel(new CurrentUserResponseViewModel { Authenticated = false });

            var isFirstLogin = await AuthService.ComputeIsFirstLoginAsync(user.Id);
            return JsonCamel(new CurrentUserResponseViewModel
            {
                Authenticated = true,
                User = AuthService.ToUserResponse(user),
                IsFirstLogin = isFirstLogin,
            });
        }
    }
}
