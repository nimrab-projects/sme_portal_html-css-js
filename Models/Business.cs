using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmePortal.Web.Models
{
    // Extends Setup.md's minimal "ApplicantProfile" table into the full shape the existing
    // businessSetup.js form actually collects (decision 4). One user owns many businesses,
    // matching js/state.js's `businesses: []` / `selectedBusiness`.
    [Table("Business")]
    public class Business
    {
        public int BusinessId { get; set; }

        [Required]
        public int UserId { get; set; }
        [ForeignKey("UserId")]
        public virtual ApplicationUser User { get; set; }

        [Required, MaxLength(200)]
        public string Name { get; set; }

        // Setup.md's ApplicantProfile columns (kept for spec parity):
        [MaxLength(15)]
        public string OwnerCnic { get; set; }
        [MaxLength(20)]
        public string Ntn { get; set; }
        [MaxLength(20)]
        public string Strn { get; set; }              // not collected by the current form
        [MaxLength(100)]
        public string Province { get; set; }          // not collected by the current form
        [MaxLength(100)]
        public string City { get; set; }               // not collected by the current form
        [MaxLength(20)]
        public string PostalCode { get; set; }         // not collected by the current form
        [MaxLength(200)]
        public string Website { get; set; }             // not collected by the current form

        // Fields the real businessSetup.js form actually collects:
        [MaxLength(150)]
        public string ContactPerson { get; set; }
        [MaxLength(30)]
        public string CellLandline { get; set; }
        [MaxLength(150)]
        public string Email { get; set; }
        public string Address { get; set; }
        [MaxLength(30)]
        public string AnnualSales { get; set; }
        [MaxLength(10)]
        public string YearEstablished { get; set; }
        [MaxLength(10)]
        public string Employees { get; set; }
        [MaxLength(20)]
        public string Premise { get; set; }             // Owned | Rented
        [MaxLength(50)]
        public string Nature { get; set; }              // Manufacturing | Services | Trading | Agri-SME
        [MaxLength(50)]
        public string BusinessStatus { get; set; }      // Proprietorship | Partnership | Private Limited Company
        [MaxLength(5)]
        public string Registration { get; set; }        // Yes | No
        [MaxLength(50)]
        public string RegistrationNumber { get; set; }
        [MaxLength(20)]
        public string RegistrationAuthority { get; set; }
        public string Description { get; set; }
        [MaxLength(150)]
        public string Bank { get; set; }
        [MaxLength(40)]
        public string Iban { get; set; }

        [MaxLength(20)]
        public string Status { get; set; } = "Active";

        public DateTime CreatedOn { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedOn { get; set; }

        public virtual ICollection<Shareholder> Shareholders { get; set; } = new List<Shareholder>();
    }
}
