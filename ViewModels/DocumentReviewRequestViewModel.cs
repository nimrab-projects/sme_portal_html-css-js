using System.ComponentModel.DataAnnotations;

namespace SmePortal.Web.ViewModels
{
    // Phase 13 (Bank Portal) - Bank Officer's Verify/Reject action on one uploaded document.
    // The specific new status (verified/rejected) is implied by which controller action is
    // called, not sent by the client - see Controllers/BankApplicationController.cs.
    public class DocumentReviewRequestViewModel
    {
        [MaxLength(500)]
        public string Remarks { get; set; }
    }
}
