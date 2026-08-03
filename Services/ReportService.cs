using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Threading.Tasks;
using Newtonsoft.Json;
using SmePortal.Web.Models;
using SmePortal.Web.Repositories;
using SmePortal.Web.ViewModels;

namespace SmePortal.Web.Services
{
    // SBP Admin Reports. Every builder below operates on the SAME one bulk fetch
    // (IApplicationRepository.GetAllAsync(), already eager-loading Business/Business.User/
    // StatusHistory - see ApplicationRepository.cs) - never a second, per-report query. The 6
    // fixed report cards always run unfiltered (the full dataset); "custom" is the only report
    // type ApplyFilter ever narrows. Deliberately reuses the exact same real-data conventions
    // established throughout this app: Bank/Scheme default to "Not Provided" (never dropped),
    // "Disbursed" is a genuine COUNT/SUM against a real, currently-mostly-zero status (see
    // Services/SbpAdminService.cs's own comment on why that's honest, not fabricated), and
    // Province/City are real Models/Business.cs columns the Applicant Portal's form has never
    // collected - so Geographic Spread will read "Not Provided" until a future phase adds that
    // field to the form, exactly the same honesty convention as everything else here.
    public class ReportService : IReportService
    {
        private static readonly HashSet<string> AllowedReportTypes = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "application_status", "turnaround_time", "assessment", "decline_analysis",
            "disbursement_summary", "geographic_spread", "custom",
        };

        private readonly IApplicationRepository _applicationRepository;
        private readonly IReportHistoryRepository _reportHistoryRepository;
        private readonly IUserRepository _userRepository;

        public ReportService(IApplicationRepository applicationRepository, IReportHistoryRepository reportHistoryRepository, IUserRepository userRepository)
        {
            _applicationRepository = applicationRepository;
            _reportHistoryRepository = reportHistoryRepository;
            _userRepository = userRepository;
        }

        public async Task<ReportDataViewModel> GenerateReportAsync(string reportType, ReportFilterViewModel filter, int generatedByUserId)
        {
            if (string.IsNullOrWhiteSpace(reportType) || !AllowedReportTypes.Contains(reportType))
            {
                throw new InvalidOperationException("Unknown report type.");
            }

            var allApplications = await _applicationRepository.GetAllAsync();
            var isCustom = string.Equals(reportType, "custom", StringComparison.OrdinalIgnoreCase);

            List<Application> scoped;
            ReportFilterViewModel effectiveFilter = null;
            if (isCustom)
            {
                effectiveFilter = filter ?? new ReportFilterViewModel();
                ValidateFilter(effectiveFilter);
                scoped = ApplyFilter(allApplications, effectiveFilter);
                if (scoped.Count == 0)
                {
                    throw new InvalidOperationException("No data available for the selected filters.");
                }
            }
            else
            {
                scoped = allApplications;
            }

            var data = BuildReportData(reportType, scoped, effectiveFilter);
            var format = isCustom ? (string.IsNullOrWhiteSpace(effectiveFilter.Format) ? "PDF" : effectiveFilter.Format) : DefaultFormatFor(reportType);

            var user = await _userRepository.GetByIdAsync(generatedByUserId);
            var history = new ReportHistory
            {
                ReportType = reportType,
                ReportName = data.Title,
                Format = format,
                GeneratedByUserId = generatedByUserId,
                GeneratedOn = DateTime.UtcNow,
                FiltersJson = effectiveFilter == null ? null : JsonConvert.SerializeObject(effectiveFilter),
            };
            await _reportHistoryRepository.AddAsync(history);

            data.HistoryId = history.ReportHistoryId;
            data.Format = format;
            data.GeneratedBy = user?.FullName ?? "SBP Admin";
            data.GeneratedOn = history.GeneratedOn.ToString("yyyy-MM-dd HH:mm");
            return data;
        }

        public async Task<ReportDataViewModel> RegenerateAsync(int historyId)
        {
            var history = await _reportHistoryRepository.GetByIdAsync(historyId);
            if (history == null) return null;

            var allApplications = await _applicationRepository.GetAllAsync();
            var filter = string.IsNullOrWhiteSpace(history.FiltersJson)
                ? null
                : JsonConvert.DeserializeObject<ReportFilterViewModel>(history.FiltersJson);
            var scoped = filter == null ? allApplications : ApplyFilter(allApplications, filter);

            var data = BuildReportData(history.ReportType, scoped, filter);

            var user = await _userRepository.GetByIdAsync(history.GeneratedByUserId);
            data.HistoryId = history.ReportHistoryId;
            data.Format = history.Format;
            data.GeneratedBy = user?.FullName ?? "SBP Admin";
            // Recomputed live from CURRENT data (Models/ReportHistory.cs's own comment) - the
            // displayed "generated on" intentionally stays the ORIGINAL generation time, since
            // this is still "the same report", just re-run against today's numbers.
            data.GeneratedOn = history.GeneratedOn.ToString("yyyy-MM-dd HH:mm");
            return data;
        }

        public async Task<List<ReportHistoryViewModel>> GetHistoryAsync()
        {
            var history = await _reportHistoryRepository.GetAllAsync();
            return history.Select(h => new ReportHistoryViewModel
            {
                Id = h.ReportHistoryId.ToString(),
                ReportType = h.ReportType,
                ReportName = h.ReportName,
                Format = h.Format,
                GeneratedBy = h.GeneratedByUser?.FullName ?? "Unknown",
                GeneratedOn = h.GeneratedOn.ToString("yyyy-MM-dd HH:mm"),
                FiltersUsed = DescribeFilter(string.IsNullOrWhiteSpace(h.FiltersJson) ? null : JsonConvert.DeserializeObject<ReportFilterViewModel>(h.FiltersJson)),
            }).ToList();
        }

        // ── Dispatch ──────────────────────────────────────────────────────────────────────────
        private static ReportDataViewModel BuildReportData(string reportType, List<Application> apps, ReportFilterViewModel filter)
        {
            switch (reportType.ToLowerInvariant())
            {
                case "application_status": return BuildApplicationStatusReport(apps, filter);
                case "turnaround_time": return BuildTurnaroundTimeReport(apps, filter);
                case "assessment": return BuildAssessmentReport(apps, filter);
                case "decline_analysis": return BuildDeclineAnalysisReport(apps, filter);
                case "disbursement_summary": return BuildDisbursementSummaryReport(apps, filter);
                case "geographic_spread": return BuildGeographicSpreadReport(apps, filter);
                case "custom": return BuildCustomReport(apps, filter);
                default: throw new InvalidOperationException("Unknown report type.");
            }
        }

        private static string DefaultFormatFor(string reportType)
        {
            switch (reportType.ToLowerInvariant())
            {
                case "turnaround_time":
                case "decline_analysis":
                    return "Excel";
                default:
                    return "PDF";
            }
        }

        // ── Report builders ───────────────────────────────────────────────────────────────────
        private static ReportDataViewModel BuildApplicationStatusReport(List<Application> apps, ReportFilterViewModel filter)
        {
            var total = apps.Count;
            var underReview = apps.Count(a => IsStatus(a, "under_review"));
            var approved = apps.Count(a => IsStatus(a, "approved"));
            var rejected = apps.Count(a => IsStatus(a, "rejected"));
            var disbursed = apps.Count(a => IsStatus(a, "disbursed"));

            var bankRows = apps.GroupBy(BankOf).OrderByDescending(g => g.Count())
                .Select(g => new List<string>
                {
                    g.Key, g.Count().ToString(),
                    g.Count(a => IsStatus(a, "under_review")).ToString(),
                    g.Count(a => IsStatus(a, "approved")).ToString(),
                    g.Count(a => IsStatus(a, "rejected")).ToString(),
                    g.Count(a => IsStatus(a, "disbursed")).ToString(),
                }).ToList();

            var schemeRows = apps.GroupBy(SchemeOf).OrderByDescending(g => g.Count())
                .Select(g => new List<string>
                {
                    g.Key, g.Count().ToString(),
                    g.Count(a => IsStatus(a, "approved")).ToString(),
                    g.Count(a => IsStatus(a, "rejected")).ToString(),
                }).ToList();

            return new ReportDataViewModel
            {
                ReportType = "application_status",
                Title = "Application Status Report",
                FiltersApplied = DescribeFilterLines(filter),
                Metrics = new List<ReportMetricViewModel>
                {
                    new ReportMetricViewModel { Label = "Total Applications", Value = total.ToString() },
                    new ReportMetricViewModel { Label = "Under Review", Value = underReview.ToString() },
                    new ReportMetricViewModel { Label = "Approved", Value = approved.ToString() },
                    new ReportMetricViewModel { Label = "Rejected", Value = rejected.ToString() },
                    new ReportMetricViewModel { Label = "Disbursed", Value = disbursed.ToString() },
                },
                Sections = new List<ReportSectionViewModel>
                {
                    new ReportSectionViewModel { Title = "Bank-wise Summary", Columns = new List<string> { "Bank", "Total", "Under Review", "Approved", "Rejected", "Disbursed" }, Rows = bankRows },
                    new ReportSectionViewModel { Title = "Scheme-wise Summary", Columns = new List<string> { "Scheme", "Total", "Approved", "Rejected" }, Rows = schemeRows },
                },
            };
        }

        private static ReportDataViewModel BuildTurnaroundTimeReport(List<Application> apps, ReportFilterViewModel filter)
        {
            var completed = apps
                .Select(a => new { App = a, Days = OverallProcessingDays(a) })
                .Where(x => x.Days.HasValue)
                .ToList();

            double? avgDays = completed.Count > 0 ? completed.Average(x => x.Days.Value) : (double?)null;

            var byBank = completed.GroupBy(x => BankOf(x.App))
                .Select(g => new { Bank = g.Key, Avg = g.Average(x => x.Days.Value), Count = g.Count() })
                .OrderBy(x => x.Avg)
                .ToList();

            var fastest = byBank.FirstOrDefault();
            var slowest = byBank.Count > 0 ? byBank[byBank.Count - 1] : null;

            var byStage = apps.SelectMany(GetTransitions)
                .GroupBy(t => $"{StatusLabel(t.From)} -> {StatusLabel(t.To)}")
                .Select(g => new List<string> { g.Key, g.Count().ToString(), Math.Round(g.Average(t => t.Days), 1).ToString(CultureInfo.InvariantCulture) })
                .ToList();

            var bankRows = byBank
                .Select(x => new List<string> { x.Bank, x.Count.ToString(), Math.Round(x.Avg, 1).ToString(CultureInfo.InvariantCulture) })
                .ToList();

            return new ReportDataViewModel
            {
                ReportType = "turnaround_time",
                Title = "Turnaround Time Report",
                FiltersApplied = DescribeFilterLines(filter),
                Metrics = new List<ReportMetricViewModel>
                {
                    new ReportMetricViewModel { Label = "Applications Completed", Value = completed.Count.ToString() },
                    new ReportMetricViewModel { Label = "Average Processing Time (days)", Value = avgDays.HasValue ? Math.Round(avgDays.Value, 1).ToString(CultureInfo.InvariantCulture) : "No completed applications yet" },
                    new ReportMetricViewModel { Label = "Fastest Bank", Value = fastest != null ? $"{fastest.Bank} ({Math.Round(fastest.Avg, 1)} days)" : "Not enough data yet" },
                    new ReportMetricViewModel { Label = "Slowest Bank", Value = slowest != null ? $"{slowest.Bank} ({Math.Round(slowest.Avg, 1)} days)" : "Not enough data yet" },
                },
                Sections = new List<ReportSectionViewModel>
                {
                    new ReportSectionViewModel { Title = "Processing Time by Bank (days)", Columns = new List<string> { "Bank", "Completed Applications", "Average Days" }, Rows = bankRows },
                    new ReportSectionViewModel { Title = "Processing Time by Stage (days)", Columns = new List<string> { "Stage Transition", "Occurrences", "Average Days" }, Rows = byStage },
                },
            };
        }

        private static ReportDataViewModel BuildAssessmentReport(List<Application> apps, ReportFilterViewModel filter)
        {
            var reviewed = apps.Count;
            var approved = apps.Count(a => IsStatus(a, "approved"));
            var rejected = apps.Count(a => IsStatus(a, "rejected"));
            var decided = approved + rejected;
            var acceptanceRatio = Rate(approved, decided);

            var bankRows = apps.GroupBy(BankOf).OrderByDescending(g => g.Count())
                .Select(g =>
                {
                    var bApproved = g.Count(a => IsStatus(a, "approved"));
                    var bRejected = g.Count(a => IsStatus(a, "rejected"));
                    return new List<string> { g.Key, g.Count().ToString(), bApproved.ToString(), bRejected.ToString(), $"{Rate(bApproved, bApproved + bRejected)}%" };
                }).ToList();

            // No real credit-risk-scoring model exists anywhere in this system (see
            // ViewModels/BankApplicationResponseViewModel.cs's own Risk field comment) - every
            // application reads "Medium" today. This is that same real, honest (if currently
            // undifferentiated) value, not a fabricated distribution.
            var riskRows = new List<List<string>> { new List<string> { "Medium", reviewed.ToString() } };

            return new ReportDataViewModel
            {
                ReportType = "assessment",
                Title = "Assessment Report",
                FiltersApplied = DescribeFilterLines(filter),
                Metrics = new List<ReportMetricViewModel>
                {
                    new ReportMetricViewModel { Label = "Applications Reviewed", Value = reviewed.ToString() },
                    new ReportMetricViewModel { Label = "Approved", Value = approved.ToString() },
                    new ReportMetricViewModel { Label = "Rejected", Value = rejected.ToString() },
                    new ReportMetricViewModel { Label = "Acceptance Ratio", Value = $"{acceptanceRatio}%" },
                },
                Sections = new List<ReportSectionViewModel>
                {
                    new ReportSectionViewModel { Title = "Bank Comparison", Columns = new List<string> { "Bank", "Reviewed", "Approved", "Rejected", "Acceptance Ratio" }, Rows = bankRows },
                    new ReportSectionViewModel { Title = "Risk Assessment Summary", Columns = new List<string> { "Risk Level", "Applications" }, Rows = riskRows },
                },
            };
        }

        private static ReportDataViewModel BuildDeclineAnalysisReport(List<Application> apps, ReportFilterViewModel filter)
        {
            var rejected = apps.Where(a => IsStatus(a, "rejected")).ToList();
            var rejectionRate = Rate(rejected.Count, apps.Count);

            var reasonRows = rejected.GroupBy(RejectionReasonOf).OrderByDescending(g => g.Count())
                .Select(g => new List<string> { g.Key, g.Count().ToString() }).ToList();

            var sectorRows = rejected.GroupBy(SectorOf).OrderByDescending(g => g.Count())
                .Select(g => new List<string> { g.Key, g.Count().ToString() }).ToList();

            var bankRows = rejected.GroupBy(BankOf).OrderByDescending(g => g.Count())
                .Select(g => new List<string> { g.Key, g.Count().ToString() }).ToList();

            var monthlyRows = rejected
                .GroupBy(a => MonthOf(StatusDateOf(a, "rejected")))
                .OrderBy(g => g.Key)
                .Select(g => new List<string> { g.Key.ToString("MMM yyyy"), g.Count().ToString() }).ToList();

            return new ReportDataViewModel
            {
                ReportType = "decline_analysis",
                Title = "Decline Analysis Report",
                FiltersApplied = DescribeFilterLines(filter),
                Metrics = new List<ReportMetricViewModel>
                {
                    new ReportMetricViewModel { Label = "Total Rejected", Value = rejected.Count.ToString() },
                    new ReportMetricViewModel { Label = "Rejection Rate", Value = $"{rejectionRate}%" },
                },
                Sections = new List<ReportSectionViewModel>
                {
                    new ReportSectionViewModel { Title = "Rejection Reasons", Columns = new List<string> { "Reason", "Count" }, Rows = reasonRows },
                    new ReportSectionViewModel { Title = "Sector-wise Rejection", Columns = new List<string> { "Sector", "Rejected" }, Rows = sectorRows },
                    new ReportSectionViewModel { Title = "Bank-wise Rejection", Columns = new List<string> { "Bank", "Rejected" }, Rows = bankRows },
                    new ReportSectionViewModel { Title = "Monthly Rejection Trends", Columns = new List<string> { "Month", "Rejected" }, Rows = monthlyRows },
                },
            };
        }

        private static ReportDataViewModel BuildDisbursementSummaryReport(List<Application> apps, ReportFilterViewModel filter)
        {
            var disbursed = apps.Where(a => IsStatus(a, "disbursed")).ToList();
            var totalAmount = disbursed.Sum(DisbursedAmountOf);

            var bankRows = disbursed.GroupBy(BankOf).OrderByDescending(g => g.Count())
                .Select(g => new List<string> { g.Key, g.Count().ToString(), $"PKR {g.Sum(DisbursedAmountOf):N0}" }).ToList();

            var schemeRows = disbursed.GroupBy(SchemeOf).OrderByDescending(g => g.Count())
                .Select(g => new List<string> { g.Key, g.Count().ToString(), $"PKR {g.Sum(DisbursedAmountOf):N0}" }).ToList();

            var monthlyRows = disbursed
                .GroupBy(a => MonthOf(StatusDateOf(a, "disbursed")))
                .OrderBy(g => g.Key)
                .Select(g => new List<string> { g.Key.ToString("MMM yyyy"), g.Count().ToString(), $"PKR {g.Sum(DisbursedAmountOf):N0}" }).ToList();

            return new ReportDataViewModel
            {
                ReportType = "disbursement_summary",
                Title = "Disbursement Summary Report",
                FiltersApplied = DescribeFilterLines(filter),
                Metrics = new List<ReportMetricViewModel>
                {
                    new ReportMetricViewModel { Label = "Total Disbursed Amount", Value = $"PKR {totalAmount:N0}" },
                    new ReportMetricViewModel { Label = "Disbursed Applications", Value = disbursed.Count.ToString() },
                },
                Sections = new List<ReportSectionViewModel>
                {
                    new ReportSectionViewModel { Title = "Bank-wise Disbursement", Columns = new List<string> { "Bank", "Disbursed Applications", "Disbursed Amount" }, Rows = bankRows },
                    new ReportSectionViewModel { Title = "Scheme-wise Disbursement", Columns = new List<string> { "Scheme", "Disbursed Applications", "Disbursed Amount" }, Rows = schemeRows },
                    new ReportSectionViewModel { Title = "Monthly Trend", Columns = new List<string> { "Month", "Disbursed Applications", "Disbursed Amount" }, Rows = monthlyRows },
                },
            };
        }

        // Province/City are real Models/Business.cs columns (not fabricated), but the Applicant
        // Portal's business form has never collected them (see Business.cs's own comment) - every
        // row here honestly reads "Not Provided" today, same convention as an unset Bank, and
        // will start reflecting real geography automatically the moment a future phase adds
        // those fields to the form, with no change needed here.
        private static ReportDataViewModel BuildGeographicSpreadReport(List<Application> apps, ReportFilterViewModel filter)
        {
            var provinces = apps.Select(ProvinceOf).Distinct().Count(p => p != "Not Provided");
            var cities = apps.Select(CityOf).Distinct().Count(c => c != "Not Provided");

            var provinceRows = apps.GroupBy(ProvinceOf).OrderByDescending(g => g.Count())
                .Select(g => new List<string> { g.Key, g.Count().ToString() }).ToList();
            var cityRows = apps.GroupBy(CityOf).OrderByDescending(g => g.Count())
                .Select(g => new List<string> { g.Key, g.Count().ToString() }).ToList();
            var provinceApprovalRows = apps.Where(a => IsStatus(a, "approved")).GroupBy(ProvinceOf).OrderByDescending(g => g.Count())
                .Select(g => new List<string> { g.Key, g.Count().ToString() }).ToList();
            var provinceDisbursementRows = apps.Where(a => IsStatus(a, "disbursed")).GroupBy(ProvinceOf).OrderByDescending(g => g.Count())
                .Select(g => new List<string> { g.Key, g.Count().ToString() }).ToList();

            return new ReportDataViewModel
            {
                ReportType = "geographic_spread",
                Title = "Geographic Spread Report",
                FiltersApplied = DescribeFilterLines(filter),
                Metrics = new List<ReportMetricViewModel>
                {
                    new ReportMetricViewModel { Label = "Total Applications", Value = apps.Count.ToString() },
                    new ReportMetricViewModel { Label = "Provinces Represented", Value = provinces.ToString() },
                    new ReportMetricViewModel { Label = "Cities Represented", Value = cities.ToString() },
                },
                Sections = new List<ReportSectionViewModel>
                {
                    new ReportSectionViewModel { Title = "Province-wise Applications", Columns = new List<string> { "Province", "Applications" }, Rows = provinceRows },
                    new ReportSectionViewModel { Title = "City-wise Applications", Columns = new List<string> { "City", "Applications" }, Rows = cityRows },
                    new ReportSectionViewModel { Title = "Province-wise Approvals", Columns = new List<string> { "Province", "Approved" }, Rows = provinceApprovalRows },
                    new ReportSectionViewModel { Title = "Province-wise Disbursements", Columns = new List<string> { "Province", "Disbursed" }, Rows = provinceDisbursementRows },
                },
            };
        }

        // Reuses each fixed report's own builder (fed the already-filtered list) and splices out
        // only the requested sections, rather than a second, divergent implementation of the same
        // groupings - "reuse existing logic" applies within Reports itself, not just across pages.
        private static ReportDataViewModel BuildCustomReport(List<Application> apps, ReportFilterViewModel filter)
        {
            var metrics = new List<ReportMetricViewModel>
            {
                new ReportMetricViewModel { Label = "Total Applications", Value = apps.Count.ToString() },
                new ReportMetricViewModel { Label = "Under Review", Value = apps.Count(a => IsStatus(a, "under_review")).ToString() },
                new ReportMetricViewModel { Label = "Approved", Value = apps.Count(a => IsStatus(a, "approved")).ToString() },
                new ReportMetricViewModel { Label = "Rejected", Value = apps.Count(a => IsStatus(a, "rejected")).ToString() },
                new ReportMetricViewModel { Label = "Disbursed", Value = apps.Count(a => IsStatus(a, "disbursed")).ToString() },
            };

            var requested = (filter.Sections != null && filter.Sections.Count > 0)
                ? new HashSet<string>(filter.Sections, StringComparer.OrdinalIgnoreCase)
                : new HashSet<string>(new[] { "bank", "scheme", "turnaround", "decline", "disbursement", "geographic", "risk" }, StringComparer.OrdinalIgnoreCase);

            var sections = new List<ReportSectionViewModel>();
            if (requested.Contains("bank"))
                sections.AddRange(BuildApplicationStatusReport(apps, filter).Sections.Where(s => s.Title == "Bank-wise Summary"));
            if (requested.Contains("scheme"))
                sections.AddRange(BuildApplicationStatusReport(apps, filter).Sections.Where(s => s.Title == "Scheme-wise Summary"));
            if (requested.Contains("turnaround"))
                sections.AddRange(BuildTurnaroundTimeReport(apps, filter).Sections);
            if (requested.Contains("decline"))
                sections.AddRange(BuildDeclineAnalysisReport(apps, filter).Sections);
            if (requested.Contains("disbursement"))
                sections.AddRange(BuildDisbursementSummaryReport(apps, filter).Sections);
            if (requested.Contains("geographic"))
                sections.AddRange(BuildGeographicSpreadReport(apps, filter).Sections);
            if (requested.Contains("risk"))
                sections.AddRange(BuildAssessmentReport(apps, filter).Sections.Where(s => s.Title == "Risk Assessment Summary"));

            return new ReportDataViewModel
            {
                ReportType = "custom",
                Title = "Custom Report",
                FiltersApplied = DescribeFilterLines(filter),
                Metrics = metrics,
                Sections = sections,
            };
        }

        // ── Filtering / validation ────────────────────────────────────────────────────────────
        private static void ValidateFilter(ReportFilterViewModel filter)
        {
            if ((filter.DateFrom.HasValue && !filter.DateTo.HasValue) || (!filter.DateFrom.HasValue && filter.DateTo.HasValue))
            {
                throw new InvalidOperationException("Please select both a start and end date, or leave the date range empty.");
            }
            if (filter.DateFrom.HasValue && filter.DateTo.HasValue && filter.DateFrom.Value > filter.DateTo.Value)
            {
                throw new InvalidOperationException("Invalid filter combination: the start date must be before the end date.");
            }
            if (filter.AmountMin.HasValue && filter.AmountMax.HasValue && filter.AmountMin.Value > filter.AmountMax.Value)
            {
                throw new InvalidOperationException("Invalid filter combination: the minimum amount must be less than the maximum amount.");
            }

            var hasAnyFilter = filter.DateFrom.HasValue || filter.DateTo.HasValue ||
                !string.IsNullOrWhiteSpace(filter.Bank) || !string.IsNullOrWhiteSpace(filter.Province) ||
                !string.IsNullOrWhiteSpace(filter.City) || !string.IsNullOrWhiteSpace(filter.Business) ||
                !string.IsNullOrWhiteSpace(filter.Scheme) || !string.IsNullOrWhiteSpace(filter.Status) ||
                filter.AmountMin.HasValue || filter.AmountMax.HasValue;
            if (!hasAnyFilter)
            {
                throw new InvalidOperationException("Select a date range or at least one filter to generate a custom report.");
            }
        }

        private static List<Application> ApplyFilter(List<Application> apps, ReportFilterViewModel filter)
        {
            IEnumerable<Application> q = apps;
            if (filter.DateFrom.HasValue)
            {
                var from = filter.DateFrom.Value.Date;
                q = q.Where(a => (a.SubmittedOn ?? a.CreatedOn).Date >= from);
            }
            if (filter.DateTo.HasValue)
            {
                var to = filter.DateTo.Value.Date;
                q = q.Where(a => (a.SubmittedOn ?? a.CreatedOn).Date <= to);
            }
            if (!string.IsNullOrWhiteSpace(filter.Bank))
                q = q.Where(a => string.Equals(BankOf(a), filter.Bank, StringComparison.OrdinalIgnoreCase));
            if (!string.IsNullOrWhiteSpace(filter.Province))
                q = q.Where(a => string.Equals(ProvinceOf(a), filter.Province, StringComparison.OrdinalIgnoreCase));
            if (!string.IsNullOrWhiteSpace(filter.City))
                q = q.Where(a => string.Equals(CityOf(a), filter.City, StringComparison.OrdinalIgnoreCase));
            if (!string.IsNullOrWhiteSpace(filter.Business))
                q = q.Where(a => (a.Business?.Name ?? "").IndexOf(filter.Business, StringComparison.OrdinalIgnoreCase) >= 0);
            if (!string.IsNullOrWhiteSpace(filter.Scheme))
                q = q.Where(a => string.Equals(SchemeOf(a), filter.Scheme, StringComparison.OrdinalIgnoreCase));
            if (!string.IsNullOrWhiteSpace(filter.Status))
                q = q.Where(a => IsStatus(a, filter.Status));
            if (filter.AmountMin.HasValue)
                q = q.Where(a => a.RequestedAmount >= filter.AmountMin.Value);
            if (filter.AmountMax.HasValue)
                q = q.Where(a => a.RequestedAmount <= filter.AmountMax.Value);
            return q.ToList();
        }

        private static List<string> DescribeFilterLines(ReportFilterViewModel filter)
        {
            var lines = new List<string>();
            if (filter == null) return lines;
            if (filter.DateFrom.HasValue || filter.DateTo.HasValue)
                lines.Add($"Date: {(filter.DateFrom?.ToString("yyyy-MM-dd") ?? "any")} to {(filter.DateTo?.ToString("yyyy-MM-dd") ?? "any")}");
            if (!string.IsNullOrWhiteSpace(filter.Bank)) lines.Add($"Bank: {filter.Bank}");
            if (!string.IsNullOrWhiteSpace(filter.Province)) lines.Add($"Province: {filter.Province}");
            if (!string.IsNullOrWhiteSpace(filter.City)) lines.Add($"City: {filter.City}");
            if (!string.IsNullOrWhiteSpace(filter.Business)) lines.Add($"Business: {filter.Business}");
            if (!string.IsNullOrWhiteSpace(filter.Scheme)) lines.Add($"Scheme: {filter.Scheme}");
            if (!string.IsNullOrWhiteSpace(filter.Status)) lines.Add($"Status: {filter.Status}");
            if (filter.AmountMin.HasValue || filter.AmountMax.HasValue)
                lines.Add($"Amount: {(filter.AmountMin?.ToString("N0") ?? "any")} to {(filter.AmountMax?.ToString("N0") ?? "any")}");
            return lines;
        }

        private static string DescribeFilter(ReportFilterViewModel filter)
        {
            var lines = DescribeFilterLines(filter);
            return lines.Count == 0 ? "No filters" : string.Join("; ", lines);
        }

        // ── Shared field accessors (real, "Not Provided" for missing - never dropped) ─────────
        private static string BankOf(Application a) => string.IsNullOrWhiteSpace(a.Business?.Bank) ? "Not Provided" : a.Business.Bank;
        private static string SchemeOf(Application a) => string.IsNullOrWhiteSpace(a.Scheme) ? "Not Provided" : a.Scheme;
        private static string ProvinceOf(Application a) => string.IsNullOrWhiteSpace(a.Business?.Province) ? "Not Provided" : a.Business.Province;
        private static string CityOf(Application a) => string.IsNullOrWhiteSpace(a.Business?.City) ? "Not Provided" : a.Business.City;

        private static string SectorOf(Application a)
        {
            if (!string.IsNullOrWhiteSpace(a.BusinessSector)) return a.BusinessSector;
            return string.IsNullOrWhiteSpace(a.Business?.Nature) ? "Not Provided" : a.Business.Nature;
        }

        private static string RejectionReasonOf(Application a)
        {
            var row = (a.StatusHistory ?? new List<ApplicationStatusHistory>())
                .Where(h => string.Equals(h.Status, "rejected", StringComparison.OrdinalIgnoreCase))
                .OrderByDescending(h => h.CreatedOn)
                .FirstOrDefault();
            return row != null && !string.IsNullOrWhiteSpace(row.Note) ? row.Note.Trim() : "No reason provided";
        }

        private static DateTime StatusDateOf(Application a, string status)
        {
            var row = (a.StatusHistory ?? new List<ApplicationStatusHistory>())
                .Where(h => string.Equals(h.Status, status, StringComparison.OrdinalIgnoreCase))
                .OrderByDescending(h => h.CreatedOn)
                .FirstOrDefault();
            return row?.CreatedOn ?? a.UpdatedOn ?? a.CreatedOn;
        }

        private static DateTime MonthOf(DateTime d) => new DateTime(d.Year, d.Month, 1);

        private static decimal DisbursedAmountOf(Application a) => a.OfferApprovedAmount ?? 0m;

        private static double? OverallProcessingDays(Application a)
        {
            var history = (a.StatusHistory ?? new List<ApplicationStatusHistory>()).OrderBy(h => h.CreatedOn).ToList();
            if (history.Count < 2) return null;
            return (history[history.Count - 1].CreatedOn - history[0].CreatedOn).TotalDays;
        }

        private static IEnumerable<(string From, string To, double Days)> GetTransitions(Application a)
        {
            var history = (a.StatusHistory ?? new List<ApplicationStatusHistory>()).OrderBy(h => h.CreatedOn).ToList();
            for (var i = 1; i < history.Count; i++)
            {
                yield return (history[i - 1].Status, history[i].Status, (history[i].CreatedOn - history[i - 1].CreatedOn).TotalDays);
            }
        }

        private static string StatusLabel(string status)
        {
            switch ((status ?? "").ToLowerInvariant())
            {
                case "under_review": return "Under Review";
                case "approved": return "Approved";
                case "rejected": return "Rejected";
                case "offer_issued": return "Offer Issued";
                case "disbursed": return "Disbursed";
                case "submitted": return "Submitted";
                default: return string.IsNullOrWhiteSpace(status) ? "Unknown" : status;
            }
        }

        private static bool IsStatus(Application application, string status)
        {
            return string.Equals(application.Status, status, StringComparison.OrdinalIgnoreCase);
        }

        private static decimal Rate(int numerator, int denominator)
        {
            if (denominator <= 0) return 0m;
            return Math.Round((decimal)numerator / denominator * 100m, 1);
        }
    }
}
