using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmePortal.Web.Models
{
    // SBP Admin Reports - a record of every report an admin has generated. Re-download
    // (Services/ReportService.cs's RegenerateAsync) does NOT insert a new row - it reuses this
    // row's Format/ReportType/FiltersJson to recompute the report live from current data, so a
    // report generated with the same filters always reflects the real, current database rather
    // than a stale point-in-time snapshot. Only the original "Generate"/"Download" action ever
    // inserts a row here.
    [Table("ReportHistory")]
    public class ReportHistory
    {
        public int ReportHistoryId { get; set; }

        [Required, MaxLength(50)]
        public string ReportType { get; set; }

        [Required, MaxLength(150)]
        public string ReportName { get; set; }

        [Required, MaxLength(10)]
        public string Format { get; set; }

        [Required]
        public int GeneratedByUserId { get; set; }
        [ForeignKey("GeneratedByUserId")]
        public virtual ApplicationUser GeneratedByUser { get; set; }

        public DateTime GeneratedOn { get; set; } = DateTime.UtcNow;

        // Serialized ViewModels.ReportFilterViewModel (Newtonsoft.Json) - null/empty for the 6
        // fixed report cards, which always run against the full, unfiltered dataset. The exact
        // same object that produced this report, so re-download can recompute identically.
        public string FiltersJson { get; set; }
    }
}
