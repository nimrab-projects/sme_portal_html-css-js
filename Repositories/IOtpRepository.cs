using System.Threading.Tasks;
using SmePortal.Web.Models;

namespace SmePortal.Web.Repositories
{
    public interface IOtpRepository
    {
        Task<EmailOtp> AddAsync(EmailOtp otp);
        Task<EmailOtp> GetLatestActiveAsync(int userId, string purpose);
        Task SaveChangesAsync();
    }
}
