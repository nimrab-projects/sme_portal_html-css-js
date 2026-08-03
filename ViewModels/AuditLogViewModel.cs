namespace SmePortal.Web.ViewModels
{
    // Audit Trail (SBP Admin Portal). Models/AuditLog.cs only ever stores UserId/Action/
    // IPAddress/Browser/CreatedOn - there is no separate "Module"/"Status" column anywhere.
    // Module/Status/Activity below are derived, honest categorizations of the real Action string
    // (Services/AuditService.cs's DeriveModule/DeriveStatus/FriendlyActivity), the same
    // "friendly label for a real value" convention already used throughout this app (e.g.
    // SbpAdminService.FriendlyRoleName, ReportService.StatusLabel) - never a fabricated field.
    public class AuditLogViewModel
    {
        public string Id { get; set; }
        public string Timestamp { get; set; }
        public string User { get; set; }
        public string UserRole { get; set; }
        public string Activity { get; set; }
        public string Module { get; set; }
        public string IPAddress { get; set; }
        public string Browser { get; set; }
        public string Status { get; set; }

        // The literal, un-friendlified Action string - "additional metadata" for the detail
        // modal/search, since nothing beyond it is stored.
        public string RawAction { get; set; }
    }
}
