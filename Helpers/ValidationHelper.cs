using System;
using System.Net.Mail;
using System.Text.RegularExpressions;

namespace SmePortal.Web.Helpers
{
    public static class ValidationHelper
    {
        private static readonly Regex MobileRegex = new Regex(@"^(\+92|0)?3\d{9}$", RegexOptions.Compiled);
        private static readonly Regex CnicRegex = new Regex(@"^\d{5}-\d{7}-\d{1}$", RegexOptions.Compiled);

        public static bool IsValidEmail(string email)
        {
            if (string.IsNullOrWhiteSpace(email)) return false;
            try
            {
                return new MailAddress(email).Address == email;
            }
            catch (FormatException)
            {
                return false;
            }
        }

        public static string NormalizeMobile(string mobile)
        {
            if (string.IsNullOrWhiteSpace(mobile)) return mobile;
            return Regex.Replace(mobile, @"[\s\-]", "");
        }

        public static bool IsValidMobile(string mobile)
        {
            if (string.IsNullOrWhiteSpace(mobile)) return false;
            return MobileRegex.IsMatch(NormalizeMobile(mobile));
        }

        public static bool IsValidCnic(string cnic)
        {
            if (string.IsNullOrWhiteSpace(cnic)) return false;
            return CnicRegex.IsMatch(cnic);
        }
    }
}
