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
        }
    }
}
