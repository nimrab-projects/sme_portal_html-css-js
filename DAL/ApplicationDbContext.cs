using System.ComponentModel.DataAnnotations.Schema;
using System.Data.Entity;
using System.Data.Entity.Infrastructure.Annotations;
using Microsoft.AspNet.Identity.EntityFramework;
using SmePortal.Web.Models;

namespace SmePortal.Web.DAL
{
    public class ApplicationDbContext
        : IdentityDbContext<ApplicationUser, ApplicationRole, int, ApplicationUserLogin, ApplicationUserRole, ApplicationUserClaim>
    {
        public ApplicationDbContext() : base("DefaultConnection")
        {
        }

        public DbSet<Business> Businesses { get; set; }
        public DbSet<Shareholder> Shareholders { get; set; }
        public DbSet<AuditLog> AuditLogs { get; set; }
        public DbSet<EmailOtp> EmailOtps { get; set; }
        public DbSet<Models.Application> Applications { get; set; }
        public DbSet<ApplicationStatusHistory> ApplicationStatusHistories { get; set; }
        public DbSet<ApplicationDocument> ApplicationDocuments { get; set; }
        public DbSet<Notification> Notifications { get; set; }

        public static ApplicationDbContext Create()
        {
            return new ApplicationDbContext();
        }

        protected override void OnModelCreating(DbModelBuilder modelBuilder)
        {
            // Required first: sets up Identity's own table/key mappings (composite PK on
            // UserRoles, etc.) before our overrides below.
            base.OnModelCreating(modelBuilder);

            // base.OnModelCreating maps these to Identity's default AspNetUsers/AspNetRoles/
            // AspNetUserRoles/AspNetUserClaims/AspNetUserLogins table names via its own Fluent
            // API calls, which win over the [Table("...")] data annotations on the Models
            // themselves (Fluent beats annotations in EF6) - these explicit ToTable() calls are
            // what actually rename them to match Setup.md's ERD (Users/Roles/UserRoles).
            modelBuilder.Entity<ApplicationUser>().ToTable("Users");
            modelBuilder.Entity<ApplicationRole>().ToTable("Roles");
            modelBuilder.Entity<ApplicationUserRole>().ToTable("UserRoles");
            modelBuilder.Entity<ApplicationUserLogin>().ToTable("UserLogins");
            modelBuilder.Entity<ApplicationUserClaim>().ToTable("UserClaims");

            modelBuilder.Entity<ApplicationUser>()
                .Property(u => u.Email)
                .HasColumnAnnotation(IndexAnnotation.AnnotationName,
                    new IndexAnnotation(new IndexAttribute("IX_Users_Email") { IsUnique = true }));
            modelBuilder.Entity<ApplicationUser>()
                .Property(u => u.Mobile)
                .HasColumnAnnotation(IndexAnnotation.AnnotationName,
                    new IndexAnnotation(new IndexAttribute("IX_Users_Mobile") { IsUnique = true }));

            modelBuilder.Entity<Business>()
                .HasMany(b => b.Shareholders)
                .WithRequired(s => s.Business)
                .HasForeignKey(s => s.BusinessId)
                .WillCascadeOnDelete(true);

            modelBuilder.Entity<Models.Application>()
                .HasRequired(a => a.Business)
                .WithMany()
                .HasForeignKey(a => a.BusinessId)
                .WillCascadeOnDelete(true);

            modelBuilder.Entity<Models.Application>()
                .HasMany(a => a.StatusHistory)
                .WithRequired(h => h.Application)
                .HasForeignKey(h => h.ApplicationId)
                .WillCascadeOnDelete(true);

            modelBuilder.Entity<Models.Application>()
                .HasMany(a => a.Documents)
                .WithRequired(d => d.Application)
                .HasForeignKey(d => d.ApplicationId)
                .WillCascadeOnDelete(true);

            modelBuilder.Entity<Notification>()
                .HasRequired(n => n.User)
                .WithMany()
                .HasForeignKey(n => n.UserId)
                .WillCascadeOnDelete(true);
        }
    }
}
