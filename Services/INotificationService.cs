using System.Collections.Generic;
using System.Threading.Tasks;
using SmePortal.Web.ViewModels;

namespace SmePortal.Web.Services
{
    public interface INotificationService
    {
        // Called from within other services at the exact moment a real event happens
        // (BusinessService.SaveBusinessAsync, ApplicationService.SubmitApplicationAsync,
        // DocumentService.UploadAsync) or from a controller for the two events that were
        // already controller-level orchestration around ASP.NET Identity directly
        // (AccountController.VerifyOtp, ProfileController.ChangePasswordApi) - never a
        // duplicate implementation of "how to create a notification", just called from
        // wherever each event already actually occurs.
        Task CreateNotificationAsync(int userId, string title, string message, string notificationType,
            int? referenceId = null, string referenceType = null, int? createdBy = null);

        Task<List<NotificationViewModel>> GetMyNotificationsAsync(int userId);
        Task<int> GetUnreadCountAsync(int userId);

        // False means "not found / not yours" (404) - same convention as
        // ApplicationService.GetApplicationDetailAsync's ownership handling.
        Task<bool> MarkAsReadAsync(int userId, int notificationId);

        Task MarkAllAsReadAsync(int userId);
    }
}
