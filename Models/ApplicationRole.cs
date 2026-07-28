using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.AspNet.Identity.EntityFramework;

namespace SmePortal.Web.Models
{
    [Table("Roles")]
    public class ApplicationRole : IdentityRole<int, ApplicationUserRole>
    {
        public ApplicationRole() { }
        public ApplicationRole(string name) { Name = name; }
    }
}
