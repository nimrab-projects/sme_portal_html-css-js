using System.Collections.Generic;
using System.Threading.Tasks;
using SmePortal.Web.Models;

namespace SmePortal.Web.Repositories
{
    public interface IUserRepository
    {
        Task<bool> EmailExistsAsync(string email);
        Task<bool> MobileExistsAsync(string mobile);

        // Phase 10: profile-update needs to check "is this mobile already used by SOMEONE ELSE",
        // not "does it exist at all" - the plain MobileExistsAsync above would incorrectly
        // reject a no-op update where the user resubmits their own current mobile number.
        Task<bool> MobileExistsForOtherUserAsync(int userId, string mobile);

        Task<ApplicationUser> GetByEmailAsync(string email);
        Task<ApplicationUser> GetByGoogleIdAsync(string googleId);

        // Phase 10: Personal Profile's "Role" field - reads the real UserRoles/Roles join
        // rather than assuming a single hardcoded role name.
        Task<List<string>> GetRoleNamesAsync(int userId);

        // Phase 8: resolves ApplicationStatusHistory.ChangedByUserId to a display name for the
        // tracking timeline's "Updated By".
        Task<ApplicationUser> GetByIdAsync(int userId);

        // Phase 5: flips Users.IsFirstLogin to false once a business profile has been saved
        // (the actual Setup-vs-Dashboard redirect is still computed live from business
        // existence - see AuthService.ComputeIsFirstLoginAsync - but the column itself should
        // still reflect reality for its own literal meaning/for audit purposes).
        Task MarkFirstLoginCompleteAsync(int userId);

        Task SaveChangesAsync();
    }
}
