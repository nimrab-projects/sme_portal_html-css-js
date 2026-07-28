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
    }
}
