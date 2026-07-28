using System;
using System.Collections.Generic;
using System.Data.Entity;
using System.Linq;
using System.Threading.Tasks;
using SmePortal.Web.DAL;
using SmePortal.Web.Models;

namespace SmePortal.Web.Repositories
{
    public class NotificationRepository : INotificationRepository
    {
        private readonly ApplicationDbContext _db;

        public NotificationRepository(ApplicationDbContext db)
        {
            _db = db;
        }

        public async Task<List<Notification>> GetByUserIdAsync(int userId)
        {
            return await _db.Notifications
                .Where(n => n.UserId == userId)
                .OrderByDescending(n => n.CreatedOn)
                .ToListAsync();
        }

        public Task<int> GetUnreadCountAsync(int userId)
        {
            return _db.Notifications.CountAsync(n => n.UserId == userId && !n.IsRead);
        }

        public Task<Notification> GetByIdAsync(int userId, int notificationId)
        {
            return _db.Notifications.FirstOrDefaultAsync(n => n.UserId == userId && n.NotificationId == notificationId);
        }

        public async Task<Notification> AddAsync(Notification notification)
        {
            _db.Notifications.Add(notification);
            await _db.SaveChangesAsync();
            return notification;
        }

        public async Task MarkAllAsReadAsync(int userId)
        {
            var unread = await _db.Notifications.Where(n => n.UserId == userId && !n.IsRead).ToListAsync();
            var now = DateTime.UtcNow;
            foreach (var n in unread)
            {
                n.IsRead = true;
                n.ReadOn = now;
            }
            await _db.SaveChangesAsync();
        }

        public Task SaveChangesAsync()
        {
            return _db.SaveChangesAsync();
        }
    }
}
