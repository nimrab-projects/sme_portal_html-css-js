using System.Collections.Generic;
using System.Threading.Tasks;
using System.Web;
using SmePortal.Web.ViewModels;

namespace SmePortal.Web.Services
{
    // Result of a successful download lookup - the controller streams PhysicalPath under
    // OriginalFileName/ContentType. Never constructed for a missing/not-owned document (the
    // service returns null instead, same "null means 404, never throw" convention as
    // ApplicationService.GetApplicationDetailAsync).
    public class DocumentDownloadInfo
    {
        public string PhysicalPath { get; set; }
        public string OriginalFileName { get; set; }
        public string ContentType { get; set; }
    }

    public interface IDocumentService
    {
        // Returns null if the application doesn't exist or doesn't belong to this user -
        // callers turn that into a 404, same convention as IApplicationService.
        Task<List<ApplicationDocumentViewModel>> GetDocumentsAsync(int userId, int applicationId);

        Task<ApplicationDocumentViewModel> UploadAsync(int userId, int applicationId, string documentType, HttpPostedFileBase file);

        Task<ApplicationDocumentViewModel> ReplaceAsync(int userId, int applicationId, int documentId, HttpPostedFileBase file);

        // False means "not found / not yours" (404). A disallowed-by-status delete throws
        // InvalidOperationException instead (400 with a clear message) - same "404 vs 400"
        // split as every other mutating action in this codebase.
        Task<bool> DeleteAsync(int userId, int applicationId, int documentId);

        Task<DocumentDownloadInfo> GetDownloadInfoAsync(int userId, int applicationId, int documentId);

        // Phase 13 (Bank Portal) - Bank Officer document review. Ownership is "assigned to my
        // bank" (via IApplicationService.GetApplicationDetailForBankAsync), never "uploaded by
        // me" - officers view/verify/reject documents they never uploaded themselves.
        Task<List<ApplicationDocumentViewModel>> GetDocumentsForBankAsync(string bankName, int applicationId);

        Task<DocumentDownloadInfo> GetDownloadInfoForBankAsync(string bankName, int applicationId, int documentId);

        // newStatus must be "verified" or "rejected" - anything else throws
        // InvalidOperationException (400), same "404 vs 400" convention as DeleteAsync above.
        Task<ApplicationDocumentViewModel> UpdateStatusForBankAsync(string bankName, int applicationId, int documentId, string newStatus, string remarks);

        // Phase 14 (Conditional Offer). Saves the bank officer's uploaded PDF as a regular
        // ApplicationDocument (DocumentType "ConditionalOfferLetter", pre-marked "verified" -
        // it's bank-authored, not something awaiting the bank's own verification) - reusing the
        // exact same storage/ownership plumbing as every other document, not a new upload path.
        // If one was already issued for this application, replaces it (re-issuing an offer)
        // rather than accumulating duplicates. Null means "not assigned to this bank" (404).
        Task<ApplicationDocumentViewModel> UploadOfferDocumentForBankAsync(string bankName, int officerUserId, int applicationId, HttpPostedFileBase file);
    }
}
