using System.ComponentModel.DataAnnotations;

namespace SmePortal.Web.ViewModels
{
    // Request shape for the SME Finance Application module (Phase 7). Matches exactly what
    // the existing New Application wizard (js/pages/sme/newApplication.js) already collects -
    // a selected Business, the total requested facility amount, and the facility type(s) as
    // the purpose of finance - no new form fields were added to the frontend.
    public class SubmitApplicationRequestViewModel
    {
        [Required]
        public string BusinessId { get; set; }

        [Required]
        [Range(0.01, double.MaxValue, ErrorMessage = "Requested amount must be greater than zero.")]
        public decimal RequestedAmount { get; set; }

        [Required]
        [MaxLength(300)]
        public string PurposeOfFinance { get; set; }

        // No Bank field here - "Assigned Bank" is which participating bank will process the
        // application, never applicant input. See ApplicationService.SubmitApplicationAsync.
    }
}
