using System.Collections.Generic;
using System.Threading.Tasks;
using SmePortal.Web.ViewModels;

namespace SmePortal.Web.Services
{
    public interface IBusinessService
    {
        Task<BusinessResponseViewModel> SaveBusinessAsync(int userId, SaveBusinessRequestViewModel model);
        Task<List<BusinessResponseViewModel>> GetMyBusinessesAsync(int userId);
        Task<bool> HasAnyBusinessAsync(int userId);

        // Phase 10 (Profile & Business Profile Management). Null means "doesn't exist or isn't
        // yours" - same 404-worthy convention as IApplicationService.GetApplicationDetailAsync.
        Task<BusinessResponseViewModel> GetPrimaryBusinessAsync(int userId);

        // Phase 12 (Multiple Business Management). Null means "doesn't exist or isn't yours".
        Task<BusinessResponseViewModel> GetBusinessByIdAsync(int userId, int businessId);

        // Phase 12. Returns false for "not found/not yours" (404). Throws
        // InvalidOperationException if the business has applications on record (delete blocked).
        Task<bool> DeleteBusinessAsync(int userId, int businessId);

        // Returns null for "not found/not yours" (never silently succeeds against another
        // user's business); throws InvalidOperationException for shareholder total > 100%.
        Task<BusinessResponseViewModel> UpdateBusinessAsync(int userId, int businessId, SaveBusinessRequestViewModel model);
    }
}
