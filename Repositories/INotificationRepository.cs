using System.Collections.Generic;
using System.Threading.Tasks;
using SmePortal.Web.Models;

namespace SmePortal.Web.Repositories
{
    public interface INotificationRepository
    {
        Task<List<Notification>> GetByUserIdAsync(int userId);
        Task<int> GetUnreadCountAsync(int userId);

        // Scoped to a specific user (not just NotificationId) for the same reason
        // IDocumentRepository.GetByIdAsync is scoped to a specific application - a caller can
        // never load another user's notification by guessing its id, even if the ownership
        // check one layer up were ever skipped.
        Task<Notification> GetByIdAsync(int userId, int notificationId);

        Task<Notification> AddAsync(Notification notification);
        Task MarkAllAsReadAsync(int userId);
        Task SaveChangesAsync();
    }
}
