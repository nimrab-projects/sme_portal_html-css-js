using System.Threading.Tasks;
using SmePortal.Web.Models;

namespace SmePortal.Web.Repositories
{
    public interface IAuditLogRepository
    {
        Task AddAsync(AuditLog log);
    }
}
