using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using SmePortal.Web.Repositories;
using SmePortal.Web.ViewModels;

namespace SmePortal.Web.Services
{
    public class SbpAdminService : ISbpAdminService
    {
        private static readonly HashSet<string> AllowedUserActions =
            new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "activate", "deactivate", "block", "unblock" };

        private readonly IApplicationRepository _applicationRepository;
        private readonly IUserRepository _userRepository;
        private readonly IBusinessRepository _businessRepository;
        private readonly IBusinessService _businessService;
        private readonly IApplicationService _applicationService;
        private readonly IDocumentService _documentService;

        public SbpAdminService(IApplicationRepository applicationRepository, IUserRepository userRepository,
            IBusinessRepository businessRepository, IBusinessService businessService,
            IApplicationService applicationService, IDocumentService documentService)
        {
            _applicationRepository = applicationRepository;
            _userRepository = userRepository;
            _businessRepository = businessRepository;
            _businessService = businessService;
            _applicationService = applicationService;
            _documentService = documentService;
        }

        public async Task<SbpDashboardStatsViewModel> GetDashboardStatsAsync()
        {
            // Single query, Business already eager-loaded (see ApplicationRepository.GetAllAsync)
            // - every metric below is computed by iterating this one in-memory list, not by
            // issuing a separate query per bank/per metric (no N+1).
            var applications = await _applicationRepository.GetAllAsync();

            // Grouped by Business.Bank (the only place a bank name is ever stored - see
            // Business.cs) - no separate Bank entity exists in this system, so "which banks are
            // active on the portal" is derived from real application data rather than a
            // maintained registry, and a newly-used bank name appears here automatically the
            // next time an application references it. Applications whose business skipped the
            // (optional) bank field are grouped under "Not Provided" rather than silently
            // dropped, same honesty convention used everywhere else a business has no bank on
            // file.
            var bankGroups = applications
                .GroupBy(a => string.IsNullOrWhiteSpace(a.Business?.Bank) ? "Not Provided" : a.Business.Bank)
                .Select(g => MapBankStats(g.Key, g.ToList()))
                .OrderByDescending(b => b.ApplicationsReviewed)
                .ToList();

            var totalApplications = applications.Count;
            var acceptedOffers = applications.Count(a => IsStatus(a, "approved"));
            var disbursed = applications.Count(a => IsStatus(a, "disbursed"));
            var referredToBanks = applications.Count(a => !string.IsNullOrWhiteSpace(a.Business?.Bank));
            var offersIssued = applications.Count(a => a.OfferIssuedOn.HasValue);

            return new SbpDashboardStatsViewModel
            {
                TotalApplications = totalApplications,
                ReferredToBanks = referredToBanks,
                OffersIssued = offersIssued,
                AcceptedOffers = acceptedOffers,
                Disbursed = disbursed,
                ConversionRate = Rate(acceptedOffers, totalApplications),
                BankBreakdown = bankGroups,
            };
        }

        public async Task<List<BankApplicationResponseViewModel>> GetAllApplicationsAsync()
        {
            var applications = await _applicationRepository.GetAllAsync();
            // Reuses BankApplicationService's own internal Map() - identical row shape to what
            // a Bank Officer sees for their own bank's applications, just not filtered down to
            // one bank. Never a second, divergent mapping of the same Application data.
            return applications.Select(BankApplicationService.Map).ToList();
        }

        public async Task<List<AdminUserViewModel>> GetAllUsersAsync()
        {
            // Three bulk queries total, regardless of how many users exist - never a
            // per-user query in a loop (no N+1).
            var users = await _userRepository.GetAllAsync();
            var rolesByUserId = await _userRepository.GetAllUserRoleNamesAsync();
            var businesses = await _businessRepository.GetAllAsync();
            var businessesByUserId = businesses.GroupBy(b => b.UserId).ToDictionary(g => g.Key, g => g.ToList());

            return users.Select(u =>
            {
                rolesByUserId.TryGetValue(u.Id, out var roles);
                businessesByUserId.TryGetValue(u.Id, out var userBusinesses);
                return MapUserRow(u, roles ?? new List<string>(), userBusinesses ?? new List<Models.Business>());
            }).ToList();
        }

        public async Task<AdminUserDetailViewModel> GetUserDetailAsync(int userId)
        {
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null) return null;

            var roles = await _userRepository.GetRoleNamesAsync(userId);
            // Reuses the exact same service methods the Applicant Portal itself calls for "my
            // businesses"/"my applications" - never a second, divergent implementation of what
            // this user owns.
            var businesses = await _businessService.GetMyBusinessesAsync(userId);
            var applications = await _applicationService.GetMyApplicationsAsync(userId);

            var documents = new List<AdminUserDocumentViewModel>();
            foreach (var application in applications)
            {
                if (!int.TryParse(application.Id, out var applicationId)) continue;
                // Reuses IDocumentService.GetDocumentsAsync exactly as the Applicant Portal's own
                // Application Details page calls it - passing the target user's id (not the
                // admin's) is what makes the existing ownership check inside it resolve
                // correctly for oversight purposes.
                var applicationDocuments = await _documentService.GetDocumentsAsync(userId, applicationId);
                if (applicationDocuments == null) continue;

                documents.AddRange(applicationDocuments.Select(d => new AdminUserDocumentViewModel
                {
                    ApplicationCaseId = application.CaseId,
                    DocumentType = d.DocumentType,
                    OriginalFileName = d.OriginalFileName,
                    Status = d.Status,
                    UploadedOn = d.UploadedOn,
                }));
            }

            var cnic = FirstNonEmpty(businesses.Select(b => b.OwnerCnic));
            var basic = new AdminUserViewModel
            {
                Id = user.Id.ToString(),
                FullName = user.FullName,
                Email = user.Email,
                Cnic = cnic ?? "Not Provided",
                UserType = FormatUserType(roles),
                AssignedBank = string.IsNullOrWhiteSpace(user.BankName) ? null : user.BankName,
                BusinessNames = string.Join(", ", businesses.Select(b => b.Name)),
                RegistrationDate = user.CreatedOn.ToString("yyyy-MM-dd"),
                AccountStatus = AccountStatusLabel(user),
                IsBlocked = user.IsBlocked,
                IsActive = user.IsActive,
                IsEmailVerified = user.IsEmailVerified,
                LastLogin = user.LastLogin.HasValue ? user.LastLogin.Value.ToString("yyyy-MM-dd HH:mm") : "Never",
            };

            return new AdminUserDetailViewModel
            {
                Basic = basic,
                Businesses = businesses,
                Applications = applications,
                Documents = documents,
                ActivitySummary = new AdminUserActivitySummaryViewModel
                {
                    BusinessCount = businesses.Count,
                    ApplicationCount = applications.Count,
                    DocumentCount = documents.Count,
                },
            };
        }

        public async Task<BankDetailViewModel> GetBankDetailAsync(string bankName)
        {
            if (string.IsNullOrWhiteSpace(bankName) || bankName == "Not Provided")
            {
                // "Not Provided" is a display-only bucket for businesses that skipped the
                // optional bank field, never a real bank - there is nothing to drill into.
                return null;
            }

            // Reuses the exact same repository query Bank Officers' own dashboard/queue already
            // call for "my bank's applications" (Services/BankApplicationService.cs) - never a
            // second, divergent query for the same data.
            var applications = await _applicationRepository.GetByBankNameAsync(bankName);
            if (applications.Count == 0) return null;

            var approved = applications.Count(a => IsStatus(a, "approved"));
            var disbursed = applications.Count(a => IsStatus(a, "disbursed"));

            // Two bulk queries (not per-officer) - same N+1-avoidance convention as
            // GetAllUsersAsync above.
            var users = await _userRepository.GetAllAsync();
            var rolesByUserId = await _userRepository.GetAllUserRoleNamesAsync();
            var officersCount = users.Count(u =>
                string.Equals(u.BankName, bankName, StringComparison.OrdinalIgnoreCase) &&
                rolesByUserId.TryGetValue(u.Id, out var roles) && roles.Contains("BankOfficer"));

            var monthlyStats = applications
                .GroupBy(a =>
                {
                    var d = a.SubmittedOn ?? a.CreatedOn;
                    return new DateTime(d.Year, d.Month, 1);
                })
                .OrderBy(g => g.Key)
                .Select(g => new BankMonthlyStatViewModel
                {
                    Month = g.Key.ToString("MMM yyyy"),
                    Applications = g.Count(),
                    Disbursed = g.Count(a => IsStatus(a, "disbursed")),
                })
                .ToList();

            return new BankDetailViewModel
            {
                Bank = bankName,
                OfficersCount = officersCount,
                FirstApplicationOn = applications.Min(a => a.CreatedOn).ToString("yyyy-MM-dd"),
                TotalApplications = applications.Count,
                UnderReview = applications.Count(a => IsStatus(a, "under_review")),
                Approved = approved,
                Rejected = applications.Count(a => IsStatus(a, "rejected")),
                OffersIssued = applications.Count(a => a.OfferIssuedOn.HasValue),
                AcceptedOffers = approved,
                Disbursed = disbursed,
                ApprovalRate = Rate(approved, applications.Count),
                DisbursementRate = Rate(disbursed, approved),
                TotalFinancedAmount = applications
                    .Where(a => IsStatus(a, "disbursed") && a.OfferApprovedAmount.HasValue)
                    .Sum(a => a.OfferApprovedAmount.Value),
                // Reuses BankApplicationService's own internal Map() (already made `internal` for
                // GetAllApplicationsAsync above) - the same row shape a Bank Officer sees for
                // their own queue, never a second mapping.
                RecentApplications = applications.Take(5).Select(BankApplicationService.Map).ToList(),
                PendingApplications = applications.Where(a => IsStatus(a, "under_review")).Select(BankApplicationService.Map).ToList(),
                MonthlyStats = monthlyStats,
            };
        }

        public async Task<AdminUserViewModel> SetUserStatusAsync(int actingAdminUserId, int targetUserId, string action)
        {
            if (string.IsNullOrWhiteSpace(action) || !AllowedUserActions.Contains(action))
            {
                throw new InvalidOperationException("Action must be one of: activate, deactivate, block, unblock.");
            }
            if (actingAdminUserId == targetUserId)
            {
                throw new InvalidOperationException("You cannot change the status of your own account.");
            }

            var user = await _userRepository.GetByIdAsync(targetUserId);
            if (user == null) return null;

            switch (action.ToLowerInvariant())
            {
                case "activate": user.IsActive = true; break;
                case "deactivate": user.IsActive = false; break;
                case "block": user.IsBlocked = true; break;
                case "unblock": user.IsBlocked = false; break;
            }
            user.UpdatedOn = DateTime.UtcNow;
            await _userRepository.SaveChangesAsync();

            var roles = await _userRepository.GetRoleNamesAsync(targetUserId);
            var businesses = await _businessRepository.GetByUserIdAsync(targetUserId);
            return MapUserRow(user, roles, businesses);
        }

        private static AdminUserViewModel MapUserRow(Models.ApplicationUser u, List<string> roles, List<Models.Business> businesses)
        {
            var cnic = FirstNonEmpty(businesses.Select(b => b.OwnerCnic));
            return new AdminUserViewModel
            {
                Id = u.Id.ToString(),
                FullName = u.FullName,
                Email = u.Email,
                Cnic = cnic ?? "Not Provided",
                UserType = FormatUserType(roles),
                AssignedBank = string.IsNullOrWhiteSpace(u.BankName) ? null : u.BankName,
                BusinessNames = string.Join(", ", businesses.Select(b => b.Name)),
                RegistrationDate = u.CreatedOn.ToString("yyyy-MM-dd"),
                AccountStatus = AccountStatusLabel(u),
                IsBlocked = u.IsBlocked,
                IsActive = u.IsActive,
                IsEmailVerified = u.IsEmailVerified,
                LastLogin = u.LastLogin.HasValue ? u.LastLogin.Value.ToString("yyyy-MM-dd HH:mm") : "Never",
            };
        }

        private static string AccountStatusLabel(Models.ApplicationUser u)
        {
            if (u.IsBlocked) return "Blocked";
            return u.IsActive ? "Active" : "Inactive";
        }

        private static string FormatUserType(List<string> roles)
        {
            if (roles == null || roles.Count == 0) return "Unassigned";
            return string.Join(" / ", roles.Select(FriendlyRoleName));
        }

        private static string FriendlyRoleName(string role)
        {
            switch (role)
            {
                case "BankOfficer": return "Bank Officer";
                case "SbpAdmin": return "SBP Admin";
                case "Applicant": return "Applicant";
                default: return role;
            }
        }

        private static string FirstNonEmpty(IEnumerable<string> values)
        {
            return values.FirstOrDefault(v => !string.IsNullOrWhiteSpace(v));
        }

        private static BankStatsViewModel MapBankStats(string bank, List<Models.Application> apps)
        {
            var applicationsReviewed = apps.Count;
            var approved = apps.Count(a => IsStatus(a, "approved"));
            var disbursed = apps.Count(a => IsStatus(a, "disbursed"));

            return new BankStatsViewModel
            {
                Bank = bank,
                ApplicationsReviewed = applicationsReviewed,
                ReferredToBanks = bank == "Not Provided" ? 0 : applicationsReviewed,
                OffersIssued = apps.Count(a => a.OfferIssuedOn.HasValue),
                Approved = approved,
                Disbursed = disbursed,
                ConversionRate = Rate(approved, applicationsReviewed),
                DisbursementRate = Rate(disbursed, approved),
            };
        }

        private static bool IsStatus(Models.Application application, string status)
        {
            return string.Equals(application.Status, status, StringComparison.OrdinalIgnoreCase);
        }

        // Rounded to 1 decimal place; 0 (not a divide-by-zero exception) when there's nothing
        // to compute a rate against yet.
        private static decimal Rate(int numerator, int denominator)
        {
            if (denominator <= 0) return 0m;
            return Math.Round((decimal)numerator / denominator * 100m, 1);
        }
    }
}
