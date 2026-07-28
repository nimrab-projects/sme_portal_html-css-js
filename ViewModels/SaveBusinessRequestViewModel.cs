using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace SmePortal.Web.ViewModels
{
    // Mirrors the object businessSetup.js's data-save handler currently builds for the local
    // (mock) addBusiness() call 1:1, so the frontend change is just "send this to the API
    // instead of calling addBusiness() directly, then call addBusiness() with the response".
    //
    // Data annotations added in Phase 5 for ApplicantController.Setup's ModelState validation
    // (max lengths mirror Models/Business.cs's column lengths; CNIC/phone patterns mirror
    // Helpers/ValidationHelper.cs's regexes - not duplicated logic, just expressed as
    // annotations so ModelState.IsValid works for the classic form-post path too).
    public class SaveBusinessRequestViewModel
    {
        [Required(ErrorMessage = "Business name is required."), StringLength(200)]
        public string Name { get; set; }

        [Required(ErrorMessage = "Business nature is required.")]
        public string Nature { get; set; }

        [StringLength(20)]
        public string Ntn { get; set; }

        // Optional - not collected by the current Business Setup form, but the column has
        // existed since Phase 1 (Setup.md's original ERD) and Personal/Business Profile (Phase
        // 10) can display it "if applicable" without requiring a new form field.
        [StringLength(20)]
        public string Strn { get; set; }
        [StringLength(100)]
        public string Province { get; set; }
        [StringLength(100)]
        public string City { get; set; }
        [StringLength(20)]
        public string PostalCode { get; set; }
        [StringLength(200)]
        public string Website { get; set; }

        [Required(ErrorMessage = "Business address is required.")]
        public string Address { get; set; }

        [Required(ErrorMessage = "Owner CNIC is required.")]
        [RegularExpression(@"^\d{5}-\d{7}-\d{1}$", ErrorMessage = "CNIC must be in the format XXXXX-XXXXXXX-X.")]
        public string OwnerCnic { get; set; }

        [Required(ErrorMessage = "Contact person is required."), StringLength(150)]
        public string ContactPerson { get; set; }

        [Required(ErrorMessage = "Cell/landline number is required.")]
        [RegularExpression(@"^[+0-9 \-]{7,20}$", ErrorMessage = "Enter a valid phone number.")]
        public string CellLandline { get; set; }

        [Required(ErrorMessage = "Business email is required.")]
        [EmailAddress(ErrorMessage = "Enter a valid email address."), StringLength(150)]
        public string Email { get; set; }

        [Required(ErrorMessage = "Year of establishment is required.")]
        public string YearEstablished { get; set; }

        [Required(ErrorMessage = "Annual sales is required.")]
        public string AnnualSales { get; set; }

        [Required(ErrorMessage = "Number of employees is required.")]
        public string Employees { get; set; }

        [Required(ErrorMessage = "Business premise is required.")]
        public string Premise { get; set; }

        [Required(ErrorMessage = "Business status is required.")]
        public string BusinessStatus { get; set; }

        [Required(ErrorMessage = "Business registration is required.")]
        public string Registration { get; set; }

        [StringLength(50)]
        public string RegistrationNumber { get; set; }

        [StringLength(20)]
        public string RegistrationAuthority { get; set; }

        [Required(ErrorMessage = "Business description is required.")]
        public string Description { get; set; }

        [StringLength(150)]
        public string Bank { get; set; }

        [StringLength(40)]
        [RegularExpression(@"^PK\d{2}[A-Z]{4}\d{16}$", ErrorMessage = "IBAN must be in the format PK00XXXX0000000000000000.")]
        public string Iban { get; set; }

        public List<ShareholderViewModel> Shareholders { get; set; } = new List<ShareholderViewModel>();
    }
}
