using System.Collections.Generic;
using System.Threading.Tasks;

namespace SmePortal.Web.Repositories
{
    public interface IApplicationRepository
    {
        // Deliberately takes business IDs, never a UserId - "my applications" is always
        // computed as (my business IDs) -> (applications where BusinessId in those IDs),
        // never a direct Application.UserId column (there isn't one).
        Task<List<Models.Application>> GetByBusinessIdsAsync(IEnumerable<int> businessIds);

        // Includes Business and StatusHistory - used by Details/Tracking, which need the full
        // record plus its audit trail in a single query (Phase 8 performance requirement).
        Task<Models.Application> GetByIdAsync(int applicationId);

        Task<Models.Application> AddAsync(Models.Application application);

        // Lets the service assign the identity-derived reference number (CaseId) after the
        // first save and persist it with a second, explicit save - see ApplicationService.
        Task SaveChangesAsync();

        Task AddStatusHistoryAsync(Models.ApplicationStatusHistory history);

        // Phase 12 (Multiple Business Management) - backs BusinessService.DeleteBusinessAsync's
        // "never delete a business with applications on record" rule.
        Task<int> CountByBusinessIdAsync(int businessId);
    }
}
