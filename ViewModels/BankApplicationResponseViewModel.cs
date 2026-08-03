namespace SmePortal.Web.ViewModels
{
    // Phase 13 (Bank Portal) - shape matches js/state.js's SAMPLE_BANK_APPLICATIONS entries
    // exactly (id, caseId, business, scheme, amount, submitted, status, risk) so
    // js/pages/bank/portal.js's existing queue list/dashboard table keep working completely
    // unmodified once real data replaces the seed. Extra fields below are additive - the
    // existing frontend simply ignores JSON fields it doesn't read (same convention
    // ApplicationResponseViewModel already established for the applicant side).
    public class BankApplicationResponseViewModel
    {
        public string Id { get; set; }
        public string CaseId { get; set; }
        public string Business { get; set; }
        public string Scheme { get; set; }
        public string Amount { get; set; }
        public string Submitted { get; set; }
        public string Status { get; set; }
        // No real risk-scoring model exists anywhere in this system - not a stated requirement
        // for this phase either. Defaulted to a fixed neutral value purely so the existing
        // frontend's risk badge/composition chart (built against this field) keeps rendering
        // without fabricating a fake AI/credit-scoring result.
        public string Risk { get; set; } = "Medium";

        // Additive - explicit requirements from this phase's spec ("Applicant Name, Business
        // Name, Business Bank, Requested Amount") not covered by the fields above.
        public string ApplicantName { get; set; }
        public string BusinessBank { get; set; }
        public decimal RequestedAmount { get; set; }
        public string BusinessId { get; set; }
    }
}
