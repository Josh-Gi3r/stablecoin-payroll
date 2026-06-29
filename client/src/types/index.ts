// ============================================================================
// PAYROLL PLATFORM - COMPREHENSIVE DATA MODELS
// ============================================================================

// AUTHENTICATION & USER
export type UserRole = 'super_admin' | 'client_admin' | 'finance' | 'hr' | 'employee';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  tenantId: string | null;
  clientId: string | null;
  company: string;
  createdAt: Date;
  isGuest: boolean;
}

// EOR tenant + client
export interface Tenant {
  id: string;
  type: 'operator' | 'client';
  name: string;
  country: 'MY' | 'SG';
  status: 'active' | 'suspended' | 'archived';
}

export interface Client {
  id: string;
  tenantId: string;
  operatorTenantId: string;
  name: string;
  country: 'MY' | 'SG';
  registrationNumber?: string;
  taxId?: string;
  primaryContactName?: string;
  primaryContactEmail?: string;
  primaryContactPhone?: string;
  servicePlan: 'basic' | 'enterprise';
  serviceFeePct: number;
  noticeDefaultMonths: number;
  status: 'active' | 'suspended' | 'archived';
}

export interface AuthContext {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string) => Promise<void>;
  logout: () => void;
  loginAsGuest: () => void;
}

// ============================================================================
// PAYROLL
// ============================================================================

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  employmentType: 'full-time' | 'part-time' | 'contractor';
  hireDate: Date;
  terminationDate?: Date;
  status: 'active' | 'inactive' | 'terminated';
  
  // Compensation
  salary: number;
  salaryType: 'hourly' | 'salaried';
  payFrequency: 'weekly' | 'bi-weekly' | 'semi-monthly' | 'monthly';
  currency: string;
  
  // Tax Information
  ssn: string;
  taxFilingStatus: 'single' | 'married' | 'head-of-household';
  federalWithholding: number;
  stateWithholding: number;
  
  // Bank Account
  bankAccountNumber: string;
  bankRoutingNumber: string;
  bankAccountType: 'checking' | 'savings';
  
  // Deductions
  healthInsurance: number;
  retirement401k: number;
  otherDeductions: number;
  
  // Emergency Contact
  emergencyContactName: string;
  emergencyContactPhone: string;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface PayrollRun {
  id: string;
  payPeriodStart: Date;
  payPeriodEnd: Date;
  payDate: Date;
  status: 'draft' | 'pending-approval' | 'approved' | 'processed' | 'paid';
  totalGrossPay: number;
  totalDeductions: number;
  totalTaxes: number;
  totalNetPay: number;
  currency: string;
  payslips: Payslip[];
  createdAt: Date;
  processedAt?: Date;
}

export interface Payslip {
  id: string;
  employeeId: string;
  payrollRunId: string;
  grossPay: number;
  federalTax: number;
  stateTax: number;
  socialSecurityTax: number;
  medicareTax: number;
  healthInsuranceDeduction: number;
  retirement401kDeduction: number;
  otherDeductions: number;
  netPay: number;
  currency: string;
  paymentMethod: 'direct-deposit' | 'check' | 'stablecoin';
  paymentStatus: 'pending' | 'processed' | 'paid';
  createdAt: Date;
}

// ============================================================================
// INVOICING
// ============================================================================

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  taxId: string;
  paymentTerms: 'net-15' | 'net-30' | 'net-60' | 'due-on-receipt';
  preferredCurrency: string;
  createdAt: Date;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  issueDate: Date;
  dueDate: Date;
  currency: string;
  status: 'draft' | 'sent' | 'viewed' | 'partially-paid' | 'paid' | 'overdue' | 'cancelled';
  
  // Line Items
  lineItems: InvoiceLineItem[];
  
  // Totals
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  
  // Payment
  paymentMethods: string[];
  paymentHistory: Payment[];
  
  // Settlement
  platformFee: number; // $0.01 flat
  wiseFeeComparison: number;
  
  notes: string;
  createdAt: Date;
  sentAt?: Date;
  paidAt?: Date;
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  taxable: boolean;
}

export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  paymentMethod: 'card' | 'ach' | 'stablecoin' | 'check' | 'wire';
  paymentDate: Date;
  transactionId: string;
  status: 'pending' | 'completed' | 'failed';
}

// ============================================================================
// EXPENSES & RECEIPTS
// ============================================================================

export interface Expense {
  id: string;
  employeeId: string;
  description: string;
  category: string;
  amount: number;
  currency: string;
  date: Date;
  vendor?: string;
  receipt?: Receipt;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'reimbursed';
  approvedBy?: string;
  reimbursementDate?: Date;
  notes: string;
  createdAt: Date;
}

export interface Receipt {
  id: string;
  expenseId: string;
  fileName: string;
  fileUrl: string;
  uploadDate: Date;
  
  // OCR Parsed Data
  vendor: string;
  amount: number;
  date: Date;
  category: string;
  items: ReceiptItem[];
  
  parsedAt?: Date;
}

export interface ReceiptItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface Vendor {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  taxId: string;
  paymentTerms: 'net-15' | 'net-30' | 'net-60' | 'due-on-receipt';
  preferredCurrency: string;
  invoices: VendorInvoice[];
  createdAt: Date;
}

export interface VendorInvoice {
  id: string;
  vendorId: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  dueDate: Date;
  status: 'received' | 'approved' | 'paid' | 'overdue';
  receiptUrl?: string;
  createdAt: Date;
}

// ============================================================================
// ACCOUNTING
// ============================================================================

export interface ChartOfAccount {
  id: string;
  accountNumber: string;
  accountName: string;
  accountType: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  subType: string;
  balance: number;
  currency: string;
  status: 'active' | 'inactive';
  createdAt: Date;
}

export interface JournalEntry {
  id: string;
  entryDate: Date;
  description: string;
  status: 'draft' | 'pending-approval' | 'approved' | 'posted';
  lineItems: JournalLineItem[];
  approvedBy?: string;
  approvalDate?: Date;
  createdAt: Date;
}

export interface JournalLineItem {
  id: string;
  accountId: string;
  debit: number;
  credit: number;
  description: string;
}

export interface BankAccount {
  id: string;
  accountName: string;
  accountNumber: string;
  routingNumber: string;
  bankName: string;
  accountType: 'checking' | 'savings';
  currency: string;
  balance: number;
  lastReconciliationDate: Date;
  createdAt: Date;
}

export interface BankReconciliation {
  id: string;
  bankAccountId: string;
  reconciliationDate: Date;
  bankBalance: number;
  bookBalance: number;
  difference: number;
  status: 'pending' | 'completed';
  transactions: BankTransaction[];
  createdAt: Date;
}

export interface BankTransaction {
  id: string;
  bankAccountId: string;
  date: Date;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  status: 'cleared' | 'uncleared';
  matchedJournalEntry?: string;
}

export interface FinancialStatement {
  id: string;
  statementType: 'income-statement' | 'balance-sheet' | 'cash-flow';
  periodStart: Date;
  periodEnd: Date;
  data: Record<string, number>;
  createdAt: Date;
}

// ============================================================================
// SETTLEMENT & MULTI-CURRENCY
// ============================================================================

export interface Stablecoin {
  id: string;
  symbol: string;
  name: string;
  decimals: number;
  chainId: number;
  contractAddress: string;
  issuer: string;
  currentPrice: number;
  marketCap: number;
  volume24h: number;
  lastUpdated: Date;
}

export interface MultiCurrencyWallet {
  id: string;
  userId: string;
  balances: Record<string, number>; // { 'USDC': 10000, 'EURC': 5000, ... }
  totalValueUSD: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SettlementTransaction {
  id: string;
  userId: string;
  type: 'send' | 'swap' | 'receive';
  fromCurrency: string;
  toCurrency: string;
  fromAmount: number;
  toAmount: number;
  exchangeRate: number;
  platformFee: number; // $0.01 flat
  wiseFeeComparison: number;
  savingsAmount: number;
  status: 'pending' | 'completed' | 'failed';
  transactionHash?: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface ConversionRate {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  timestamp: Date;
}

// ============================================================================
// TREASURY
// ============================================================================

export interface Treasury {
  id: string;
  userId: string;
  totalBalance: number;
  balanceByStablecoin: Record<string, number>;
  totalYieldEarned: number;
  yieldByStablecoin: Record<string, number>;
  treasuryDeposits: TreasuryDeposit[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TreasuryDeposit {
  id: string;
  treasuryId: string;
  stablecoin: string;
  depositAmount: number;
  depositDate: Date;
  yieldEarned: number;
  yieldRate: number;
  status: 'active' | 'withdrawn';
  withdrawalDate?: Date;
  withdrawalAmount?: number;
}

export interface CashFlowForecast {
  id: string;
  userId: string;
  forecastDate: Date;
  projectedInflows: Record<string, number>; // by stablecoin
  projectedOutflows: Record<string, number>; // by stablecoin
  projectedBalance: Record<string, number>; // by stablecoin
  confidence: number; // 0-1
  createdAt: Date;
}

// ============================================================================
// REPORTING
// ============================================================================

export interface Report {
  id: string;
  userId: string;
  reportType: 'payroll-summary' | 'invoice-aging' | 'expense-summary' | 'financial-statement' | 'tax-report' | 'custom';
  periodStart: Date;
  periodEnd: Date;
  data: Record<string, any>;
  format: 'pdf' | 'excel' | 'csv' | 'json';
  status: 'generated' | 'scheduled' | 'sent';
  createdAt: Date;
}

export interface ReportSchedule {
  id: string;
  userId: string;
  reportType: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
  recipients: string[];
  format: 'pdf' | 'excel' | 'csv';
  nextRunDate: Date;
  createdAt: Date;
}

// ============================================================================
// INTEGRATIONS
// ============================================================================

export interface XeroIntegration {
  id: string;
  userId: string;
  tenantId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  syncStatus: 'connected' | 'disconnected' | 'error';
  lastSyncDate?: Date;
  createdAt: Date;
}

export interface QuickBooksIntegration {
  id: string;
  userId: string;
  realmId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  syncStatus: 'connected' | 'disconnected' | 'error';
  lastSyncDate?: Date;
  createdAt: Date;
}

// ============================================================================
// DASHBOARD METRICS
// ============================================================================

export interface DashboardMetrics {
  payroll: {
    totalEmployees: number;
    nextPayrollDate: Date;
    totalPayrollCost: number;
    currency: string;
  };
  invoicing: {
    totalInvoices: number;
    outstandingAmount: number;
    paidAmount: number;
    overdueAmount: number;
    overdueCount: number;
  };
  expenses: {
    totalExpenses: number;
    pendingApproval: number;
    approvedAmount: number;
    reimbursedAmount: number;
  };
  treasury: {
    totalBalance: number;
    balanceByStablecoin: Record<string, number>;
    totalYield: number;
    yieldRate: number;
  };
  financials: {
    revenue: number;
    expenses: number;
    netIncome: number;
    cashFlow: number;
  };
}

// ============================================================================
// AUDIT & COMPLIANCE
// ============================================================================

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  changes: Record<string, any>;
  timestamp: Date;
  ipAddress: string;
}

export interface ComplianceReport {
  id: string;
  userId: string;
  country: string;
  reportType: 'tax' | 'labor' | 'financial' | 'data-privacy';
  periodStart: Date;
  periodEnd: Date;
  status: 'compliant' | 'non-compliant' | 'review-required';
  findings: string[];
  createdAt: Date;
}
