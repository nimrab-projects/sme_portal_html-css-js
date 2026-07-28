using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmePortal.Web.Models
{
    [Table("Shareholder")]
    public class Shareholder
    {
        public int ShareholderId { get; set; }

        [Required]
        public int BusinessId { get; set; }
        [ForeignKey("BusinessId")]
        public virtual Business Business { get; set; }

        [MaxLength(150)]
        public string Name { get; set; }
        [MaxLength(15)]
        public string Cnic { get; set; }
        [MaxLength(30)]
        public string Phone { get; set; }
        [MaxLength(150)]
        public string Email { get; set; }
        public decimal? SharePercentage { get; set; }

        // Only meaningful when Business.BusinessStatus == "Partnership", matching the form's
        // conditional "Role in Partnership" field.
        [MaxLength(100)]
        public string Role { get; set; }
    }
}
