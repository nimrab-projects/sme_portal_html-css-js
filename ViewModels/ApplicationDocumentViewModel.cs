namespace SmePortal.Web.ViewModels
{
    public class ApplicationDocumentViewModel
    {
        public string Id { get; set; }
        public string DocumentType { get; set; }
        public string OriginalFileName { get; set; }
        public string ContentType { get; set; }
        public long FileSize { get; set; }
        public string UploadedOn { get; set; }
        public string Status { get; set; }
        public string Remarks { get; set; }
    }
}
