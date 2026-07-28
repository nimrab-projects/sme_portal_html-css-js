using System;
using System.Data.Entity;
using System.Linq;
using System.Threading.Tasks;
using SmePortal.Web.DAL;
using SmePortal.Web.Models;

namespace SmePortal.Web.Repositories
{
    public class OtpRepository : IOtpRepository
    {
        private readonly ApplicationDbContext _db;

        public OtpRepository(ApplicationDbContext db)
        {
            _db = db;
        }

        public async Task<EmailOtp> AddAsync(EmailOtp otp)
        {
            _db.EmailOtps.Add(otp);
            await _db.SaveChangesAsync();
            return otp;
        }

        public Task<EmailOtp> GetLatestActiveAsync(int userId, string purpose)
        {
            return _db.EmailOtps
                .Where(o => o.UserId == userId && o.Purpose == purpose && !o.IsUsed && o.ExpiresOn > DateTime.UtcNow)
                .OrderByDescending(o => o.CreatedOn)
                .FirstOrDefaultAsync();
        }

        public Task SaveChangesAsync()
        {
            return _db.SaveChangesAsync();
        }
    }
}
