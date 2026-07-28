using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmePortal.Web.Models
{
    [Table("AuditLog")]
    public class AuditLog
    {
        [Key]
        public int AuditId { get; set; }

        // Nullable: a failed login with an unknown email has no user row to point at.
        public int? UserId { get; set; }
        [ForeignKey("UserId")]
        public virtual ApplicationUser User { get; set; }

        [Required, MaxLength(100)]
        public string Action { get; set; }
        [MaxLength(64)]
        public string IPAddress { get; set; }
        [MaxLength(300)]
        public string Browser { get; set; }

        public DateTime CreatedOn { get; set; } = DateTime.UtcNow;
    }
}
