using System.Web.Mvc;
using System.Web.Routing;

namespace SmePortal.Web
{
    public static class RouteConfig
    {
        public static void RegisterRoutes(RouteCollection routes)
        {
            routes.IgnoreRoute("{resource}.axd/{*pathInfo}");

            // JSON API endpoints (Controllers/AccountController.cs, Controllers/BusinessController.cs)
            // stay attribute-routed under /api/*; registered first so they always win over the
            // conventional route below for those specific URLs.
            routes.MapMvcAttributeRoutes();

            // Real page routes: / -> HomeController.Index(), /Account/Login -> AccountController.Login(),
            // /Applicant -> ApplicantController.Index(), /Applicant/Setup -> ApplicantController.Setup().
            routes.MapRoute(
                name: "Default",
                url: "{controller}/{action}/{id}",
                defaults: new { controller = "Home", action = "Index", id = UrlParameter.Optional }
            );
        }
    }
}
