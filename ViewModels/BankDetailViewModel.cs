using System.Collections.Generic;

namespace SmePortal.Web.ViewModels
{
    // Backs the Executive Dashboard's "Bank Performance Overview" row-click detail view
    // (Phase 2 follow-up). Every count/rate here mirrors the same real, honest computation
    // already established in SbpAdminService/BankStatsViewModel/BankDashboardStatsViewModel -
    // this is not a second, divergent definition of "approved"/"disbursed"/etc, just the same
    // math scoped to one bank and enriched with the lists/trend a single-bank drill-down needs.
    public class BankMonthlyStatViewModel
    {
        public string Month { get; set; }
        public int Applications { get; set; }
        public int Disbursed { get; set; }
    }

    public class BankDetailViewModel
    {
        public string Bank { get; set; }

        // Count of ApplicationUser rows with this BankName and the BankOfficer role - "how many
        // officers this bank has on the portal", derived the same "no separate Bank entity"
        // way everything else bank-related is (Models/Business.cs's own comment).
        public int OfficersCount { get; set; }

        public string FirstApplicationOn { get; set; }

        public int TotalApplications { get; set; }
        public int UnderReview { get; set; }
        public int Approved { get; set; }
        public int Rejected { get; set; }
        public int OffersIssued { get; set; }

        // Same definition as SbpDashboardStatsViewModel.AcceptedOffers - COUNT(Status="approved").
        public int AcceptedOffers { get; set; }

        // Real Application.Status "disbursed" - genuine COUNT(*), currently 0 system-wide until
        // a real disbursement workflow exists (see BankStatsViewModel's own comment).
        public int Disbursed { get; set; }

        public decimal ApprovalRate { get; set; }
        public decimal DisbursementRate { get; set; }

        // Sum of OfferApprovedAmount for this bank's disbursed applications - a real SUM(),
        // currently 0 for the same reason Disbursed is currently 0.
        public decimal TotalFinancedAmount { get; set; }

        public List<BankApplicationResponseViewModel> RecentApplications { get; set; }
        public List<BankApplicationResponseViewModel> PendingApplications { get; set; }
        public List<BankMonthlyStatViewModel> MonthlyStats { get; set; }
    }
}
