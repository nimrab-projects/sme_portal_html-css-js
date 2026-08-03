using System;
using System.Collections.Generic;
using System.Data.Entity;
using System.Linq;
using System.Threading.Tasks;
using SmePortal.Web.DAL;
using SmePortal.Web.Models;

namespace SmePortal.Web.Repositories
{
    public class UserRepository : IUserRepository
    {
        private readonly ApplicationDbContext _db;

        public UserRepository(ApplicationDbContext db)
        {
            _db = db;
        }

        public Task<bool> EmailExistsAsync(string email)
        {
            return _db.Users.AnyAsync(u => u.Email == email);
        }

        public Task<bool> MobileExistsAsync(string mobile)
        {
            return _db.Users.AnyAsync(u => u.Mobile == mobile);
        }

        public Task<bool> MobileExistsForOtherUserAsync(int userId, string mobile)
        {
            return _db.Users.AnyAsync(u => u.Mobile == mobile && u.Id != userId);
        }

        public async Task<List<string>> GetRoleNamesAsync(int userId)
        {
            var roleIds = await _db.Users
                .Where(u => u.Id == userId)
                .SelectMany(u => u.Roles.Select(r => r.RoleId))
                .ToListAsync();
            if (roleIds.Count == 0) return new List<string>();

            return await _db.Roles.Where(r => roleIds.Contains(r.Id)).Select(r => r.Name).ToListAsync();
        }

        public Task<ApplicationUser> GetByEmailAsync(string email)
        {
            return _db.Users.FirstOrDefaultAsync(u => u.Email == email);
        }

        public Task<ApplicationUser> GetByGoogleIdAsync(string googleId)
        {
            return _db.Users.FirstOrDefaultAsync(u => u.GoogleId == googleId);
        }

        public Task<ApplicationUser> GetByIdAsync(int userId)
        {
            return _db.Users.FirstOrDefaultAsync(u => u.Id == userId);
        }

        public async Task MarkFirstLoginCompleteAsync(int userId)
        {
            // Users is IDbSet<ApplicationUser> here (Identity's DbContext base), which has no
            // FindAsync - that extension only exists on the concrete DbSet<T> type.
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null || !user.IsFirstLogin) return;

            user.IsFirstLogin = false;
            user.UpdatedOn = DateTime.UtcNow;
            await _db.SaveChangesAsync();
        }

        public Task SaveChangesAsync()
        {
            return _db.SaveChangesAsync();
        }

        public async Task<List<ApplicationUser>> GetAllAsync()
        {
            return await _db.Users.ToListAsync();
        }

        public async Task<Dictionary<int, List<string>>> GetAllUserRoleNamesAsync()
        {
            var pairs = await (
                from u in _db.Users
                from ur in u.Roles
                join r in _db.Roles on ur.RoleId equals r.Id
                select new { UserId = u.Id, RoleName = r.Name }
            ).ToListAsync();

            return pairs
                .GroupBy(p => p.UserId)
                .ToDictionary(g => g.Key, g => g.Select(p => p.RoleName).ToList());
        }
    }
}
