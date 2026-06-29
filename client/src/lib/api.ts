import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('app_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401s
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !err.config.url?.includes('/auth/')) {
      localStorage.removeItem('app_token');
      // Optionally redirect to login
    }
    return Promise.reject(err);
  }
);

// ── Auth ─────────────────────────────────────────────────
export const auth = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }).then(r => { localStorage.setItem('app_token', r.data.token); return r.data; }),
  register: (data: { email: string; password: string; name: string; role?: string }) => api.post('/auth/register', data).then(r => { localStorage.setItem('app_token', r.data.token); return r.data; }),
  guest: () => api.post('/auth/guest').then(r => { localStorage.setItem('app_token', r.data.token); return r.data; }),
  me: () => api.get('/auth/me').then(r => r.data),
  updateProfile: (data: { name?: string; company?: string }) => api.patch('/auth/me', data).then(r => r.data),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.post('/auth/password', data).then(r => r.data),
  logout: () => { localStorage.removeItem('app_token'); return api.post('/auth/logout'); },
};

export const webhooks = {
  list: () => api.get('/webhooks').then(r => r.data),
  create: (data: { url: string; events?: string[] }) => api.post('/webhooks', data).then(r => r.data),
  remove: (id: string) => api.delete(`/webhooks/${id}`).then(r => r.data),
};

// ── Dashboard ────────────────────────────────────────────
export const dashboard = {
  metrics: () => api.get('/dashboard/metrics').then(r => r.data),
  clientSummary: () => api.get('/dashboard/client-summary').then(r => r.data),
  payrollCostTrend: () => api.get('/dashboard/payroll-cost-trend').then(r => r.data),
  departmentTotals: () => api.get('/dashboard/department-totals').then(r => r.data),
  topEarners: (limit = 5) => api.get('/dashboard/top-earners', { params: { limit } }).then(r => r.data),
  recentActivity: (limit = 8) => api.get('/dashboard/recent-activity', { params: { limit } }).then(r => r.data),
};

// ── Clients (EOR) ────────────────────────────────────────
export const clients = {
  list: () => api.get('/clients').then(r => r.data),
  get: (id: string) => api.get(`/clients/${id}`).then(r => r.data),
  create: (data: any) => api.post('/clients', data).then(r => r.data),
  update: (id: string, data: any) => api.patch(`/clients/${id}`, data).then(r => r.data),
};

// ── Deposits (EOR trust account) ─────────────────────────
export const deposits = {
  list: () => api.get('/deposits').then(r => r.data),
  ledger: (id: string) => api.get(`/deposits/${id}/ledger`).then(r => r.data),
  ledgerAll: () => api.get('/deposits/ledger/all').then(r => r.data),
  quote: (data: { salary: number; fixedAllowances: { label: string; amount: number }[]; noticeMonths: number }) =>
    api.post('/deposits/quote', data).then(r => r.data),
  createForEmployee: (employeeId: string) => api.post(`/deposits/for-employee/${employeeId}`).then(r => r.data),
  markReceived: (id: string, data: { trustAccountRef?: string; receivedDate?: string }) =>
    api.post(`/deposits/${id}/mark-received`, data).then(r => r.data),
  draw: (id: string, data: { amount: number; reference: string; note?: string }) =>
    api.post(`/deposits/${id}/draw`, data).then(r => r.data),
  refund: (id: string, data: { amount: number; note?: string }) =>
    api.post(`/deposits/${id}/refund`, data).then(r => r.data),
};

// ── Contracts (EOR) ──────────────────────────────────────
export const contracts = {
  templates: () => api.get('/contracts/templates').then(r => r.data),
  list: () => api.get('/contracts').then(r => r.data),
  get: (id: string) => api.get(`/contracts/${id}`).then(r => r.data),
  generate: (data: { templateId: string; employeeId: string; variables?: Record<string, string> }) =>
    api.post('/contracts', data).then(r => r.data),
  sign: (id: string, data: { party: string; signerName: string; signerEmail: string }) =>
    api.post(`/contracts/${id}/sign`, data).then(r => r.data),
  pdf: (id: string) => api.post(`/contracts/${id}/pdf`).then(r => r.data),
};

// ── Employees ────────────────────────────────────────────
export const employees = {
  list: () => api.get('/employees').then(r => r.data),
  get: (id: string) => api.get(`/employees/${id}`).then(r => r.data),
  me: () => api.get('/employees/me').then(r => r.data),
  create: (data: any) => api.post('/employees', data).then(r => r.data),
  update: (id: string, data: any) => api.patch(`/employees/${id}`, data).then(r => r.data),
};

// ── Payroll ──────────────────────────────────────────────
export const payroll = {
  runs: () => api.get('/payroll/runs').then(r => r.data),
  run: (id: string) => api.get(`/payroll/runs/${id}`).then(r => r.data),
  createRun: (data: any) => api.post('/payroll/runs', data).then(r => r.data),
  updateStatus: (id: string, status: string) => api.patch(`/payroll/runs/${id}/status`, { status }).then(r => r.data),
  payslips: (employeeId?: string) => api.get('/payroll/payslips', { params: { employeeId } }).then(r => r.data),
};

// ── Customers & Invoices ─────────────────────────────────
export const customers = {
  list: () => api.get('/customers').then(r => r.data),
  create: (data: any) => api.post('/customers', data).then(r => r.data),
};

export const invoices = {
  list: () => api.get('/invoices').then(r => r.data),
  get: (id: string) => api.get(`/invoices/${id}`).then(r => r.data),
  create: (data: any) => api.post('/invoices', data).then(r => r.data),
  update: (id: string, data: any) => api.patch(`/invoices/${id}`, data).then(r => r.data),
  remove: (id: string) => api.delete(`/invoices/${id}`).then(r => r.data),
};

// ── Expenses ─────────────────────────────────────────────
export const expenses = {
  list: (params?: { employeeId?: string; status?: string }) => api.get('/expenses', { params }).then(r => r.data),
  create: (data: any) => api.post('/expenses', data).then(r => r.data),
  update: (id: string, data: any) => api.patch(`/expenses/${id}`, data).then(r => r.data),
};

export const receipts = {
  list: (expenseId?: string) => api.get('/receipts', { params: { expenseId } }).then(r => r.data),
  create: (data: any) => api.post('/receipts', data).then(r => r.data),
};

// ── Vendors & Bills ──────────────────────────────────────
export const vendors = {
  list: () => api.get('/vendors').then(r => r.data),
  create: (data: any) => api.post('/vendors', data).then(r => r.data),
};

export const bills = {
  list: (params?: { vendorId?: string; status?: string }) => api.get('/bills', { params }).then(r => r.data),
  create: (data: any) => api.post('/bills', data).then(r => r.data),
  update: (id: string, data: any) => api.patch(`/bills/${id}`, data).then(r => r.data),
};

// ── Accounting ───────────────────────────────────────────
export const accounting = {
  chart: () => api.get('/accounting/chart').then(r => r.data),
  createAccount: (data: any) => api.post('/accounting/chart', data).then(r => r.data),
  journal: () => api.get('/accounting/journal').then(r => r.data),
  journalEntry: (id: string) => api.get(`/accounting/journal/${id}`).then(r => r.data),
  createJournal: (data: any) => api.post('/accounting/journal', data).then(r => r.data),
};

// ── Settlement & Treasury ────────────────────────────────
export const stablecoins = {
  list: () => api.get('/stablecoins').then(r => r.data),
};

export const wallets = {
  list: () => api.get('/wallets').then(r => r.data),
};

export const transactions = {
  list: () => api.get('/transactions').then(r => r.data),
  send: (data: any) => api.post('/transactions/send', data).then(r => r.data),
  swap: (data: any) => api.post('/transactions/swap', data).then(r => r.data),
};

export const treasury = {
  deposits: () => api.get('/treasury/deposits').then(r => r.data),
  deposit: (data: any) => api.post('/treasury/deposits', data).then(r => r.data),
};

// ── Time Off ─────────────────────────────────────────────
export const timeOff = {
  balances: (employeeId?: string) => api.get('/time-off/balances', { params: { employeeId } }).then(r => r.data),
  requests: (params?: { employeeId?: string; status?: string }) => api.get('/time-off/requests', { params }).then(r => r.data),
  createRequest: (data: any) => api.post('/time-off/requests', data).then(r => r.data),
  updateRequest: (id: string, data: any) => api.patch(`/time-off/requests/${id}`, data).then(r => r.data),
};

// ── Approvals ────────────────────────────────────────────
export const approvals = {
  list: (params?: { status?: string; type?: string }) => api.get('/approvals', { params }).then(r => r.data),
  update: (id: string, status: string) => api.patch(`/approvals/${id}`, { status }).then(r => r.data),
};

// ── People ───────────────────────────────────────────────
export const people = {
  list: (params?: { department?: string; search?: string }) => api.get('/people', { params }).then(r => r.data),
};

// ── Reports ──────────────────────────────────────────────
export const reports = {
  list: () => api.get('/reports').then(r => r.data),
  create: (data: any) => api.post('/reports', data).then(r => r.data),
};

// ── Automation ───────────────────────────────────────────
export const automation = {
  rules: () => api.get('/automation/rules').then(r => r.data),
  createRule: (data: any) => api.post('/automation/rules', data).then(r => r.data),
  updateRule: (id: string, data: any) => api.patch(`/automation/rules/${id}`, data).then(r => r.data),
  deleteRule: (id: string) => api.delete(`/automation/rules/${id}`).then(r => r.data),
};

// ── Integrations ─────────────────────────────────────────
export const integrations = {
  list: () => api.get('/integrations').then(r => r.data),
  create: (data: any) => api.post('/integrations', data).then(r => r.data),
  remove: (id: string) => api.delete(`/integrations/${id}`).then(r => r.data),
};

// ── FX ───────────────────────────────────────────────────
export const fx = {
  rates: () => api.get('/fx/rates').then(r => r.data),
};

// ── Documents ────────────────────────────────────────────
export const documents = {
  listByUser: (userId: string, params?: { documentType?: string; limit?: number; offset?: number }) =>
    api.get(`/documents/user/${userId}`, { params }).then(r => r.data),
  get: (id: string) => api.get(`/documents/${id}`).then(r => r.data),
  signedUrl: (id: string) => api.get(`/documents/signed-url/${id}`).then(r => r.data),
  remove: (id: string) => api.delete(`/documents/${id}`).then(r => r.data),
  kycQueue: () => api.get('/documents/kyc/queue').then(r => r.data),
  setVerification: (id: string, body: { status: 'verified' | 'rejected'; notes?: string }) =>
    api.patch(`/documents/${id}/verification`, body).then(r => r.data),
};

// ── Audit ────────────────────────────────────────────────
export const auditLogs = {
  list: () => api.get('/audit-logs').then(r => r.data),
};

// ── Settlement (EOR final-pay calculation) ───────────────
export const settlement = {
  final: (data: {
    employeeId: string;
    cessationDate: string;
    initiatedBy: 'employer' | 'employee' | 'misconduct';
    unusedAnnualLeaveDays: number;
    noticeInLieuDays: number;
    contractualSeverance?: number;
    terminationBenefits?: number;
  }) => api.post('/settlement/final', data).then(r => r.data),
};

// ── Notifications ────────────────────────────────────────
export const notifications = {
  preferences: (userId: string) => api.get(`/notifications/preferences/${userId}`).then(r => r.data),
  updatePreferences: (userId: string, prefs: {
    emailEnabled?: boolean;
    smsEnabled?: boolean;
    taxAlerts?: boolean;
    fxAlerts?: boolean;
    payrollAlerts?: boolean;
    slackEnabled?: boolean;
  }) =>
    api.patch(`/notifications/preferences/${userId}`, prefs).then(r => r.data),
  history: (userId: string) => api.get(`/notifications/history/${userId}`).then(r => r.data),
  sendPayslip: (data: any) => api.post('/notifications/send-payslip', data).then(r => r.data),
  sendKycVerification: (data: any) => api.post('/notifications/send-kyc-verification', data).then(r => r.data),
  sendLivenessTest: (data: any) => api.post('/notifications/send-liveness-test', data).then(r => r.data),
};

// ── Liveness (KYC) ───────────────────────────────────────
export const liveness = {
  initialize: (data: { userId: string; email: string }) =>
    api.post('/liveness/initialize', data).then(r => r.data),
  verify: (data: { testId: string; sessionId: string }) =>
    api.post('/liveness/verify', data).then(r => r.data),
  result: (testId: string) => api.get(`/liveness/result/${testId}`).then(r => r.data),
  history: (userId: string) => api.get(`/liveness/history/${userId}`).then(r => r.data),
  latest: (userId: string) => api.get(`/liveness/latest/${userId}`).then(r => r.data),
  verified: (userId: string) => api.get(`/liveness/verified/${userId}`).then(r => r.data),
};

// ── Admin Analytics ──────────────────────────────────────
export const adminAnalytics = {
  payrollSummary: (companyId: string) => api.get(`/admin-analytics/payroll-summary/${companyId}`).then(r => r.data),
  payrollRun: (payrollRunId: string) => api.get(`/admin-analytics/payroll-run/${payrollRunId}`).then(r => r.data),
  employeeHistory: (employeeId: string) => api.get(`/admin-analytics/employee-history/${employeeId}`).then(r => r.data),
  deductionBreakdown: (payrollRunId: string) => api.get(`/admin-analytics/deduction-breakdown/${payrollRunId}`).then(r => r.data),
  settlementAnalytics: (companyId: string) => api.get(`/admin-analytics/settlement-analytics/${companyId}`).then(r => r.data),
  employeeDistribution: (companyId: string) => api.get(`/admin-analytics/employee-distribution/${companyId}`).then(r => r.data),
  topEarners: (companyId: string) => api.get(`/admin-analytics/top-earners/${companyId}`).then(r => r.data),
  payrollTrends: (companyId: string) => api.get(`/admin-analytics/payroll-trends/${companyId}`).then(r => r.data),
};

// ── Statutory filings (MY) ───────────────────────────────
export const statutory = {
  filings: (params?: { year?: number; month?: number; clientId?: string }) =>
    api.get('/statutory/filings', { params }).then(r => r.data),
};

// ── AI Chat ──────────────────────────────────────────────
export const chat = {
  messages: () => api.get('/chat/messages').then(r => r.data),
  send: (content: string) => api.post('/chat/messages', { content }).then(r => r.data),
};

export default api;
