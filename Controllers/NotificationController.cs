using System;
using System.Threading.Tasks;
using System.Web.Mvc;
using Microsoft.AspNet.Identity;
using SmePortal.Web.Filters;
using SmePortal.Web.Repositories;
using SmePortal.Web.Services;

namespace SmePortal.Web.Controllers
{
    // Notifications & Communication (Phase 11). Same "page action + JSON API on one thin
    // controller" pattern as ApplicationController/DocumentController.
    [Authorize]
    public class NotificationController : ApiControllerBase
    {
        private INotificationService NotificationService => new NotificationService(new NotificationRepository(Db));

        private int CurrentUserId => Convert.ToInt32(User.Identity.GetUserId());

        // GET /Notifications -> Views/Notification/Index.cshtml (Notification Center).
        [Route("Notifications")]
        [HttpGet]
        public ActionResult Index()
        {
            return View();
        }

        [Route("api/notifications/mine")]
        [HttpGet]
        public async Task<ActionResult> Mine()
        {
            var notifications = await NotificationService.GetMyNotificationsAsync(CurrentUserId);
            return JsonCamel(new { notifications });
        }

        [Route("api/notifications/unread-count")]
        [HttpGet]
        public async Task<ActionResult> UnreadCount()
        {
            var count = await NotificationService.GetUnreadCountAsync(CurrentUserId);
            return JsonCamel(new { count });
        }

        // Ownership-checked via CurrentUserId inside the service - a manually-typed id
        // belonging to another user 404s rather than silently succeeding or leaking existence.
        [Route("api/notifications/{id:int}/read")]
        [HttpPost]
        [ValidateAjaxAntiForgeryToken]
        public async Task<ActionResult> MarkAsRead(int id)
        {
            var ok = await NotificationService.MarkAsReadAsync(CurrentUserId, id);
            if (!ok) return new HttpNotFoundResult();
            return JsonCamel(new { success = true });
        }

        [Route("api/notifications/read-all")]
        [HttpPost]
        [ValidateAjaxAntiForgeryToken]
        public async Task<ActionResult> MarkAllAsRead()
        {
            await NotificationService.MarkAllAsReadAsync(CurrentUserId);
            return JsonCamel(new { success = true });
        }
    }
}
