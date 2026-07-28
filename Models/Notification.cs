using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmePortal.Web.Models
{
    // Phase 11 (Notifications & Communication). [Key] required: EF6's key-by-convention only
    // recognizes "Id" or "{ClassName}Id" (which would be "NotificationId" here - it happens to
    // already match, but this is made explicit anyway after the same convention mismatch bit
    // ApplicationDocument in Phase 9).
    [Table("Notification")]
    public class Notification
    {
        [Key]
        public int NotificationId { get; set; }

        [Required]
        public int UserId { get; set; }
        [ForeignKey("UserId")]
        public virtual ApplicationUser User { get; set; }

        [Required, MaxLength(200)]
        public string Title { get; set; }

        [Required, MaxLength(500)]
        public string Message { get; set; }

        // RegistrationCompleted | BusinessCreated | BusinessUpdated | ApplicationSubmitted |
        // ApplicationStatusChanged | DocumentUploaded | DocumentVerified | OfferLetterGenerated |
        // OfferLetterAccepted | OfferLetterRejected | PasswordChanged
        [Required, MaxLength(50)]
        public string NotificationType { get; set; }

        // What this notification is about, if anything - e.g. an ApplicationId - so the
        // frontend can build a real navigation link. Nullable: PasswordChanged/
        // RegistrationCompleted have nothing to link to.
        public int? ReferenceId { get; set; }
        [MaxLength(50)]
        public string ReferenceType { get; set; }

        public bool IsRead { get; set; }
        public DateTime CreatedOn { get; set; } = DateTime.UtcNow;
        public DateTime? ReadOn { get; set; }

        // Audit only, same convention as Application.SubmittedByUserId - who/what triggered this
        // notification (almost always the same user it's for today, since no admin/bank-side
        // actor exists yet in this system).
        public int? CreatedBy { get; set; }
    }
}
