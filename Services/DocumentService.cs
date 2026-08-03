using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using System.Web;
using SmePortal.Web.Repositories;
using SmePortal.Web.ViewModels;

namespace SmePortal.Web.Services
{
    public class DocumentService : IDocumentService
    {
        // Statuses at/after which the review has concluded and a bank has already acted on the
        // submitted document set - deleting past this point could pull a file out from under a
        // decision already made. "under_review" is deliberately NOT included here even though a
        // new application starts there immediately on submission (see
        // ApplicationService.SubmitApplicationAsync): the real document upload only ever happens
        // post-submission from the Application Details page (there is no separate upload step in
        // the New Application wizard itself), so applicants still need to be able to
        // upload/replace/delete documents while their application is under review, right up
        // until a bank actually decides it.
        private static readonly HashSet<string> StatusesLockingDocuments =
            new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "approved", "rejected", "disbursed" };

        // Matches the existing frontend's own <input accept=".pdf,.jpg,.jpeg,.png"> exactly
        // (js/pages/sme/newApplication.js) - not a new, separately-invented allow-list. This is
        // also what rejects executable file types: nothing outside this map is ever accepted,
        // an allow-list being strictly safer than trying to deny-list dangerous extensions.
        private static readonly Dictionary<string, string> AllowedExtensions =
            new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
            {
                { ".pdf", "application/pdf" },
                { ".jpg", "image/jpeg" },
                { ".jpeg", "image/jpeg" },
                { ".png", "image/png" },
            };

        // Matches the existing frontend's own advertised "up to 10MB each" copy on the
        // Document Upload step - not a new limit invented for this phase.
        private const long MaxFileSizeBytes = 10L * 1024 * 1024;

        private readonly IDocumentRepository _documentRepository;
        private readonly IApplicationService _applicationService;
        private readonly INotificationService _notificationService;
        private readonly string _uploadsRootPath;

        public DocumentService(IDocumentRepository documentRepository, IApplicationService applicationService,
            INotificationService notificationService, string uploadsRootPath)
        {
            _documentRepository = documentRepository;
            _applicationService = applicationService;
            _notificationService = notificationService;
            _uploadsRootPath = uploadsRootPath;
        }

        public async Task<List<ApplicationDocumentViewModel>> GetDocumentsAsync(int userId, int applicationId)
        {
            var detail = await _applicationService.GetApplicationDetailAsync(userId, applicationId);
            if (detail == null) return null;

            var documents = await _documentRepository.GetByApplicationIdAsync(applicationId);
            return documents.Select(Map).ToList();
        }

        public async Task<ApplicationDocumentViewModel> UploadAsync(int userId, int applicationId, string documentType, HttpPostedFileBase file)
        {
            var detail = await _applicationService.GetApplicationDetailAsync(userId, applicationId);
            if (detail == null) return null;

            if (string.IsNullOrWhiteSpace(documentType))
            {
                throw new InvalidOperationException("Document type is required.");
            }

            var extension = ValidateFile(file);

            // Duplicate-upload rule: one file per document type per application - the existing
            // frontend's own UI already reflects this (its Upload button turns into Replace the
            // moment a file is attached for that slot); this just enforces it server-side too.
            var existingForType = await _documentRepository.GetByApplicationAndTypeAsync(applicationId, documentType);
            if (existingForType != null)
            {
                throw new InvalidOperationException("A document of this type has already been uploaded. Use Replace to update it.");
            }

            var folder = EnsureApplicationFolder(detail.CaseId);
            var storedFileName = Guid.NewGuid().ToString("N") + extension;
            var physicalPath = Path.Combine(folder, storedFileName);

            await SaveFileAsync(file, physicalPath);

            var document = new Models.ApplicationDocument
            {
                ApplicationId = applicationId,
                DocumentType = documentType,
                OriginalFileName = SanitizeOriginalFileName(file.FileName),
                StoredFileName = storedFileName,
                ContentType = AllowedExtensions[extension],
                FileSize = file.ContentLength,
                StoragePath = RelativeStoragePath(detail.CaseId, storedFileName),
                UploadedByUserId = userId,
                UploadedOn = DateTime.UtcNow,
                Status = "pending_verification",
            };

            await _documentRepository.AddAsync(document);

            // ReferenceType "Application" (not "Document") - there is no standalone document
            // details page anywhere in this frontend; documents are shown on the Application
            // Details page's Documents card, so that's the real, working destination.
            await _notificationService.CreateNotificationAsync(
                userId, "Document Uploaded", $"{documentType} was uploaded successfully.",
                "DocumentUploaded", applicationId, "Application", userId);

            return Map(document);
        }

        public async Task<ApplicationDocumentViewModel> ReplaceAsync(int userId, int applicationId, int documentId, HttpPostedFileBase file)
        {
            var detail = await _applicationService.GetApplicationDetailAsync(userId, applicationId);
            if (detail == null) return null;

            var existing = await _documentRepository.GetByIdAsync(applicationId, documentId);
            if (existing == null) return null;

            if (StatusesLockingDocuments.Contains(detail.Status))
            {
                throw new InvalidOperationException("Documents can no longer be replaced once a decision has been made on this application.");
            }

            var extension = ValidateFile(file);

            var folder = EnsureApplicationFolder(detail.CaseId);
            var newStoredFileName = Guid.NewGuid().ToString("N") + extension;
            var newPhysicalPath = Path.Combine(folder, newStoredFileName);

            await SaveFileAsync(file, newPhysicalPath);

            // Best-effort cleanup of the old physical file - a failure here (e.g. file already
            // gone) must not block the metadata update, which is the source of truth.
            TryDeletePhysicalFile(existing.StoragePath);

            existing.OriginalFileName = SanitizeOriginalFileName(file.FileName);
            existing.StoredFileName = newStoredFileName;
            existing.ContentType = AllowedExtensions[extension];
            existing.FileSize = file.ContentLength;
            existing.StoragePath = RelativeStoragePath(detail.CaseId, newStoredFileName);
            existing.UploadedByUserId = userId;
            existing.UploadedOn = DateTime.UtcNow;
            existing.Status = "pending_verification";
            existing.Remarks = null;

            await _documentRepository.SaveChangesAsync();
            return Map(existing);
        }

        public async Task<bool> DeleteAsync(int userId, int applicationId, int documentId)
        {
            var detail = await _applicationService.GetApplicationDetailAsync(userId, applicationId);
            if (detail == null) return false;

            var existing = await _documentRepository.GetByIdAsync(applicationId, documentId);
            if (existing == null) return false;

            if (StatusesLockingDocuments.Contains(detail.Status))
            {
                throw new InvalidOperationException("Documents can no longer be deleted once a decision has been made on this application.");
            }

            TryDeletePhysicalFile(existing.StoragePath);
            await _documentRepository.DeleteAsync(existing);
            return true;
        }

        public async Task<DocumentDownloadInfo> GetDownloadInfoAsync(int userId, int applicationId, int documentId)
        {
            var detail = await _applicationService.GetApplicationDetailAsync(userId, applicationId);
            if (detail == null) return null;

            var existing = await _documentRepository.GetByIdAsync(applicationId, documentId);
            if (existing == null) return null;

            var physicalPath = Path.Combine(_uploadsRootPath, existing.StoragePath.Replace('/', Path.DirectorySeparatorChar));
            if (!File.Exists(physicalPath)) return null;

            return new DocumentDownloadInfo
            {
                PhysicalPath = physicalPath,
                OriginalFileName = existing.OriginalFileName,
                ContentType = existing.ContentType,
            };
        }

        public async Task<List<ApplicationDocumentViewModel>> GetDocumentsForBankAsync(string bankName, int applicationId)
        {
            var detail = await _applicationService.GetApplicationDetailForBankAsync(bankName, applicationId);
            if (detail == null) return null;

            var documents = await _documentRepository.GetByApplicationIdAsync(applicationId);
            return documents.Select(Map).ToList();
        }

        public async Task<DocumentDownloadInfo> GetDownloadInfoForBankAsync(string bankName, int applicationId, int documentId)
        {
            var detail = await _applicationService.GetApplicationDetailForBankAsync(bankName, applicationId);
            if (detail == null) return null;

            var existing = await _documentRepository.GetByIdAsync(applicationId, documentId);
            if (existing == null) return null;

            var physicalPath = Path.Combine(_uploadsRootPath, existing.StoragePath.Replace('/', Path.DirectorySeparatorChar));
            if (!File.Exists(physicalPath)) return null;

            return new DocumentDownloadInfo
            {
                PhysicalPath = physicalPath,
                OriginalFileName = existing.OriginalFileName,
                ContentType = existing.ContentType,
            };
        }

        private static readonly HashSet<string> AllowedBankDocumentStatuses =
            new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "verified", "rejected" };

        public async Task<ApplicationDocumentViewModel> UpdateStatusForBankAsync(
            string bankName, int applicationId, int documentId, string newStatus, string remarks)
        {
            var detail = await _applicationService.GetApplicationDetailForBankAsync(bankName, applicationId);
            if (detail == null) return null;

            var existing = await _documentRepository.GetByIdAsync(applicationId, documentId);
            if (existing == null) return null;

            if (string.IsNullOrWhiteSpace(newStatus) || !AllowedBankDocumentStatuses.Contains(newStatus))
            {
                throw new InvalidOperationException("Status must be either 'verified' or 'rejected'.");
            }

            existing.Status = newStatus.ToLowerInvariant();
            existing.Remarks = string.IsNullOrWhiteSpace(remarks) ? null : remarks.Trim();
            await _documentRepository.SaveChangesAsync();

            // The applicant owns this document (via Application -> Business -> UserId), not the
            // reviewing bank officer - they're the one who needs to know a decision was made on
            // something they uploaded.
            var notificationTitle = existing.Status == "verified" ? "Document Verified" : "Document Rejected";
            var notificationMessage = existing.Status == "verified"
                ? $"Your {existing.DocumentType} document for {detail.CaseId} has been verified."
                : $"Your {existing.DocumentType} document for {detail.CaseId} was rejected." +
                  (string.IsNullOrWhiteSpace(existing.Remarks) ? "" : $" Reason: {existing.Remarks}");
            var applicantUserId = await _applicationService.GetOwnerUserIdAsync(applicationId);
            if (applicantUserId.HasValue)
            {
                await _notificationService.CreateNotificationAsync(
                    applicantUserId.Value, notificationTitle, notificationMessage,
                    existing.Status == "verified" ? "DocumentVerified" : "DocumentRejected",
                    applicationId, "Application");
            }

            return Map(existing);
        }

        private const string OfferDocumentType = "ConditionalOfferLetter";

        public async Task<ApplicationDocumentViewModel> UploadOfferDocumentForBankAsync(string bankName, int officerUserId, int applicationId, HttpPostedFileBase file)
        {
            var detail = await _applicationService.GetApplicationDetailForBankAsync(bankName, applicationId);
            if (detail == null) return null;

            var extension = ValidateFile(file);
            var folder = EnsureApplicationFolder(detail.CaseId);
            var storedFileName = Guid.NewGuid().ToString("N") + extension;
            var physicalPath = Path.Combine(folder, storedFileName);
            await SaveFileAsync(file, physicalPath);

            var existing = await _documentRepository.GetByApplicationAndTypeAsync(applicationId, OfferDocumentType);
            if (existing != null)
            {
                // Re-issuing an offer (e.g. correcting a mistake) replaces the previous file
                // rather than accumulating a second ConditionalOfferLetter row.
                TryDeletePhysicalFile(existing.StoragePath);
                existing.OriginalFileName = SanitizeOriginalFileName(file.FileName);
                existing.StoredFileName = storedFileName;
                existing.ContentType = AllowedExtensions[extension];
                existing.FileSize = file.ContentLength;
                existing.StoragePath = RelativeStoragePath(detail.CaseId, storedFileName);
                existing.UploadedByUserId = officerUserId;
                existing.UploadedOn = DateTime.UtcNow;
                existing.Status = "verified";
                existing.Remarks = null;
                await _documentRepository.SaveChangesAsync();
                return Map(existing);
            }

            var document = new Models.ApplicationDocument
            {
                ApplicationId = applicationId,
                DocumentType = OfferDocumentType,
                OriginalFileName = SanitizeOriginalFileName(file.FileName),
                StoredFileName = storedFileName,
                ContentType = AllowedExtensions[extension],
                FileSize = file.ContentLength,
                StoragePath = RelativeStoragePath(detail.CaseId, storedFileName),
                UploadedByUserId = officerUserId,
                UploadedOn = DateTime.UtcNow,
                // Bank-authored, not something awaiting the bank's own verification - see
                // AllowedBankDocumentStatuses/UpdateStatusForBankAsync above, which this
                // deliberately never routes through.
                Status = "verified",
            };
            await _documentRepository.AddAsync(document);
            return Map(document);
        }

        private string EnsureApplicationFolder(string caseId)
        {
            var folder = Path.Combine(_uploadsRootPath, "ApplicationDocuments", SanitizeFolderName(caseId));
            Directory.CreateDirectory(folder);
            return folder;
        }

        private static string RelativeStoragePath(string caseId, string storedFileName)
        {
            return $"ApplicationDocuments/{SanitizeFolderName(caseId)}/{storedFileName}";
        }

        private void TryDeletePhysicalFile(string relativeStoragePath)
        {
            try
            {
                var path = Path.Combine(_uploadsRootPath, relativeStoragePath.Replace('/', Path.DirectorySeparatorChar));
                if (File.Exists(path)) File.Delete(path);
            }
            catch (IOException)
            {
                // Best-effort only - an orphaned file on disk is a minor cleanup issue, not a
                // reason to fail the metadata operation the user actually asked for.
            }
        }

        private static async Task SaveFileAsync(HttpPostedFileBase file, string physicalPath)
        {
            using (var stream = new FileStream(physicalPath, FileMode.Create, FileAccess.Write))
            {
                await file.InputStream.CopyToAsync(stream);
            }
        }

        // Returns the validated, lowercased extension (including the leading '.'). Every
        // rejection here throws InvalidOperationException, mapped by the controller to a 400
        // with a clear message - same convention as ApplicationService.SubmitApplicationAsync.
        private static string ValidateFile(HttpPostedFileBase file)
        {
            if (file == null || file.ContentLength <= 0)
            {
                throw new InvalidOperationException("Please choose a file to upload.");
            }
            if (file.ContentLength > MaxFileSizeBytes)
            {
                throw new InvalidOperationException("File is too large. Maximum size is 10MB.");
            }

            var extension = Path.GetExtension(file.FileName ?? "").ToLowerInvariant();
            if (!AllowedExtensions.ContainsKey(extension))
            {
                throw new InvalidOperationException("Unsupported file type. Allowed types: PDF, JPG, JPEG, PNG.");
            }

            return extension;
        }

        // The ONLY use of the user-supplied filename is this sanitized, display-only value
        // (OriginalFileName, shown in the UI and used as the download's suggested filename) -
        // the actual on-disk StoredFileName is always a fresh GUID (see UploadAsync/
        // ReplaceAsync), so nothing derived from user input ever touches a real filesystem path.
        private static string SanitizeOriginalFileName(string fileName)
        {
            var name = Path.GetFileName(fileName ?? ""); // strips any directory/".." components
            var safe = new string(name.Where(c =>
                char.IsLetterOrDigit(c) || c == '.' || c == '-' || c == '_' || c == ' ' || c == '(' || c == ')'
            ).ToArray()).Trim();

            if (safe.Length > 200)
            {
                safe = safe.Substring(safe.Length - 200);
            }
            return string.IsNullOrWhiteSpace(safe) ? "document" : safe;
        }

        private static string SanitizeFolderName(string value)
        {
            return new string((value ?? "").Where(c => char.IsLetterOrDigit(c) || c == '-').ToArray());
        }

        private static ApplicationDocumentViewModel Map(Models.ApplicationDocument d)
        {
            return new ApplicationDocumentViewModel
            {
                Id = d.DocumentId.ToString(),
                DocumentType = d.DocumentType,
                OriginalFileName = d.OriginalFileName,
                ContentType = d.ContentType,
                FileSize = d.FileSize,
                UploadedOn = d.UploadedOn.ToString("yyyy-MM-dd HH:mm", CultureInfo.InvariantCulture),
                Status = d.Status,
                Remarks = d.Remarks,
            };
        }
    }
}
