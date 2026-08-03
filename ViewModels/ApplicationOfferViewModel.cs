namespace SmePortal.Web.ViewModels
{
    public class ApplicationOfferViewModel
    {
        public string ApplicationId { get; set; }
        public string CaseId { get; set; }
        public string BusinessName { get; set; }
        public string Bank { get; set; }
        public string Status { get; set; }
        public decimal ApprovedAmount { get; set; }
        public string ApprovedAmountDisplay { get; set; }
        public string MarkupRate { get; set; }
        public string Tenor { get; set; }
        public string MonthlyInstallment { get; set; }
        public string ProcessingFee { get; set; }
        public string ExpiryDate { get; set; }
        public string DisbursementTimeline { get; set; }
        public string IssuedOn { get; set; }
        public string DocumentId { get; set; }
        public string DocumentFileName { get; set; }
    }
}
