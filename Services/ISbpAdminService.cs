using System.Collections.Generic;
using System.Threading.Tasks;
using SmePortal.Web.ViewModels;

namespace SmePortal.Web.Services
{
    // SBP Admin Portal sync. Unlike IBankApplicationService, nothing here is scoped by bank name
    // - an SBP Administrator has real oversight across every bank, so every method reads the
    // full, system-wide data set via the exact same IApplicationRepository every other portal
    // already uses.
    public interface ISbpAdminService
    {
        Task<SbpDashboardStatsViewModel> GetDashboardStatsAsync();

        // Phase 2 sync (Applications page) - the same real Application rows Bank Portal's own
        // queue shows, just unscoped by bank. Reuses BankApplicationService's own row-shaping
        // (BankApplicationResponseViewModel/its internal Map method) rather than a second,
        // divergent mapping for what is the same underlying data.
        Task<List<BankApplicationResponseViewModel>> GetAllApplicationsAsync();

        // Phase 3 sync (User Management) - every real user in the system (Applicant, Bank
        // Officer, SBP Admin alike), one row each, built from the exact same Users/Roles/
        // Business tables every other portal already reads.
        Task<List<AdminUserViewModel>> GetAllUsersAsync();

        // Null means "no such user" (404) - never throws for a merely-empty businesses/
        // applications list (a brand-new user legitimately has none yet).
        Task<AdminUserDetailViewModel> GetUserDetailAsync(int userId);

        // action is "activate" | "deactivate" | "block" | "unblock". Never deletes anything -
        // only flips IsActive/IsBlocked. Throws InvalidOperationException for a bad action
        // value or if the admin targets their own account (a safety guard, not something an
        // admin should ever do to themselves). Null means "no such user" (404).
        Task<AdminUserViewModel> SetUserStatusAsync(int actingAdminUserId, int targetUserId, string action);

        // Executive Dashboard's Bank Performance Overview row-click drill-down. Null means
        // either the bank name is the "Not Provided" bucket (not a real bank) or no applications
        // exist for it yet (404) - never a partially-populated fake result.
        Task<BankDetailViewModel> GetBankDetailAsync(string bankName);
    }
}
