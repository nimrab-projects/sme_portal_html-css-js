using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Threading.Tasks;
using System.Web;
using SmePortal.Web.Repositories;
using SmePortal.Web.ViewModels;

namespace SmePortal.Web.Services
{
    public class BankApplicationService : IBankApplicationService
    {
        private static readonly HashSet<string> AllowedStatuses =
            new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "under_review", "approved", "rejected" };

        private readonly IApplicationRepository _applicationRepository;
        private readonly IApplicationService _applicationService;
        private readonly IDocumentRepository _documentRepository;
        private readonly IDocumentService _documentService;
        private readonly INotificationService _notificationService;

        public BankApplicationService(IApplicationRepository applicationRepository, IApplicationService applicationService,
            IDocumentRepository documentRepository, IDocumentService documentService, INotificationService notificationService)
        {
            _applicationRepository = applicationRepository;
            _applicationService = applicationService;
            _documentRepository = documentRepository;
            _documentService = documentService;
            _notificationService = notificationService;
        }

        public async Task<List<BankApplicationResponseViewModel>> GetAssignedApplicationsAsync(string bankName)
        {
            var applications = await _applicationRepository.GetByBankNameAsync(bankName);
            return applications.Select(Map).ToList();
        }

        public async Task<BankDashboardStatsViewModel> GetDashboardStatsAsync(string bankName)
        {
            var applications = await _applicationRepository.GetByBankNameAsync(bankName);
            var applicationIds = applications.Select(a => a.ApplicationId).ToList();

            var documentsPending = await _documentRepository.CountPendingByApplicationIdsAsync(applicationIds);

            return new BankDashboardStatsViewModel
            {
                TotalAssigned = applications.Count,
                UnderReview = applications.Count(a => string.Equals(a.Status, "under_review", StringComparison.OrdinalIgnoreCase)),
                Approved = applications.Count(a => string.Equals(a.Status, "approved", StringComparison.OrdinalIgnoreCase)),
                Rejected = applications.Count(a => string.Equals(a.Status, "rejected", StringComparison.OrdinalIgnoreCase)),
                DocumentsPending = documentsPending,
                RecentApplications = applications.Take(5).Select(Map).ToList(),
            };
        }

        public async Task<ApplicationDetailViewModel> UpdateStatusAsync(
            string bankName, int officerUserId, int applicationId, string newStatus, string remarks)
        {
            if (string.IsNullOrWhiteSpace(newStatus) || !AllowedStatuses.Contains(newStatus))
            {
                throw new InvalidOperationException("Status must be one of: under_review, approved, rejected.");
            }

            // Reuses the exact same ownership check (assigned to my bank) the detail/documents
            // endpoints already use - never a second, divergent authorization rule.
            var detail = await _applicationService.GetApplicationDetailForBankAsync(bankName, applicationId);
            if (detail == null) return null;

            var application = await _applicationRepository.GetByIdAsync(applicationId);
            if (application == null) return null;

            var now = DateTime.UtcNow;
            var normalizedStatus = newStatus.ToLowerInvariant();
            application.Status = normalizedStatus;
            application.UpdatedOn = now;
            await _applicationRepository.SaveChangesAsync();

            await _applicationRepository.AddStatusHistoryAsync(new Models.ApplicationStatusHistory
            {
                ApplicationId = applicationId,
                Status = normalizedStatus,
                Note = string.IsNullOrWhiteSpace(remarks) ? null : remarks.Trim(),
                ChangedByUserId = officerUserId,
                CreatedOn = now,
            });

            var applicantUserId = await _applicationService.GetOwnerUserIdAsync(applicationId);
            if (applicantUserId.HasValue)
            {
                var statusLabel = StatusLabel(normalizedStatus);
                var message = $"Your application {detail.CaseId} status has been updated to {statusLabel}." +
                    (string.IsNullOrWhiteSpace(remarks) ? "" : $" Remarks: {remarks.Trim()}");
                await _notificationService.CreateNotificationAsync(
                    applicantUserId.Value, "Application Status Updated", message,
                    "ApplicationStatusChanged", applicationId, "Application", officerUserId);
            }

            return await _applicationService.GetApplicationDetailForBankAsync(bankName, applicationId);
        }

        public async Task<ApplicationDetailViewModel> IssueOfferAsync(
            string bankName, int officerUserId, int applicationId, decimal approvedAmount, string markupRate,
            string tenor, string monthlyInstallment, string processingFee, DateTime? expiryDate,
            string disbursementTimeline, HttpPostedFileBase file)
        {
            var detail = await _applicationService.GetApplicationDetailForBankAsync(bankName, applicationId);
            if (detail == null) return null;

            if (!string.Equals(detail.Status, "under_review", StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException("A conditional offer can only be issued while an application is under review.");
            }
            if (approvedAmount <= 0)
            {
                throw new InvalidOperationException("Approved amount must be greater than zero.");
            }
            if (string.IsNullOrWhiteSpace(markupRate) || string.IsNullOrWhiteSpace(tenor))
            {
                throw new InvalidOperationException("Markup rate and tenor are required.");
            }

            // Validates/saves the file and creates the ApplicationDocument row first - if the
            // file itself is invalid (wrong type, too large, missing), this throws before any
            // Application field is touched, so a bad upload never leaves the application
            // half-updated.
            var document = await _documentService.UploadOfferDocumentForBankAsync(bankName, officerUserId, applicationId, file);

            var application = await _applicationRepository.GetByIdAsync(applicationId);
            var now = DateTime.UtcNow;
            application.OfferApprovedAmount = approvedAmount;
            application.OfferMarkupRate = markupRate.Trim();
            application.OfferTenor = tenor.Trim();
            application.OfferMonthlyInstallment = string.IsNullOrWhiteSpace(monthlyInstallment) ? null : monthlyInstallment.Trim();
            application.OfferProcessingFee = string.IsNullOrWhiteSpace(processingFee) ? null : processingFee.Trim();
            application.OfferExpiryDate = expiryDate;
            application.OfferDisbursementTimeline = string.IsNullOrWhiteSpace(disbursementTimeline) ? null : disbursementTimeline.Trim();
            application.OfferDocumentId = int.Parse(document.Id);
            application.OfferIssuedOn = now;
            application.Status = "offer_issued";
            application.UpdatedOn = now;
            await _applicationRepository.SaveChangesAsync();

            await _applicationRepository.AddStatusHistoryAsync(new Models.ApplicationStatusHistory
            {
                ApplicationId = applicationId,
                Status = "offer_issued",
                Note = $"Conditional offer issued: PKR {approvedAmount:N0} at {markupRate.Trim()}, {tenor.Trim()}.",
                ChangedByUserId = officerUserId,
                CreatedOn = now,
            });

            var applicantUserId = await _applicationService.GetOwnerUserIdAsync(applicationId);
            if (applicantUserId.HasValue)
            {
                await _notificationService.CreateNotificationAsync(
                    applicantUserId.Value, "Conditional Offer Issued",
                    $"{detail.Bank} has issued a conditional financing offer for {detail.CaseId}. Review and accept or decline it on the SME Portal.",
                    "OfferIssued", applicationId, "Application", officerUserId);
            }

            return await _applicationService.GetApplicationDetailForBankAsync(bankName, applicationId);
        }

        private static readonly HashSet<string> AllowedRequestInfoTypes =
            new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "documents", "info" };

        public async Task<bool> RequestInfoAsync(
            string bankName, int officerUserId, int applicationId, string requestType, List<string> messages)
        {
            if (string.IsNullOrWhiteSpace(requestType) || !AllowedRequestInfoTypes.Contains(requestType))
            {
                throw new InvalidOperationException("Request type must be either 'documents' or 'info'.");
            }
            var cleanMessages = (messages ?? new List<string>())
                .Select(m => (m ?? "").Trim())
                .Where(m => !string.IsNullOrWhiteSpace(m))
                .ToList();
            if (cleanMessages.Count == 0)
            {
                throw new InvalidOperationException("At least one message is required.");
            }

            var detail = await _applicationService.GetApplicationDetailForBankAsync(bankName, applicationId);
            if (detail == null) return false;

            var applicantUserId = await _applicationService.GetOwnerUserIdAsync(applicationId);
            if (!applicantUserId.HasValue) return false;

            var normalizedType = requestType.ToLowerInvariant();
            var title = normalizedType == "documents" ? "Document Required" : "Information Requested";
            var joinedMessages = string.Join("; ", cleanMessages.Select(m => $"\"{m}\""));
            var message = $"{bankName} requested {(normalizedType == "documents" ? "document(s)" : "information")} for {detail.CaseId}: {joinedMessages}";

            await _notificationService.CreateNotificationAsync(
                applicantUserId.Value, title, message,
                normalizedType == "documents" ? "DocumentRequested" : "InfoRequested",
                applicationId, "Application", officerUserId);

            return true;
        }

        private static string StatusLabel(string status)
        {
            switch (status)
            {
                case "under_review": return "Under Review";
                case "approved": return "Approved";
                case "rejected": return "Rejected";
                default: return status;
            }
        }

        // Internal (not private) so SbpAdminService can reuse this exact same row shape for its
        // own system-wide Applications list (Phase 2 sync) instead of a second, duplicate
        // mapping - the two lists are the same real data, just scoped differently (one bank vs
        // every bank), so the row-shaping logic must not diverge between them.
        internal static BankApplicationResponseViewModel Map(Models.Application a)
        {
            return new BankApplicationResponseViewModel
            {
                Id = a.ApplicationId.ToString(),
                CaseId = a.CaseId,
                Business = a.Business?.Name ?? "",
                Scheme = a.Scheme,
                Amount = a.Amount,
                Submitted = (a.SubmittedOn ?? a.CreatedOn).ToString("MMM d", CultureInfo.InvariantCulture),
                Status = a.Status,
                ApplicantName = a.Business?.User?.FullName ?? "",
                BusinessBank = string.IsNullOrWhiteSpace(a.Business?.Bank) ? "Not Provided" : a.Business.Bank,
                RequestedAmount = a.RequestedAmount,
                BusinessId = a.BusinessId.ToString(),
            };
        }
    }
}
