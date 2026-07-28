using System.Web.Mvc;

namespace SmePortal.Web.Filters
{
    // Registered globally (FilterConfig) so every MVC-rendered response - Login/Setup/Index
    // views and the JSON API alike - is marked non-cacheable and non-bfcache-eligible. Without
    // this, a browser can silently restore a frozen snapshot of an earlier page load (e.g. via
    // back/forward navigation or disk cache) instead of re-running the current script, which
    // reads as "blank page after login" until the user hard-refreshes. Static files under
    // Scripts/ and Content/ are served by IIS's own handler and never pass through here, so
    // their caching is untouched.
    public class NoCacheAttribute : ActionFilterAttribute
    {
        public override void OnResultExecuting(ResultExecutingContext filterContext)
        {
            var cache = filterContext.HttpContext.Response.Cache;
            cache.SetCacheability(System.Web.HttpCacheability.NoCache);
            cache.SetNoStore();
            cache.SetExpires(System.DateTime.UtcNow.AddDays(-1));
            filterContext.HttpContext.Response.Headers["Pragma"] = "no-cache";
            base.OnResultExecuting(filterContext);
        }
    }
}
