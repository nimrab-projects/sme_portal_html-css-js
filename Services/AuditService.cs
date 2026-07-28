using System.Threading.Tasks;
using System.Web;
using SmePortal.Web.Helpers;
using SmePortal.Web.Models;
using SmePortal.Web.Repositories;

namespace SmePortal.Web.Services
{
    public class AuditService : IAuditService
    {
        private readonly IAuditLogRepository _auditLogRepository;

        public AuditService(IAuditLogRepository auditLogRepository)
        {
            _auditLogRepository = auditLogRepository;
        }

        public Task LogAsync(int? userId, string action, HttpRequestBase request)
        {
            var log = new AuditLog
            {
                UserId = userId,
                Action = action,
                IPAddress = IpAddressHelper.GetClientIp(request),
                Browser = IpAddressHelper.GetUserAgent(request),
            };
            return _auditLogRepository.AddAsync(log);
        }
    }
}
