using System.Collections.Generic;
using System.Data.Entity;
using System.Linq;
using System.Threading.Tasks;
using SmePortal.Web.DAL;

namespace SmePortal.Web.Repositories
{
    public class ApplicationRepository : IApplicationRepository
    {
        private readonly ApplicationDbContext _db;

        public ApplicationRepository(ApplicationDbContext db)
        {
            _db = db;
        }

        public async Task<List<Models.Application>> GetByBusinessIdsAsync(IEnumerable<int> businessIds)
        {
            var ids = businessIds as ICollection<int> ?? businessIds.ToList();
            if (ids.Count == 0) return new List<Models.Application>();

            return await _db.Applications
                .Include(a => a.Business)
                .Where(a => ids.Contains(a.BusinessId))
                .OrderByDescending(a => a.CreatedOn)
                .ToListAsync();
        }

        public async Task<Models.Application> GetByIdAsync(int applicationId)
        {
            return await _db.Applications
                .Include(a => a.Business)
                .Include(a => a.StatusHistory)
                .FirstOrDefaultAsync(a => a.ApplicationId == applicationId);
        }

        public async Task<Models.Application> AddAsync(Models.Application application)
        {
            _db.Applications.Add(application);
            await _db.SaveChangesAsync();
            return application;
        }

        public Task SaveChangesAsync()
        {
            return _db.SaveChangesAsync();
        }

        public async Task AddStatusHistoryAsync(Models.ApplicationStatusHistory history)
        {
            _db.ApplicationStatusHistories.Add(history);
            await _db.SaveChangesAsync();
        }

        public Task<int> CountByBusinessIdAsync(int businessId)
        {
            return _db.Applications.CountAsync(a => a.BusinessId == businessId);
        }
    }
}
