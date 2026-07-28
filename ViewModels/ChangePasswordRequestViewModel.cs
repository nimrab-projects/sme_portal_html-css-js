using System.ComponentModel.DataAnnotations;

namespace SmePortal.Web.ViewModels
{
    // No custom password logic here - Controllers/ProfileController.cs's ChangePassword action
    // passes CurrentPassword/NewPassword straight into ASP.NET Identity's own
    // UserManager.ChangePasswordAsync, which already validates the current password and applies
    // the same PasswordValidator policy configured in App_Start/IdentityConfig.cs.
    public class ChangePasswordRequestViewModel
    {
        [Required(ErrorMessage = "Current password is required.")]
        public string CurrentPassword { get; set; }

        [Required(ErrorMessage = "New password is required.")]
        public string NewPassword { get; set; }

        [Required(ErrorMessage = "Please confirm your new password.")]
        public string ConfirmPassword { get; set; }
    }
}
