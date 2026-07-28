using Microsoft.AspNet.Identity.Owin;
using Microsoft.Owin;
using Owin;
using SmePortal.Web.DAL;

[assembly: OwinStartup(typeof(SmePortal.Web.Startup))]

namespace SmePortal.Web
{
    public partial class Startup
    {
        public void Configuration(IAppBuilder app)
        {
            app.CreatePerOwinContext(ApplicationDbContext.Create);
            app.CreatePerOwinContext<ApplicationUserManager>(ApplicationUserManager.Create);
            app.CreatePerOwinContext<ApplicationSignInManager>(ApplicationSignInManager.Create);

            ConfigureAuth(app);
        }
    }
}
