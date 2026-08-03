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
    // JSON API for the SBP Admin Portal. Same [Authorize(Roles = "SbpAdmin")] enforcement as
    // BankApplicationController's [Authorize(Roles = "BankOfficer")] - an Applicant or Bank
    // Officer's otherwise-valid session fails this role check, so neither can ever reach
    // system-wide data through here.
    [RoutePrefix("api/sbp")]
    [Authorize(Roles = "SbpAdmin")]
    public class SbpApplicationController : ApiControllerBase
    {
        private string UploadsRootPath => Server.MapPath("~/App_Data/Uploads");

        private IUserRepository UserRepository => new UserRepository(Db);
        private IBusinessRepository BusinessRepository => new BusinessRepository(Db);
        private IApplicationRepository ApplicationRepository => new ApplicationRepository(Db);
        private INotificationService NotificationService => new NotificationService(new NotificationRepository(Db));

        private IApplicationService ApplicationService =>
            new ApplicationService(ApplicationRepository, BusinessRepository, UserRepository, NotificationService);

        private IBusinessService BusinessService =>
            new BusinessService(BusinessRepository, UserRepository, NotificationService, ApplicationRepository);

        private IDocumentService DocumentService =>
            new DocumentService(new DocumentRepository(Db), ApplicationService, NotificationService, UploadsRootPath);

        private ISbpAdminService SbpAdminService =>
            new SbpAdminService(ApplicationRepository, UserRepository, BusinessRepository, BusinessService, ApplicationService, DocumentService);

        private IBankRepository BankRepository => new BankRepository(Db);
        private IBankService BankService => new BankService(BankRepository);

        private IReportHistoryRepository ReportHistoryRepository => new ReportHistoryRepository(Db);
        private IReportService ReportService => new ReportService(ApplicationRepository, ReportHistoryRepository, UserRepository);

        private IAuditLogRepository AuditLogRepository => new AuditLogRepository(Db);
        private IAuditService AuditService => new AuditService(AuditLogRepository, UserRepository);

        private int CurrentUserId => Convert.ToInt32(User.Identity.GetUserId());

        [Route("dashboard")]
        [HttpGet]
        public async Task<ActionResult> Dashboard()
        {
            var stats = await SbpAdminService.GetDashboardStatsAsync();
            return JsonCamel(stats);
        }

        // Phase 2 sync (Applications page) - every real application system-wide, same row shape
        // Bank Portal's own queue already returns.
        [Route("applications")]
        [HttpGet]
        public async Task<ActionResult> Applications()
        {
            var applications = await SbpAdminService.GetAllApplicationsAsync();
            return JsonCamel(new { applications });
        }

        // Phase 3 sync (User Management) - every real user, system-wide.
        [Route("users")]
        [HttpGet]
        public async Task<ActionResult> Users()
        {
            var users = await SbpAdminService.GetAllUsersAsync();
            return JsonCamel(new { users });
        }

        [Route("users/{id:int}")]
        [HttpGet]
        public async Task<ActionResult> UserDetail(int id)
        {
            var detail = await SbpAdminService.GetUserDetailAsync(id);
            if (detail == null) return new HttpNotFoundResult();
            return JsonCamel(new { user = detail });
        }

        // Executive Dashboard's Bank Performance Overview row-click drill-down. Query string
        // (not a route segment) because a real bank name can contain spaces/punctuation that
        // don't round-trip cleanly through attribute-routed path segments.
        [Route("banks/detail")]
        [HttpGet]
        public async Task<ActionResult> BankDetail(string bank)
        {
            var detail = await SbpAdminService.GetBankDetailAsync(bank);
            if (detail == null) return new HttpNotFoundResult();
            return JsonCamel(new { bank = detail });
        }

        // Bank Management - real Models/Bank.cs rows, replacing the hardcoded BANKS array that
        // used to live in js/pages/sbp/portal.js's bankManagementHtml().
        [Route("banks")]
        [HttpGet]
        public async Task<ActionResult> Banks()
        {
            var banks = await BankService.GetAllBanksAsync();
            return JsonCamel(new { banks });
        }

        [Route("banks")]
        [HttpPost]
        [ValidateAjaxAntiForgeryToken]
        public async Task<ActionResult> CreateBank(SaveBankRequestViewModel model)
        {
            try
            {
                var bank = await BankService.CreateBankAsync(model);
                await AuditService.LogAsync(CurrentUserId, "BankCreated", Request);
                return JsonCamel(new { success = true, bank });
            }
            catch (InvalidOperationException ex)
            {
                return JsonCamel(new ApiErrorViewModel { Error = "invalid_bank", Message = ex.Message });
            }
        }

        [Route("banks/{id:int}")]
        [HttpPost]
        [ValidateAjaxAntiForgeryToken]
        public async Task<ActionResult> UpdateBank(int id, SaveBankRequestViewModel model)
        {
            try
            {
                var bank = await BankService.UpdateBankAsync(id, model);
                if (bank == null) return new HttpNotFoundResult();
                await AuditService.LogAsync(CurrentUserId, "BankUpdated", Request);
                return JsonCamel(new { success = true, bank });
            }
            catch (InvalidOperationException ex)
            {
                return JsonCamel(new ApiErrorViewModel { Error = "invalid_bank", Message = ex.Message });
            }
        }

        [Route("banks/{id:int}/status")]
        [HttpPost]
        [ValidateAjaxAntiForgeryToken]
        public async Task<ActionResult> SetBankStatus(int id, SetBankStatusRequestViewModel model)
        {
            var bank = await BankService.SetBankStatusAsync(id, model?.IsActive ?? true);
            if (bank == null) return new HttpNotFoundResult();
            await AuditService.LogAsync(CurrentUserId, "BankStatusChanged", Request);
            return JsonCamel(new { success = true, bank });
        }

        // Audit Trail - every real audit log, system-wide (Services/AuditService.cs).
        [Route("audit-logs")]
        [HttpGet]
        public async Task<ActionResult> AuditLogs()
        {
            var logs = await AuditService.GetAuditLogsAsync();
            return JsonCamel(new { logs });
        }

        // Reports - the 6 fixed report cards. Always the full, unfiltered dataset (see
        // Services/ReportService.cs) - "custom" is the only report type that ever takes filters.
        // Regex-constrained to the 6 fixed report keys only, so this never ambiguously matches
        // reports/custom or reports/history below.
        [Route("reports/{reportType:regex(^(application_status|turnaround_time|assessment|decline_analysis|disbursement_summary|geographic_spread)$)}")]
        [HttpGet]
        public async Task<ActionResult> GenerateReport(string reportType)
        {
            try
            {
                var data = await ReportService.GenerateReportAsync(reportType, null, CurrentUserId);
                await AuditService.LogAsync(CurrentUserId, "ReportGenerated", Request);
                return JsonCamel(new { success = true, report = data });
            }
            catch (InvalidOperationException ex)
            {
                return JsonCamel(new ApiErrorViewModel { Error = "invalid_report", Message = ex.Message });
            }
        }

        [Route("reports/custom")]
        [HttpPost]
        [ValidateAjaxAntiForgeryToken]
        public async Task<ActionResult> GenerateCustomReport(ReportFilterViewModel model)
        {
            try
            {
                var data = await ReportService.GenerateReportAsync("custom", model, CurrentUserId);
                await AuditService.LogAsync(CurrentUserId, "ReportGenerated", Request);
                return JsonCamel(new { success = true, report = data });
            }
            catch (InvalidOperationException ex)
            {
                return JsonCamel(new ApiErrorViewModel { Error = "invalid_report", Message = ex.Message });
            }
        }

        [Route("reports/history")]
        [HttpGet]
        public async Task<ActionResult> ReportHistoryList()
        {
            var history = await ReportService.GetHistoryAsync();
            return JsonCamel(new { history });
        }

        [Route("reports/history/{id:int}/regenerate")]
        [HttpGet]
        public async Task<ActionResult> RegenerateReport(int id)
        {
            var data = await ReportService.RegenerateAsync(id);
            if (data == null) return new HttpNotFoundResult();
            return JsonCamel(new { success = true, report = data });
        }

        [Route("users/{id:int}/status")]
        [HttpPost]
        [ValidateAjaxAntiForgeryToken]
        public async Task<ActionResult> UpdateUserStatus(int id, SetUserStatusRequestViewModel model)
        {
            try
            {
                var updated = await SbpAdminService.SetUserStatusAsync(CurrentUserId, id, model?.Action);
                if (updated == null) return new HttpNotFoundResult();
                await AuditService.LogAsync(CurrentUserId, "UserStatusChanged", Request);
                return JsonCamel(new { success = true, user = updated });
            }
            catch (InvalidOperationException ex)
            {
                return JsonCamel(new ApiErrorViewModel { Error = "invalid_action", Message = ex.Message });
            }
        }
    }
}
