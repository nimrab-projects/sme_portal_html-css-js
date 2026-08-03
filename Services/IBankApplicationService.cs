using System;
using System.Threading.Tasks;
using System.Web;
using SmePortal.Web.ViewModels;

namespace SmePortal.Web.Services
{
    // Phase 13 (Bank Portal). Every method here is scoped by bankName (Business.Bank) - a Bank
    // Officer only ever sees/acts on applications assigned to their own bank, enforced the same
    // "resolve ownership server-side, never trust a client id" way the applicant side already
    // does for Application -> Business -> UserId.
    public interface IBankApplicationService
    {
        Task<BankDashboardStatsViewModel> GetDashboardStatsAsync(string bankName);

        Task<System.Collections.Generic.List<BankApplicationResponseViewModel>> GetAssignedApplicationsAsync(string bankName);

        // Returns null if the application doesn't exist or isn't assigned to this bank (404).
        // Throws InvalidOperationException for a disallowed status value (400) - same "404 vs
        // 400" split as every other mutating action in this codebase.
        Task<ApplicationDetailViewModel> UpdateStatusAsync(
            string bankName, int officerUserId, int applicationId, string newStatus, string remarks);

        // Phase 14 (Conditional Offer). Only allowed while the application is "under_review" -
        // throws InvalidOperationException otherwise (an offer can't be issued twice, nor on an
        // already-resolved application). Sets the real Application.Status to "offer_issued" and
        // saves the uploaded PDF via IDocumentService - the applicant then Accepts/Declines it
        // via IApplicationService.DecideOfferAsync, which is what finally produces "approved"/
        // "rejected". Null means "not assigned to this bank" (404).
        Task<ApplicationDetailViewModel> IssueOfferAsync(
            string bankName, int officerUserId, int applicationId, decimal approvedAmount, string markupRate,
            string tenor, string monthlyInstallment, string processingFee, DateTime? expiryDate,
            string disbursementTimeline, HttpPostedFileBase file);

        // "Request More Information" (Application Queue's own action, previously a client-only
        // addNotification() call in js/pages/bank/portal.js that never left the officer's own
        // browser tab). requestType is "documents" | "info"; messages is the list of free-text
        // requests entered in that modal. Creates a real Notification for the actual applicant -
        // null means "not assigned to this bank" (404), throws InvalidOperationException for a
        // bad requestType or an empty messages list (400).
        Task<bool> RequestInfoAsync(
            string bankName, int officerUserId, int applicationId, string requestType,
            System.Collections.Generic.List<string> messages);
    }
}
