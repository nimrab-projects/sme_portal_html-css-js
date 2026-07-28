// 1:1 port of src/app/pages/sme/BusinessSetup.tsx
//
// Phase 10 (Profile & Business Profile Management) extended this same module to also serve
// Business Profile Edit (#/sme/business-profile/edit, params.mode === "edit") rather than
// building a second, near-duplicate form file - every field-rendering function below (fieldHtml/
// selectHtml/shareholderFieldHtml/etc.) is reused byte-for-byte for both create and edit; only
// the initial data, the submit destination (create vs update), and a handful of text strings
// (button/heading copy) differ by mode.
//
// Phase 12 (Multiple Business Management) added a third mode, "add" (#/sme/business-profile/add)
// - INSERTs a new business exactly like "create" does (same POST /api/business/save call), but
// reached from My Businesses rather than the first-time registration flow, so it returns to My
// Businesses afterward instead of the Dashboard. It also extended "edit" to accept an optional
// params.id (from #/sme/business-profile/edit/:id) so My Businesses can edit ANY of the user's
// businesses, not just the primary/first-created one Profile's bare edit route operates on -
// still the exact same form/service/validation, just parameterized by which business to load.
import { addBusiness, updateBusinessInState } from "../../state.js";
import { navigate } from "../../router.js";
import { C } from "../../colors.js";
import { icon, hydrateIcons, wireImageFallbacks, escapeHtml, qs, qsa } from "../../utils.js";
import * as api from "../../api.js";

const BANKS = [
  "Habib Bank Limited (HBL)",
  "United Bank Limited (UBL)",
  "MCB Bank Limited",
  "Allied Bank Limited",
  "National Bank of Pakistan",
  "Bank Alfalah",
  "Meezan Bank",
  "Faysal Bank",
  "Askari Bank",
  "Standard Chartered Bank",
];

const INITIAL_FORM = {
  name: "", ownerCnic: "", contactPerson: "", cellLandline: "", email: "", ntn: "",
  address: "", annualSales: "", yearEstablished: "", employees: "",
  premise: "", nature: "", businessStatus: "", registration: "No",
  registrationNumber: "", registrationAuthority: "SECP", description: "",
  bank: "", iban: "",
};

function emptyShareholder() {
  return { name: "", cnic: "", phone: "", email: "", share: "", role: "" };
}

// Maps a BusinessResponseViewModel (the shape GET /api/profile/business returns) onto this
// form's field names - they already match 1:1 field-for-field, so this is a plain pass-through.
function businessToForm(biz) {
  return {
    name: biz.name || "", ownerCnic: biz.ownerCnic || "", contactPerson: biz.contactPerson || "",
    cellLandline: biz.cellLandline || "", email: biz.email || "", ntn: biz.ntn || "",
    address: biz.address || "", annualSales: biz.annualSales || "", yearEstablished: biz.yearEstablished || "",
    employees: biz.employees || "", premise: biz.premise || "", nature: biz.nature || "",
    businessStatus: biz.businessStatus || "", registration: biz.registration || "No",
    registrationNumber: biz.registrationNumber || "", registrationAuthority: biz.registrationAuthority || "SECP",
    description: biz.description || "", bank: biz.bank || "", iban: biz.iban || "",
  };
}

function businessToShareholders(biz) {
  if (!biz.shareholders || biz.shareholders.length === 0) return [emptyShareholder()];
  return biz.shareholders.map((sh) => ({
    name: sh.name || "", cnic: sh.cnic || "", phone: sh.phone || "",
    email: sh.email || "", share: sh.share || "", role: sh.role || "",
  }));
}

function fieldHtml({ key, label, placeholder, type = "text", hint, required = false, value }) {
  return `
    <div>
      <label class="block text-sm font-medium mb-1.5" style="color:${C.text};">
        ${label} ${required ? `<span style="color:#DC2626;">*</span>` : ""}
      </label>
      <input data-field="${key}" type="${type}" placeholder="${escapeHtml(placeholder)}" value="${escapeHtml(value)}"
        class="w-full rounded-xl border text-sm outline-none transition-all field-input"
        style="padding:11px 14px;background:${C.surface};border:1.5px solid ${C.border};color:${C.text};" />
      ${hint ? `<p class="text-xs mt-1" style="color:${C.textMuted};">${hint}</p>` : ""}
    </div>
  `;
}

function textAreaHtml({ key, label, placeholder, required = false, value }) {
  return `
    <div>
      <label class="block text-sm font-medium mb-1.5" style="color:${C.text};">
        ${label} ${required ? `<span style="color:#DC2626;">*</span>` : ""}
      </label>
      <textarea data-field="${key}" rows="4" placeholder="${escapeHtml(placeholder)}"
        class="w-full rounded-xl border text-sm outline-none resize-none field-input"
        style="padding:11px 14px;background:${C.surface};border:1.5px solid ${C.border};color:${C.text};">${escapeHtml(value)}</textarea>
    </div>
  `;
}

function selectHtml({ key, label, options, value, required = false }) {
  return `
    <div>
      <label class="block text-sm font-medium mb-1.5" style="color:${C.text};">
        ${label} ${required ? `<span style="color:#DC2626;">*</span>` : ""}
      </label>
      <div class="relative">
        <select data-field="${key}" class="w-full rounded-xl border text-sm outline-none appearance-none field-input"
          style="padding:11px 36px 11px 14px;background:${C.surface};border:1.5px solid ${C.border};color:${C.text};">
          <option value="" ${value === "" ? "selected" : ""}>-- Select --</option>
          ${options.map((o) => `<option value="${escapeHtml(o)}" ${value === o ? "selected" : ""}>${escapeHtml(o)}</option>`).join("")}
        </select>
        ${icon("chevron-down", { size: 16, color: C.textMuted, className: "absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" })}
      </div>
    </div>
  `;
}

function shareholderFieldHtml({ index, key, label, placeholder, type = "text", value }) {
  return `
    <div>
      <label class="block text-sm font-medium mb-1.5" style="color:${C.text};">${label}</label>
      <input data-shareholder-field="${key}" data-shareholder-index="${index}" type="${type}" placeholder="${escapeHtml(placeholder)}" value="${escapeHtml(value)}"
        class="w-full rounded-xl border text-sm outline-none transition-all field-input"
        style="padding:11px 14px;background:${C.surface};border:1.5px solid ${C.border};color:${C.text};" />
    </div>
  `;
}

export function render(container, params) {
  // "create" = the original standalone /Applicant/Setup page (first-time business creation).
  // "add" = Phase 12's "Add Business" from My Businesses - same INSERT as "create", different
  // return destination. "edit" = Phase 10's Business Profile Edit, mounted as a layout child -
  // loads an existing business first; params.id (Phase 12) picks which one, defaulting to the
  // caller's primary business when absent (Profile's own bare edit route).
  const mode = params && params.mode === "edit" ? "edit" : params && params.mode === "add" ? "add" : "create";
  // Where "Cancel"/"Back"/post-save navigation returns to in edit mode - My Businesses when a
  // specific business was opened by id, or Profile's Business Profile view otherwise (unchanged
  // Phase 10 behavior for that route).
  const editReturnPath = params && params.id ? "/sme/businesses" : "/sme/business-profile";
  // "create" (the original registration-time /Applicant/Setup flow) is the only mode that shows
  // the full onboarding experience - left green pitch panel, mobile brand header, capped form
  // width. "add"/"edit" (Phase 12, reached from an already-onboarded user's My Businesses page)
  // show only the form itself at full available width, starting directly at "Business
  // Information" - same form/fields/validation/service call either way, just less chrome around
  // it, per the explicit "the user is already onboarded" requirement.
  const isOnboarding = mode === "create";
  let editBusinessId = null;
  let loadingEdit = mode === "edit";

  // Local state, scoped to this mount — matches React's useState reset on
  // every fresh mount of the component (this page is a standalone route,
  // not a persistent layout child, so a fresh render() call = a fresh mount).
  let showSuccess = false;
  let form = { ...INITIAL_FORM };
  let shareholders = [emptyShareholder()];
  let saveError = "";
  let saving = false;

  function buildHtml() {
    if (loadingEdit) {
      return `
        <div class="min-h-screen flex items-center justify-center" style="background:${C.bg};">
          <p class="text-sm" style="color:${C.textMuted};">Loading business profile…</p>
        </div>
      `;
    }

    const showShareholders = form.businessStatus !== "" && form.businessStatus !== "Proprietorship";
    const isPartnership = form.businessStatus === "Partnership";

    return `
      <div class="min-h-screen flex" style="font-family:var(--font-display);background:${C.bg};">
        ${isOnboarding ? `
        <!-- Left panel (onboarding only - see isOnboarding's own comment above) -->
        <div class="hidden lg:flex lg:w-[360px] flex-shrink-0 flex-col justify-between px-10 py-12 relative overflow-hidden"
          style="background:linear-gradient(160deg, #042614 0%, #063D1C 70%);">
          <div class="absolute inset-0 pointer-events-none overflow-hidden">
            <div class="absolute -bottom-24 -left-24 w-72 h-72 rounded-full opacity-10"
              style="background:radial-gradient(circle, #4ADE80, transparent 70%);"></div>
          </div>

          <div class="relative z-10">
            <div class="w-16 h-16 rounded-2xl flex items-center justify-center mb-7 mx-auto"
              style="background:linear-gradient(160deg, rgba(255,255,255,0.14), rgba(255,255,255,0.04));border:1px solid rgba(255,255,255,0.18);box-shadow:0 0 24px rgba(74,222,128,0.25);">
              <img data-fallback src="/Content/images/state_bank_of_pakistan_logo-1.png" alt="SBP" class="w-12 h-12 object-contain" style="filter:brightness(0) invert(1);" />
            </div>

            <h2 class="text-3xl font-black tracking-tight leading-[1.15] mb-2">
              <span class="text-white">Create Your</span><br />
              <span style="background:linear-gradient(90deg, #4ADE80, #A7F3D0);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">Business Profile</span>
            </h2>
            <p class="text-white text-xs leading-relaxed mb-6">
              A single account can manage multiple businesses. Add your business details below to start applying for financing.
            </p>

            <h3 class="text-white text-base font-bold mb-3">Why It Works For You</h3>
            <div class="space-y-2">
              ${[
                { iconName: "shield-check", text: "Predefined requirements reduce rejections." },
                { iconName: "scale", text: "Fair process, less discretionary conduct." },
                { iconName: "users-2", text: "Every eligible business can apply." },
                { iconName: "zap", text: "Faster loan processing time." },
              ].map(({ iconName, text }) => `
                <div class="flex items-center gap-3 p-2.5 rounded-xl transition-all"
                  style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.08);">
                  <div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style="background:rgba(74,222,128,0.15);">
                    ${icon(iconName, { size: 16, color: "#4ADE80" })}
                  </div>
                  <span class="text-white text-xs leading-snug">${text}</span>
                </div>
              `).join("")}
            </div>
          </div>

          <div class="relative z-10 p-4 rounded-xl" style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.08);">
            <p class="text-white/40 text-[11px] leading-relaxed">
              Your business data is encrypted and used solely for financing evaluation under SBP's SME framework.
            </p>
          </div>
        </div>
        ` : ""}

        <!-- Right form -->
        <div class="flex-1 overflow-y-auto">
          <div class="${isOnboarding ? "max-w-2xl mx-auto" : "max-w-none"} px-6 py-10">
            <button data-back class="flex items-center gap-2 mb-6 text-sm" style="color:${C.textMuted};">
              ${icon("arrow-left", { size: 16 })} Back
            </button>

            ${isOnboarding ? `
            <!-- Mobile brand header (onboarding only) -->
            <div class="lg:hidden flex items-center gap-3 mb-8">
              <div class="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style="background:linear-gradient(160deg, ${C.green}, ${C.greenDark});">
                <img data-fallback src="/Content/images/state_bank_of_pakistan_logo-1.png" alt="SBP" class="w-9 h-9 object-contain" style="filter:brightness(0) invert(1);" />
              </div>
              <div>
                <h2 class="text-base font-extrabold" style="color:${C.text};">Create Your Business Profile</h2>
                <p class="text-xs" style="color:${C.textMuted};">State Bank of Pakistan</p>
              </div>
            </div>
            ` : ""}

            <!-- Header -->
            <div class="mb-6 flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style="background:linear-gradient(135deg, ${C.green}, ${C.greenDark});">
                ${icon("building-2", { size: 20, color: "#fff" })}
              </div>
              <div>
                <h3 class="text-xl font-extrabold leading-tight" style="color:${C.text};letter-spacing:-0.01em;">Business Information</h3>
                <div class="h-[3px] w-10 rounded-full mt-1.5" style="background:linear-gradient(90deg, ${C.green}, ${C.blue});"></div>
              </div>
            </div>

            ${saveError ? `
              <div class="rounded-xl p-3 flex gap-2.5 mb-6" style="background:#FEE2E2;border:1.5px solid #DC2626;">
                ${icon("x-circle", { size: 16, color: "#DC2626", style: "margin-top:2px;" })}
                <p class="text-xs leading-relaxed" style="color:#DC2626;">${escapeHtml(saveError)}</p>
              </div>
            ` : ""}

            <div class="rounded-2xl border p-5 md:p-6" style="border:1.5px solid ${C.border};background:${C.surface};">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                ${fieldHtml({ key: "name", label: "Name of Business", placeholder: "ABC Traders", required: true, value: form.name })}
                ${fieldHtml({ key: "ownerCnic", label: "Owner CNIC", placeholder: "XXXXX-XXXXXXX-X", required: true, value: form.ownerCnic })}
                ${fieldHtml({ key: "contactPerson", label: "Contact Person", placeholder: "Ahmed Khan", required: true, value: form.contactPerson })}
                ${fieldHtml({ key: "cellLandline", label: "Cell / Landline No.", placeholder: "+92 300 0000000", type: "tel", required: true, value: form.cellLandline })}
                ${fieldHtml({ key: "email", label: "Business Email Address", placeholder: "info@business.com", type: "email", required: true, value: form.email })}
                ${fieldHtml({ key: "ntn", label: "NTN No. (If applicable)", placeholder: "1234567-8", value: form.ntn })}
                <div class="md:col-span-2">
                  ${textAreaHtml({ key: "address", label: "Business Address", placeholder: "Plot 45, SITE Industrial Area, Karachi", required: true, value: form.address })}
                </div>
                ${fieldHtml({ key: "annualSales", label: "Annual Sales (Rs.)", placeholder: "0", type: "number", required: true, value: form.annualSales })}
                ${fieldHtml({ key: "yearEstablished", label: "Year of Establishment", placeholder: "0", type: "number", required: true, value: form.yearEstablished })}
                ${fieldHtml({ key: "employees", label: "No. of Employees", placeholder: "0", type: "number", required: true, value: form.employees })}
                ${selectHtml({ key: "premise", label: "Business Premise", options: ["Owned", "Rented"], required: true, value: form.premise })}
                ${selectHtml({ key: "nature", label: "Business Nature", options: ["Manufacturing", "Services", "Trading", "Agri-SME"], required: true, value: form.nature })}
                ${selectHtml({ key: "businessStatus", label: "Business Status", options: ["Proprietorship", "Partnership", "Private Limited Company"], required: true, value: form.businessStatus })}
                ${selectHtml({ key: "registration", label: "Business Registration", options: ["Yes", "No"], required: true, value: form.registration })}
                ${form.registration === "Yes" ? `
                  ${fieldHtml({ key: "registrationNumber", label: "Registration Number", placeholder: "e.g. 0123456", required: true, value: form.registrationNumber })}
                  ${selectHtml({ key: "registrationAuthority", label: "Registration Authority", options: ["SECP"], required: true, value: form.registrationAuthority })}
                ` : ""}
                <div class="md:col-span-2">
                  ${textAreaHtml({ key: "description", label: "Business Description", placeholder: "Briefly describe your main products or services...", required: true, value: form.description })}
                </div>
              </div>
            </div>

            <!-- Shareholders / Partnership Details -->
            ${showShareholders ? `
              <div class="mt-8 rounded-2xl border p-5 md:p-6" style="border:1.5px solid ${C.border};background:${C.surface};">
                <div class="flex items-center justify-between mb-4">
                  <h3 class="text-base font-bold" style="color:${C.text};">${isPartnership ? "Partnership Details" : "Shareholders"}</h3>
                  <button data-add-shareholder class="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all hover:bg-gray-50"
                    style="border:1.5px solid ${C.green};color:${C.green};">
                    ${icon("plus", { size: 14 })} ${isPartnership ? "Add Partner" : "Add Shareholder"}
                  </button>
                </div>
                <div class="space-y-4">
                  ${shareholders.map((sh, i) => `
                    <div class="p-4 rounded-xl border" style="border:1.5px solid ${C.border};background:${C.bg};">
                      <div class="flex items-center justify-between mb-3">
                        <span class="text-xs font-semibold" style="color:${C.textMuted};">${isPartnership ? "PARTNER" : "SHAREHOLDER"} ${i + 1}</span>
                        ${shareholders.length > 1 ? `
                          <button data-remove-shareholder="${i}" style="color:#DC2626;">${icon("trash-2", { size: 14 })}</button>
                        ` : ""}
                      </div>
                      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        ${shareholderFieldHtml({ index: i, key: "name", label: "Full Name", placeholder: "Ahmed Khan", value: sh.name })}
                        ${shareholderFieldHtml({ index: i, key: "cnic", label: "CNIC", placeholder: "XXXXX-XXXXXXX-X", value: sh.cnic })}
                        ${isPartnership ? shareholderFieldHtml({ index: i, key: "role", label: "Role in Partnership", placeholder: "e.g. Managing Partner", value: sh.role }) : ""}
                        ${shareholderFieldHtml({ index: i, key: "phone", label: "Contact Number", placeholder: "+92 300 0000000", type: "tel", value: sh.phone })}
                        ${shareholderFieldHtml({ index: i, key: "email", label: "Email Address", placeholder: "email@domain.com", type: "email", value: sh.email })}
                        ${shareholderFieldHtml({ index: i, key: "share", label: isPartnership ? "Profit Sharing %" : "Shareholding %", placeholder: "e.g. 60", type: "number", value: sh.share })}
                      </div>
                    </div>
                  `).join("")}
                </div>
              </div>
            ` : ""}

            <!-- Bank Detail (Optional) -->
            <div class="mt-8 rounded-2xl border overflow-hidden" style="border:1.5px solid ${C.border};">
              <div class="px-5 py-4 border-l-4" style="border-color:${C.green};background:${C.greenLight};">
                <span class="text-sm font-bold" style="color:${C.text};">Bank Detail</span>
                <span class="text-xs ml-1" style="color:${C.textMuted};">(Optional)</span>
              </div>
              <div class="p-5 grid grid-cols-1 md:grid-cols-2 gap-4" style="background:${C.surface};">
                ${selectHtml({ key: "bank", label: "Bank", options: BANKS, value: form.bank })}
                ${fieldHtml({ key: "iban", label: "Business IBAN", placeholder: "e.g. PK36SCBL0000001123456702", hint: "International Bank Account Number (IBAN)", value: form.iban })}
              </div>
            </div>

            <!-- Navigation -->
            <div class="flex items-center justify-between mt-8 pt-6 border-t" style="border-color:${C.border};">
              <button data-cancel class="flex items-center gap-2 px-5 py-2.5 rounded-xl border text-sm font-medium transition-all hover:bg-gray-50"
                style="border:1.5px solid ${C.border};color:${C.text};">
                Cancel
              </button>

              <button data-save class="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
                style="background:${C.green};">
                ${mode === "edit" ? "Save Changes" : mode === "add" ? "Save Business" : "Save & Continue to Verification"} ${icon("check-circle-2", { size: 16 })}
              </button>
            </div>
          </div>
        </div>

        <style>
          .field-input:focus { border-color: ${C.green} !important; box-shadow: 0 0 0 3px ${C.green}18; }
        </style>

        ${showSuccess ? `
          <div class="fixed inset-0 z-50 flex items-center justify-center" style="background:rgba(0,0,0,0.4);">
            <div class="bg-white rounded-2xl p-8 text-center shadow-2xl">
              <div class="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style="background:${C.greenLight};">
                ${icon("check-circle-2", { size: 32, color: C.green })}
              </div>
              <h3 class="text-lg font-bold mb-1" style="color:${C.text};">${mode === "edit" ? "Business Profile Updated!" : "Business Profile Created!"}</h3>
              <p class="text-sm" style="color:${C.textMuted};">${mode === "create" ? "Redirecting to your dashboard..." : "Redirecting..."}</p>
            </div>
          </div>
        ` : ""}
      </div>
    `;
  }

  function wireEvents() {
    const goBack = () => {
      if (mode === "edit") navigate(editReturnPath);
      else if (mode === "add") navigate("/sme/businesses");
      else window.location.href = "/";
    };
    qs("[data-back]", container)?.addEventListener("click", goBack);
    qs("[data-cancel]", container)?.addEventListener("click", goBack);

    // Text field bindings (no full re-render on keystroke, to preserve focus);
    // select fields re-render because they can toggle conditional sections.
    qsa("[data-field]", container).forEach((el) => {
      const key = el.getAttribute("data-field");
      el.addEventListener(el.tagName === "SELECT" ? "change" : "input", (e) => {
        form = { ...form, [key]: e.target.value };
        if (key === "businessStatus" || key === "registration") {
          renderAll();
        }
      });
    });

    qsa("[data-shareholder-field]", container).forEach((el) => {
      const key = el.getAttribute("data-shareholder-field");
      const i = Number(el.getAttribute("data-shareholder-index"));
      el.addEventListener("input", (e) => {
        shareholders = shareholders.map((sh, idx) => (idx === i ? { ...sh, [key]: e.target.value } : sh));
      });
    });

    qs("[data-add-shareholder]", container)?.addEventListener("click", () => {
      shareholders = [...shareholders, emptyShareholder()];
      renderAll();
    });

    qsa("[data-remove-shareholder]", container).forEach((btn) => {
      btn.addEventListener("click", () => {
        const i = Number(btn.getAttribute("data-remove-shareholder"));
        shareholders = shareholders.filter((_, idx) => idx !== i);
        renderAll();
      });
    });

    qs("[data-save]", container)?.addEventListener("click", async () => {
      if (saving) return;
      saving = true;
      saveError = "";
      const showShareholders = form.businessStatus !== "" && form.businessStatus !== "Proprietorship";

      const payload = {
        name: form.name,
        nature: form.nature,
        ntn: form.ntn,
        address: form.address,
        ownerCnic: form.ownerCnic,
        contactPerson: form.contactPerson,
        cellLandline: form.cellLandline,
        email: form.email,
        yearEstablished: form.yearEstablished,
        annualSales: form.annualSales,
        employees: form.employees,
        premise: form.premise,
        businessStatus: form.businessStatus,
        registration: form.registration,
        registrationNumber: form.registration === "Yes" ? form.registrationNumber : undefined,
        registrationAuthority: form.registration === "Yes" ? form.registrationAuthority : undefined,
        description: form.description,
        bank: form.bank || undefined,
        iban: form.iban || undefined,
        shareholders: showShareholders ? shareholders : [],
      };

      const result = mode === "edit"
        ? await api.updateBusiness({ ...payload, businessId: editBusinessId })
        : await api.saveBusiness(payload);
      saving = false;

      if (!result || !result.success) {
        saveError = (result && result.message) || "Couldn't save your business. Please check the form and try again.";
        renderAll();
        return;
      }

      if (mode === "edit") {
        updateBusinessInState(result.business);
        showSuccess = true;
        renderAll();
        setTimeout(() => navigate(editReturnPath), 1500);
      } else if (mode === "add") {
        addBusiness(result.business);
        showSuccess = true;
        renderAll();
        setTimeout(() => navigate("/sme/businesses"), 1500);
      } else {
        addBusiness(result.business);
        showSuccess = true;
        renderAll();
        setTimeout(() => { window.location.href = "/Applicant"; }, 1500);
      }
    });
  }

  function renderAll() {
    container.innerHTML = buildHtml();
    wireEvents();
    hydrateIcons();
    wireImageFallbacks(container);
  }

  renderAll();

  if (mode === "edit") {
    const fetchBusiness = params && params.id ? api.getBusinessById(params.id) : api.getMyPrimaryBusiness();
    fetchBusiness.then((result) => {
      loadingEdit = false;
      if (result && result.business) {
        editBusinessId = result.business.id;
        form = businessToForm(result.business);
        shareholders = businessToShareholders(result.business);
      } else {
        saveError = "Couldn't load your business profile. Please try again.";
      }
      renderAll();
    });
  }
}
