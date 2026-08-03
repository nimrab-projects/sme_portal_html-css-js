using System.Collections.Generic;
using System.Threading.Tasks;
using SmePortal.Web.Models;

namespace SmePortal.Web.Repositories
{
    public interface IBusinessRepository
    {
        Task<int> CountByUserIdAsync(int userId);
        Task<List<Business>> GetByUserIdAsync(int userId);
        Task<Business> AddAsync(Business business);

        // Phase 10 (Profile & Business Profile Management):
        Task<Business> GetByIdAsync(int businessId);
        Task SaveChangesAsync();

        // Phase 12 (Multiple Business Management). Cascades to the business's Shareholder rows
        // (existing FK cascade-delete mapping) - callers must verify there are no Application
        // rows referencing this business first, since that relationship also cascades and this
        // method does not re-check it itself.
        Task DeleteAsync(Business business);

        // Replaces the full shareholder set for a business in one operation (delete-all-then-
        // insert-fresh) - the simplest correct strategy for "submit the whole list again",
        // since the client has no stable shareholder IDs to diff against and shareholder rows
        // carry no identity of their own beyond belonging to this business.
        Task ReplaceShareholdersAsync(int businessId, List<Shareholder> newShareholders);

        // SBP Admin Portal sync (Phase 3 - User Management) - every business system-wide, in
        // one query, so the user list can derive each user's CNIC/business names/bank in bulk
        // (grouped by UserId in the service layer) instead of calling GetByUserIdAsync in a
        // loop (N+1).
        Task<List<Business>> GetAllAsync();
    }
}
