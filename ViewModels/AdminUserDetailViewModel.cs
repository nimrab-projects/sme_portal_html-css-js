using System.Collections.Generic;

namespace SmePortal.Web.ViewModels
{
    // One uploaded document, tagged with which application it belongs to - since a user's
    // detail view spans every one of their applications' documents at once, unlike the
    // Applicant/Bank Portal's own document lists (which are always scoped to one application
    // already known from the page context).
    public class AdminUserDocumentViewModel
    {
        public string ApplicationCaseId { get; set; }
        public string DocumentType { get; set; }
        public string OriginalFileName { get; set; }
        public string Status { get; set; }
        public string UploadedOn { get; set; }
    }

    public class AdminUserActivitySummaryViewModel
    {
        public int BusinessCount { get; set; }
        public int ApplicationCount { get; set; }
        public int DocumentCount { get; set; }
    }

    // SBP Admin Portal sync (Phase 3 - User Management). Every list here is built by reusing the
    // exact same services the Applicant/Bank Portal already call for themselves
    // (IBusinessService.GetMyBusinessesAsync, IApplicationService.GetMyApplicationsAsync,
    // IDocumentService.GetDocumentsAsync) - see Services/SbpAdminService.cs's GetUserDetailAsync -
    // never a second, parallel implementation of "what does this user own".
    public class AdminUserDetailViewModel
    {
        public AdminUserViewModel Basic { get; set; }
        public List<BusinessResponseViewModel> Businesses { get; set; } = new List<BusinessResponseViewModel>();
        public List<ApplicationResponseViewModel> Applications { get; set; } = new List<ApplicationResponseViewModel>();
        public List<AdminUserDocumentViewModel> Documents { get; set; } = new List<AdminUserDocumentViewModel>();
        public AdminUserActivitySummaryViewModel ActivitySummary { get; set; }
    }
}
