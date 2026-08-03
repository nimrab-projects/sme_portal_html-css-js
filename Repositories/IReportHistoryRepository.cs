using System.Collections.Generic;
using System.Threading.Tasks;
using SmePortal.Web.Models;

namespace SmePortal.Web.Repositories
{
    public interface IReportHistoryRepository
    {
        Task<List<ReportHistory>> GetAllAsync();
        Task<ReportHistory> GetByIdAsync(int id);
        Task AddAsync(ReportHistory history);
    }
}
