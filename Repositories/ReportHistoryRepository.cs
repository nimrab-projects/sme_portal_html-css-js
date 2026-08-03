using System.Collections.Generic;
using System.Data.Entity;
using System.Linq;
using System.Threading.Tasks;
using SmePortal.Web.DAL;
using SmePortal.Web.Models;

namespace SmePortal.Web.Repositories
{
    public class ReportHistoryRepository : IReportHistoryRepository
    {
        private readonly ApplicationDbContext _db;

        public ReportHistoryRepository(ApplicationDbContext db)
        {
            _db = db;
        }

        public async Task<List<ReportHistory>> GetAllAsync()
        {
            return await _db.ReportHistories
                .Include(h => h.GeneratedByUser)
                .OrderByDescending(h => h.GeneratedOn)
                .ToListAsync();
        }

        public Task<ReportHistory> GetByIdAsync(int id)
        {
            return _db.ReportHistories.FirstOrDefaultAsync(h => h.ReportHistoryId == id);
        }

        public async Task AddAsync(ReportHistory history)
        {
            _db.ReportHistories.Add(history);
            await _db.SaveChangesAsync();
        }
    }
}
