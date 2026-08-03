using System.Collections.Generic;
using System.Threading.Tasks;

namespace SmePortal.Web.Repositories
{
    public interface IDocumentRepository
    {
        Task<List<Models.ApplicationDocument>> GetByApplicationIdAsync(int applicationId);

        // Scoped to a specific application (not just DocumentId) so a caller can never load a
        // document belonging to a different application by guessing its id - the ownership
        // check (Application -> Business -> UserId) still happens one level up in
        // DocumentService, but this repository method itself never returns a cross-application
        // result even if misused.
        Task<Models.ApplicationDocument> GetByIdAsync(int applicationId, int documentId);

        Task<Models.ApplicationDocument> GetByApplicationAndTypeAsync(int applicationId, string documentType);

        Task<Models.ApplicationDocument> AddAsync(Models.ApplicationDocument document);

        Task DeleteAsync(Models.ApplicationDocument document);

        Task SaveChangesAsync();

        // Phase 13 (Bank Portal) - backs the Bank Dashboard's "Documents Pending" stat: how many
        // uploaded documents, across all of this bank's assigned applications, are still
        // awaiting a Verify/Reject decision.
        Task<int> CountPendingByApplicationIdsAsync(IEnumerable<int> applicationIds);

        // SBP Admin Portal sync - same pending-document count as above, but broken down per
        // application so a caller (SbpAdminService) can re-group it per bank without a second,
        // duplicate query per bank.
        Task<Dictionary<int, int>> GetPendingCountsByApplicationIdAsync(IEnumerable<int> applicationIds);
    }
}
