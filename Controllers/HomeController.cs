using System.Web.Mvc;

namespace SmePortal.Web.Controllers
{
    public class HomeController : Controller
    {
        // GET / -> Views/Home/Index.cshtml (the landing page, ported 1:1 from the old
        // static index.html + js/pages/intro.js; see Phase 2).
        public ActionResult Index()
        {
            return View();
        }
    }
}
