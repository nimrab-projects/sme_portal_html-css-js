using System.Collections.Generic;
using System.Threading.Tasks;
using SmePortal.Web.ViewModels;

namespace SmePortal.Web.Services
{
    public interface IBankService
    {
        Task<List<BankAdminViewModel>> GetAllBanksAsync();

        // Powers the Applicant Portal's Business Setup/Edit "Bank" dropdown (Controllers/
        // BusinessController.cs) - Active banks only (Deactivation Rule: an inactive bank must
        // not be available for assigning new applications).
        Task<List<string>> GetActiveBankNamesAsync();

        // Throws InvalidOperationException for missing required fields or a duplicate name/code.
        Task<BankAdminViewModel> CreateBankAsync(SaveBankRequestViewModel model);

        // Null means "no such bank" (404). Throws InvalidOperationException for missing required
        // fields or a duplicate name/code (never creates a second row - always updates in place).
        Task<BankAdminViewModel> UpdateBankAsync(int id, SaveBankRequestViewModel model);

        // Null means "no such bank" (404). Never deletes - only flips IsActive, same
        // never-delete convention as SbpAdminService.SetUserStatusAsync.
        Task<BankAdminViewModel> SetBankStatusAsync(int id, bool isActive);
    }
}
