using System;
using System.Runtime.Caching;
using System.Web.Mvc;
using SmePortal.Web.Helpers;

namespace SmePortal.Web.Filters
{
    // Lightweight per-IP request cap for login/register, backed by System.Runtime.Caching's
    // in-process MemoryCache - no new infra (e.g. Redis) needed for Phase 1. Flagged limitation:
    // in-memory only, so it resets on app-pool recycle and isn't shared across instances in a
    // multi-server deployment; acceptable for Phase 1, documented for future hardening.
    public class RateLimitAttribute : FilterAttribute, IActionFilter
    {
        private readonly int _maxRequests;
        private readonly int _windowSeconds;

        public RateLimitAttribute(int maxRequests = 10, int windowSeconds = 60)
        {
            _maxRequests = maxRequests;
            _windowSeconds = windowSeconds;
        }

        public void OnActionExecuting(ActionExecutingContext filterContext)
        {
            var request = filterContext.HttpContext.Request;
            var ip = IpAddressHelper.GetClientIp(request) ?? "unknown";
            var actionName = filterContext.ActionDescriptor.ActionName;
            var cacheKey = $"ratelimit:{actionName}:{ip}";

            var cache = MemoryCache.Default;
            var count = cache.Get(cacheKey) as int?;

            if (count.HasValue && count.Value >= _maxRequests)
            {
                filterContext.HttpContext.Response.StatusCode = 429;
                filterContext.Result = new JsonNetResult(new
                {
                    success = false,
                    error = "rate_limited",
                    retryAfterSeconds = _windowSeconds,
                });
                return;
            }

            cache.Set(cacheKey, (count ?? 0) + 1, DateTimeOffset.UtcNow.AddSeconds(_windowSeconds));
        }

        public void OnActionExecuted(ActionExecutedContext filterContext)
        {
        }
    }
}
