using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmePortal.Web.Models
{
    // One uploaded file against a specific Application (Phase 9). DocumentType is a free-form
    // string (not an enum/lookup table) matching whatever label the existing frontend's
    // required-document checklist uses (js/pages/sme/newApplication.js's PROPRIETORSHIP_DOCS/
    // PARTNERSHIP_DOCS) - reused as-is, not duplicated into a new server-side vocabulary.
    //
    // StoredFileName/StoragePath are always server-generated (a GUID, never derived from the
    // user's original filename) - see Services/DocumentService.cs - which is what actually
    // prevents path traversal and invalid-character/executable-filename attacks, rather than
    // trying to sanitize an attacker-controlled string into something safe.
    [Table("ApplicationDocument")]
    public class ApplicationDocument
    {
        // EF6's key-by-convention only recognizes "Id" or "{ClassName}Id" - since the class is
        // ApplicationDocument, that would be "ApplicationDocumentId", not "DocumentId". [Key]
        // makes this explicit so the literal field name from the spec still works.
        [Key]
        public int DocumentId { get; set; }

        [Required]
        public int ApplicationId { get; set; }
        [ForeignKey("ApplicationId")]
        public virtual Application Application { get; set; }

        [Required, MaxLength(150)]
        public string DocumentType { get; set; }

        [Required, MaxLength(260)]
        public string OriginalFileName { get; set; }

        [Required, MaxLength(260)]
        public string StoredFileName { get; set; }

        [Required, MaxLength(150)]
        public string ContentType { get; set; }

        public long FileSize { get; set; }

        // Relative to App_Data/Uploads (e.g. "ApplicationDocuments/SME-2026-000002/<guid>.pdf") -
        // never a web-servable path; see DocumentService's comment on why App_Data was used
        // instead of the Setup.md-suggested /Uploads at the site root.
        [Required, MaxLength(500)]
        public string StoragePath { get; set; }

        public int UploadedByUserId { get; set; }
        public DateTime UploadedOn { get; set; } = DateTime.UtcNow;

        // pending_verification | verified | rejected - no reviewer/bank-side flow exists yet in
        // any phase to move a document out of pending_verification, but the column is real and
        // ready for when one does (same forward-compatible approach as Application.Status /
        // ApplicationStatusHistory in Phases 6-8).
        [Required, MaxLength(30)]
        public string Status { get; set; } = "pending_verification";

        [MaxLength(500)]
        public string Remarks { get; set; }
    }
}
