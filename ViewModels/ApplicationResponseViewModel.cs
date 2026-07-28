namespace SmePortal.Web.ViewModels
{
    // Shape matches js/state.js's SAMPLE_APPS entries exactly (id as string, same field
    // names) so dashboard.js/myApplications.js keep working completely unmodified once real
    // applications replace the seed data. Phase 7 fields (purposeOfFinance/businessSector/
    // businessAge/monthlyTurnover/employees) are additive - the existing frontend simply
    // ignores JSON fields it doesn't read.
    public class ApplicationResponseViewModel
    {
        public string Id { get; set; }
        public string CaseId { get; set; }
        public string BusinessName { get; set; }
        public string Scheme { get; set; }
        public string Amount { get; set; }
        public string Status { get; set; }
        public string Bank { get; set; }
        public string SubmittedDate { get; set; }
        public string LastUpdatedDate { get; set; }
        public int Stage { get; set; }

        public string PurposeOfFinance { get; set; }
        public string BusinessSector { get; set; }
        public int BusinessAge { get; set; }
        public decimal MonthlyTurnover { get; set; }
        public int Employees { get; set; }
    }
}
