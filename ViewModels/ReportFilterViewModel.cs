using System;
using System.Collections.Generic;

namespace SmePortal.Web.ViewModels
{
    // Generate Custom Report's filter set. Every field is optional except where BuildReportAsync
    // itself enforces a rule (Services/ReportService.cs) - null/empty means "don't filter on
    // this". Also the exact shape persisted as Models/ReportHistory.cs's FiltersJson, so
    // re-download can deserialize it and recompute an identical report from current data.
    public class ReportFilterViewModel
    {
        public DateTime? DateFrom { get; set; }
        public DateTime? DateTo { get; set; }
        public string Bank { get; set; }
        public string Province { get; set; }
        public string City { get; set; }
        public string Business { get; set; }
        public string Scheme { get; set; }
        public string Status { get; set; }
        public decimal? AmountMin { get; set; }
        public decimal? AmountMax { get; set; }

        // Which sections to include (e.g. "summary","bank","scheme","turnaround","decline",
        // "disbursement","geographic","risk") - empty/null means "include everything relevant".
        public List<string> Sections { get; set; }

        // "PDF" | "Excel" - which the client will actually render, but also recorded so
        // re-download reuses the same format without asking again.
        public string Format { get; set; } = "PDF";
    }
}
