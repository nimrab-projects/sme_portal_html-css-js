namespace SmePortal.Web.ViewModels
{
    public class ReportHistoryViewModel
    {
        public string Id { get; set; }
        public string ReportType { get; set; }
        public string ReportName { get; set; }
        public string Format { get; set; }
        public string GeneratedBy { get; set; }
        public string GeneratedOn { get; set; }
        public string FiltersUsed { get; set; }
    }
}
