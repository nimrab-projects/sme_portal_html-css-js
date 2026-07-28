using System.Threading.Tasks;

namespace SmePortal.Web.Services
{
    public class OtpVerificationResult
    {
        public bool Success { get; set; }
        public string Error { get; set; } // "invalid", "expired", "too_many_attempts"
    }

    public interface IOtpService
    {
        // Returns the plaintext code - only ever surfaced back to the caller behind the
        // Otp:DevEchoEnabled gate (see AccountController.Register); storage is always hashed.
        Task<string> GenerateAndStoreOtpAsync(int userId, string purpose = "EmailVerification");

        Task<OtpVerificationResult> VerifyOtpAsync(int userId, string code, string purpose = "EmailVerification");
    }
}
