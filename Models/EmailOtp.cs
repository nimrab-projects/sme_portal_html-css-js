using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmePortal.Web.Models
{
    // New table, not in Setup.md's literal list — required to back real server-side OTP
    // generation/verification (decision 2). Verification is always done against OtpCodeHash
    // (reusing Identity's own PasswordHasher, no new crypto dependency) - that never changed.
    // OtpCode below is a deliberate, dev-environment-only addition: the plaintext code, stored
    // alongside the hash purely so it can be read directly from the database while testing
    // (no email/SMS provider is wired up yet). This is a real security tradeoff - anyone with
    // DB access can read a still-valid OTP - acceptable here only because this is a local
    // SQL Express dev database with no real delivery channel; remove this column before any
    // production deployment.
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

        [MaxLength(10)]
        public string OtpCode { get; set; }

        [Required, MaxLength(50)]
        public string Purpose { get; set; } = "EmailVerification";

        public DateTime ExpiresOn { get; set; }
        public bool IsUsed { get; set; }
        public int Attempts { get; set; }

        public DateTime CreatedOn { get; set; } = DateTime.UtcNow;
    }
}
