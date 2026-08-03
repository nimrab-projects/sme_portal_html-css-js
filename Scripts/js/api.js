// Thin fetch wrapper for the ASP.NET MVC5 JSON API (see Setup.md Phase 1 / Controllers/
// AccountController.cs, Controllers/BusinessController.cs). Same plain-ES-module style as
// utils.js: small named exports, no build step, no framework.

let csrfToken = null;

async function request(path, { method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (method !== "GET" && csrfToken) headers["X-CSRF-TOKEN"] = csrfToken;

  let res;
  try {
    res = await fetch(path, {
      method,
      headers,
      credentials: "same-origin",
      // Always send a body (even "") on non-GET requests - some servers reject a POST with
      // no body/Content-Length at all.
      body: method !== "GET" ? JSON.stringify(body ?? {}) : undefined,
    });
  } catch (e) {
    return { success: false, error: "network_error" };
  }

  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }
  if (!data) return { success: false, error: "network_error" };
  return data;
}

// Fetches the double-submit CSRF token (also sets the antiforgery cookie as a side effect on
// the server) and caches it for every mutating call this page session makes. Must run before
// any POST (register/login/logout/save-business) - every page whose JS makes a POST call needs
// to call this (or bootstrapSession(), which calls it internally) once at boot. Exported
// directly (not just via bootstrapSession()) for pages like Login/Setup that need the token
// but don't need a full session/business-list fetch.
export async function loadCsrfToken() {
  const data = await request("/api/account/csrf-token");
  csrfToken = data && data.token ? data.token : null;
}

export async function register(payload) {
  return request("/api/account/register", { method: "POST", body: payload });
}

export async function verifyOtp(payload) {
  return request("/api/account/verify-otp", { method: "POST", body: payload });
}

export async function login(payload) {
  return request("/api/account/login", { method: "POST", body: payload });
}

export async function logout() {
  return request("/api/account/logout", { method: "POST" });
}

export async function getCurrentUser() {
  return request("/api/account/current-user");
}

export async function saveBusiness(payload) {
  return request("/api/business/save", { method: "POST", body: payload });
}

export async function listMyBusinesses() {
  return request("/api/business/my");
}

// Phase 10 (Profile & Business Profile Management): updates the caller's EXISTING business
// (identified by payload.businessId) in place - never creates a second row.
export async function updateBusiness(payload) {
  return request("/api/business/update", { method: "POST", body: payload });
}

// Phase 12 (Multiple Business Management): fetches any one of the caller's own businesses by
// id (not just the primary one) - backs the My Businesses page's View/Edit-by-id actions. The
// server 404s (not the usual {success:false} JSON-with-200 body) for a business that doesn't
// exist or belongs to another user - request() can't parse a 404's body as JSON, so this
// mirrors getApplicationDetail()'s own real-fetch + status-check pattern below.
export async function getBusinessById(id) {
  const res = await fetch(`/api/business/${id}`, { credentials: "same-origin" });
  if (res.status === 404) {
    return { success: false, error: "not_found" };
  }
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }
  if (!data) return { success: false, error: "network_error" };
  return { success: true, business: data.business };
}

export async function deleteBusiness(id) {
  const headers = {};
  if (csrfToken) headers["X-CSRF-TOKEN"] = csrfToken;
  let res;
  try {
    res = await fetch(`/api/business/${id}`, { method: "DELETE", headers, credentials: "same-origin" });
  } catch (e) {
    return { success: false, error: "network_error" };
  }
  if (res.status === 404) return { success: false, error: "not_found" };
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }
  return data || { success: false, error: "network_error" };
}

export async function getMyProfile() {
  return request("/api/profile/me");
}

// The user's primary (first-created) business - what Business Profile view/edit always
// operate on. request() can't parse a 404's HTML body as JSON, so a user with no business yet
// gets a clean { success:false, error:"network_error" } instead of throwing.
export async function getMyPrimaryBusiness() {
  return request("/api/profile/business");
}

export async function updateProfile(payload) {
  return request("/api/profile/update", { method: "POST", body: payload });
}

export async function changePassword(payload) {
  return request("/api/profile/change-password", { method: "POST", body: payload });
}

export async function listMyApplications() {
  return request("/api/applications/mine");
}

export async function submitApplication(payload) {
  return request("/api/applications/save", { method: "POST", body: payload });
}

// Backs Application Details/Tracking (Phase 8). The server 404s (not the usual
// {success:false} JSON-with-200 body) for an application that doesn't exist or belongs to
// another user - request() below can't parse a 404's empty body as JSON, so callers get
// { success: false, error: "not_found" } instead of throwing.
export async function getApplicationDetail(id) {
  const res = await fetch(`/api/applications/${id}`, { credentials: "same-origin" });
  if (res.status === 404) {
    return { success: false, error: "not_found" };
  }
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }
  if (!data) return { success: false, error: "network_error" };
  return { success: true, application: data.application };
}

// Application Document upload/view/replace/delete (Phase 9). Upload/replace use FormData, not
// the JSON `request()` helper above - a real file body needs multipart/form-data with a
// browser-generated boundary, which fetch only sets correctly when the Content-Type header is
// left unset entirely (manually setting it to anything, including a guessed boundary, breaks
// the browser's own multipart body).
export async function listApplicationDocuments(applicationId) {
  return request(`/api/applications/${applicationId}/documents`);
}

async function postFormData(path, formData) {
  const headers = {};
  if (csrfToken) headers["X-CSRF-TOKEN"] = csrfToken;
  let res;
  try {
    res = await fetch(path, { method: "POST", headers, credentials: "same-origin", body: formData });
  } catch (e) {
    return { success: false, error: "network_error" };
  }
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }
  return data || { success: false, error: "network_error" };
}

export async function uploadApplicationDocument(applicationId, documentType, file) {
  const formData = new FormData();
  formData.append("documentType", documentType);
  formData.append("file", file);
  return postFormData(`/api/applications/${applicationId}/documents`, formData);
}

export async function replaceApplicationDocument(applicationId, documentId, file) {
  const formData = new FormData();
  formData.append("file", file);
  return postFormData(`/api/applications/${applicationId}/documents/${documentId}/replace`, formData);
}

export async function deleteApplicationDocument(applicationId, documentId) {
  const headers = {};
  if (csrfToken) headers["X-CSRF-TOKEN"] = csrfToken;
  let res;
  try {
    res = await fetch(`/api/applications/${applicationId}/documents/${documentId}`, {
      method: "DELETE",
      headers,
      credentials: "same-origin",
    });
  } catch (e) {
    return { success: false, error: "network_error" };
  }
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }
  return data || { success: false, error: "network_error" };
}

// A plain URL, not a fetch - downloads/previews are a real browser navigation (anchor href /
// window.open), which is also what lets the browser natively preview PDFs/images inline.
export function applicationDocumentDownloadUrl(applicationId, documentId) {
  return `/api/applications/${applicationId}/documents/${documentId}/download`;
}

// Notifications & Communication Module (Phase 11).
export async function listMyNotifications() {
  return request("/api/notifications/mine");
}

export async function getUnreadNotificationCount() {
  return request("/api/notifications/unread-count");
}

export async function markNotificationRead(id) {
  const headers = {};
  if (csrfToken) headers["X-CSRF-TOKEN"] = csrfToken;
  let res;
  try {
    res = await fetch(`/api/notifications/${id}/read`, { method: "POST", headers, credentials: "same-origin" });
  } catch (e) {
    return { success: false, error: "network_error" };
  }
  if (res.status === 404) return { success: false, error: "not_found" };
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }
  return data || { success: false, error: "network_error" };
}

export async function markAllNotificationsRead() {
  return request("/api/notifications/read-all", { method: "POST" });
}

// Bank Portal (Phase 13). Sign-in is email + OTP only (no password field in
// js/pages/bank/auth.js) - reuses the same OtpService infrastructure as registration
// email-verification, just a server-side "BankLogin" purpose so the two never cross-validate.
export async function requestBankLoginOtp(email) {
  return request("/api/account/bank-login/request-otp", { method: "POST", body: { email } });
}

export async function verifyBankLoginOtp(email, otp) {
  return request("/api/account/bank-login/verify-otp", { method: "POST", body: { email, otp } });
}

export async function getBankDashboard() {
  return request("/api/bank/dashboard");
}

// SBP Admin Portal sync. Same email + OTP pattern as the Bank Officer login above - only the
// endpoint differs, so a Bank Officer/SBP Admin/registration OTP never cross-validate.
export async function requestSbpAdminLoginOtp(email) {
  return request("/api/account/sbp-admin-login/request-otp", { method: "POST", body: { email } });
}

export async function verifySbpAdminLoginOtp(email, otp) {
  return request("/api/account/sbp-admin-login/verify-otp", { method: "POST", body: { email, otp } });
}

export async function getSbpDashboard() {
  return request("/api/sbp/dashboard");
}

export async function getSbpApplications() {
  return request("/api/sbp/applications");
}

export async function getSbpUsers() {
  return request("/api/sbp/users");
}

// Same 404-can't-be-parsed-as-JSON handling as getApplicationDetail()/getBankApplicationDetail()
// above.
export async function getSbpUserDetail(id) {
  const res = await fetch(`/api/sbp/users/${id}`, { credentials: "same-origin" });
  if (res.status === 404) {
    return { success: false, error: "not_found" };
  }
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }
  if (!data) return { success: false, error: "network_error" };
  return { success: true, user: data.user };
}

export async function updateSbpUserStatus(id, action) {
  return request(`/api/sbp/users/${id}/status`, { method: "POST", body: { action } });
}

// Executive Dashboard's Bank Performance Overview row-click drill-down. Same 404-can't-be-
// parsed-as-JSON handling as getApplicationDetail()/getSbpUserDetail() above - a bank name with
// no applications on file (or the "Not Provided" bucket) 404s rather than returning a fake row.
export async function getSbpBankDetail(bankName) {
  const res = await fetch(`/api/sbp/banks/detail?bank=${encodeURIComponent(bankName)}`, { credentials: "same-origin" });
  if (res.status === 404) {
    return { success: false, error: "not_found" };
  }
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }
  if (!data) return { success: false, error: "network_error" };
  return { success: true, bank: data.bank };
}

// Bank Management (SBP Admin) - real CRUD against Controllers/SbpApplicationController.cs's
// Banks endpoints, replacing the hardcoded BANKS stub that used to live in
// js/pages/sbp/portal.js's bankManagementHtml().
export async function getSbpBanks() {
  return request("/api/sbp/banks");
}

export async function createSbpBank(payload) {
  return request("/api/sbp/banks", { method: "POST", body: payload });
}

export async function updateSbpBank(id, payload) {
  return request(`/api/sbp/banks/${id}`, { method: "POST", body: payload });
}

export async function updateSbpBankStatus(id, isActive) {
  return request(`/api/sbp/banks/${id}/status`, { method: "POST", body: { isActive } });
}

// Powers the Business Setup/Edit "Bank" dropdown (js/pages/sme/businessSetup.js) - replaces its
// old hardcoded BANKS array with the real, active banks from SBP Admin's Bank Management.
export async function listActiveBanks() {
  return request("/api/business/banks");
}

// SBP Admin Reports - real generation against Controllers/SbpApplicationController.cs's Reports
// endpoints (Services/ReportService.cs), replacing the hardcoded REPORTS stub that used to live
// in js/pages/sbp/portal.js's reportsHtml().
export async function getSbpReport(reportType) {
  return request(`/api/sbp/reports/${reportType}`);
}

export async function generateSbpCustomReport(filter) {
  return request("/api/sbp/reports/custom", { method: "POST", body: filter });
}

export async function getSbpReportHistory() {
  return request("/api/sbp/reports/history");
}

export async function regenerateSbpReport(id) {
  return request(`/api/sbp/reports/history/${id}/regenerate`);
}

// Audit Trail (SBP Admin Portal) - real logs against Controllers/SbpApplicationController.cs's
// audit-logs endpoint (Services/AuditService.cs), replacing the hardcoded LOGS stub that used to
// live in js/pages/sbp/portal.js's auditTrailHtml().
export async function getSbpAuditLogs() {
  return request("/api/sbp/audit-logs");
}

export async function getBankApplications() {
  return request("/api/bank/applications");
}

// Same 404-can't-be-parsed-as-JSON handling as getApplicationDetail() above.
export async function getBankApplicationDetail(id) {
  const res = await fetch(`/api/bank/applications/${id}`, { credentials: "same-origin" });
  if (res.status === 404) {
    return { success: false, error: "not_found" };
  }
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }
  if (!data) return { success: false, error: "network_error" };
  return { success: true, application: data.application };
}

export async function updateBankApplicationStatus(id, status, remarks) {
  return request(`/api/bank/applications/${id}/status`, { method: "POST", body: { status, remarks } });
}

export async function verifyBankDocument(applicationId, documentId, remarks) {
  return request(`/api/bank/applications/${applicationId}/documents/${documentId}/verify`, {
    method: "POST",
    body: { remarks },
  });
}

export async function rejectBankDocument(applicationId, documentId, remarks) {
  return request(`/api/bank/applications/${applicationId}/documents/${documentId}/reject`, {
    method: "POST",
    body: { remarks },
  });
}

export function bankApplicationDocumentDownloadUrl(applicationId, documentId) {
  return `/api/bank/applications/${applicationId}/documents/${documentId}/download`;
}

// "Request More Information" (Application Queue) - creates a real Notification for the
// applicant. Previously this was a client-only addNotification() call that only ever updated
// the bank officer's own browser tab, never actually reaching the applicant.
export async function requestApplicationInfo(applicationId, requestType, messages) {
  return request(`/api/bank/applications/${applicationId}/request-info`, {
    method: "POST",
    body: { requestType, messages },
  });
}

// Conditional Offer (Phase 14). Issuing an offer needs a real file upload (multipart, like
// uploadApplicationDocument above) alongside the officer-entered terms, so this uses
// postFormData rather than the JSON request() helper.
export async function issueBankOffer(applicationId, terms, file) {
  const formData = new FormData();
  Object.entries(terms).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== "") formData.append(key, value);
  });
  formData.append("file", file);
  return postFormData(`/api/bank/applications/${applicationId}/offer`, formData);
}

// Same 404-can't-be-parsed-as-JSON handling as getApplicationDetail()/getBankApplicationDetail()
// above - "no offer issued yet" and "not yours" both surface as a plain 404.
export async function getApplicationOffer(id) {
  const res = await fetch(`/api/applications/${id}/offer`, { credentials: "same-origin" });
  if (res.status === 404) {
    return { success: false, error: "not_found" };
  }
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }
  if (!data) return { success: false, error: "network_error" };
  return { success: true, offer: data.offer };
}

export async function decideApplicationOffer(id, decision, reason) {
  return request(`/api/applications/${id}/offer/decision`, { method: "POST", body: { decision, reason } });
}

// Called once at boot (js/main.js) before the router starts, so a page reload while
// logged in re-hydrates js/state.js from the database instead of resetting to the mock
// seed data. Never throws - any failure just leaves the app in its logged-out seed state.
export async function bootstrapSession() {
  await loadCsrfToken();
  try {
    const current = await getCurrentUser();
    if (!current || !current.authenticated) {
      return { authenticated: false };
    }
    const businessesResult = await listMyBusinesses();
    const businesses = (businessesResult && businessesResult.businesses) || [];
    const applicationsResult = await listMyApplications();
    const applications = (applicationsResult && applicationsResult.applications) || [];
    const notificationsResult = await listMyNotifications();
    const notifications = (notificationsResult && notificationsResult.notifications) || [];
    return { authenticated: true, user: current.user, businesses, applications, notifications };
  } catch (e) {
    return { authenticated: false };
  }
}
