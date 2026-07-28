using System.Collections.Generic;
using System.Data.Entity;
using System.Linq;
using System.Threading.Tasks;
using SmePortal.Web.DAL;

namespace SmePortal.Web.Repositories
{
    public class DocumentRepository : IDocumentRepository
    {
        private readonly ApplicationDbContext _db;

        public DocumentRepository(ApplicationDbContext db)
        {
            _db = db;
        }

        public async Task<List<Models.ApplicationDocument>> GetByApplicationIdAsync(int applicationId)
        {
            return await _db.ApplicationDocuments
                .Where(d => d.ApplicationId == applicationId)
                .OrderBy(d => d.DocumentType)
                .ToListAsync();
        }

        public Task<Models.ApplicationDocument> GetByIdAsync(int applicationId, int documentId)
        {
            return _db.ApplicationDocuments
                .FirstOrDefaultAsync(d => d.ApplicationId == applicationId && d.DocumentId == documentId);
        }

        public Task<Models.ApplicationDocument> GetByApplicationAndTypeAsync(int applicationId, string documentType)
        {
            return _db.ApplicationDocuments
                .FirstOrDefaultAsync(d => d.ApplicationId == applicationId && d.DocumentType == documentType);
        }

        public async Task<Models.ApplicationDocument> AddAsync(Models.ApplicationDocument document)
        {
            _db.ApplicationDocuments.Add(document);
            await _db.SaveChangesAsync();
            return document;
        }

        public Task DeleteAsync(Models.ApplicationDocument document)
        {
            _db.ApplicationDocuments.Remove(document);
            return _db.SaveChangesAsync();
        }

        public Task SaveChangesAsync()
        {
            return _db.SaveChangesAsync();
        }
    }
}
