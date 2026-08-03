using System.ComponentModel.DataAnnotations;

namespace SmePortal.Web.ViewModels
{
    // No Email field here at all - Personal Profile explicitly does not allow editing email
    // until a future email-verification workflow exists (Phase 10 spec).
    public class UpdateProfileRequestViewModel
    {
        [Required(ErrorMessage = "Full name is required."), StringLength(200)]
        public string FullName { get; set; }

        [Required(ErrorMessage = "Mobile number is required.")]
        public string Mobile { get; set; }

        // Optional (Admin Profile). Null/omitted leaves the existing picture (or lack of one)
        // unchanged - never required to save a name/phone update.
        public string ProfilePictureUrl { get; set; }
    }
}
