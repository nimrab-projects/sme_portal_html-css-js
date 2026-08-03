using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using SmePortal.Web.Helpers;
using SmePortal.Web.Models;
using SmePortal.Web.Repositories;
using SmePortal.Web.ViewModels;

namespace SmePortal.Web.Services
{
    public class BankService : IBankService
    {
        private readonly IBankRepository _bankRepository;

        public BankService(IBankRepository bankRepository)
        {
            _bankRepository = bankRepository;
        }

        public async Task<List<BankAdminViewModel>> GetAllBanksAsync()
        {
            var banks = await _bankRepository.GetAllAsync();
            return banks.OrderBy(b => b.Name).Select(Map).ToList();
        }

        public async Task<List<string>> GetActiveBankNamesAsync()
        {
            var banks = await _bankRepository.GetAllAsync();
            return banks.Where(b => b.IsActive).OrderBy(b => b.Name).Select(b => b.Name).ToList();
        }

        public async Task<BankAdminViewModel> CreateBankAsync(SaveBankRequestViewModel model)
        {
            ValidateFields(model);
            var name = model.Name.Trim();
            var code = model.Code.Trim();

            if (await _bankRepository.NameExistsAsync(name, null))
            {
                throw new InvalidOperationException("A bank with this name already exists.");
            }
            if (await _bankRepository.CodeExistsAsync(code, null))
            {
                throw new InvalidOperationException("A bank with this code already exists.");
            }

            var now = DateTime.UtcNow;
            var bank = new Bank
            {
                Name = name,
                Code = code,
                Type = model.Type.Trim(),
                Coverage = model.Coverage.Trim(),
                ContactPerson = model.ContactPerson.Trim(),
                ContactEmail = model.ContactEmail.Trim(),
                ContactNumber = model.ContactNumber.Trim(),
                Address = model.Address.Trim(),
                IsActive = model.IsActive,
                CreatedOn = now,
                UpdatedOn = now,
            };
            await _bankRepository.AddAsync(bank);
            return Map(bank);
        }

        public async Task<BankAdminViewModel> UpdateBankAsync(int id, SaveBankRequestViewModel model)
        {
            ValidateFields(model);
            var bank = await _bankRepository.GetByIdAsync(id);
            if (bank == null) return null;

            var name = model.Name.Trim();
            var code = model.Code.Trim();
            if (await _bankRepository.NameExistsAsync(name, id))
            {
                throw new InvalidOperationException("A bank with this name already exists.");
            }
            if (await _bankRepository.CodeExistsAsync(code, id))
            {
                throw new InvalidOperationException("A bank with this code already exists.");
            }

            bank.Name = name;
            bank.Code = code;
            bank.Type = model.Type.Trim();
            bank.Coverage = model.Coverage.Trim();
            bank.ContactPerson = model.ContactPerson.Trim();
            bank.ContactEmail = model.ContactEmail.Trim();
            bank.ContactNumber = model.ContactNumber.Trim();
            bank.Address = model.Address.Trim();
            bank.IsActive = model.IsActive;
            bank.UpdatedOn = DateTime.UtcNow;
            await _bankRepository.SaveChangesAsync();
            return Map(bank);
        }

        public async Task<BankAdminViewModel> SetBankStatusAsync(int id, bool isActive)
        {
            var bank = await _bankRepository.GetByIdAsync(id);
            if (bank == null) return null;

            // Deactivation Rule: flips availability for NEW assignments only - existing
            // Business/Application rows are never touched by this (this table has no foreign key
            // relationship to either), so historical data and existing links are automatically
            // unaffected.
            bank.IsActive = isActive;
            bank.UpdatedOn = DateTime.UtcNow;
            await _bankRepository.SaveChangesAsync();
            return Map(bank);
        }

        private static void ValidateFields(SaveBankRequestViewModel model)
        {
            if (model == null)
            {
                throw new InvalidOperationException("Bank details are required.");
            }
            if (string.IsNullOrWhiteSpace(model.Name))
            {
                throw new InvalidOperationException("Bank name is required.");
            }
            if (string.IsNullOrWhiteSpace(model.Code))
            {
                throw new InvalidOperationException("Bank code is required.");
            }
            if (string.IsNullOrWhiteSpace(model.Type))
            {
                throw new InvalidOperationException("Bank type is required.");
            }
            if (string.IsNullOrWhiteSpace(model.Coverage))
            {
                throw new InvalidOperationException("Coverage is required.");
            }
            if (string.IsNullOrWhiteSpace(model.ContactPerson))
            {
                throw new InvalidOperationException("Contact person is required.");
            }
            if (string.IsNullOrWhiteSpace(model.ContactEmail) || !ValidationHelper.IsValidEmail(model.ContactEmail.Trim()))
            {
                throw new InvalidOperationException("A valid contact email is required.");
            }
            if (string.IsNullOrWhiteSpace(model.ContactNumber))
            {
                throw new InvalidOperationException("Contact number is required.");
            }
            if (string.IsNullOrWhiteSpace(model.Address))
            {
                throw new InvalidOperationException("Bank address is required.");
            }
        }

        private static BankAdminViewModel Map(Bank b)
        {
            return new BankAdminViewModel
            {
                Id = b.BankId.ToString(),
                Name = b.Name,
                Code = b.Code,
                Type = b.Type,
                Coverage = string.IsNullOrWhiteSpace(b.Coverage) ? "Not Provided" : b.Coverage,
                ContactPerson = string.IsNullOrWhiteSpace(b.ContactPerson) ? "Not Provided" : b.ContactPerson,
                ContactEmail = string.IsNullOrWhiteSpace(b.ContactEmail) ? "Not Provided" : b.ContactEmail,
                ContactNumber = string.IsNullOrWhiteSpace(b.ContactNumber) ? "Not Provided" : b.ContactNumber,
                Address = string.IsNullOrWhiteSpace(b.Address) ? "Not Provided" : b.Address,
                IsActive = b.IsActive,
                Status = b.IsActive ? "Active" : "Inactive",
                Joined = b.CreatedOn.ToString("MMM yyyy"),
            };
        }
    }
}
