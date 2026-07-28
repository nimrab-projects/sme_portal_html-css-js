using System;
using System.Web;
using System.Web.Mvc;
using Newtonsoft.Json;
using Newtonsoft.Json.Serialization;

namespace SmePortal.Web.Helpers
{
    // MVC5's built-in Controller.Json() uses JavaScriptSerializer (PascalCase by default).
    // This override serializes with Json.NET + camelCase so responses come back as
    // {fullName, email, isFirstLogin} matching what the existing frontend JS expects,
    // with zero client-side key-mapping code.
    public class JsonNetResult : JsonResult
    {
        private static readonly JsonSerializerSettings Settings = new JsonSerializerSettings
        {
            ContractResolver = new CamelCasePropertyNamesContractResolver(),
            NullValueHandling = NullValueHandling.Include,
        };

        public JsonNetResult(object data, JsonRequestBehavior behavior = JsonRequestBehavior.DenyGet)
        {
            Data = data;
            JsonRequestBehavior = behavior;
        }

        public override void ExecuteResult(ControllerContext context)
        {
            if (context == null) throw new ArgumentNullException(nameof(context));

            var response = context.HttpContext.Response;
            response.ContentType = string.IsNullOrEmpty(ContentType) ? "application/json" : ContentType;
            if (ContentEncoding != null) response.ContentEncoding = ContentEncoding;

            if (JsonRequestBehavior == JsonRequestBehavior.DenyGet &&
                string.Equals(context.HttpContext.Request.HttpMethod, "GET", StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException(
                    "GET requests are not allowed for JSON responses that expose sensitive data. " +
                    "Pass JsonRequestBehavior.AllowGet if this endpoint is safe to expose via GET.");
            }

            if (Data != null)
            {
                response.Write(JsonConvert.SerializeObject(Data, Settings));
            }
        }
    }
}
