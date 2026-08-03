using System.Collections.Generic;
using System.Threading.Tasks;
using SmePortal.Web.Models;

namespace SmePortal.Web.Repositories
{
    public interface IAuditLogRepository
    {
        Task AddAsync(AuditLog log);

        // Audit Trail (SBP Admin Portal) - the one place system-wide, unscoped access is
        // legitimate, same reasoning as every other GetAllAsync() in this app.
        Task<List<AuditLog>> GetAllAsync();
    }
}
