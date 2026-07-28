using System;
using System.Threading.Tasks;
using System.Web;
using System.Web.Mvc;
using Microsoft.AspNet.Identity;
using Microsoft.AspNet.Identity.Owin;
using SmePortal.Web.Filters;
using SmePortal.Web.Repositories;
using SmePortal.Web.Services;
using SmePortal.Web.ViewModels;

namespace SmePortal.Web.Controllers
{
    // Personal Profile + Business Profile Management (Phase 10). Page actions here are the same
    // thin "bootstrap shell" pattern as every other real MVC page in this app (ApplicantController,
    // ApplicationController) - the real UI is JS-rendered; these actions only gate authorization
    // and, for Business, whether a business exists yet to view/edit. The JSON API lives on this
    // same controller for Profile-specific reads/writes, while Business create/update stays on
    // BusinessController (its existing, established home) - Profile's Business pages call that
    // controller's endpoints rather than duplicating business logic here.
    [Authorize]
    public class ProfileController : ApiControllerBase
    {
        private IUserService UserService => new UserService(new UserRepository(Db), new BusinessRepository(Db));

        private INotificationService NotificationService => new NotificationService(new NotificationRepository(Db));

        private IBusinessService BusinessService =>
            new BusinessService(new BusinessRepository(Db), new UserRepository(Db), NotificationService, new ApplicationRepository(Db));

        private int CurrentUserId => Convert.ToInt32(User.Identity.GetUserId());

        // Explicit routes on every page action here (rather than relying on the {controller}/
        // {action}/{id} convention) because /Profile/Business/Edit is a 4-segment path the
        // default convention can't express, and mixing "some actions conventional, one
        // attribute-routed" on the same controller invites exactly the kind of routing ambiguity
        // this avoids outright.

        // GET /Profile
        [Route("Profile")]
        [HttpGet]
        public ActionResult Index()
        {
            return View();
        }

        // GET /Profile/Edit
        [Route("Profile/Edit")]
        [HttpGet]
        public ActionResult Edit()
        {
            return View();
        }

        // GET /Profile/Business - a business must exist to view it (redirect to Setup, same
        // guard ApplicantController.Index already uses).
        [Route("Profile/Business")]
        [HttpGet]
        public async Task<ActionResult> Business()
        {
            if (!await BusinessService.HasAnyBusinessAsync(CurrentUserId))
            {
                return RedirectToAction("Setup", "Applicant");
            }
            return View();
        }

        // GET /Profile/Business/Edit
        [Route("Profile/Business/Edit")]
        [HttpGet]
        public async Task<ActionResult> BusinessEdit()
        {
            if (!await BusinessService.HasAnyBusinessAsync(CurrentUserId))
            {
                return RedirectToAction("Setup", "Applicant");
            }
            return View();
        }

        // GET /Profile/ChangePassword
        [Route("Profile/ChangePassword")]
        [HttpGet]
        public ActionResult ChangePassword()
        {
            return View();
        }

        // ===== JSON API =====

        [Route("api/profile/me")]
        [HttpGet]
        public async Task<ActionResult> Me()
        {
            var profile = await UserService.GetProfileAsync(CurrentUserId);
            if (profile == null) return new HttpNotFoundResult();
            return JsonCamel(new { profile });
        }

        // The user's primary (first-created) business - "the business created during
        // registration" that Profile/Business Profile Edit always operate on. Backed by
        // BusinessService.GetPrimaryBusinessAsync rather than the client guessing which of
        // state.businesses[] is "primary" from array order.
        [Route("api/profile/business")]
        [HttpGet]
        public async Task<ActionResult> PrimaryBusiness()
        {
            var business = await BusinessService.GetPrimaryBusinessAsync(CurrentUserId);
            if (business == null) return new HttpNotFoundResult();
            return JsonCamel(new { business });
        }

        [Route("api/profile/update")]
        [HttpPost]
        [ValidateAjaxAntiForgeryToken]
        public async Task<ActionResult> Update(UpdateProfileRequestViewModel model)
        {
            if (model == null || !ModelState.IsValid)
            {
                return JsonCamel(new ApiErrorViewModel { Error = "missing_fields", Message = "Please check the form and try again." });
            }

            try
            {
                var profile = await UserService.UpdateProfileAsync(CurrentUserId, model);
                return JsonCamel(new { success = true, profile });
            }
            catch (InvalidOperationException ex)
            {
                return JsonCamel(new ApiErrorViewModel { Error = "invalid_profile", Message = ex.Message });
            }
        }

        // Reuses ASP.NET Identity's own UserManager.ChangePasswordAsync directly - it already
        // validates the current password and applies App_Start/IdentityConfig.cs's
        // PasswordValidator policy to the new one, exactly like Setup.md's Phase 1 decision to
        // never build a custom password system. Thin by design: there is no service/repository
        // layer to put between here and Identity, because Identity already IS that layer for
        // this specific concern (same reasoning as AccountController's login/register actions).
        [Route("api/profile/change-password")]
        [HttpPost]
        [ValidateAjaxAntiForgeryToken]
        public async Task<ActionResult> ChangePasswordApi(ChangePasswordRequestViewModel model)
        {
            if (model == null || string.IsNullOrWhiteSpace(model.CurrentPassword) ||
                string.IsNullOrWhiteSpace(model.NewPassword))
            {
                return JsonCamel(new ApiErrorViewModel { Error = "missing_fields", Message = "All fields are required." });
            }

            if (model.NewPassword != model.ConfirmPassword)
            {
                return JsonCamel(new ApiErrorViewModel { Error = "passwords_mismatch", Message = "New password and confirmation do not match." });
            }

            var userManager = HttpContext.GetOwinContext().GetUserManager<ApplicationUserManager>();
            var result = await userManager.ChangePasswordAsync(CurrentUserId, model.CurrentPassword, model.NewPassword);

            if (!result.Succeeded)
            {
                return JsonCamel(new ApiErrorViewModel { Error = "change_password_failed", Message = string.Join(" ", result.Errors) });
            }

            await NotificationService.CreateNotificationAsync(
                CurrentUserId, "Password Changed", "Your account password was changed successfully.",
                "PasswordChanged", createdBy: CurrentUserId);

            return JsonCamel(new { success = true });
        }
    }
}
