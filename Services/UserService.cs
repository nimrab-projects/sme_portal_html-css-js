using System;
using System.Globalization;
using System.Linq;
using System.Threading.Tasks;
using SmePortal.Web.Helpers;
using SmePortal.Web.Repositories;
using SmePortal.Web.ViewModels;

namespace SmePortal.Web.Services
{
    // Personal Profile (Phase 10). Deliberately does not touch passwords - ASP.NET Identity's
    // own UserManager already owns that (see Controllers/ProfileController.cs's ChangePassword
    // action), so reimplementing it here would be exactly the "custom password system" the
    // spec says not to build.
    public class UserService : IUserService
    {
        // ~700,000 base64 characters caps a stored picture around ~500KB decoded - a small
        // avatar, not a document. Enforced here (not just client-side) since this is the one
        // place ProfilePictureUrl is ever written.
        private const int MaxProfilePictureLength = 700_000;

        private readonly IUserRepository _userRepository;
        private readonly IBusinessRepository _businessRepository;

        public UserService(IUserRepository userRepository, IBusinessRepository businessRepository)
        {
            _userRepository = userRepository;
            _businessRepository = businessRepository;
        }

        public async Task<UserProfileViewModel> GetProfileAsync(int userId)
        {
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null) return null;

            return await MapAsync(user);
        }

        public async Task<UserProfileViewModel> UpdateProfileAsync(int userId, UpdateProfileRequestViewModel model)
        {
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null)
            {
                throw new InvalidOperationException("User not found.");
            }

            if (!ValidationHelper.IsValidMobile(model.Mobile))
            {
                throw new InvalidOperationException("Enter a valid Pakistani mobile number.");
            }

            var normalizedMobile = ValidationHelper.NormalizeMobile(model.Mobile);
            if (await _userRepository.MobileExistsForOtherUserAsync(userId, normalizedMobile))
            {
                throw new InvalidOperationException("This mobile number is already registered to another account.");
            }

            // null = "leave the existing picture untouched" (a name/phone-only save); any string
            // (including "") = "set it to this" - "" is how the client clears a picture back to
            // the initial-letter fallback. See ViewModels/UpdateProfileRequestViewModel.cs.
            if (model.ProfilePictureUrl != null)
            {
                if (model.ProfilePictureUrl.Length > MaxProfilePictureLength)
                {
                    throw new InvalidOperationException("Profile picture is too large. Please choose a smaller image.");
                }
                user.ProfilePictureUrl = model.ProfilePictureUrl.Length == 0 ? null : model.ProfilePictureUrl;
            }

            user.FullName = model.FullName.Trim();
            user.Mobile = normalizedMobile;
            user.UpdatedOn = DateTime.UtcNow;
            await _userRepository.SaveChangesAsync();

            return await MapAsync(user);
        }

        private async Task<UserProfileViewModel> MapAsync(Models.ApplicationUser user)
        {
            var businesses = await _businessRepository.GetByUserIdAsync(user.Id);
            // "The business created during registration" - the primary/first one, matching how
            // the rest of the app already treats the earliest-created business as the default
            // (e.g. the dashboard's initial selected business).
            var primaryBusiness = businesses.FirstOrDefault();
            var roles = await _userRepository.GetRoleNamesAsync(user.Id);

            return new UserProfileViewModel
            {
                Id = user.Id.ToString(),
                FullName = user.FullName,
                Email = user.Email,
                Mobile = user.Mobile,
                Cnic = string.IsNullOrWhiteSpace(primaryBusiness?.OwnerCnic) ? "Not Provided" : primaryBusiness.OwnerCnic,
                Roles = roles,
                RegistrationDate = user.CreatedOn.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                LastLogin = user.LastLogin?.ToString("yyyy-MM-dd HH:mm", CultureInfo.InvariantCulture) ?? "Never",
                AccountStatus = user.IsActive ? "Active" : "Inactive",
                Department = string.IsNullOrWhiteSpace(user.Department) ? "Not Provided" : user.Department,
                ProfilePictureUrl = user.ProfilePictureUrl,
            };
        }
    }
}
