using System.Threading.Tasks;
using SmePortal.Web.ViewModels;

namespace SmePortal.Web.Services
{
    public interface IUserService
    {
        Task<UserProfileViewModel> GetProfileAsync(int userId);

        // Throws InvalidOperationException (mobile already used by another account) - same
        // "service throws, controller shapes the 400" convention as every other mutating action
        // in this codebase.
        Task<UserProfileViewModel> UpdateProfileAsync(int userId, UpdateProfileRequestViewModel model);
    }
}
