using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.AspNet.Identity.EntityFramework;

namespace SmePortal.Web.Models
{
    // Table "UserRoles", composite PK (UserId, RoleId) via IdentityDbContext's own
    // OnModelCreating (base.OnModelCreating is called from ApplicationDbContext).
    // Deliberate, flagged deviation from Setup.md's literal surrogate "UserRoleId" PK:
    // Identity's composite-key plumbing is idiomatic here and prevents duplicate role rows.
    [Table("UserRoles")]
    public class ApplicationUserRole : IdentityUserRole<int>
    {
    }
}
