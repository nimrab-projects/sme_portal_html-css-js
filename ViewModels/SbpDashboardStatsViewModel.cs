using System.Collections.Generic;

namespace SmePortal.Web.ViewModels
{
    public class SbpDashboardStatsViewModel
    {
        // COUNT(*) across every Application row, system-wide.
        public int TotalApplications { get; set; }

        // Applications whose business actually has a bank on file (Business.Bank) - a business
        // can skip that (optional) field, in which case its application was never actually
        // referred to any bank for review. Real, derived from the same Business.Bank column
        // Bank Portal itself is scoped by (Services/BankApplicationService.cs), not a new concept.
        public int ReferredToBanks { get; set; }

        // COUNT of applications where OfferIssuedOn is set - i.e. a conditional offer was ever
        // issued for it (Services/BankApplicationService.cs's IssueOfferAsync), regardless of
        // whether it was later accepted/declined. Deliberately NOT "current status ==
        // offer_issued" - that would undercount by excluding every offer that has since been
        // accepted or declined.
        public int OffersIssued { get; set; }

        // COUNT(Status == "approved") - the applicant's own real acceptance of a conditional
        // offer (Services/ApplicationService.cs's DecideOfferAsync) is what sets this status, so
        // "Accepted Offers" and "Approved" are the same real event in this system, not two
        // different metrics needing separate tracking.
        public int AcceptedOffers { get; set; }

        // COUNT(Status == "disbursed") - see BankStatsViewModel's own comment: a real, valid
        // status this system has always recognized, honestly 0 until a real disbursement
        // workflow exists to ever set it.
        public int Disbursed { get; set; }

        // AcceptedOffers ÷ TotalApplications × 100, rounded to 1 decimal - "of everything ever
        // submitted, what fraction ended up approved". 0 when there are no applications yet.
        public decimal ConversionRate { get; set; }

        public List<BankStatsViewModel> BankBreakdown { get; set; } = new List<BankStatsViewModel>();
    }
}
