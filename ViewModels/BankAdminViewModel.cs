namespace SmePortal.Web.ViewModels
{
    // Response shape for SBP Admin's Bank Management page - replaces the old hardcoded
    // { name, code, type, region, active, joined } stub in js/pages/sbp/portal.js's
    // bankManagementHtml() with real Models/Bank.cs rows.
    public class BankAdminViewModel
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public string Code { get; set; }
        public string Type { get; set; }
        public string Coverage { get; set; }
        public string ContactPerson { get; set; }
        public string ContactEmail { get; set; }
        public string ContactNumber { get; set; }
        public string Address { get; set; }
        public bool IsActive { get; set; }
        public string Status { get; set; }
        public string Joined { get; set; }
    }
}
