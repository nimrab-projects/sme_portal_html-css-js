using Microsoft.AspNet.Identity.EntityFramework;

namespace SmePortal.Web.Models
{
    // Required by IdentityDbContext<>'s generic constraints; unused in Phase 1.
    public class ApplicationUserClaim : IdentityUserClaim<int>
    {
    }
}
