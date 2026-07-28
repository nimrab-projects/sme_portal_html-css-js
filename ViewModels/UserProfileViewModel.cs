using System.Collections.Generic;

namespace SmePortal.Web.ViewModels
{
    // Personal Profile (Phase 10). Cnic is deliberately NOT a Users column - it's sourced from
    // the user's primary (first-created) Business.OwnerCnic, since that's the only place a CNIC
    // is already collected anywhere in this system (avoids a second, duplicate CNIC field that
    // could drift out of sync with the one on the Business record).
    public class UserProfileViewModel
    {
        public string Id { get; set; }
        public string FullName { get; set; }
        public string Email { get; set; }
        public string Mobile { get; set; }
        public string Cnic { get; set; }
        public List<string> Roles { get; set; } = new List<string>();
        public string RegistrationDate { get; set; }
        public string LastLogin { get; set; }
        public string AccountStatus { get; set; }
    }
}
