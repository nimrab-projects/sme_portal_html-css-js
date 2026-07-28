using Microsoft.AspNet.Identity.EntityFramework;

namespace SmePortal.Web.Models
{
    // Required by IdentityDbContext<>'s generic constraints. Google sign-in in Phase 1 links
    // via ApplicationUser.GoogleId directly rather than through this table; kept empty/unused
    // for now but structurally required plumbing (not a Setup.md-listed table).
    public class ApplicationUserLogin : IdentityUserLogin<int>
    {
    }
}
