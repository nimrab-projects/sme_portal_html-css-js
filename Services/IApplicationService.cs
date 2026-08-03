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

        // Phase 13 (Bank Portal) - same shape, scoped to "belongs to my bank" instead of
        // "belongs to me". Null for both "doesn't exist" and "assigned to a different bank".
        Task<ApplicationDetailViewModel> GetApplicationDetailForBankAsync(string bankName, int applicationId);

        // Phase 13 (Bank Portal) - resolves Application -> Business -> UserId directly, for
        // callers (DocumentService, BankApplicationService) that need to notify the actual
        // applicant after a bank-side action, without re-deriving the join themselves. Null if
        // the application doesn't exist.
        Task<int?> GetOwnerUserIdAsync(int applicationId);

        // Phase 14 (Conditional Offer). Null when the application doesn't belong to this user,
        // OR no offer has ever been issued for it (OfferIssuedOn is null) - same "don't
        // distinguish the reasons" 404 rule as GetApplicationDetailAsync.
        Task<ApplicationOfferViewModel> GetOfferAsync(int userId, int applicationId);

        // decision is "accept" | "decline" - throws InvalidOperationException for an invalid
        // decision value or if the application isn't currently awaiting one (Status must be
        // "offer_issued"). Sets Status to "approved"/"rejected", the same real, final statuses
        // the Bank Portal's own direct Accept/Decline already produce - an applicant-driven
        // offer decision is just a second, applicant-side path to the exact same status column,
        // never a parallel/duplicate status concept.
        Task<ApplicationDetailViewModel> DecideOfferAsync(int userId, int applicationId, string decision, string reason);
    }
}
