using System.Collections.Generic;
using System.Data.Entity;
using System.Threading.Tasks;
using SmePortal.Web.DAL;
using SmePortal.Web.Models;

namespace SmePortal.Web.Repositories
{
    public class BankRepository : IBankRepository
    {
        private readonly ApplicationDbContext _db;

        public BankRepository(ApplicationDbContext db)
        {
            _db = db;
        }

        public async Task<List<Bank>> GetAllAsync()
        {
            return await _db.Banks.ToListAsync();
        }

        public Task<Bank> GetByIdAsync(int id)
        {
            return _db.Banks.FirstOrDefaultAsync(b => b.BankId == id);
        }

        public Task<bool> NameExistsAsync(string name, int? excludeId)
        {
            return _db.Banks.AnyAsync(b => b.Name == name && (!excludeId.HasValue || b.BankId != excludeId.Value));
        }

        public Task<bool> CodeExistsAsync(string code, int? excludeId)
        {
            return _db.Banks.AnyAsync(b => b.Code == code && (!excludeId.HasValue || b.BankId != excludeId.Value));
        }

        public async Task AddAsync(Bank bank)
        {
            _db.Banks.Add(bank);
            await _db.SaveChangesAsync();
        }

        public Task SaveChangesAsync()
        {
            return _db.SaveChangesAsync();
        }
    }
}
