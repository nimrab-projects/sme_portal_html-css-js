namespace SmePortal.Web.ViewModels
{
    // Every field here mirrors one of SbpDashboardStatsViewModel's own system-wide fields,
    // computed the same way but scoped to just this one bank's applications - so picking a bank
    // in the Executive Dashboard's filter can show that bank's own real numbers in the top cards
    // (not just the table row) without a second server round-trip or a second, JS-side
    // re-implementation of the same math.
    public class BankStatsViewModel
    {
        public string Bank { get; set; }

        // Every application on file for this bank - "reviewed" here means "assigned to this
        // bank for review", matching Bank Portal's own "Total Assigned" dashboard stat exactly
        // (Services/BankApplicationService.cs's GetDashboardStatsAsync), not a separate concept.
        public int ApplicationsReviewed { get; set; }

        // Always equal to ApplicationsReviewed, except for the "Not Provided" group (businesses
        // that skipped the optional bank field) - those were never actually referred to any
        // bank, so this is 0 for that one group specifically.
        public int ReferredToBanks { get; set; }

        // COUNT of this bank's applications where OfferIssuedOn is set (ever issued, regardless
        // of later outcome) - see SbpDashboardStatsViewModel's own comment.
        public int OffersIssued { get; set; }

        public int Approved { get; set; }

        // Real Application.Status value "disbursed" - a valid, real status this system has
        // always recognized (Models/Application.cs), but no workflow anywhere yet transitions
        // an application into it. This is a genuine COUNT(*) against that status, not a
        // fabricated number - it will honestly read 0 until a real disbursement action exists,
        // and will start reflecting reality automatically the moment one does.
        public int Disbursed { get; set; }

        // Approved ÷ ApplicationsReviewed × 100, rounded to 1 decimal. 0 when there are no
        // applications for this bank yet (avoids a divide-by-zero, not a fabricated figure).
        public decimal ConversionRate { get; set; }

        // Disbursed ÷ Approved × 100, rounded to 1 decimal - "of the applications this bank
        // approved, how many were actually disbursed". 0 when Approved is 0.
        public decimal DisbursementRate { get; set; }
    }
}
