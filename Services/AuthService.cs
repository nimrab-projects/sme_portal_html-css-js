using System.Threading.Tasks;
using SmePortal.Web.Models;
using SmePortal.Web.Repositories;
using SmePortal.Web.ViewModels;

namespace SmePortal.Web.Services
{
    public class AuthService : IAuthService
    {
        private readonly IUserRepository _userRepository;
        private readonly IBusinessService _businessService;

        public AuthService(IUserRepository userRepository, IBusinessService businessService)
        {
            _userRepository = userRepository;
            _businessService = businessService;
        }

        public Task<bool> EmailExistsAsync(string email) => _userRepository.EmailExistsAsync(email);

        public Task<bool> MobileExistsAsync(string mobile) => _userRepository.MobileExistsAsync(mobile);

        public Task<bool> ComputeIsFirstLoginAsync(int userId)
        {
            return _businessService.HasAnyBusinessAsync(userId).ContinueWith(t => !t.Result);
        }

        public UserResponseViewModel ToUserResponse(ApplicationUser user)
        {
            return new UserResponseViewModel
            {
                Id = user.Id.ToString(),
                Name = user.FullName,
                Email = user.Email,
                Mobile = user.Mobile,
            };
        }
    }
}
