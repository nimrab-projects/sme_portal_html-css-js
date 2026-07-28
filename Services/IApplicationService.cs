using System.Collections.Generic;
using System.Threading.Tasks;
using SmePortal.Web.ViewModels;

namespace SmePortal.Web.Services
{
    public interface IApplicationService
    {
        // Loads every business the user owns, then every application belonging to those
        // businesses - never a direct Application.UserId lookup (there isn't one).
        Task<List<ApplicationResponseViewModel>> GetMyApplicationsAsync(int userId);

        Task<ApplicationResponseViewModel> SubmitApplicationAsync(int userId, SubmitApplicationRequestViewModel model);

        // Returns null when the application doesn't exist OR belongs to a different user's
        // business - the controller turns that into a 404, never distinguishing the two cases
        // (Phase 8's security requirement: never reveal whether another applicant's ID exists).
        Task<ApplicationDetailViewModel> GetApplicationDetailAsync(int userId, int applicationId);
    }
}
