namespace SmePortal.Web.ViewModels
{
    // Field names deliberately match js/state.js's existing SAMPLE_NOTIFICATIONS mock shape
    // (Id/Title/Desc/Read) so js/pages/sme/layout.js's dropdown keeps rendering unmodified -
    // Date/Time/NotificationType/ReferenceId/ReferenceType are additive fields the existing mock
    // never had. "dot" (the colored indicator) is intentionally NOT a server field - it's
    // presentation, computed client-side from NotificationType, same as every other status-to-
    // color mapping in this app (dashboard.js/myApplications.js's STATUS_CONFIG).
    public class NotificationViewModel
    {
        public string Id { get; set; }
        public string Title { get; set; }
        public string Desc { get; set; }
        public string Date { get; set; }
        public string Time { get; set; }
        public bool Read { get; set; }
        public string NotificationType { get; set; }
        public string ReferenceId { get; set; }
        public string ReferenceType { get; set; }
    }
}
