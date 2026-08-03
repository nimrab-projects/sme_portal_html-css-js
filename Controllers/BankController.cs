using System.Web.Mvc;

namespace SmePortal.Web.Controllers
{
    // Serves the real, server-protected Bank Portal page (Views/Bank/Index.cshtml, mounting
    // js/pages/bank/layout.js + portal.js exactly as they already exist). This is the actual
    // "Applicants must never access Bank Portal pages" / "Prevent URL manipulation" enforcement
    // point for the PAGE itself - [Authorize(Roles = "BankOfficer")] rejects anyone who isn't
    // signed in as a Bank Officer before any Bank Portal HTML is ever served, the same pattern
    // ApplicantController already uses for the Applicant Dashboard.
    [Authorize(Roles = "BankOfficer")]
    public class BankController : Controller
    {
        // GET /Bank -> Views/Bank/Index.cshtml
        [HttpGet]
        public ActionResult Index()
        {
            return View();
        }
    }
}
