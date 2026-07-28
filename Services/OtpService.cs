using System;
using System.Configuration;
using System.Security.Cryptography;
using System.Threading.Tasks;
using Microsoft.AspNet.Identity;
using SmePortal.Web.Models;
using SmePortal.Web.Repositories;

namespace SmePortal.Web.Services
{
    public class OtpService : IOtpService
    {
        private const int MaxAttempts = 5;
        private readonly IOtpRepository _otpRepository;
        private readonly PasswordHasher _hasher = new PasswordHasher();

        public OtpService(IOtpRepository otpRepository)
        {
            _otpRepository = otpRepository;
        }

        public async Task<string> GenerateAndStoreOtpAsync(int userId, string purpose = "EmailVerification")
        {
            var code = GenerateNumericCode(6);
            var expiryMinutes = 10;
            int.TryParse(ConfigurationManager.AppSettings["Otp:ExpiryMinutes"], out expiryMinutes);
            if (expiryMinutes <= 0) expiryMinutes = 10;

            var otp = new EmailOtp
            {
                UserId = userId,
                Purpose = purpose,
                OtpCodeHash = _hasher.HashPassword(code),
                ExpiresOn = DateTime.UtcNow.AddMinutes(expiryMinutes),
                IsUsed = false,
                Attempts = 0,
            };
            await _otpRepository.AddAsync(otp);
            return code;
        }

        public async Task<OtpVerificationResult> VerifyOtpAsync(int userId, string code, string purpose = "EmailVerification")
        {
            var otp = await _otpRepository.GetLatestActiveAsync(userId, purpose);
            if (otp == null)
            {
                return new OtpVerificationResult { Success = false, Error = "expired" };
            }

            if (otp.Attempts >= MaxAttempts)
            {
                return new OtpVerificationResult { Success = false, Error = "too_many_attempts" };
            }

            var result = _hasher.VerifyHashedPassword(otp.OtpCodeHash, code ?? "");
            if (result != PasswordVerificationResult.Success)
            {
                otp.Attempts += 1;
                await _otpRepository.SaveChangesAsync();
                return new OtpVerificationResult { Success = false, Error = "invalid" };
            }

            otp.IsUsed = true;
            await _otpRepository.SaveChangesAsync();
            return new OtpVerificationResult { Success = true };
        }

        private static string GenerateNumericCode(int digits)
        {
            using (var rng = RandomNumberGenerator.Create())
            {
                var bytes = new byte[4];
                rng.GetBytes(bytes);
                var value = BitConverter.ToUInt32(bytes, 0);
                var max = (uint)Math.Pow(10, digits);
                var code = (value % max).ToString().PadLeft(digits, '0');
                return code;
            }
        }
    }
}
