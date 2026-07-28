using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using SmePortal.Web.Models;
using SmePortal.Web.Repositories;
using SmePortal.Web.ViewModels;

namespace SmePortal.Web.Services
{
    public class BusinessService : IBusinessService
    {
        private readonly IBusinessRepository _businessRepository;
        private readonly IUserRepository _userRepository;
        private readonly INotificationService _notificationService;
        private readonly IApplicationRepository _applicationRepository;

        public BusinessService(IBusinessRepository businessRepository, IUserRepository userRepository,
            INotificationService notificationService, IApplicationRepository applicationRepository)
        {
            _businessRepository = businessRepository;
            _userRepository = userRepository;
            _notificationService = notificationService;
            _applicationRepository = applicationRepository;
        }

        public async Task<BusinessResponseViewModel> SaveBusinessAsync(int userId, SaveBusinessRequestViewModel model)
        {
            ValidateShareholderTotal(model);

            var business = new Business
            {
                UserId = userId,
                Name = model.Name,
                OwnerCnic = model.OwnerCnic,
                ContactPerson = model.ContactPerson,
                CellLandline = model.CellLandline,
                Email = model.Email,
                Ntn = model.Ntn,
                Strn = string.IsNullOrWhiteSpace(model.Strn) ? null : model.Strn,
                Province = string.IsNullOrWhiteSpace(model.Province) ? null : model.Province,
                City = string.IsNullOrWhiteSpace(model.City) ? null : model.City,
                PostalCode = string.IsNullOrWhiteSpace(model.PostalCode) ? null : model.PostalCode,
                Website = string.IsNullOrWhiteSpace(model.Website) ? null : model.Website,
                Address = model.Address,
                AnnualSales = model.AnnualSales,
                YearEstablished = model.YearEstablished,
                Employees = model.Employees,
                Premise = model.Premise,
                Nature = model.Nature,
                BusinessStatus = model.BusinessStatus,
                Registration = model.Registration,
                RegistrationNumber = model.Registration == "Yes" ? model.RegistrationNumber : null,
                RegistrationAuthority = model.Registration == "Yes" ? model.RegistrationAuthority : null,
                Description = model.Description,
                Bank = string.IsNullOrWhiteSpace(model.Bank) ? null : model.Bank,
                Iban = string.IsNullOrWhiteSpace(model.Iban) ? null : model.Iban,
                Status = "Active",
            };

            foreach (var shareholder in BuildShareholders(model))
            {
                business.Shareholders.Add(shareholder);
            }

            await _businessRepository.AddAsync(business);
            await _userRepository.MarkFirstLoginCompleteAsync(userId);
            await _notificationService.CreateNotificationAsync(
                userId, "Business Profile Created", $"Your business profile for \"{business.Name}\" has been created.",
                "BusinessCreated", business.BusinessId, "Business", userId);
            return Map(business);
        }

        public async Task<List<BusinessResponseViewModel>> GetMyBusinessesAsync(int userId)
        {
            var businesses = await _businessRepository.GetByUserIdAsync(userId);
            return businesses.Select(Map).ToList();
        }

        public async Task<bool> HasAnyBusinessAsync(int userId)
        {
            return await _businessRepository.CountByUserIdAsync(userId) > 0;
        }

        public async Task<BusinessResponseViewModel> GetPrimaryBusinessAsync(int userId)
        {
            // "The business created during registration" - the earliest-created one, matching
            // GetByUserIdAsync's own OrderBy(CreatedOn) and how the rest of the app already
            // treats the first business as the default (e.g. the dashboard's initial selection).
            var businesses = await _businessRepository.GetByUserIdAsync(userId);
            var primary = businesses.FirstOrDefault();
            return primary == null ? null : Map(primary);
        }

        // Phase 12 (Multiple Business Management) - fetches ANY one of the caller's businesses
        // by id (not just the primary/first-created one GetPrimaryBusinessAsync returns), for
        // the My Businesses page's View/Edit-by-id actions. Same null-for-"not found or not
        // yours" convention as UpdateBusinessAsync/GetApplicationDetailAsync.
        public async Task<BusinessResponseViewModel> GetBusinessByIdAsync(int userId, int businessId)
        {
            var business = await _businessRepository.GetByIdAsync(businessId);
            if (business == null || business.UserId != userId)
            {
                return null;
            }
            return Map(business);
        }

        // Phase 12 - returns null for "not found/not yours" (404, same convention as everywhere
        // else). Throws InvalidOperationException if the business rule below blocks deletion.
        public async Task<bool> DeleteBusinessAsync(int userId, int businessId)
        {
            var business = await _businessRepository.GetByIdAsync(businessId);
            if (business == null || business.UserId != userId)
            {
                return false;
            }

            // Business rule: a business with any submitted financing applications may never be
            // deleted - Business->Application is a cascade-delete relationship, so allowing this
            // would silently destroy real application/status-history/document records along with
            // it. The applicant must not be able to lose that history through what looks like a
            // simple business-profile cleanup action.
            var applicationCount = await _applicationRepository.CountByBusinessIdAsync(businessId);
            if (applicationCount > 0)
            {
                throw new InvalidOperationException(
                    "This business cannot be deleted because it has one or more financing applications on record.");
            }

            await _businessRepository.DeleteAsync(business);
            return true;
        }

        public async Task<BusinessResponseViewModel> UpdateBusinessAsync(int userId, int businessId, SaveBusinessRequestViewModel model)
        {
            var business = await _businessRepository.GetByIdAsync(businessId);

            // Never trust a client-supplied BusinessId on its own - same ownership rule used
            // everywhere else in this codebase (Application/Document). Returning null here (not
            // throwing) lets the controller answer "not found" and "not yours" identically with
            // a 404, same convention as ApplicationService.GetApplicationDetailAsync.
            if (business == null || business.UserId != userId)
            {
                return null;
            }

            ValidateShareholderTotal(model);

            business.Name = model.Name;
            business.OwnerCnic = model.OwnerCnic;
            business.ContactPerson = model.ContactPerson;
            business.CellLandline = model.CellLandline;
            business.Email = model.Email;
            business.Ntn = model.Ntn;
            business.Strn = string.IsNullOrWhiteSpace(model.Strn) ? null : model.Strn;
            business.Province = string.IsNullOrWhiteSpace(model.Province) ? null : model.Province;
            business.City = string.IsNullOrWhiteSpace(model.City) ? null : model.City;
            business.PostalCode = string.IsNullOrWhiteSpace(model.PostalCode) ? null : model.PostalCode;
            business.Website = string.IsNullOrWhiteSpace(model.Website) ? null : model.Website;
            business.Address = model.Address;
            business.AnnualSales = model.AnnualSales;
            business.YearEstablished = model.YearEstablished;
            business.Employees = model.Employees;
            business.Premise = model.Premise;
            business.Nature = model.Nature;
            business.BusinessStatus = model.BusinessStatus;
            business.Registration = model.Registration;
            business.RegistrationNumber = model.Registration == "Yes" ? model.RegistrationNumber : null;
            business.RegistrationAuthority = model.Registration == "Yes" ? model.RegistrationAuthority : null;
            business.Description = model.Description;
            business.Bank = string.IsNullOrWhiteSpace(model.Bank) ? null : model.Bank;
            business.Iban = string.IsNullOrWhiteSpace(model.Iban) ? null : model.Iban;
            business.UpdatedOn = DateTime.UtcNow;

            await _businessRepository.SaveChangesAsync();
            await _businessRepository.ReplaceShareholdersAsync(businessId, BuildShareholders(model));

            var refreshed = await _businessRepository.GetByIdAsync(businessId);
            await _notificationService.CreateNotificationAsync(
                userId, "Business Profile Updated", $"Your business profile for \"{refreshed.Name}\" has been updated.",
                "BusinessUpdated", refreshed.BusinessId, "Business", userId);
            return Map(refreshed);
        }

        // Shared by SaveBusinessAsync and UpdateBusinessAsync - the one place shareholder rows
        // are ever built from the submitted form data.
        private static List<Shareholder> BuildShareholders(SaveBusinessRequestViewModel model)
        {
            var showShareholders = !string.IsNullOrEmpty(model.BusinessStatus) &&
                                    model.BusinessStatus != "Proprietorship";
            var result = new List<Shareholder>();

            if (!showShareholders || model.Shareholders == null) return result;

            foreach (var sh in model.Shareholders)
            {
                decimal.TryParse(sh.Share, out var share);
                result.Add(new Shareholder
                {
                    Name = sh.Name,
                    Cnic = sh.Cnic,
                    Phone = sh.Phone,
                    Email = sh.Email,
                    SharePercentage = share == 0 && string.IsNullOrWhiteSpace(sh.Share) ? (decimal?)null : share,
                    Role = model.BusinessStatus == "Partnership" ? sh.Role : null,
                });
            }

            return result;
        }

        // Shareholding can never legitimately add up to more than 100% - checked here (shared by
        // both Save and Update) rather than requiring exactly 100%, since nothing else in this
        // system has ever mandated that shareholders be fully allocated before a business can be
        // saved, and enforcing that now would risk rejecting previously-valid data.
        private static void ValidateShareholderTotal(SaveBusinessRequestViewModel model)
        {
            var showShareholders = !string.IsNullOrEmpty(model.BusinessStatus) &&
                                    model.BusinessStatus != "Proprietorship";
            if (!showShareholders || model.Shareholders == null) return;

            decimal total = 0;
            foreach (var sh in model.Shareholders)
            {
                if (decimal.TryParse(sh.Share, out var share)) total += share;
            }

            if (total > 100)
            {
                throw new InvalidOperationException("Total shareholding cannot exceed 100%.");
            }
        }

        private static BusinessResponseViewModel Map(Business b)
        {
            return new BusinessResponseViewModel
            {
                Id = b.BusinessId.ToString(),
                Name = b.Name,
                Nature = b.Nature,
                Ntn = b.Ntn,
                Strn = b.Strn,
                Province = b.Province,
                City = b.City,
                PostalCode = b.PostalCode,
                Website = b.Website,
                Address = b.Address,
                Status = b.Status,
                OwnerCnic = b.OwnerCnic,
                ContactPerson = b.ContactPerson,
                CellLandline = b.CellLandline,
                Email = b.Email,
                YearEstablished = b.YearEstablished,
                AnnualSales = b.AnnualSales,
                Employees = b.Employees,
                Premise = b.Premise,
                BusinessStatus = b.BusinessStatus,
                Registration = b.Registration,
                RegistrationNumber = b.RegistrationNumber,
                RegistrationAuthority = b.RegistrationAuthority,
                Description = b.Description,
                Bank = b.Bank,
                Iban = b.Iban,
                CreatedOn = b.CreatedOn.ToString("yyyy-MM-dd"),
                Shareholders = b.Shareholders?.Select(s => new ShareholderViewModel
                {
                    Name = s.Name,
                    Cnic = s.Cnic,
                    Phone = s.Phone,
                    Email = s.Email,
                    Share = s.SharePercentage?.ToString() ?? "",
                    Role = s.Role,
                }).ToList(),
            };
        }
    }
}
