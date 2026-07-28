namespace SmePortal.Web.ViewModels
{
    public class ApiErrorViewModel
    {
        public bool Success { get; } = false;
        public string Error { get; set; }
        public string Message { get; set; }
        public int? RetryAfterMinutes { get; set; }
    }
}
