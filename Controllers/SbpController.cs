using System.Web.Mvc;

namespace SmePortal.Web.Controllers
{
    // Serves the real, server-protected SBP Admin Portal page (Views/Sbp/Index.cshtml, mounting
    // js/pages/sbp/layout.js + portal.js). Exact same enforcement pattern as BankController -
    // [Authorize(Roles = "SbpAdmin")] rejects anyone who isn't signed in as an SBP Admin before
    // any Admin Portal HTML is ever served.
    [Authorize(Roles = "SbpAdmin")]
    public class SbpController : Controller
    {
        // GET /Sbp -> Views/Sbp/Index.cshtml
        [HttpGet]
        public ActionResult Index()
        {
            return View();
        }
    }
}
