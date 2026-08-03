using System.Collections.Generic;
using System.Threading.Tasks;
using System.Web;
using SmePortal.Web.ViewModels;

namespace SmePortal.Web.Services
{
    public interface IAuditService
    {
        Task LogAsync(int? userId, string action, HttpRequestBase request);

        // Audit Trail (SBP Admin Portal) - every real audit log, system-wide. Filtering/search
        // happen client-side against this one fetched list, same convention as every other real
        // SBP Admin page (Dashboard/Applications/Users/Banks/Reports history).
        Task<List<AuditLogViewModel>> GetAuditLogsAsync();
    }
}
