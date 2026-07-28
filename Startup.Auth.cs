using System;
using System.Configuration;
using Microsoft.AspNet.Identity;
using Microsoft.Owin;
using Microsoft.Owin.Security;
using Microsoft.Owin.Security.Cookies;
using Microsoft.Owin.Security.Google;
using Owin;

namespace SmePortal.Web
{
    public partial class Startup
    {
        // Referenced by AccountController when issuing the sign-in cookie / by
        // Filters/AjaxAuthorizeAttribute when checking the authenticated identity.
        public const string ApplicationCookieAuthenticationType = "ApplicationCookie";

        public void ConfigureAuth(IAppBuilder app)
        {
            app.SetDefaultSignInAsAuthenticationType(ApplicationCookieAuthenticationType);

            var forceHttps = string.Equals(
                ConfigurationManager.AppSettings["Security:ForceHttps"], "true", StringComparison.OrdinalIgnoreCase);

            app.UseCookieAuthentication(new CookieAuthenticationOptions
            {
                AuthenticationType = ApplicationCookieAuthenticationType,
                // Real page, not the JSON endpoint - Phase 5: [Authorize] on ApplicantController
                // needs anonymous users redirected somewhere that actually renders a page.
                // OnApplyRedirect below still skips this entirely for /api/* requests, which
                // get a plain 401 instead (auth.js/api.js never follow a redirect for those).
                LoginPath = new PathString("/Account/Login"),
                CookieHttpOnly = true,
                CookieSecure = forceHttps ? CookieSecureOption.Always : CookieSecureOption.SameAsRequest,
                CookieSameSite = SameSiteMode.Lax,
                ExpireTimeSpan = TimeSpan.FromDays(14),
                SlidingExpiration = true,
                Provider = new CookieAuthenticationProvider
                {
                    // JSON API: a 401 for unauthenticated AJAX, never an HTML login-page redirect.
                    OnApplyRedirect = ctx =>
                    {
                        if (!IsApiRequest(ctx.Request.Path))
                        {
                            ctx.Response.Redirect(ctx.RedirectUri);
                        }
                    },
                },
            });

            app.UseExternalSignInCookie(DefaultAuthenticationTypes.ExternalCookie);

            var googleClientId = ConfigurationManager.AppSettings["Auth:Google:ClientId"];
            var googleClientSecret = ConfigurationManager.AppSettings["Auth:Google:ClientSecret"];
            if (!string.IsNullOrWhiteSpace(googleClientId) && !string.IsNullOrWhiteSpace(googleClientSecret))
            {
                app.UseGoogleAuthentication(new GoogleOAuth2AuthenticationOptions
                {
                    ClientId = googleClientId,
                    ClientSecret = googleClientSecret,
                    CallbackPath = new PathString("/api/account/google-callback"),
                });
            }
            // If credentials are still placeholders, the Google middleware is simply not
            // registered — /api/account/google-login will 404 until real values are dropped
            // into Web.config, per decision 3. No code changes needed at that point.
        }

        private static bool IsApiRequest(PathString path)
        {
            return path.HasValue && path.Value.StartsWith("/api/", StringComparison.OrdinalIgnoreCase);
        }
    }
}
