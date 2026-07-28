using System.Web;
using System.Web.Mvc;
using System.Web.Routing;
using Microsoft.AspNet.Identity.Owin;
using SmePortal.Web.DAL;
using SmePortal.Web.Helpers;

namespace SmePortal.Web.Controllers
{
    public abstract class ApiControllerBase : Controller
    {
        // HttpContext (and therefore the OWIN context) isn't available yet inside a
        // controller's constructor - ASP.NET MVC populates ControllerContext via
        // Initialize(), which runs after construction but before any action executes.
        // Db is exposed as a property, safe to read from any action method.
        protected ApplicationDbContext Db { get; private set; }

        protected override void Initialize(RequestContext requestContext)
        {
            base.Initialize(requestContext);
            Db = HttpContext.GetOwinContext().Get<ApplicationDbContext>();
        }

        protected JsonNetResult JsonCamel(object data, JsonRequestBehavior behavior = JsonRequestBehavior.AllowGet)
        {
            return new JsonNetResult(data, behavior);
        }
    }
}
