using System;
using System.Data.Entity;
using System.Web;
using System.Web.Mvc;
using System.Web.Routing;
using SmePortal.Web.DAL;
using SmePortal.Web.DAL.Migrations;

namespace SmePortal.Web
{
    public class MvcApplication : HttpApplication
    {
        protected void Application_Start()
        {
            AreaRegistration.RegisterAllAreas();
            FilterConfig.RegisterGlobalFilters(GlobalFilters.Filters);
            RouteConfig.RegisterRoutes(RouteTable.Routes);

            Database.SetInitializer(
                new MigrateDatabaseToLatestVersion<ApplicationDbContext, Configuration>());
        }

        // Fires for every request including static files (index.html, css/*, js/*), which is
        // required here: those requests are served by IIS's static-file handler and never enter
        // the MVC pipeline, so a GlobalFilter/ActionFilter would silently miss them.
        protected void Application_PreSendRequestHeaders()
        {
            var response = Response;
            if (response == null) return;

            response.Headers.Remove("X-Powered-By");
            response.Headers.Remove("Server");

            if (response.Headers["X-Content-Type-Options"] == null)
                response.Headers.Add("X-Content-Type-Options", "nosniff");
            if (response.Headers["X-Frame-Options"] == null)
                response.Headers.Add("X-Frame-Options", "DENY");
            if (response.Headers["Referrer-Policy"] == null)
                response.Headers.Add("Referrer-Policy", "same-origin");
            if (response.Headers["Content-Security-Policy"] == null)
            {
                // style-src allows 'unsafe-inline' because auth.js/businessSetup.js inject dynamic
                // <style> blocks via innerHTML (existing behavior, not redesigned here).
                response.Headers.Add(
                    "Content-Security-Policy",
                    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; " +
                    "img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; object-src 'none'");
            }
        }

        // A file upload over httpRuntime's maxRequestLength (Web.config, 10240 KB = 10MB -
        // matches the Document Upload limit) throws HttpException while ASP.NET is still
        // reading the raw request, before routing/MVC action selection ever happens - so
        // Filters/HandleApiExceptionAttribute.cs (an MVC IExceptionFilter, which only wraps
        // action execution) never gets a chance to run, and the request would otherwise fall
        // through to a raw ASP.NET yellow-error-page instead of the clean JSON error shape
        // every other /api/* failure returns. This narrowly targets only that one exception on
        // /api/* paths; everything else still flows through HandleApiExceptionAttribute/
        // customErrors exactly as before.
        protected void Application_Error()
        {
            var httpException = Server.GetLastError() as HttpException;
            if (httpException == null) return;
            if (httpException.Message.IndexOf("Maximum request length exceeded", StringComparison.OrdinalIgnoreCase) < 0) return;
            if (!Request.Path.StartsWith("/api/", StringComparison.OrdinalIgnoreCase)) return;

            Server.ClearError();
            Response.Clear();
            Response.StatusCode = 413;
            Response.ContentType = "application/json";
            Response.Write("{\"success\":false,\"error\":\"file_too_large\",\"message\":\"File is too large. Maximum size is 10MB.\"}");
            Response.End();
        }

        protected void Application_BeginRequest()
        {
            var forceHttps = string.Equals(
                System.Configuration.ConfigurationManager.AppSettings["Security:ForceHttps"],
                "true", StringComparison.OrdinalIgnoreCase);

            if (forceHttps && !Request.IsSecureConnection && !Request.IsLocal)
            {
                var httpsUrl = "https://" + Request.Url.Host + Request.RawUrl;
                Response.RedirectPermanent(httpsUrl);
            }
        }
    }
}
