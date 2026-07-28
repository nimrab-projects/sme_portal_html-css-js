using System.Web.Helpers;
using System.Web.Mvc;
using SmePortal.Web.Helpers;

namespace SmePortal.Web.Filters
{
    // Double-submit CSRF check for a fetch-based JSON API. index.html must stay a 100%-static
    // file (no Razor), so the classic @Html.AntiForgeryToken() form-field approach isn't
    // available. Instead: GET /api/account/csrf-token (AccountController.CsrfToken) calls
    // AntiForgery.GetTokens, which both returns a form token in the JSON body AND sets the
    // antiforgery cookie as a side effect. js/api.js caches the form token at boot and sends
    // it back as the X-CSRF-TOKEN header on every mutating request; this attribute validates
    // the header value against the cookie value.
    public class ValidateAjaxAntiForgeryTokenAttribute : FilterAttribute, IAuthorizationFilter
    {
        public void OnAuthorization(AuthorizationContext filterContext)
        {
            var request = filterContext.HttpContext.Request;
            var cookie = request.Cookies[AntiForgeryConfig.CookieName];
            var headerToken = request.Headers["X-CSRF-TOKEN"];

            try
            {
                AntiForgery.Validate(cookie?.Value, headerToken);
            }
            catch (System.Exception)
            {
                filterContext.HttpContext.Response.StatusCode = 403;
                filterContext.Result = new JsonNetResult(new
                {
                    success = false,
                    error = "csrf_validation_failed",
                });
            }
        }
    }
}
