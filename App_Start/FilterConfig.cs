using System.Web.Mvc;
using SmePortal.Web.Filters;

namespace SmePortal.Web
{
    public static class FilterConfig
    {
        public static void RegisterGlobalFilters(GlobalFilterCollection filters)
        {
            // JSON-only API surface: no HandleErrorAttribute (that targets Razor error views).
            filters.Add(new HandleApiExceptionAttribute());
            // Prevents the browser (and bfcache) from silently replaying a stale snapshot of
            // Login/Setup/Dashboard instead of the current page - see NoCacheAttribute.
            filters.Add(new NoCacheAttribute());
        }
    }
}
