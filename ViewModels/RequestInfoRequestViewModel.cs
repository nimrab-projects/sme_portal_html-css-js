using System.Collections.Generic;

namespace SmePortal.Web.ViewModels
{
    public class RequestInfoRequestViewModel
    {
        // "documents" | "info"
        public string RequestType { get; set; }
        public List<string> Messages { get; set; } = new List<string>();
    }
}
