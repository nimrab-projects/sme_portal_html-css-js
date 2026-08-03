namespace SmePortal.Web.ViewModels
{
    // SBP Admin Portal sync (Phase 3 - User Management). One row per real Users table record -
    // deliberately never includes PasswordHash/SecurityStamp/tokens (this is the only place
    // those fields could leak to a browser, so they're simply never mapped here at all).
    public class AdminUserViewModel
    {
        public string Id { get; set; }
        public string FullName { get; set; }
        public string Email { get; set; }

        // From the user's first real Business.OwnerCnic on file - there is no CNIC field on the
        // Users table itself (only ever collected at Business Setup). "Not Provided" when the
        // user owns no business yet.
        public string Cnic { get; set; }

        // "Applicant" | "Bank Officer" | "SBP Admin" - derived from the real Roles/UserRoles
        // tables (same source UserRepository.GetRoleNamesAsync already uses elsewhere), never a
        // second, separate role concept. A user with no role at all shows "Unassigned" (should
        // not really happen, but never silently blank).
        public string UserType { get; set; }

        // Only ever set for Bank Officer accounts (Users.BankName) - null/"" for everyone else.
        public string AssignedBank { get; set; }

        // Real business names this user owns, comma-joined - included so the search box can
        // match "search by Business Name" without a second round-trip; not necessarily its own
        // display column.
        public string BusinessNames { get; set; }

        public string RegistrationDate { get; set; }

        // "Active" | "Inactive" | "Blocked" - see Models/ApplicationUser.cs's own comment on why
        // IsBlocked is a separate flag from IsActive.
        public string AccountStatus { get; set; }
        public bool IsBlocked { get; set; }
        public bool IsActive { get; set; }

        public bool IsEmailVerified { get; set; }
        public string LastLogin { get; set; }
    }
}
