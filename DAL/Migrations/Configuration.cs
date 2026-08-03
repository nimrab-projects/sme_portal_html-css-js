using System;
using System.Data.Entity.Migrations;
using System.Linq;
using SmePortal.Web.Models;

namespace SmePortal.Web.DAL.Migrations
{
    // Automatic migrations (rather than hand-scaffolded named migrations via the
    // Package Manager Console's Add-Migration) is a deliberate, pragmatic choice here:
    // this environment has no interactive Visual Studio session to run Add-Migration from,
    // and automatic migrations still give real EF6 Code-First schema creation/versioning
    // (a __MigrationHistory table, applied via MigrateDatabaseToLatestVersion in
    // Global.asax.Application_Start). Anyone opening this in Visual Studio later can switch
    // to explicit Add-Migration workflow at any time without restructuring anything.
    internal sealed class Configuration : DbMigrationsConfiguration<ApplicationDbContext>
    {
        public Configuration()
        {
            AutomaticMigrationsEnabled = true;
            AutomaticMigrationDataLossAllowed = true;
        }

        protected override void Seed(ApplicationDbContext context)
        {
            if (!context.Roles.Any(r => r.Name == "Applicant"))
            {
                context.Roles.Add(new ApplicationRole("Applicant"));
                context.SaveChanges();
            }

            // Phase 13 (Bank Portal). Bank Officers have no self-registration UI (a real bank
            // would have SBP/IT provision these accounts, not a public sign-up form) - seeded
            // here the same way the "Applicant" role itself is, so there's at least one working
            // account to sign in with. Login is OTP-only (see AccountController's
            // BankLoginRequestOtp/BankLoginVerifyOtp), so no password is ever set.
            if (!context.Roles.Any(r => r.Name == "BankOfficer"))
            {
                context.Roles.Add(new ApplicationRole("BankOfficer"));
                context.SaveChanges();
            }

            // One demo officer per bank, matching Business.Bank's exact free-text value
            // (businessSetup.js's BANKS list) - this is what scopes "my assigned applications"
            // to each officer. Several are seeded (not just HBL) so cross-bank isolation can be
            // verified end-to-end against real test data already on file for other banks.
            // Mobile is set explicitly (and unique per officer) - Users.Mobile has a unique
            // index, and SQL Server's unique index treats multiple NULLs as duplicates, so a
            // second/third NULL-mobile row would fail to insert once one already exists.
            var demoBankOfficers = new[]
            {
                new { Email = "officer.hbl@sbpsmeportal.pk", FullName = "Bilal Raza", BankName = "Habib Bank Limited (HBL)", Mobile = "03000000001" },
                new { Email = "officer.meezan@sbpsmeportal.pk", FullName = "Ayesha Siddiqui", BankName = "Meezan Bank", Mobile = "03000000002" },
                new { Email = "officer.askari@sbpsmeportal.pk", FullName = "Usman Tariq", BankName = "Askari Bank", Mobile = "03000000003" },
                new { Email = "officer.faysal@sbpsmeportal.pk", FullName = "Hassan Ali", BankName = "Faysal Bank", Mobile = "03000000004" },
            };

            var bankOfficerRole = context.Roles.First(r => r.Name == "BankOfficer");
            foreach (var demo in demoBankOfficers)
            {
                if (context.Users.Any(u => u.Email == demo.Email)) continue;

                var officer = new ApplicationUser
                {
                    UserName = demo.Email,
                    Email = demo.Email,
                    FullName = demo.FullName,
                    BankName = demo.BankName,
                    Mobile = demo.Mobile,
                    EmailConfirmed = true,
                    IsEmailVerified = true,
                    IsActive = true,
                    IsFirstLogin = false,
                    AuthProvider = AuthProviders.BankOtp,
                    CreatedOn = DateTime.UtcNow,
                    // UserManager.CreateAsync() normally generates this automatically
                    // (NewSecurityStamp()) - since this account is inserted directly rather than
                    // through UserManager, it has to be set explicitly, or ClaimsIdentityFactory
                    // throws ArgumentNullException the first time this user signs in (it always
                    // adds a claim for the security stamp, and Claim's constructor rejects a
                    // null value).
                    SecurityStamp = Guid.NewGuid().ToString(),
                };
                context.Users.Add(officer);
                context.SaveChanges();

                context.Set<ApplicationUserRole>().Add(new ApplicationUserRole
                {
                    UserId = officer.Id,
                    RoleId = bankOfficerRole.Id,
                });
                context.SaveChanges();
            }

            // SBP Admin Portal sync - same "no self-registration, seeded like Applicant/
            // BankOfficer" reasoning as above. OTP-only login (AccountController's
            // SbpAdminLoginRequestOtp/VerifyOtp), no password.
            if (!context.Roles.Any(r => r.Name == "SbpAdmin"))
            {
                context.Roles.Add(new ApplicationRole("SbpAdmin"));
                context.SaveChanges();
            }

            const string demoSbpAdminEmail = "admin.sbp@sbpsmeportal.pk";
            if (!context.Users.Any(u => u.Email == demoSbpAdminEmail))
            {
                var admin = new ApplicationUser
                {
                    UserName = demoSbpAdminEmail,
                    Email = demoSbpAdminEmail,
                    FullName = "Dr. Amjad Hussain",
                    Mobile = "03000000005",
                    EmailConfirmed = true,
                    IsEmailVerified = true,
                    IsActive = true,
                    IsFirstLogin = false,
                    AuthProvider = AuthProviders.SbpOtp,
                    CreatedOn = DateTime.UtcNow,
                    SecurityStamp = Guid.NewGuid().ToString(),
                };
                context.Users.Add(admin);
                context.SaveChanges();

                var sbpAdminRole = context.Roles.First(r => r.Name == "SbpAdmin");
                context.Set<ApplicationUserRole>().Add(new ApplicationUserRole
                {
                    UserId = admin.Id,
                    RoleId = sbpAdminRole.Id,
                });
                context.SaveChanges();
            }

            // SBP Admin Bank Management - seeds the same 10 banks businessSetup.js's old
            // hardcoded dropdown already offered, so switching that dropdown to load from this
            // real table (Portal Integration requirement) doesn't leave applicants with an empty
            // Bank list, and Bank Management doesn't start empty despite real test applications
            // already existing against these exact bank names. Code/Type are real, public facts
            // (not fabricated); Coverage defaults to "Nationwide" matching the old stub's data.
            // Contact fields are left blank rather than inventing a fake contact person/number -
            // shown as "Not Provided" in the admin UI, same convention as CNIC elsewhere.
            var seedBanks = new[]
            {
                new { Name = "Habib Bank Limited (HBL)", Code = "HBL", Type = "Commercial" },
                new { Name = "United Bank Limited (UBL)", Code = "UBL", Type = "Commercial" },
                new { Name = "MCB Bank Limited", Code = "MCB", Type = "Commercial" },
                new { Name = "Allied Bank Limited", Code = "ABL", Type = "Commercial" },
                new { Name = "National Bank of Pakistan", Code = "NBP", Type = "Commercial" },
                new { Name = "Bank Alfalah", Code = "BAFL", Type = "Commercial" },
                new { Name = "Meezan Bank", Code = "MEBL", Type = "Islamic" },
                new { Name = "Faysal Bank", Code = "FABL", Type = "Islamic" },
                new { Name = "Askari Bank", Code = "AKBL", Type = "Commercial" },
                new { Name = "Standard Chartered Bank", Code = "SCBL", Type = "Commercial" },
            };
            foreach (var seed in seedBanks)
            {
                if (context.Banks.Any(b => b.Name == seed.Name)) continue;

                context.Banks.Add(new Bank
                {
                    Name = seed.Name,
                    Code = seed.Code,
                    Type = seed.Type,
                    Coverage = "Nationwide",
                    IsActive = true,
                    CreatedOn = DateTime.UtcNow,
                    UpdatedOn = DateTime.UtcNow,
                });
                context.SaveChanges();
            }
        }
    }
}
