using System.Collections.Generic;

namespace SmePortal.Web.ViewModels
{
    // Phase 13 (Bank Portal) - backs the Bank Dashboard's stat cards + Recent Applications
    // table. All counts computed live from SQL Server in BankApplicationService, never
    // hardcoded (js/pages/bank/portal.js's STAT_CARDS/MONTHLY_TREND placeholders are what this
    // replaces).
    public class BankDashboardStatsViewModel
    {
        public int TotalAssigned { get; set; }
        public int UnderReview { get; set; }
        public int Approved { get; set; }
        public int Rejected { get; set; }
        public int DocumentsPending { get; set; }
        public List<BankApplicationResponseViewModel> RecentApplications { get; set; } = new List<BankApplicationResponseViewModel>();
    }
}
