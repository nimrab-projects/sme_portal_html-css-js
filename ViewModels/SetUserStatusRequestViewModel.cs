namespace SmePortal.Web.ViewModels
{
    public class SetUserStatusRequestViewModel
    {
        // "activate" | "deactivate" | "block" | "unblock"
        public string Action { get; set; }
    }
}
