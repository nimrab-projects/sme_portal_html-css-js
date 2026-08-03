using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmePortal.Web.Models
{
    // SBP Admin Bank Management - a genuinely new entity (nothing like this existed before).
    // Deliberately separate from Business.Bank (the free-text string an applicant picks, matched
    // against ApplicationUser.BankName for Bank Officer queue scoping - see Business.cs) rather
    // than a replacement for it: changing that established mechanism would be a much larger,
    // riskier change touching every application/business flow, and isn't what this phase asked
    // for. This table is the source of truth for "which banks exist and are active" (surfaced via
    // Controllers/BusinessController.cs's banks endpoint to the applicant's Bank dropdown), while
    // Business.Bank/Application data keep working exactly as before regardless of this table's
    // contents - a bank being deactivated here never touches existing Business/Application rows.
    [Table("Banks")]
    public class Bank
    {
        [Key]
        public int BankId { get; set; }

        [Required, MaxLength(150)]
        public string Name { get; set; }

        [Required, MaxLength(20)]
        public string Code { get; set; }

        [Required, MaxLength(50)]
        public string Type { get; set; }

        // Contact/coverage/address fields are intentionally NOT [Required] at the DB level (only
        // enforced as required by Services/BankService.cs when an admin submits the Add/Edit
        // form) - the 10 seeded banks (DAL/Migrations/Configuration.cs) have no real contact
        // info available, and leaving them blank is more honest than fabricating one.
        [MaxLength(150)]
        public string Coverage { get; set; }

        [MaxLength(150)]
        public string ContactPerson { get; set; }

        [MaxLength(150)]
        public string ContactEmail { get; set; }

        [MaxLength(30)]
        public string ContactNumber { get; set; }

        [MaxLength(300)]
        public string Address { get; set; }

        public bool IsActive { get; set; } = true;

        public DateTime CreatedOn { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedOn { get; set; } = DateTime.UtcNow;
    }
}
