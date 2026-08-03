namespace SmePortal.Web.ViewModels
{
    public class SaveBankRequestViewModel
    {
        public string Name { get; set; }
        public string Code { get; set; }
        public string Type { get; set; }
        public string Coverage { get; set; }
        public string ContactPerson { get; set; }
        public string ContactEmail { get; set; }
        public string ContactNumber { get; set; }
        public string Address { get; set; }
        public bool IsActive { get; set; } = true;
    }
}
