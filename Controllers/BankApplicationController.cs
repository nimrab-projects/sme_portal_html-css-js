using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Web;
using System.Web.Mvc;
using Microsoft.AspNet.Identity;
using SmePortal.Web.Filters;
using SmePortal.Web.Repositories;
using SmePortal.Web.Services;
using SmePortal.Web.ViewModels;

namespace SmePortal.Web.Controllers
{
    // JSON API for the Bank Portal (Phase 13). [Authorize(Roles = "BankOfficer")] is the actual
    // enforcement point for "Applicants must never access Bank Portal routes" - an Applicant's
    // otherwise-valid session cookie fails the role check here, and every action below then
    // scopes further to CurrentBankNameAsync() (Business.Bank == this officer's own bank), so
    // one Bank Officer can never reach another bank's applications either, even by guessing ids.
    [RoutePrefix("api/bank")]
    [Authorize(Roles = "BankOfficer")]
    public class BankApplicationController : ApiControllerBase
    {
        private string UploadsRootPath => Server.MapPath("~/App_Data/Uploads");

        private IUserRepository UserRepository => new UserRepository(Db);
        private IApplicationRepository ApplicationRepository => new ApplicationRepository(Db);
        private INotificationService NotificationService => new NotificationService(new NotificationRepository(Db));
        private IApplicationService ApplicationService =>
            new ApplicationService(ApplicationRepository, new BusinessRepository(Db), UserRepository, NotificationService);
        private IDocumentService DocumentService =>
            new DocumentService(new DocumentRepository(Db), ApplicationService, NotificationService, UploadsRootPath);
        private IBankApplicationService BankApplicationService =>
            new BankApplicationService(ApplicationRepository, ApplicationService, new DocumentRepository(Db), DocumentService, NotificationService);

        private int CurrentUserId => Convert.ToInt32(User.Identity.GetUserId());

        // Every action needs this, so it's resolved once per request rather than duplicated -
        // a null/empty result (should never happen for a real BankOfficer account, but defends
        // against a mis-provisioned one) simply yields empty results everywhere, never someone
        // else's data.
        private async Task<string> CurrentBankNameAsync()
        {
            var user = await UserRepository.GetByIdAsync(CurrentUserId);
            return user?.BankName;
        }

        [Route("dashboard")]
        [HttpGet]
        public async Task<ActionResult> Dashboard()
        {
            var bankName = await CurrentBankNameAsync();
            var stats = await BankApplicationService.GetDashboardStatsAsync(bankName);
            return JsonCamel(stats);
        }

        [Route("applications")]
        [HttpGet]
        public async Task<ActionResult> Applications()
        {
            var bankName = await CurrentBankNameAsync();
            var applications = await BankApplicationService.GetAssignedApplicationsAsync(bankName);
            return JsonCamel(new { applications });
        }

        [Route("applications/{id:int}")]
        [HttpGet]
        public async Task<ActionResult> ApplicationDetail(int id)
        {
            var bankName = await CurrentBankNameAsync();
            var detail = await ApplicationService.GetApplicationDetailForBankAsync(bankName, id);
            if (detail == null) return new HttpNotFoundResult();

            var documents = await DocumentService.GetDocumentsForBankAsync(bankName, id);
            detail.Documents = documents ?? new List<ApplicationDocumentViewModel>();

            return JsonCamel(new { application = detail });
        }

        [Route("applications/{id:int}/status")]
        [HttpPost]
        [ValidateAjaxAntiForgeryToken]
        public async Task<ActionResult> UpdateStatus(int id, UpdateApplicationStatusRequestViewModel model)
        {
            if (model == null || !ModelState.IsValid)
            {
                return JsonCamel(new ApiErrorViewModel { Error = "missing_fields", Message = "Please provide a status." });
            }

            var bankName = await CurrentBankNameAsync();
            try
            {
                var updated = await BankApplicationService.UpdateStatusAsync(bankName, CurrentUserId, id, model.Status, model.Remarks);
                if (updated == null) return new HttpNotFoundResult();
                return JsonCamel(new { success = true, application = updated });
            }
            catch (InvalidOperationException ex)
            {
                return JsonCamel(new ApiErrorViewModel { Error = "invalid_status", Message = ex.Message });
            }
        }

        [Route("applications/{id:int}/offer")]
        [HttpPost]
        [ValidateAjaxAntiForgeryToken]
        public async Task<ActionResult> IssueOffer(
            int id, HttpPostedFileBase file, decimal approvedAmount, string markupRate, string tenor,
            string monthlyInstallment, string processingFee, DateTime? expiryDate, string disbursementTimeline)
        {
            var bankName = await CurrentBankNameAsync();
            try
            {
                var updated = await BankApplicationService.IssueOfferAsync(
                    bankName, CurrentUserId, id, approvedAmount, markupRate, tenor, monthlyInstallment,
                    processingFee, expiryDate, disbursementTimeline, file);
                if (updated == null) return new HttpNotFoundResult();
                return JsonCamel(new { success = true, application = updated });
            }
            catch (InvalidOperationException ex)
            {
                return JsonCamel(new ApiErrorViewModel { Error = "invalid_offer", Message = ex.Message });
            }
        }

        [Route("applications/{id:int}/request-info")]
        [HttpPost]
        [ValidateAjaxAntiForgeryToken]
        public async Task<ActionResult> RequestInfo(int id, RequestInfoRequestViewModel model)
        {
            try
            {
                var bankName = await CurrentBankNameAsync();
                var sent = await BankApplicationService.RequestInfoAsync(bankName, CurrentUserId, id, model?.RequestType, model?.Messages);
                if (!sent) return new HttpNotFoundResult();
                return JsonCamel(new { success = true });
            }
            catch (InvalidOperationException ex)
            {
                return JsonCamel(new ApiErrorViewModel { Error = "invalid_request", Message = ex.Message });
            }
        }

        [Route("applications/{id:int}/documents/{docId:int}/verify")]
        [HttpPost]
        [ValidateAjaxAntiForgeryToken]
        public async Task<ActionResult> VerifyDocument(int id, int docId, DocumentReviewRequestViewModel model)
        {
            var bankName = await CurrentBankNameAsync();
            try
            {
                var updated = await DocumentService.UpdateStatusForBankAsync(bankName, id, docId, "verified", model?.Remarks);
                if (updated == null) return new HttpNotFoundResult();
                return JsonCamel(new { success = true, document = updated });
            }
            catch (InvalidOperationException ex)
            {
                return JsonCamel(new ApiErrorViewModel { Error = "invalid_status", Message = ex.Message });
            }
        }

        [Route("applications/{id:int}/documents/{docId:int}/reject")]
        [HttpPost]
        [ValidateAjaxAntiForgeryToken]
        public async Task<ActionResult> RejectDocument(int id, int docId, DocumentReviewRequestViewModel model)
        {
            var bankName = await CurrentBankNameAsync();
            try
            {
                var updated = await DocumentService.UpdateStatusForBankAsync(bankName, id, docId, "rejected", model?.Remarks);
                if (updated == null) return new HttpNotFoundResult();
                return JsonCamel(new { success = true, document = updated });
            }
            catch (InvalidOperationException ex)
            {
                return JsonCamel(new ApiErrorViewModel { Error = "invalid_status", Message = ex.Message });
            }
        }

        [Route("applications/{id:int}/documents/{docId:int}/download")]
        [HttpGet]
        public async Task<ActionResult> DownloadDocument(int id, int docId)
        {
            var bankName = await CurrentBankNameAsync();
            var info = await DocumentService.GetDownloadInfoForBankAsync(bankName, id, docId);
            if (info == null) return new HttpNotFoundResult();
            return File(info.PhysicalPath, info.ContentType, info.OriginalFileName);
        }
    }
}
