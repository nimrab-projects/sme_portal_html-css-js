using System.Collections.Generic;

namespace SmePortal.Web.ViewModels
{
    // Shape matches js/state.js's SAMPLE_BUSINESSES entries exactly (id as string, same field
    // names) so myBusinesses.js/dashboard.js/layout.js keep working unmodified once real
    // businesses replace the seed data via addBusiness()/setBusinesses().
    public class BusinessResponseViewModel
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public string Nature { get; set; }
        public string Ntn { get; set; }
        public string Strn { get; set; }
        public string Province { get; set; }
        public string City { get; set; }
        public string PostalCode { get; set; }
        public string Website { get; set; }
        public string Address { get; set; }
        public string Status { get; set; }
        public string OwnerCnic { get; set; }
        public string ContactPerson { get; set; }
        public string CellLandline { get; set; }
        public string Email { get; set; }
        public string YearEstablished { get; set; }
        public string AnnualSales { get; set; }
        public string Employees { get; set; }
        public string Premise { get; set; }
        public string BusinessStatus { get; set; }
        public string Registration { get; set; }
        public string RegistrationNumber { get; set; }
        public string RegistrationAuthority { get; set; }
        public string Description { get; set; }
        public string Bank { get; set; }
        public string Iban { get; set; }
        public string CreatedOn { get; set; }
        public List<ShareholderViewModel> Shareholders { get; set; }
    }
}
