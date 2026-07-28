using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Threading.Tasks;
using SmePortal.Web.Repositories;
using SmePortal.Web.ViewModels;

namespace SmePortal.Web.Services
{
    public class NotificationService : INotificationService
    {
        private readonly INotificationRepository _notificationRepository;

        public NotificationService(INotificationRepository notificationRepository)
        {
            _notificationRepository = notificationRepository;
        }

        public async Task CreateNotificationAsync(int userId, string title, string message, string notificationType,
            int? referenceId = null, string referenceType = null, int? createdBy = null)
        {
            await _notificationRepository.AddAsync(new Models.Notification
            {
                UserId = userId,
                Title = title,
                Message = message,
                NotificationType = notificationType,
                ReferenceId = referenceId,
                ReferenceType = referenceType,
                IsRead = false,
                CreatedOn = DateTime.UtcNow,
                CreatedBy = createdBy,
            });
        }

        public async Task<List<NotificationViewModel>> GetMyNotificationsAsync(int userId)
        {
            var notifications = await _notificationRepository.GetByUserIdAsync(userId);
            return notifications.Select(Map).ToList();
        }

        public Task<int> GetUnreadCountAsync(int userId)
        {
            return _notificationRepository.GetUnreadCountAsync(userId);
        }

        public async Task<bool> MarkAsReadAsync(int userId, int notificationId)
        {
            var notification = await _notificationRepository.GetByIdAsync(userId, notificationId);
            if (notification == null) return false;

            if (!notification.IsRead)
            {
                notification.IsRead = true;
                notification.ReadOn = DateTime.UtcNow;
                await _notificationRepository.SaveChangesAsync();
            }
            return true;
        }

        public Task MarkAllAsReadAsync(int userId)
        {
            return _notificationRepository.MarkAllAsReadAsync(userId);
        }

        private static NotificationViewModel Map(Models.Notification n)
        {
            return new NotificationViewModel
            {
                Id = n.NotificationId.ToString(),
                Title = n.Title,
                Desc = n.Message,
                Date = n.CreatedOn.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                Time = n.CreatedOn.ToString("HH:mm", CultureInfo.InvariantCulture),
                Read = n.IsRead,
                NotificationType = n.NotificationType,
                ReferenceId = n.ReferenceId?.ToString(),
                ReferenceType = n.ReferenceType,
            };
        }
    }
}
