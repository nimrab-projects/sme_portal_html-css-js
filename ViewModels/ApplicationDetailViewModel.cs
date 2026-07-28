using System.Collections.Generic;

namespace SmePortal.Web.ViewModels
{
    // Full Application Details page (Phase 8) - everything ApplicationResponseViewModel has,
    // plus Business/Applicant context and the real status-history timeline. Flat fields (not
    // nested Business/Applicant objects) to match this codebase's existing JSON conventions
    // (ApplicationResponseViewModel, BusinessResponseViewModel are both flat).
    public class ApplicationDetailViewModel
    {
        public string Id { get; set; }
        public string CaseId { get; set; }
        public string Status { get; set; }
        public int Stage { get; set; }
        public string Scheme { get; set; }
        public string PurposeOfFinance { get; set; }
        public string Amount { get; set; }
        public decimal RequestedAmount { get; set; }
        public string Bank { get; set; }
        public string SubmittedDate { get; set; }
        public string LastUpdatedDate { get; set; }

        public string BusinessSector { get; set; }
        public int BusinessAge { get; set; }
        public decimal MonthlyTurnover { get; set; }
        public int Employees { get; set; }

        public string BusinessId { get; set; }
        public string BusinessName { get; set; }
        public string BusinessNature { get; set; }
        public string BusinessNtn { get; set; }
        public string BusinessAddress { get; set; }
        public string BusinessContactPerson { get; set; }
        public string BusinessCellLandline { get; set; }
        public string BusinessEmail { get; set; }
        public string BusinessOwnerCnic { get; set; }
        public string BusinessStatus { get; set; }

        public string ApplicantName { get; set; }
        public string ApplicantEmail { get; set; }
        public string ApplicantMobile { get; set; }

        public List<ApplicationStatusHistoryViewModel> Timeline { get; set; } = new List<ApplicationStatusHistoryViewModel>();

        // No document-upload/storage endpoint exists yet (unchanged scope boundary from Phases
        // 6-7) - always an empty list, never fake entries.
        public List<object> Documents { get; set; } = new List<object>();
    }
}
