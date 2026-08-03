using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Web;
using SmePortal.Web.Helpers;
using SmePortal.Web.Models;
using SmePortal.Web.Repositories;
using SmePortal.Web.ViewModels;

namespace SmePortal.Web.Services
{
    public class AuditService : IAuditService
    {
        private readonly IAuditLogRepository _auditLogRepository;
        private readonly IUserRepository _userRepository;

        public AuditService(IAuditLogRepository auditLogRepository, IUserRepository userRepository)
        {
            _auditLogRepository = auditLogRepository;
            _userRepository = userRepository;
        }

        public Task LogAsync(int? userId, string action, HttpRequestBase request)
        {
            var log = new AuditLog
            {
                UserId = userId,
                Action = action,
                IPAddress = IpAddressHelper.GetClientIp(request),
                Browser = IpAddressHelper.GetUserAgent(request),
            };
            return _auditLogRepository.AddAsync(log);
        }

        public async Task<List<AuditLogViewModel>> GetAuditLogsAsync()
        {
            var logs = await _auditLogRepository.GetAllAsync();
            // Bulk role lookup (one query, not per-row) - same N+1-avoidance convention as
            // SbpAdminService.GetAllUsersAsync.
            var rolesByUserId = await _userRepository.GetAllUserRoleNamesAsync();

            return logs.Select(log =>
            {
                List<string> roles = null;
                if (log.UserId.HasValue) rolesByUserId.TryGetValue(log.UserId.Value, out roles);

                return new AuditLogViewModel
                {
                    Id = log.AuditId.ToString(),
                    Timestamp = log.CreatedOn.ToString("yyyy-MM-dd HH:mm:ss", CultureInfo.InvariantCulture),
                    User = log.User?.FullName ?? "Unknown",
                    UserRole = FriendlyRoles(roles),
                    Activity = FriendlyActivity(log.Action),
                    Module = DeriveModule(log.Action),
                    IPAddress = string.IsNullOrWhiteSpace(log.IPAddress) ? "Not Provided" : log.IPAddress,
                    Browser = string.IsNullOrWhiteSpace(log.Browser) ? "Not Provided" : log.Browser,
                    Status = DeriveStatus(log.Action),
                    RawAction = log.Action,
                };
            }).ToList();
        }

        private static string FriendlyRoles(List<string> roles)
        {
            if (roles == null || roles.Count == 0) return "N/A";
            return string.Join(" / ", roles.Select(r =>
            {
                switch (r)
                {
                    case "BankOfficer": return "Bank Officer";
                    case "SbpAdmin": return "SBP Admin";
                    case "Applicant": return "Applicant";
                    default: return r;
                }
            }));
        }

        // Every literal Action string this app ever writes (see AccountController.cs's
        // AuditService.LogAsync call sites, plus SbpApplicationController.cs's admin-action
        // calls) mapped to a human-readable label. Anything not in this map (e.g. a future
        // action added later) still renders sensibly via the humanized fallback below, rather
        // than breaking.
        private static readonly Dictionary<string, string> ActivityLabels = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            { "Register", "Applicant Registered" },
            { "RegisterGoogle", "Applicant Registered (Google)" },
            { "VerifyOtp", "OTP Verified" },
            { "Login", "User Login" },
            { "LoginGoogle", "User Login (Google)" },
            { "LoginFailed", "Failed Login Attempt" },
            { "LoginLockedOut", "Account Locked Out" },
            { "LoginBlockedAccount", "Blocked Account Login Attempt" },
            { "LoginInactiveAccount", "Inactive Account Login Attempt" },
            { "BankLoginOtpRequested", "Bank OTP Requested" },
            { "BankLoginOtpRequestDenied", "Bank OTP Request Denied" },
            { "BankLogin", "Bank Officer Login" },
            { "SbpAdminLoginOtpRequested", "SBP Admin OTP Requested" },
            { "SbpAdminLoginOtpRequestDenied", "SBP Admin OTP Request Denied" },
            { "SbpAdminLogin", "SBP Admin Login" },
            { "Logout", "User Logout" },
            { "BankCreated", "Bank Added" },
            { "BankUpdated", "Bank Updated" },
            { "BankStatusChanged", "Bank Status Changed" },
            { "UserStatusChanged", "User Status Changed" },
            { "ReportGenerated", "Report Generated" },
            { "ProfileUpdated", "Profile Updated" },
        };

        private static string FriendlyActivity(string action)
        {
            if (!string.IsNullOrWhiteSpace(action) && ActivityLabels.TryGetValue(action, out var label)) return label;
            return string.IsNullOrWhiteSpace(action) ? "Unknown Activity" : Regex.Replace(action, "([a-z])([A-Z])", "$1 $2");
        }

        private static string DeriveModule(string action)
        {
            var a = action ?? "";
            if (a.StartsWith("SbpAdmin", StringComparison.OrdinalIgnoreCase)) return "SBP Admin Portal";
            if (a.StartsWith("Bank", StringComparison.OrdinalIgnoreCase))
            {
                return a.IndexOf("Login", StringComparison.OrdinalIgnoreCase) >= 0 || a.IndexOf("Otp", StringComparison.OrdinalIgnoreCase) >= 0
                    ? "Bank Portal" : "Bank Management";
            }
            if (a.StartsWith("User", StringComparison.OrdinalIgnoreCase)) return "User Management";
            if (a.StartsWith("Report", StringComparison.OrdinalIgnoreCase)) return "Reports";
            if (a.StartsWith("Profile", StringComparison.OrdinalIgnoreCase)) return "Profile";
            if (a.IndexOf("Login", StringComparison.OrdinalIgnoreCase) >= 0 || a.IndexOf("Register", StringComparison.OrdinalIgnoreCase) >= 0 ||
                a.IndexOf("Logout", StringComparison.OrdinalIgnoreCase) >= 0 || a.IndexOf("Otp", StringComparison.OrdinalIgnoreCase) >= 0)
            {
                return "Authentication";
            }
            return "General";
        }

        private static string DeriveStatus(string action)
        {
            var a = action ?? "";
            if (a.IndexOf("Failed", StringComparison.OrdinalIgnoreCase) >= 0 ||
                a.IndexOf("Denied", StringComparison.OrdinalIgnoreCase) >= 0 ||
                a.IndexOf("LockedOut", StringComparison.OrdinalIgnoreCase) >= 0 ||
                a.IndexOf("BlockedAccount", StringComparison.OrdinalIgnoreCase) >= 0 ||
                a.IndexOf("InactiveAccount", StringComparison.OrdinalIgnoreCase) >= 0)
            {
                return "Failed";
            }
            return "Success";
        }
    }
}
