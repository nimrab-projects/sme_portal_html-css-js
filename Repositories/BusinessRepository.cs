using System.Collections.Generic;
using System.Data.Entity;
using System.Linq;
using System.Threading.Tasks;
using SmePortal.Web.DAL;
using SmePortal.Web.Models;

namespace SmePortal.Web.Repositories
{
    public class BusinessRepository : IBusinessRepository
    {
        private readonly ApplicationDbContext _db;

        public BusinessRepository(ApplicationDbContext db)
        {
            _db = db;
        }

        public Task<int> CountByUserIdAsync(int userId)
        {
            return _db.Businesses.CountAsync(b => b.UserId == userId);
        }

        public async Task<List<Business>> GetByUserIdAsync(int userId)
        {
            return await _db.Businesses
                .Include(b => b.Shareholders)
                .Where(b => b.UserId == userId)
                .OrderBy(b => b.CreatedOn)
                .ToListAsync();
        }

        public async Task<Business> AddAsync(Business business)
        {
            _db.Businesses.Add(business);
            await _db.SaveChangesAsync();
            return business;
        }

        public Task<Business> GetByIdAsync(int businessId)
        {
            return _db.Businesses
                .Include(b => b.Shareholders)
                .FirstOrDefaultAsync(b => b.BusinessId == businessId);
        }

        public Task SaveChangesAsync()
        {
            return _db.SaveChangesAsync();
        }

        public Task DeleteAsync(Business business)
        {
            _db.Businesses.Remove(business);
            return _db.SaveChangesAsync();
        }

        public async Task ReplaceShareholdersAsync(int businessId, List<Shareholder> newShareholders)
        {
            var existing = await _db.Shareholders.Where(s => s.BusinessId == businessId).ToListAsync();
            _db.Shareholders.RemoveRange(existing);

            foreach (var shareholder in newShareholders)
            {
                shareholder.BusinessId = businessId;
                _db.Shareholders.Add(shareholder);
            }

            await _db.SaveChangesAsync();
        }
    }
}
