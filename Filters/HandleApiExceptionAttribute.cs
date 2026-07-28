using System;
using System.Net;
using System.Web.Mvc;
using SmePortal.Web.Helpers;

namespace SmePortal.Web.Filters
{
    // Global filter (see App_Start/FilterConfig.cs). This app now mixes JSON API controllers
    // (AccountController/BusinessController's /api/* actions) with real page-serving controllers
    // (HomeController, and AccountController/ApplicantController's page actions from Phase 2+).
    // Route on the request path so each gets the right error shape: JSON for /api/*, the normal
    // Razor error view for everything else. AllowGet is used deliberately here (not the default
    // DenyGet) - an error message is never the kind of sensitive/array JSON that GET-based JSON
    // hijacking targets, and denying GET would make the exception handler itself throw on any
    // failed GET request, masking the real exception.
    public class HandleApiExceptionAttribute : FilterAttribute, IExceptionFilter
    {
        public void OnException(ExceptionContext filterContext)
        {
            if (filterContext.ExceptionHandled) return;

            filterContext.HttpContext.Response.Clear();
            filterContext.HttpContext.Response.StatusCode = (int)HttpStatusCode.InternalServerError;
            filterContext.HttpContext.Response.TrySkipIisCustomErrors = true;

            var isDebug = filterContext.HttpContext.IsDebuggingEnabled;
            var isApiRequest = filterContext.HttpContext.Request.Path
                .StartsWith("/api/", StringComparison.OrdinalIgnoreCase);

            if (isApiRequest)
            {
                filterContext.Result = new JsonNetResult(new
                {
                    success = false,
                    error = "server_error",
                    message = isDebug ? filterContext.Exception.Message : "An unexpected error occurred.",
                }, JsonRequestBehavior.AllowGet);
            }
            else
            {
                filterContext.Result = new ViewResult
                {
                    ViewName = "Error",
                    ViewData = new ViewDataDictionary(new HandleErrorInfo(
                        filterContext.Exception,
                        (string)filterContext.RouteData.Values["controller"],
                        (string)filterContext.RouteData.Values["action"])),
                };
            }

            filterContext.ExceptionHandled = true;
        }
    }
}
