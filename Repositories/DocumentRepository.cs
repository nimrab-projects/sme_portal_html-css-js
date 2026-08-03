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

        public Task<int> CountPendingByApplicationIdsAsync(IEnumerable<int> applicationIds)
        {
            var ids = applicationIds as ICollection<int> ?? applicationIds.ToList();
            if (ids.Count == 0) return Task.FromResult(0);

            return _db.ApplicationDocuments
                .CountAsync(d => ids.Contains(d.ApplicationId) && d.Status == "pending_verification");
        }

        public async Task<Dictionary<int, int>> GetPendingCountsByApplicationIdAsync(IEnumerable<int> applicationIds)
        {
            var ids = applicationIds as ICollection<int> ?? applicationIds.ToList();
            if (ids.Count == 0) return new Dictionary<int, int>();

            return await _db.ApplicationDocuments
                .Where(d => ids.Contains(d.ApplicationId) && d.Status == "pending_verification")
                .GroupBy(d => d.ApplicationId)
                .Select(g => new { ApplicationId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.ApplicationId, x => x.Count);
        }
    }
}
