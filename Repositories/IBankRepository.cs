using System.Collections.Generic;
using System.Threading.Tasks;
using SmePortal.Web.Models;

namespace SmePortal.Web.Repositories
{
    public interface IBankRepository
    {
        Task<List<Bank>> GetAllAsync();
        Task<Bank> GetByIdAsync(int id);

        // excludeId lets Update check "does another bank already use this name/code" without
        // the bank being edited always colliding with itself.
        Task<bool> NameExistsAsync(string name, int? excludeId);
        Task<bool> CodeExistsAsync(string code, int? excludeId);

        Task AddAsync(Bank bank);
        Task SaveChangesAsync();
    }
}
