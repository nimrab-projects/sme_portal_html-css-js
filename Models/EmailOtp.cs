using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmePortal.Web.Models
{
    // New table, not in Setup.md's literal list — required to back real server-side OTP
    // generation/verification (decision 2). Code is stored hashed (reusing Identity's own
    // PasswordHasher, no new crypto dependency); the plaintext only ever exists transiently
    // in the dev-only API response/trace log, gated by Otp:DevEchoEnabled.
    [Table("EmailOtp")]
    public class EmailOtp
    {
        [Key]
        public int OtpId { get; set; }

        [Required]
        public int UserId { get; set; }
        [ForeignKey("UserId")]
        public virtual Models.ApplicationUser User { get; set; }

        [Required, MaxLength(200)]
        public string OtpCodeHash { get; set; }

        [Required, MaxLength(50)]
        public string Purpose { get; set; } = "EmailVerification";

        public DateTime ExpiresOn { get; set; }
        public bool IsUsed { get; set; }
        public int Attempts { get; set; }

        public DateTime CreatedOn { get; set; } = DateTime.UtcNow;
    }
}
