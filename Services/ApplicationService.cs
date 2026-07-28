using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Threading.Tasks;
using SmePortal.Web.Repositories;
using SmePortal.Web.ViewModels;

namespace SmePortal.Web.Services
{
    public class ApplicationService : IApplicationService
    {
        private readonly IApplicationRepository _applicationRepository;
        private readonly IBusinessRepository _businessRepository;
        private readonly IUserRepository _userRepository;
        private readonly INotificationService _notificationService;

        public ApplicationService(IApplicationRepository applicationRepository, IBusinessRepository businessRepository,
            IUserRepository userRepository, INotificationService notificationService)
        {
            _applicationRepository = applicationRepository;
            _businessRepository = businessRepository;
            _userRepository = userRepository;
            _notificationService = notificationService;
        }

        public async Task<List<ApplicationResponseViewModel>> GetMyApplicationsAsync(int userId)
        {
            var myBusinesses = await _businessRepository.GetByUserIdAsync(userId);
            var businessIds = myBusinesses.Select(b => b.BusinessId).ToList();

            // A brand-new applicant has no businesses yet (or a business with no applications) -
            // in both cases this correctly returns an empty list, never fake/demo rows.
            var applications = await _applicationRepository.GetByBusinessIdsAsync(businessIds);

            return applications.Select(Map).ToList();
        }

        public async Task<ApplicationResponseViewModel> SubmitApplicationAsync(int userId, SubmitApplicationRequestViewModel model)
        {
            if (!int.TryParse(model.BusinessId, out var businessId))
            {
                throw new InvalidOperationException("Invalid business.");
            }

            if (model.RequestedAmount <= 0)
            {
                throw new InvalidOperationException("Requested amount must be greater than zero.");
            }

            // Ownership check: the business must actually belong to the calling user - never
            // trust a client-supplied BusinessId on its own. This is also what prevents
            // tampering with BusinessId (Phase 7's security requirement).
            var myBusinesses = await _businessRepository.GetByUserIdAsync(userId);
            var business = myBusinesses.FirstOrDefault(b => b.BusinessId == businessId);
            if (business == null)
            {
                throw new InvalidOperationException("Business not found for this user.");
            }

            var now = DateTime.UtcNow;
            var application = new Models.Application
            {
                BusinessId = businessId,
                // Placeholder until the identity value exists (assigned after the first save
                // below) - CaseId is derived from ApplicationId so uniqueness is guaranteed by
                // the database, not a race-prone in-memory random number.
                CaseId = "PENDING",
                RequestedAmount = model.RequestedAmount,
                Amount = $"PKR {model.RequestedAmount:N0}",
                // The existing wizard (newApplication.js) has no separate scheme-selection UI -
                // "Type of Facility" is the closest real concept to both, so both fields carry
                // the same value rather than asking the client for a second, redundant input.
                Scheme = model.PurposeOfFinance,
                PurposeOfFinance = model.PurposeOfFinance,
                BusinessSector = business.Nature,
                BusinessAge = ComputeBusinessAge(business.YearEstablished),
                MonthlyTurnover = ComputeMonthlyTurnover(business.AnnualSales),
                Employees = ParseIntOrZero(business.Employees),
                SubmittedByUserId = userId,
                Status = "submitted",
                Stage = 1,
                SubmittedOn = now,
                CreatedOn = now,
            };

            await _applicationRepository.AddAsync(application);

            application.CaseId = $"SME-{now.Year}-{application.ApplicationId:D6}";
            await _applicationRepository.SaveChangesAsync();

            await _applicationRepository.AddStatusHistoryAsync(new Models.ApplicationStatusHistory
            {
                ApplicationId = application.ApplicationId,
                Status = "submitted",
                Note = "Application Submitted",
                ChangedByUserId = userId,
                CreatedOn = now,
            });

            await _notificationService.CreateNotificationAsync(
                userId, "New Application Submitted", $"Your financing application {application.CaseId} has been submitted.",
                "ApplicationSubmitted", application.ApplicationId, "Application", userId);

            application.Business = business;
            return Map(application);
        }

        public async Task<ApplicationDetailViewModel> GetApplicationDetailAsync(int userId, int applicationId)
        {
            var application = await _applicationRepository.GetByIdAsync(applicationId);

            // Never trust a client-supplied ApplicationId on its own - ownership is resolved
            // exclusively via Application -> Business -> UserId, same rule as SubmitApplicationAsync.
            // Returning null (not throwing) for both "doesn't exist" and "not yours" lets the
            // controller answer both cases identically with 404 (Phase 8's security requirement).
            if (application == null || application.Business == null || application.Business.UserId != userId)
            {
                return null;
            }

            var applicant = await _userRepository.GetByIdAsync(userId);

            var distinctUserIds = application.StatusHistory.Select(h => h.ChangedByUserId).Distinct().ToList();
            var userNames = new Dictionary<int, string>();
            foreach (var uid in distinctUserIds)
            {
                var user = uid == userId ? applicant : await _userRepository.GetByIdAsync(uid);
                userNames[uid] = user?.FullName ?? "System";
            }

            var timeline = application.StatusHistory
                .OrderBy(h => h.CreatedOn)
                .Select(h => new ApplicationStatusHistoryViewModel
                {
                    Status = h.Status,
                    Remarks = h.Note,
                    UpdatedBy = userNames.TryGetValue(h.ChangedByUserId, out var name) ? name : "System",
                    Date = h.CreatedOn.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                    Time = h.CreatedOn.ToString("HH:mm", CultureInfo.InvariantCulture),
                })
                .ToList();

            var lastUpdated = application.StatusHistory.Any()
                ? application.StatusHistory.Max(h => h.CreatedOn)
                : (application.UpdatedOn ?? application.SubmittedOn ?? application.CreatedOn);

            return new ApplicationDetailViewModel
            {
                Id = application.ApplicationId.ToString(),
                CaseId = application.CaseId,
                Status = application.Status,
                Stage = application.Stage,
                Scheme = application.Scheme,
                PurposeOfFinance = application.PurposeOfFinance,
                Amount = application.Amount,
                RequestedAmount = application.RequestedAmount,
                // Single source of truth: the bank the applicant selected on their Business
                // Profile (Business.Bank is optional there, so a business that skipped it has
                // none on file - shown honestly as "Not Provided", never a fabricated name).
                Bank = string.IsNullOrWhiteSpace(application.Business.Bank) ? "Not Provided" : application.Business.Bank,
                SubmittedDate = (application.SubmittedOn ?? application.CreatedOn).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                LastUpdatedDate = lastUpdated.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                BusinessSector = application.BusinessSector,
                BusinessAge = application.BusinessAge,
                MonthlyTurnover = application.MonthlyTurnover,
                Employees = application.Employees,
                BusinessId = application.BusinessId.ToString(),
                BusinessName = application.Business.Name,
                BusinessNature = application.Business.Nature,
                BusinessNtn = application.Business.Ntn,
                BusinessAddress = application.Business.Address,
                BusinessContactPerson = application.Business.ContactPerson,
                BusinessCellLandline = application.Business.CellLandline,
                BusinessEmail = application.Business.Email,
                BusinessOwnerCnic = application.Business.OwnerCnic,
                BusinessStatus = application.Business.BusinessStatus,
                ApplicantName = applicant?.FullName ?? "",
                ApplicantEmail = applicant?.Email ?? "",
                ApplicantMobile = applicant?.Mobile ?? "",
                Timeline = timeline,
            };
        }

        private static int ComputeBusinessAge(string yearEstablished)
        {
            return int.TryParse(yearEstablished, out var year) && year > 0
                ? Math.Max(0, DateTime.UtcNow.Year - year)
                : 0;
        }

        private static decimal ComputeMonthlyTurnover(string annualSales)
        {
            var cleaned = (annualSales ?? "").Replace(",", "");
            return decimal.TryParse(cleaned, out var annual) ? Math.Round(annual / 12m, 2) : 0m;
        }

        private static int ParseIntOrZero(string value)
        {
            return int.TryParse(value, out var parsed) ? parsed : 0;
        }

        private static ApplicationResponseViewModel Map(Models.Application a)
        {
            return new ApplicationResponseViewModel
            {
                Id = a.ApplicationId.ToString(),
                CaseId = a.CaseId,
                BusinessName = a.Business?.Name ?? "",
                Scheme = a.Scheme,
                Amount = a.Amount,
                Status = a.Status,
                // Single source of truth: Business.Bank (the applicant's own Business Profile
                // selection) - a.Business is already eager-loaded by GetByBusinessIdsAsync's
                // .Include(a => a.Business), so this adds no extra query.
                Bank = string.IsNullOrWhiteSpace(a.Business?.Bank) ? "Not Provided" : a.Business.Bank,
                SubmittedDate = (a.SubmittedOn ?? a.CreatedOn).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                // Deliberately NOT reading a.StatusHistory here - that navigation property isn't
                // eager-loaded for the list query (GetByBusinessIdsAsync), and touching it would
                // trigger a lazy-load query per row (an N+1, against Phase 8's own performance
                // requirement). UpdatedOn/SubmittedOn/CreatedOn is exact for every application
                // today anyway, since nothing yet appends a second history row after submission.
                LastUpdatedDate = (a.UpdatedOn ?? a.SubmittedOn ?? a.CreatedOn).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                Stage = a.Stage,
                PurposeOfFinance = a.PurposeOfFinance,
                BusinessSector = a.BusinessSector,
                BusinessAge = a.BusinessAge,
                MonthlyTurnover = a.MonthlyTurnover,
                Employees = a.Employees,
            };
        }
    }
}
