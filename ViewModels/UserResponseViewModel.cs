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
    }
}
