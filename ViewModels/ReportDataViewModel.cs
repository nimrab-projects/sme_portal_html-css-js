using System.Collections.Generic;

namespace SmePortal.Web.ViewModels
{
    // Generic "computed report" shape every one of Services/ReportService.cs's builders returns
    // - Metrics (top-line numbers) + Sections (tabular breakdowns). Deliberately generic rather
    // than one bespoke ViewModel per report type: it lets the frontend's XLSX/PDF exporters
    // (js/pages/sbp/portal.js) render every report - the 6 fixed cards AND Custom Report - through
    // ONE shared rendering path, instead of six near-duplicate exporters.
    public class ReportMetricViewModel
    {
        public string Label { get; set; }
        public string Value { get; set; }
    }

    public class ReportSectionViewModel
    {
        public string Title { get; set; }
        public List<string> Columns { get; set; }
        public List<List<string>> Rows { get; set; }
    }

    public class ReportDataViewModel
    {
        public int? HistoryId { get; set; }
        public string ReportType { get; set; }
        public string Title { get; set; }
        public string Format { get; set; }
        public string GeneratedOn { get; set; }
        public string GeneratedBy { get; set; }
        public List<string> FiltersApplied { get; set; }
        public List<ReportMetricViewModel> Metrics { get; set; }
        public List<ReportSectionViewModel> Sections { get; set; }
    }
}
