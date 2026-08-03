namespace SmePortal.Web.ViewModels
{
    // Phase 13 (Bank Portal) - Bank Officer sign-in is email + OTP only (no password field in
    // js/pages/bank/auth.js), so this is deliberately narrower than RegisterRequestViewModel.
    public class BankLoginRequestOtpViewModel
    {
        public string Email { get; set; }
    }
}
