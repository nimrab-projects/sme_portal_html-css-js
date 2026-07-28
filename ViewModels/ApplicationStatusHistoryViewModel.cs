namespace SmePortal.Web.ViewModels
{
    // One row of the Application Tracking timeline - maps directly from Models/
    // ApplicationStatusHistory.cs (Phase 7's table, reused as-is per Phase 8's instruction not
    // to duplicate it). Field names here match Phase 8's own spec wording (Remarks/UpdatedBy)
    // even though the underlying columns are named Note/ChangedByUserId - see ApplicationService.
    public class ApplicationStatusHistoryViewModel
    {
        public string Status { get; set; }
        public string Remarks { get; set; }
        public string UpdatedBy { get; set; }
        public string Date { get; set; }
        public string Time { get; set; }
    }
}
