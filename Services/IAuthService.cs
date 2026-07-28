using System.Threading.Tasks;
using SmePortal.Web.Models;
using SmePortal.Web.ViewModels;

namespace SmePortal.Web.Services
{
    public interface IAuthService
    {
        Task<bool> EmailExistsAsync(string email);
        Task<bool> MobileExistsAsync(string mobile);

        // The Setup-vs-Dashboard redirect decision is computed live from actual business
        // existence, not read directly off Users.IsFirstLogin (see plan §9): a user who
        // abandons the Setup page without saving a business must not get routed straight to
        // an empty Dashboard on their next login.
        Task<bool> ComputeIsFirstLoginAsync(int userId);

        UserResponseViewModel ToUserResponse(ApplicationUser user);
    }
}
