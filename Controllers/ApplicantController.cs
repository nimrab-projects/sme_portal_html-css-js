using System;
using System.Threading.Tasks;
using System.Web.Mvc;
using Microsoft.AspNet.Identity;
using SmePortal.Web.Repositories;
using SmePortal.Web.Services;
using SmePortal.Web.ViewModels;

namespace SmePortal.Web.Controllers
{
    // Serves the real (JS-rendered) Setup/Dashboard pages. Extends ApiControllerBase purely to
    // reuse its Db-from-OWIN-context lazy property (see that class's doc comment) - this is not
    // a JSON API controller, it just avoids re-writing the same Initialize()/Db plumbing again.
    [Authorize]
    public class ApplicantController : ApiControllerBase
    {
        private IBusinessService BusinessService =>
            new BusinessService(new BusinessRepository(Db), new UserRepository(Db),
                new NotificationService(new NotificationRepository(Db)), new ApplicationRepository(Db));

        private int CurrentUserId => Convert.ToInt32(User.Identity.GetUserId());

        // GET /Applicant/Setup -> Views/Applicant/Setup.cshtml
        [HttpGet]
        public async Task<ActionResult> Setup()
        {
            // A user who already has a business profile must not be able to revisit Setup by
            // typing the URL - send them straight to the dashboard instead.
            if (await BusinessService.HasAnyBusinessAsync(CurrentUserId))
            {
                return RedirectToAction("Index");
            }
            return View();
        }

        // POST /Applicant/Setup - reuses the exact same IBusinessService.SaveBusinessAsync that
        // Controllers/BusinessController.cs's JSON "save" action calls (via js/api.js, from the
        // unchanged businessSetup.js UI, which is the path actually exercised today). This action
        // is a second, fully working entry point into that same shared logic - not a duplicate
        // implementation - for a classic form-post flow.
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<ActionResult> Setup(SaveBusinessRequestViewModel model)
        {
            if (!ModelState.IsValid)
            {
                return View(model);
            }

            await BusinessService.SaveBusinessAsync(CurrentUserId, model);
            return RedirectToAction("Index");
        }

        // GET /Applicant -> Views/Applicant/Index.cshtml (the full dashboard shell, Phase 6).
        [HttpGet]
        public async Task<ActionResult> Index()
        {
            // Mirror image of the check in Setup(): a user who hasn't completed Setup yet must
            // not be able to reach the Dashboard by typing the URL - send them there instead.
            if (!await BusinessService.HasAnyBusinessAsync(CurrentUserId))
            {
                return RedirectToAction("Setup");
            }
            return View();
        }
    }
}
