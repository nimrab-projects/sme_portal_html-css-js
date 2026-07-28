using System;
using System.Linq;
using System.Threading.Tasks;
using System.Web.Mvc;
using Microsoft.AspNet.Identity;
using SmePortal.Web.Filters;
using SmePortal.Web.Repositories;
using SmePortal.Web.Services;
using SmePortal.Web.ViewModels;

namespace SmePortal.Web.Controllers
{
    [RoutePrefix("api/business")]
    [Authorize]
    public class BusinessController : ApiControllerBase
    {
        private IBusinessService BusinessService =>
            new BusinessService(new BusinessRepository(Db), new UserRepository(Db),
                new NotificationService(new NotificationRepository(Db)), new ApplicationRepository(Db));

        private int CurrentUserId => Convert.ToInt32(User.Identity.GetUserId());

        // Root cause of "Save Business always shows a generic error": every ModelState failure
        // (a mistyped CNIC, an IBAN that doesn't match the required format, a missing required
        // field, etc.) was being collapsed into the same hardcoded "Please check the form and
        // try again." string, discarding the specific, already-written-out messages each
        // [Required]/[RegularExpression] attribute on SaveBusinessRequestViewModel carries (e.g.
        // "CNIC must be in the format XXXXX-XXXXXXX-X."). The user had no way to tell which
        // field, or why, so a real (correctly-rejected) formatting mistake looked identical to a
        // total failure. This logs every ModelState error (for server-side diagnosis) and
        // returns the real message(s) to the client instead - shared by Save and Update so the
        // fix lives in exactly one place.
        private string DescribeModelStateErrors()
        {
            var messages = ModelState
                .Where(kvp => kvp.Value.Errors.Count > 0)
                .SelectMany(kvp => kvp.Value.Errors.Select(error =>
                {
                    var message = string.IsNullOrEmpty(error.ErrorMessage)
                        ? (error.Exception?.Message ?? $"{kvp.Key} is invalid.")
                        : error.ErrorMessage;
                    System.Diagnostics.Trace.TraceWarning(
                        $"[BusinessController] ModelState error - Field: {kvp.Key}, Error: {message}");
                    return message;
                }))
                .ToList();

            return messages.Count > 0 ? string.Join(" ", messages) : "Please check the form and try again.";
        }

        [Route("save")]
        [HttpPost]
        [ValidateAjaxAntiForgeryToken]
        public async Task<ActionResult> Save(SaveBusinessRequestViewModel model)
        {
            if (model == null)
            {
                return JsonCamel(new ApiErrorViewModel { Error = "missing_fields", Message = "Please check the form and try again." });
            }
            if (!ModelState.IsValid)
            {
                return JsonCamel(new ApiErrorViewModel { Error = "validation_failed", Message = DescribeModelStateErrors() });
            }

            try
            {
                var business = await BusinessService.SaveBusinessAsync(CurrentUserId, model);
                return JsonCamel(new { success = true, business });
            }
            catch (InvalidOperationException ex)
            {
                return JsonCamel(new ApiErrorViewModel { Error = "invalid_business", Message = ex.Message });
            }
        }

        [Route("my")]
        [HttpGet]
        public async Task<ActionResult> My()
        {
            var businesses = await BusinessService.GetMyBusinessesAsync(CurrentUserId);
            return JsonCamel(new { businesses });
        }

        // Phase 12 (Multiple Business Management) - backs the My Businesses page's View/Edit
        // actions for any specific business the caller owns (not just the "primary" one Profile
        // operates on). 404 for both "doesn't exist" and "not yours", never distinguished.
        [Route("{id:int}")]
        [HttpGet]
        public async Task<ActionResult> GetById(int id)
        {
            var business = await BusinessService.GetBusinessByIdAsync(CurrentUserId, id);
            if (business == null) return new HttpNotFoundResult();
            return JsonCamel(new { business });
        }

        // Phase 12 - deletes one of the caller's own businesses. Blocked (InvalidOperationException
        // -> {success:false, error:"delete_not_allowed", message}) if it has any applications on
        // record, same status-code convention DocumentController's Delete already uses.
        [Route("{id:int}")]
        [HttpDelete]
        [ValidateAjaxAntiForgeryToken]
        public async Task<ActionResult> Delete(int id)
        {
            try
            {
                var deleted = await BusinessService.DeleteBusinessAsync(CurrentUserId, id);
                if (!deleted) return new HttpNotFoundResult();
                return JsonCamel(new { success = true });
            }
            catch (InvalidOperationException ex)
            {
                return JsonCamel(new { success = false, error = "delete_not_allowed", message = ex.Message });
            }
        }

        // Phase 10 (Profile & Business Profile Management) - updates the caller's EXISTING
        // business in place. Never creates a second row: BusinessService.UpdateBusinessAsync
        // resolves and mutates the business identified by model.BusinessId, ownership-checked.
        [Route("update")]
        [HttpPost]
        [ValidateAjaxAntiForgeryToken]
        public async Task<ActionResult> Update(UpdateBusinessRequestViewModel model)
        {
            if (model == null)
            {
                return JsonCamel(new ApiErrorViewModel { Error = "missing_fields", Message = "Please check the form and try again." });
            }
            if (!ModelState.IsValid)
            {
                return JsonCamel(new ApiErrorViewModel { Error = "validation_failed", Message = DescribeModelStateErrors() });
            }
            if (!int.TryParse(model.BusinessId, out var businessId))
            {
                return JsonCamel(new ApiErrorViewModel { Error = "missing_fields", Message = "Please check the form and try again." });
            }

            try
            {
                var business = await BusinessService.UpdateBusinessAsync(CurrentUserId, businessId, model);
                if (business == null) return new HttpNotFoundResult();
                return JsonCamel(new { success = true, business });
            }
            catch (InvalidOperationException ex)
            {
                return JsonCamel(new ApiErrorViewModel { Error = "invalid_business", Message = ex.Message });
            }
        }
    }
}
