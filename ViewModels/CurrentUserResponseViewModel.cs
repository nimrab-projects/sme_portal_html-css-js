namespace SmePortal.Web.ViewModels
{
    public class CurrentUserResponseViewModel
    {
        public bool Authenticated { get; set; }
        public UserResponseViewModel User { get; set; }
        public bool IsFirstLogin { get; set; }
    }
}
