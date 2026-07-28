using System.Web;

namespace SmePortal.Web.Helpers
{
    public static class IpAddressHelper
    {
        public static string GetClientIp(HttpRequestBase request)
        {
            var forwarded = request.Headers["X-Forwarded-For"];
            if (!string.IsNullOrWhiteSpace(forwarded))
            {
                return forwarded.Split(',')[0].Trim();
            }
            return request.UserHostAddress;
        }

        public static string GetUserAgent(HttpRequestBase request)
        {
            return request.UserAgent ?? "";
        }
    }
}
