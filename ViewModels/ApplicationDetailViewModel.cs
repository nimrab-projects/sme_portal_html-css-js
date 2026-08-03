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
        // Phase 13 (Bank Portal) - Business.Iban/Premise, needed by the Bank Officer's
        // Financing Details/Business Information tabs. Additive only: the applicant-facing
        // GetApplicationDetailAsync doesn't set these (its own page already fetches Business
        // separately when it needs them), so nothing about the existing applicant Application
        // Details response changes.
        public string BusinessIban { get; set; }
        public string BusinessPremise { get; set; }

        public string ApplicantName { get; set; }
        public string ApplicantEmail { get; set; }
        public string ApplicantMobile { get; set; }

        public List<ApplicationStatusHistoryViewModel> Timeline { get; set; } = new List<ApplicationStatusHistoryViewModel>();

        // Phase 13 (Bank Portal): populated by GetApplicationDetailForBankAsync for the Bank
        // Officer's Documents tab (reuses DocumentService/ApplicationDocumentViewModel - no
        // second document representation invented). The applicant-facing
        // GetApplicationDetailAsync deliberately leaves this empty, exactly as before - that
        // page already fetches documents through its own dedicated endpoint
        // (js/api.js's listApplicationDocuments), so nothing about its existing behavior changes.
        public List<ApplicationDocumentViewModel> Documents { get; set; } = new List<ApplicationDocumentViewModel>();
    }
}
