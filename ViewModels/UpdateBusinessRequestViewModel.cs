using System.ComponentModel.DataAnnotations;

namespace SmePortal.Web.ViewModels
{
    // Same fields as creating a business (inherits every data annotation from
    // SaveBusinessRequestViewModel unchanged) plus the one thing an update needs that a create
    // never did: which existing Business row to update. Never a new/duplicate set of field
    // definitions - just the one additional piece of information update-specific logic needs.
    public class UpdateBusinessRequestViewModel : SaveBusinessRequestViewModel
    {
        [Required]
        public string BusinessId { get; set; }
    }
}
