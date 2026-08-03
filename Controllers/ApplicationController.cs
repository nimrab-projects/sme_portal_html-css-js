using System;
using System.Threading.Tasks;
using System.Web.Mvc;
using Microsoft.AspNet.Identity;
using SmePortal.Web.Filters;
using SmePortal.Web.Repositories;
using SmePortal.Web.Services;
using SmePortal.Web.ViewModels;

namespace SmePortal.Web.Controllers
{
    // JSON API for real Application data backing the Dashboard's stat cards, recent-
    // applications table, and My Applications list (js/pages/sme/dashboard.js and
    // myApplications.js already read exactly this response shape - see
    // ViewModels/ApplicationResponseViewModel.cs). Mirrors BusinessController's pattern.
    //
    // Phase 7 (SME Finance Application module) added classic MVC page actions - Create/
    // MyApplications - to this SAME controller/service/repository stack (route-overridden with
    // "~/" since the class-level RoutePrefix is "api/applications"), rather than a second
    // controller, per that phase's explicit "ApplicationController" naming. Phase 8 (My
    // Applications/Details/Tracking) continues that pattern: MyApplications is renamed Index
    // (the spec's canonical GET /Application), and Details/Tracking are added the same way. The
    // actual apply/track UX users click through is still the existing JS wizard mounted inside
    // the persistent Dashboard shell (js/pages/sme/newApplication.js, myApplications.js,
    // applicationTracking.js at #/sme/apply, #/sme/applications, #/sme/tracking) - these page
    // actions are real, working, dedicated-URL entry points into that exact same unmodified
    // frontend (mirrors how ApplicantController's classic Setup POST reuses IBusinessService
    // alongside BusinessController's JSON action).
    [RoutePrefix("api/applications")]
    [Authorize]
    public class ApplicationController : ApiControllerBase
    {
        private INotificationService NotificationService => new NotificationService(new NotificationRepository(Db));

        private IApplicationService ApplicationService =>
            new ApplicationService(new ApplicationRepository(Db), new BusinessRepository(Db), new UserRepository(Db), NotificationService);

        private IBusinessService BusinessService =>
            new BusinessService(new BusinessRepository(Db), new UserRepository(Db), NotificationService, new ApplicationRepository(Db));

        private int CurrentUserId => Convert.ToInt32(User.Identity.GetUserId());

        [Route("mine")]
        [HttpGet]
        public async Task<ActionResult> Mine()
        {
            var applications = await ApplicationService.GetMyApplicationsAsync(CurrentUserId);
            return JsonCamel(new { applications });
        }

        // GET /api/applications/{id} - backs both the Details and Tracking pages' JS. Returns a
        // real HTTP 404 (not the usual {success:false} JSON-with-200 pattern used elsewhere in
        // this API) because Phase 8 explicitly requires a 403/404 status code for another
        // applicant's ApplicationId, not just an error payload.
        [Route("{id:int}")]
        [HttpGet]
        public async Task<ActionResult> Detail(int id)
        {
            var detail = await ApplicationService.GetApplicationDetailAsync(CurrentUserId, id);
            if (detail == null)
            {
                return new HttpNotFoundResult();
            }
            return JsonCamel(new { application = detail });
        }

        // GET /api/applications/{id}/offer - the real conditional offer terms (Phase 14), once
        // the Bank Portal has issued one. 404 for "no offer yet" and "not yours" alike, same
        // convention as Detail above.
        [Route("{id:int}/offer")]
        [HttpGet]
        public async Task<ActionResult> Offer(int id)
        {
            var offer = await ApplicationService.GetOfferAsync(CurrentUserId, id);
            if (offer == null) return new HttpNotFoundResult();
            return JsonCamel(new { offer });
        }

        // POST /api/applications/{id}/offer/decision - the applicant's own Accept/Decline on a
        // real, issued conditional offer. This is what finally sets Status to "approved"/
        // "rejected" for an offer-gated application (see IApplicationService.DecideOfferAsync).
        [Route("{id:int}/offer/decision")]
        [HttpPost]
        [ValidateAjaxAntiForgeryToken]
        public async Task<ActionResult> OfferDecision(int id, OfferDecisionRequestViewModel model)
        {
            try
            {
                var detail = await ApplicationService.DecideOfferAsync(CurrentUserId, id, model?.Decision, model?.Reason);
                if (detail == null) return new HttpNotFoundResult();
                return JsonCamel(new { success = true, application = detail });
            }
            catch (InvalidOperationException ex)
            {
                return JsonCamel(new ApiErrorViewModel { Error = "invalid_decision", Message = ex.Message });
            }
        }

        [Route("save")]
        [HttpPost]
        [ValidateAjaxAntiForgeryToken]
        public async Task<ActionResult> Save(SubmitApplicationRequestViewModel model)
        {
            if (model == null || !ModelState.IsValid)
            {
                return JsonCamel(new ApiErrorViewModel { Error = "missing_fields", Message = "Business, purpose of finance and a requested amount greater than zero are required." });
            }

            try
            {
                var application = await ApplicationService.SubmitApplicationAsync(CurrentUserId, model);
                return JsonCamel(new { success = true, application });
            }
            catch (InvalidOperationException ex)
            {
                return JsonCamel(new ApiErrorViewModel { Error = "invalid_business", Message = ex.Message });
            }
        }

        // GET /Application/Create -> Views/Application/Create.cshtml. A user who hasn't
        // completed Business Setup yet has no business to apply for - same guard as
        // ApplicantController.Index.
        [Route("~/Application/Create")]
        [HttpGet]
        public async Task<ActionResult> Create()
        {
            if (!await BusinessService.HasAnyBusinessAsync(CurrentUserId))
            {
                return RedirectToAction("Setup", "Applicant");
            }
            return View();
        }

        // POST /Application/Create - a real, working classic form-post entry point into the
        // exact same ApplicationService.SubmitApplicationAsync the JS wizard's fetch call uses
        // (Save, above). Not a duplicate implementation. The wizard's multi-step client-only
        // state (facilities list, document previews, the undertaking modal) has no classic-form
        // equivalent, so this covers the core required fields only - see the phase report.
        [Route("~/Application/Create")]
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<ActionResult> Create(SubmitApplicationRequestViewModel model)
        {
            if (!ModelState.IsValid)
            {
                return View(model);
            }

            try
            {
                await ApplicationService.SubmitApplicationAsync(CurrentUserId, model);
            }
            catch (InvalidOperationException ex)
            {
                ModelState.AddModelError("", ex.Message);
                ViewBag.SaveError = ex.Message;
                return View(model);
            }

            return RedirectToAction("Index", "Applicant");
        }

        // GET /Application -> Views/Application/Index.cshtml (a dedicated URL alias into the
        // existing, unmodified My Applications view at #/sme/applications inside the persistent
        // Dashboard shell). Renamed from Phase 7's MyApplications() - same action, Phase 8's
        // spec names this route "/Application" (the controller's default action), not a
        // duplicate of the old one.
        [Route("~/Application")]
        [HttpGet]
        public async Task<ActionResult> Index()
        {
            if (!await BusinessService.HasAnyBusinessAsync(CurrentUserId))
            {
                return RedirectToAction("Setup", "Applicant");
            }
            return View();
        }

        // GET /Application/Details/{id} -> Views/Application/Details.cshtml. Ownership is
        // re-checked here (not just trusted from the page having loaded) so a manually-typed
        // URL for someone else's application 404s before any markup - even the shell - renders,
        // not just when the JS later fetches /api/applications/{id}.
        [Route("~/Application/Details/{id:int}")]
        [HttpGet]
        public async Task<ActionResult> Details(int id)
        {
            var detail = await ApplicationService.GetApplicationDetailAsync(CurrentUserId, id);
            if (detail == null)
            {
                return new HttpNotFoundResult();
            }
            return View();
        }

        // GET /Application/Tracking/{id} -> Views/Application/Tracking.cshtml. Same ownership
        // guard as Details.
        [Route("~/Application/Tracking/{id:int}")]
        [HttpGet]
        public async Task<ActionResult> Tracking(int id)
        {
            var detail = await ApplicationService.GetApplicationDetailAsync(CurrentUserId, id);
            if (detail == null)
            {
                return new HttpNotFoundResult();
            }
            return View();
        }
    }
}
