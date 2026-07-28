namespace SmePortal.Web.ViewModels
{
    // Maps 1:1 to auth.js's register mode fields (Full Name, Mobile, Email, Password,
    // Confirm Password). ConfirmPassword is intentionally never validated against Password
    // server-side - the frontend's confirm-password input is deliberately broken (its value
    // is pinned to "" by a no-op onChange, matching the original source's behavior), so
    // enforcing equality here would make registration permanently impossible.
    public class RegisterRequestViewModel
    {
        public string FullName { get; set; }
        public string Email { get; set; }
        public string Mobile { get; set; }
        public string Password { get; set; }
        public string ConfirmPassword { get; set; }
    }
}
