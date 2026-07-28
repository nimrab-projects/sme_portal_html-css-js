using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmePortal.Web.Models
{
    // Audit trail for an Application's status changes. One row is inserted at submission time
    // ("Application Submitted") by ApplicationService.SubmitApplicationAsync; later phases that
    // move an application through review/approval would append further rows here rather than
    // overwriting Status in place. Not yet surfaced in the UI - js/pages/sme/applicationTracking.js
    // is still the existing hardcoded timeline (out of scope for this phase, see report).
    [Table("ApplicationStatusHistory")]
    public class ApplicationStatusHistory
    {
        public int ApplicationStatusHistoryId { get; set; }

        [Required]
        public int ApplicationId { get; set; }
        [ForeignKey("ApplicationId")]
        public virtual Application Application { get; set; }

        [Required, MaxLength(30)]
        public string Status { get; set; }

        [MaxLength(300)]
        public string Note { get; set; }

        public int ChangedByUserId { get; set; }

        public DateTime CreatedOn { get; set; } = DateTime.UtcNow;
    }
}
