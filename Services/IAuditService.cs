using System.Threading.Tasks;
using System.Web;

namespace SmePortal.Web.Services
{
    public interface IAuditService
    {
        Task LogAsync(int? userId, string action, HttpRequestBase request);
    }
}
