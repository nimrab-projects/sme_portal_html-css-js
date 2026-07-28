using System;
using System.Threading.Tasks;
using System.Web;
using System.Web.Mvc;
using Microsoft.AspNet.Identity;
using SmePortal.Web.Filters;
using SmePortal.Web.Repositories;
using SmePortal.Web.Services;

namespace SmePortal.Web.Controllers
{
    // JSON API for Application Document upload/view/replace/delete (Phase 9). A separate
    // controller from ApplicationController (which already houses the JSON application API
    // plus the Details/Tracking/Index page actions from Phases 7-8) - documents are a distinct
    // resource with their own service/repository, so a dedicated thin controller here keeps
    // each class focused (SOLID's single-responsibility) rather than growing
    // ApplicationController further. Ownership is still verified through the exact same
    // IApplicationService.GetApplicationDetailAsync used everywhere else - DocumentService
    // depends on it rather than re-deriving the Application -> Business -> UserId join.
    [RoutePrefix("api/applications/{applicationId:int}/documents")]
    [Authorize]
    public class DocumentController : ApiControllerBase
    {
        // App_Data is never served as a static file by IIS/ASP.NET (unlike Content/Scripts in
        // this project, which are served directly) - that's what actually keeps uploaded
        // documents from being reachable except through this controller's own auth-checked
        // Download action. Setup.md's suggested "/Uploads" at the site root would have been
        // directly web-servable, bypassing every ownership check below.
        private string UploadsRootPath => Server.MapPath("~/App_Data/Uploads");

        private INotificationService NotificationService => new NotificationService(new NotificationRepository(Db));

        private IApplicationService ApplicationService =>
            new ApplicationService(new ApplicationRepository(Db), new BusinessRepository(Db), new UserRepository(Db), NotificationService);

        private IDocumentService DocumentService =>
            new DocumentService(new DocumentRepository(Db), ApplicationService, NotificationService, UploadsRootPath);

        private int CurrentUserId => Convert.ToInt32(User.Identity.GetUserId());

        [Route("")]
        [HttpGet]
        public async Task<ActionResult> List(int applicationId)
        {
            var documents = await DocumentService.GetDocumentsAsync(CurrentUserId, applicationId);
            if (documents == null) return new HttpNotFoundResult();
            return JsonCamel(new { documents });
        }

        [Route("")]
        [HttpPost]
        [ValidateAjaxAntiForgeryToken]
        public async Task<ActionResult> Upload(int applicationId, HttpPostedFileBase file, string documentType)
        {
            try
            {
                var document = await DocumentService.UploadAsync(CurrentUserId, applicationId, documentType, file);
                if (document == null) return new HttpNotFoundResult();
                return JsonCamel(new { success = true, document });
            }
            catch (InvalidOperationException ex)
            {
                return JsonCamel(new { success = false, error = "invalid_upload", message = ex.Message });
            }
        }

        [Route("{id:int}/replace")]
        [HttpPost]
        [ValidateAjaxAntiForgeryToken]
        public async Task<ActionResult> Replace(int applicationId, int id, HttpPostedFileBase file)
        {
            try
            {
                var document = await DocumentService.ReplaceAsync(CurrentUserId, applicationId, id, file);
                if (document == null) return new HttpNotFoundResult();
                return JsonCamel(new { success = true, document });
            }
            catch (InvalidOperationException ex)
            {
                return JsonCamel(new { success = false, error = "invalid_upload", message = ex.Message });
            }
        }

        [Route("{id:int}")]
        [HttpDelete]
        [ValidateAjaxAntiForgeryToken]
        public async Task<ActionResult> Delete(int applicationId, int id)
        {
            try
            {
                var deleted = await DocumentService.DeleteAsync(CurrentUserId, applicationId, id);
                if (!deleted) return new HttpNotFoundResult();
                return JsonCamel(new { success = true });
            }
            catch (InvalidOperationException ex)
            {
                return JsonCamel(new { success = false, error = "delete_not_allowed", message = ex.Message });
            }
        }

        [Route("{id:int}/download")]
        [HttpGet]
        public async Task<ActionResult> Download(int applicationId, int id)
        {
            var info = await DocumentService.GetDownloadInfoAsync(CurrentUserId, applicationId, id);
            if (info == null) return new HttpNotFoundResult();
            return File(info.PhysicalPath, info.ContentType, info.OriginalFileName);
        }
    }
}
