using System.Threading.Tasks;
using SmePortal.Web.DAL;
using SmePortal.Web.Models;

namespace SmePortal.Web.Repositories
{
    public class AuditLogRepository : IAuditLogRepository
    {
        private readonly ApplicationDbContext _db;

        public AuditLogRepository(ApplicationDbContext db)
        {
            _db = db;
        }

        public async Task AddAsync(AuditLog log)
        {
            _db.AuditLogs.Add(log);
            await _db.SaveChangesAsync();
        }
    }
}
