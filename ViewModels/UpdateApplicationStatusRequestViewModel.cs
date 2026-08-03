using System.ComponentModel.DataAnnotations;

namespace SmePortal.Web.ViewModels
{
    // Phase 13 (Bank Portal) - Bank Officer's Approve/Reject/status-change action.
    public class UpdateApplicationStatusRequestViewModel
    {
        [Required]
        public string Status { get; set; }

        [MaxLength(500)]
        public string Remarks { get; set; }
    }
}
