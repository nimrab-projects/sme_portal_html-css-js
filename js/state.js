// 1:1 port of src/app/context/AppContext.tsx
// Plain-JS module-level store replacing React Context. No persistence (matches
// the original: state resets to seed data on every page reload).

const SAMPLE_BUSINESSES = [
  {
    id: "b1", name: "ABC Traders", nature: "Trading", ntn: "1234567-8",
    address: "Plot 45, SITE Industrial Area, Karachi", status: "Active",
    ownerCnic: "42101-1234567-1", contactPerson: "Ahmed Khan", cellLandline: "+92 300 0000000",
    email: "ahmed.khan@abctraders.com", yearEstablished: "2018", annualSales: "18,500,000", employees: "25",
    premise: "Rented", businessStatus: "Proprietorship", registration: "No", description: "Wholesale trading of textile goods.",
  },
  {
    id: "b2", name: "XYZ Foods Pvt. Ltd.", nature: "Manufacturing", ntn: "9876543-2",
    address: "F-6 Industrial Estate, Lahore", status: "Active",
    ownerCnic: "35201-7654321-9", contactPerson: "Sara Malik", cellLandline: "+92 321 0000000",
    email: "sara.malik@xyzfoods.com", yearEstablished: "2015", annualSales: "42,000,000", employees: "60",
    premise: "Owned", businessStatus: "Private Limited Company", registration: "Yes",
    registrationNumber: "0071523", registrationAuthority: "SECP", description: "Packaged food manufacturing and distribution.",
  },
];

const SAMPLE_APPS = [
  { id: "a1", caseId: "SBP-SME-2025-00142", businessName: "ABC Traders", scheme: "SME Asaan Finance (SAAF)", amount: "PKR 8,500,000", status: "under_review", bank: "HBL", submittedDate: "2025-06-12", stage: 3 },
  { id: "a2", caseId: "SBP-SME-2025-00098", businessName: "XYZ Foods Pvt. Ltd.", scheme: "Refinance Facility for SMEs", amount: "PKR 15,000,000", status: "approved", bank: "MCB Bank", submittedDate: "2025-05-28", stage: 5 },
  { id: "a3", caseId: "SBP-SME-2025-00071", businessName: "ABC Traders", scheme: "Technology Upgrade Scheme", amount: "PKR 22,000,000", status: "disbursed", bank: "UBL", submittedDate: "2025-04-10", stage: 6 },
  { id: "a4", caseId: "SBP-SME-2025-00183", businessName: "XYZ Foods Pvt. Ltd.", scheme: "SME Asaan Finance (SAAF)", amount: "PKR 5,000,000", status: "draft", bank: "—", submittedDate: "—", stage: 0 },
];

const SAMPLE_BANK_APPLICATIONS = [
  { id: "A001", caseId: "SBP-SME-2025-00142", business: "ABC Traders", scheme: "SAAF", amount: "PKR 8.5M", submitted: "Jun 12", status: "under_review", risk: "Low" },
  { id: "A002", caseId: "SBP-SME-2025-00139", business: "Karachi Steel Works", scheme: "Tech Upgrade", amount: "PKR 22M", submitted: "Jun 10", status: "pending", risk: "Medium" },
  { id: "A003", caseId: "SBP-SME-2025-00131", business: "Fresh Farm Exports", scheme: "Agri-SME", amount: "PKR 12M", submitted: "Jun 8", status: "pending", risk: "Low" },
  { id: "A004", caseId: "SBP-SME-2025-00128", business: "TechSoft Solutions", scheme: "SAAF", amount: "PKR 6M", submitted: "Jun 5", status: "offer_issued", risk: "Low" },
  { id: "A005", caseId: "SBP-SME-2025-00119", business: "Lahore Textile Mills", scheme: "Refinance", amount: "PKR 18M", submitted: "Jun 2", status: "approved", risk: "High" },
];

const SAMPLE_NOTIFICATIONS = [
  { id: "n1", title: "Application Under Review", desc: "SBP-SME-2025-00142 is being reviewed by HBL", time: "2h ago", dot: "#2563EB", read: false },
  { id: "n2", title: "Offer Received", desc: "MCB Bank has issued a conditional offer for XYZ Foods", time: "Yesterday", dot: "#006838", read: false },
  { id: "n3", title: "Document Required", desc: "Additional documents requested for ABC Traders application", time: "2 days ago", dot: "#EA580C", read: false },
];

function freshState() {
  return {
    role: null,
    user: null,
    businesses: SAMPLE_BUSINESSES.slice(),
    selectedBusiness: SAMPLE_BUSINESSES[0],
    applications: SAMPLE_APPS.slice(),
    selectedApplication: null,
    applicationDocuments: {},
    notifications: SAMPLE_NOTIFICATIONS.slice(),
    offerDocument: null,
    bankApplications: SAMPLE_BANK_APPLICATIONS.slice(),
  };
}

export const state = freshState();

const listeners = new Set();

// Subscribe to state changes (used by the router/layouts to trigger a re-render).
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  listeners.forEach((fn) => fn());
}

export function setRole(r) {
  state.role = r;
  notify();
}

export function setUser(u) {
  state.user = u;
  notify();
}

export function setSelectedBusiness(b) {
  state.selectedBusiness = b;
  notify();
}

export function addBusiness(b) {
  state.businesses = [...state.businesses, b];
  state.selectedBusiness = b;
  notify();
}

export function setSelectedApplication(a) {
  state.selectedApplication = a;
  notify();
}

// Mirrors AppContext.addApplication exactly, including the caseId/id generation format.
export function addApplication(a) {
  const now = new Date();
  const caseId = `SBP-SME-${now.getFullYear()}-${String(Math.floor(Math.random() * 90000) + 10000)}`;
  const id = `a${Date.now()}`;
  const isoDate = now.toISOString().slice(0, 10);
  const shortDate = now.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  state.applications = [
    { id, caseId, businessName: a.businessName, scheme: a.scheme, amount: a.amount, status: "submitted", bank: a.bank, submittedDate: isoDate, stage: 1 },
    ...state.applications,
  ];
  state.bankApplications = [
    { id, caseId, business: a.businessName, scheme: a.scheme, amount: a.amount, status: "pending", submitted: shortDate, risk: "Low" },
    ...state.bankApplications,
  ];
  if (a.documents && a.documents.length) {
    state.applicationDocuments = { ...state.applicationDocuments, [id]: a.documents };
  }

  notify();
  return caseId;
}

export function addNotification(n) {
  state.notifications = [{ ...n, id: `n${Date.now()}`, read: false }, ...state.notifications];
  notify();
}

export function markNotificationsRead() {
  state.notifications = state.notifications.map((n) => ({ ...n, read: true }));
  notify();
}

export function setOfferDocument(o) {
  state.offerDocument = o;
  notify();
}

export function updateBankApplicationStatus(id, status) {
  state.bankApplications = state.bankApplications.map((a) => (a.id === id ? { ...a, status } : a));
  notify();
}
