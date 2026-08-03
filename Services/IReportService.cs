using System.Collections.Generic;
using System.Threading.Tasks;
using SmePortal.Web.ViewModels;

namespace SmePortal.Web.Services
{
    public interface IReportService
    {
        // reportType: "application_status" | "turnaround_time" | "assessment" |
        // "decline_analysis" | "disbursement_summary" | "geographic_spread" | "custom".
        // filter is ignored (the full, unfiltered dataset is used) for every type except
        // "custom". Records a Models/ReportHistory.cs row as part of generating. Throws
        // InvalidOperationException for filter validation failures (only reachable via "custom").
        Task<ReportDataViewModel> GenerateReportAsync(string reportType, ReportFilterViewModel filter, int generatedByUserId);

        // Re-download - recomputes the named history entry's report fresh from CURRENT data
        // using its originally-saved type/filters, without inserting a new history row. Null
        // means "no such report" (404).
        Task<ReportDataViewModel> RegenerateAsync(int historyId);

        Task<List<ReportHistoryViewModel>> GetHistoryAsync();
    }
}
