using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmePortal.Web.Models
{
    // Deliberately minimal for Phase 6 (Dashboard business/application logic): just enough
    // fields to back the Dashboard's stat cards, the recent-applications table, and My
    // Applications' list/search/filter - all of which already exist unmodified in
    // js/pages/sme/dashboard.js and js/pages/sme/myApplications.js and already expect exactly
    // this shape. ApplicationFacility/ApplicationDocument (the New Application wizard's
    // multi-step data) are a separate, larger phase - not built here.
    //
    // Queried by BusinessId, never directly by UserId (per this phase's spec) - "my
    // applications" is always: my business IDs -> applications where BusinessId in (...).
    [Table("Application")]
    public class Application
    {
        public int ApplicationId { get; set; }

        [Required]
        public int BusinessId { get; set; }
        [ForeignKey("BusinessId")]
        public virtual Business Business { get; set; }

        [Required, MaxLength(30)]
        public string CaseId { get; set; }

        [MaxLength(150)]
        public string Scheme { get; set; }

        [MaxLength(30)]
        public string Amount { get; set; }

        // Deliberately NO Bank column here. There is no separate "assigned bank" workflow in
        // this system - the only bank that exists anywhere is the one the applicant selected on
        // their Business Profile (Business.Bank). A separate Application.Bank column used to
        // exist and was always populated with a hardcoded literal ("HBL") by the frontend's
        // submit call - a real, reported bug, not a real second bank concept. Removed rather
        // than fixed-in-place so there is exactly one place a bank value can ever be stored
        // (single source of truth) - every page reads Business.Bank via Application.Business.

        // Matches the exact status vocabulary already used throughout the existing frontend
        // (dashboard.js/myApplications.js's STATUS_CONFIG): draft, submitted, under_review,
        // approved, rejected, disbursed. Not redesigned to a simpler Pending/Approved/Rejected
        // set, since that would require changing the existing UI's status badges/filters.
        // A newly submitted application is already waiting on the bank/SBP, so it starts at
        // "under_review" (see ApplicationService.SubmitApplicationAsync) - "submitted" remains
        // a valid historical value on rows created before this change, never rewritten.
        [Required, MaxLength(30)]
        public string Status { get; set; } = "under_review";

        public int Stage { get; set; } = 1;

        // Phase 7 (Finance Application Module) additions below. The validated numeric amount -
        // Amount stays a display-formatted string (existing frontend contract, e.g. "PKR
        // 8,500,000"), RequestedAmount is the real source of truth used for validation
        // (> 0) and any future numeric reporting.
        public decimal RequestedAmount { get; set; }

        // "Type of Facility" from the existing New Application wizard (newApplication.js) -
        // the frontend doesn't have a separate scheme-selection UI, so this intentionally
        // mirrors Scheme for now rather than inventing a second, undistinguished input.
        [MaxLength(300)]
        public string PurposeOfFinance { get; set; }

        // Snapshotted from the selected Business at submission time (Nature/YearEstablished/
        // AnnualSales/Employees), so a historical application record stays accurate even if the
        // business's profile is edited later. Not re-collected via new form fields.
        [MaxLength(50)]
        public string BusinessSector { get; set; }
        public int BusinessAge { get; set; }
        public decimal MonthlyTurnover { get; set; }
        public int Employees { get; set; }

        // Audit only ("Created By") - ownership is still resolved exclusively via
        // BusinessId -> Business.UserId (see ApplicationService), never queried by this column.
        public int SubmittedByUserId { get; set; }

        public DateTime? SubmittedOn { get; set; }
        public DateTime CreatedOn { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedOn { get; set; }

        public virtual ICollection<ApplicationStatusHistory> StatusHistory { get; set; } = new List<ApplicationStatusHistory>();
        public virtual ICollection<ApplicationDocument> Documents { get; set; } = new List<ApplicationDocument>();

        // Conditional Offer (Phase 14). Real terms entered by the bank officer when issuing a
        // conditional offer (Bank Portal's Credit Assessment) - free-form display strings
        // matching exactly what the Offer Letter page needs to show, not new structured
        // financial fields. OfferApprovedAmount is the one true numeric value (may differ from
        // the applicant's own RequestedAmount). OfferDocumentId is a plain soft reference to an
        // ApplicationDocument row (DocumentType "ConditionalOfferLetter") - no EF navigation
        // property, to avoid a second, ambiguous relationship between these two entity types
        // alongside the existing Application -> Documents collection.
        public decimal? OfferApprovedAmount { get; set; }
        [MaxLength(100)]
        public string OfferMarkupRate { get; set; }
        [MaxLength(100)]
        public string OfferTenor { get; set; }
        [MaxLength(100)]
        public string OfferMonthlyInstallment { get; set; }
        [MaxLength(100)]
        public string OfferProcessingFee { get; set; }
        public DateTime? OfferExpiryDate { get; set; }
        [MaxLength(200)]
        public string OfferDisbursementTimeline { get; set; }
        public DateTime? OfferIssuedOn { get; set; }
        public int? OfferDocumentId { get; set; }
    }
}
