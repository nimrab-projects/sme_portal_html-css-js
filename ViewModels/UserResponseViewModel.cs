namespace SmePortal.Web.ViewModels
{
    // Shape kept intentionally minimal ({id, name, email, ...}) - js/state.js's setUser()
    // only ever reads .name/.email today; id/mobile are included for forward use without
    // breaking any existing read site.
    public class UserResponseViewModel
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public string Email { get; set; }
        public string Mobile { get; set; }

        // Phase 13 (Bank Portal) - null for Applicants, set for Bank Officer accounts. Additive:
        // js/pages/sme/*.js never reads this field, only js/pages/bank/layout.js does (replacing
        // its previous hardcoded "HBL" bank-name display with the real one).
        public string BankName { get; set; }

        // Admin Profile (SBP Admin Portal) - carried at boot/login time so the sidebar/header
        // avatar can show a real uploaded picture immediately, not just after an in-session edit.
        public string ProfilePictureUrl { get; set; }
    }
}
