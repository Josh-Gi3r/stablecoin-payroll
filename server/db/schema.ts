import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

// ============================================================================
// TENANTS & CLIENTS (MULTI-TENANCY)
// ============================================================================

// The platform operator plus each client organization is a tenant.
// The 'operator' tenant is the company running this payroll platform;
// 'client' tenants are the companies whose employees are managed here.
// Data is scoped by tenantId everywhere.
export const tenants = sqliteTable('tenants', {
  id: text('id').primaryKey(),
  type: text('type', { enum: ['operator', 'client'] }).notNull(),
  name: text('name').notNull(),
  country: text('country', { enum: ['MY', 'SG'] }).notNull().default('MY'),
  status: text('status', { enum: ['active', 'suspended', 'archived'] }).notNull().default('active'),
  configuration: text('configuration'), // JSON: branding, feature flags, etc.
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Client organizations — companies that engage the operator for EOR/payroll/HR.
// Each maps 1:1 to a client tenant, but holds the legal/commercial detail.
export const clients = sqliteTable('clients', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  operatorTenantId: text('operator_tenant_id').notNull().references(() => tenants.id), // always the operator tenant
  name: text('name').notNull(),
  country: text('country', { enum: ['MY', 'SG'] }).notNull().default('MY'),
  registrationNumber: text('registration_number'),
  taxId: text('tax_id'),
  bankAccount: text('bank_account'), // JSON: {bankName, accountName, accountNumber, branch, swift}
  primaryContactName: text('primary_contact_name'),
  primaryContactEmail: text('primary_contact_email'),
  primaryContactPhone: text('primary_contact_phone'),
  servicePlan: text('service_plan', { enum: ['basic', 'enterprise'] }).notNull().default('basic'),
  // Service mode drives sidebar nav, dashboard routing, and feature gating.
  // eor = operator is legal employer (deposits + tripartite contracts + invoicing).
  // Other tiers are SaaS — client is its own employer.
  mode: text('mode', { enum: ['payroll', 'hr', 'payroll_hr', 'eor'] }).notNull().default('eor'),
  serviceFeePct: real('service_fee_pct').notNull().default(0.05), // 5% default on gross payroll, EOR-only
  noticeDefaultMonths: integer('notice_default_months').notNull().default(1),
  defaultPayFrequency: text('default_pay_frequency'),
  defaultCurrency: text('default_currency'),
  epfEmployerNumber: text('epf_employer_number'),
  socsoEmployerNumber: text('socso_employer_number'),
  lhdnEmployerNumber: text('lhdn_employer_number'),
  status: text('status', { enum: ['active', 'suspended', 'archived'] }).notNull().default('active'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// ============================================================================
// USERS & AUTH
// ============================================================================

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  name: text('name').notNull(),
  // 5-role matrix. 'admin' is a legacy alias of 'super_admin'.
  role: text('role', {
    enum: ['super_admin', 'client_admin', 'finance', 'hr', 'employee', 'admin'],
  }).notNull().default('employee'),
  tenantId: text('tenant_id').references(() => tenants.id),
  clientId: text('client_id').references(() => clients.id),
  company: text('company').notNull().default(''),
  avatarUrl: text('avatar_url'),
  isGuest: integer('is_guest', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// ============================================================================
// EMPLOYEES
// ============================================================================

export const employees = sqliteTable('employees', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').references(() => tenants.id),
  clientId: text('client_id').references(() => clients.id),
  userId: text('user_id').references(() => users.id),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  department: text('department').notNull(),
  position: text('position').notNull(),
  employmentType: text('employment_type', { enum: ['full-time', 'part-time', 'contractor'] }).notNull(),
  hireDate: text('hire_date').notNull(),
  terminationDate: text('termination_date'),
  status: text('status', { enum: ['active', 'inactive', 'terminated'] }).notNull().default('active'),
  salary: real('salary').notNull(),
  salaryType: text('salary_type', { enum: ['hourly', 'salaried'] }).notNull(),
  payFrequency: text('pay_frequency', { enum: ['weekly', 'bi-weekly', 'semi-monthly', 'monthly'] }).notNull(),
  currency: text('currency').notNull().default('USDC'),
  taxFilingStatus: text('tax_filing_status', { enum: ['single', 'married', 'head-of-household'] }),
  federalWithholding: real('federal_withholding').default(0),
  stateWithholding: real('state_withholding').default(0),
  bankAccountType: text('bank_account_type', { enum: ['checking', 'savings'] }),
  healthInsurance: real('health_insurance').default(0),
  retirement401k: real('retirement_401k').default(0),
  otherDeductions: real('other_deductions').default(0),
  emergencyContactName: text('emergency_contact_name'),
  emergencyContactPhone: text('emergency_contact_phone'),
  emergencyContactRelationship: text('emergency_contact_relationship'),
  nric: text('nric'),
  dateOfBirth: text('date_of_birth'),
  residentialAddress: text('residential_address'),
  bankAccount: text('bank_account'), // JSON: {bankName, accountName, accountNumber, branch}
  epfBeneficiary: text('epf_beneficiary'), // JSON: {name, nric, relationship, allocationPct}
  country: text('country').default('MY'),
  // Malaysian statutory fields
  nationality: text('nationality', { enum: ['malaysian', 'pr', 'foreign'] }).default('malaysian'),
  residentStatus: text('resident_status', { enum: ['resident', 'non_resident'] }).default('resident'),
  taxCategory: text('tax_category', { enum: ['KA1', 'KA2', 'KA3'] }).default('KA1'),
  ageGroup: text('age_group', { enum: ['below_60', 'above_60'] }).default('below_60'),
  zakatMonthly: real('zakat_monthly').default(0),
  cp38Amount: real('cp38_amount').default(0),
  hrdfEligible: integer('hrdf_eligible', { mode: 'boolean' }).default(true),
  // EOR employment terms — drive deposit calculation and tripartite agreements
  noticePeriodMonths: integer('notice_period_months').notNull().default(1),
  fixedAllowances: text('fixed_allowances'), // JSON array: [{label, amount}]
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// ============================================================================
// PAYROLL
// ============================================================================

export const payrollRuns = sqliteTable('payroll_runs', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').references(() => tenants.id),
  clientId: text('client_id').references(() => clients.id),
  payPeriodStart: text('pay_period_start').notNull(),
  payPeriodEnd: text('pay_period_end').notNull(),
  payDate: text('pay_date').notNull(),
  status: text('status', { enum: ['draft', 'pending-approval', 'approved', 'processed', 'paid'] }).notNull().default('draft'),
  totalGrossPay: real('total_gross_pay').notNull().default(0),
  totalDeductions: real('total_deductions').notNull().default(0),
  totalTaxes: real('total_taxes').notNull().default(0),
  totalNetPay: real('total_net_pay').notNull().default(0),
  currency: text('currency').notNull().default('USDC'),
  createdAt: text('created_at').notNull(),
  processedAt: text('processed_at'),
});

export const payslips = sqliteTable('payslips', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').references(() => tenants.id),
  clientId: text('client_id').references(() => clients.id),
  employeeId: text('employee_id').notNull().references(() => employees.id),
  payrollRunId: text('payroll_run_id').notNull().references(() => payrollRuns.id),
  grossPay: real('gross_pay').notNull(),
  federalTax: real('federal_tax').notNull().default(0),
  stateTax: real('state_tax').notNull().default(0),
  socialSecurityTax: real('social_security_tax').notNull().default(0),
  medicareTax: real('medicare_tax').notNull().default(0),
  healthInsuranceDeduction: real('health_insurance_deduction').notNull().default(0),
  retirement401kDeduction: real('retirement_401k_deduction').notNull().default(0),
  otherDeductions: real('other_deductions').notNull().default(0),
  // Statutory deductions (MY jurisdiction — extend via jurisdiction module)
  epfEmployee: real('epf_employee').notNull().default(0),
  epfEmployer: real('epf_employer').notNull().default(0),
  socsoEmployee: real('socso_employee').notNull().default(0),
  socsoEmployer: real('socso_employer').notNull().default(0),
  eisEmployee: real('eis_employee').notNull().default(0),
  eisEmployer: real('eis_employer').notNull().default(0),
  pcbMtd: real('pcb_mtd').notNull().default(0),
  hrdf: real('hrdf').notNull().default(0),
  wht: real('wht').notNull().default(0),
  zakat: real('zakat').notNull().default(0),
  cp38: real('cp38').notNull().default(0),
  totalEmployerCost: real('total_employer_cost').notNull().default(0),
  netPay: real('net_pay').notNull(),
  currency: text('currency').notNull().default('USDC'),
  paymentMethod: text('payment_method', { enum: ['direct-deposit', 'check', 'stablecoin'] }).notNull().default('stablecoin'),
  paymentStatus: text('payment_status', { enum: ['pending', 'processed', 'paid'] }).notNull().default('pending'),
  createdAt: text('created_at').notNull(),
});

// ============================================================================
// CUSTOMERS & INVOICES
// ============================================================================

export const customers = sqliteTable('customers', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').references(() => tenants.id),
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  address: text('address'),
  city: text('city'),
  state: text('state'),
  zipCode: text('zip_code'),
  country: text('country'),
  taxId: text('tax_id'),
  paymentTerms: text('payment_terms', { enum: ['net-15', 'net-30', 'net-60', 'due-on-receipt'] }).default('net-30'),
  preferredCurrency: text('preferred_currency').default('USDC'),
  createdAt: text('created_at').notNull(),
});

export const invoices = sqliteTable('invoices', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').references(() => tenants.id),
  clientId: text('client_id').references(() => clients.id),
  payrollRunId: text('payroll_run_id').references(() => payrollRuns.id),
  invoiceNumber: text('invoice_number').notNull().unique(),
  customerId: text('customer_id').references(() => customers.id),
  issueDate: text('issue_date').notNull(),
  dueDate: text('due_date').notNull(),
  currency: text('currency').notNull().default('USDC'),
  status: text('status', { enum: ['draft', 'sent', 'viewed', 'partially-paid', 'paid', 'overdue', 'cancelled'] }).notNull().default('draft'),
  subtotal: real('subtotal').notNull().default(0),
  taxRate: real('tax_rate').notNull().default(0),
  taxAmount: real('tax_amount').notNull().default(0),
  total: real('total').notNull().default(0),
  amountPaid: real('amount_paid').notNull().default(0),
  amountDue: real('amount_due').notNull().default(0),
  serviceFeePct: real('service_fee_pct').notNull().default(0.05),
  serviceFeeAmount: real('service_fee_amount').notNull().default(0),
  // platformFee: flat per-settlement fee charged by the settlement provider
  platformFee: real('platform_fee').notNull().default(0),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
  sentAt: text('sent_at'),
  paidAt: text('paid_at'),
});

export const invoiceLineItems = sqliteTable('invoice_line_items', {
  id: text('id').primaryKey(),
  invoiceId: text('invoice_id').notNull().references(() => invoices.id),
  description: text('description').notNull(),
  quantity: real('quantity').notNull(),
  unitPrice: real('unit_price').notNull(),
  amount: real('amount').notNull(),
  taxable: integer('taxable', { mode: 'boolean' }).notNull().default(true),
});

export const payments = sqliteTable('payments', {
  id: text('id').primaryKey(),
  invoiceId: text('invoice_id').references(() => invoices.id),
  amount: real('amount').notNull(),
  paymentMethod: text('payment_method', { enum: ['card', 'ach', 'stablecoin', 'check', 'wire'] }).notNull(),
  paymentDate: text('payment_date').notNull(),
  transactionId: text('transaction_id'),
  status: text('status', { enum: ['pending', 'completed', 'failed'] }).notNull().default('pending'),
  createdAt: text('created_at').notNull(),
});

// ============================================================================
// EXPENSES & RECEIPTS
// ============================================================================

export const expenses = sqliteTable('expenses', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').references(() => tenants.id),
  clientId: text('client_id').references(() => clients.id),
  employeeId: text('employee_id').notNull().references(() => employees.id),
  description: text('description').notNull(),
  category: text('category').notNull(),
  amount: real('amount').notNull(),
  currency: text('currency').notNull().default('USDC'),
  date: text('date').notNull(),
  vendor: text('vendor'),
  status: text('status', { enum: ['draft', 'submitted', 'approved', 'rejected', 'reimbursed'] }).notNull().default('draft'),
  approvedBy: text('approved_by'),
  reimbursementDate: text('reimbursement_date'),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
});

export const receipts = sqliteTable('receipts', {
  id: text('id').primaryKey(),
  expenseId: text('expense_id').notNull().references(() => expenses.id),
  fileName: text('file_name').notNull(),
  fileUrl: text('file_url').notNull(),
  uploadDate: text('upload_date').notNull(),
  ocrVendor: text('ocr_vendor'),
  ocrAmount: real('ocr_amount'),
  ocrDate: text('ocr_date'),
  ocrCategory: text('ocr_category'),
  parsedAt: text('parsed_at'),
});

// ============================================================================
// VENDORS & BILLS
// ============================================================================

export const vendors = sqliteTable('vendors', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').references(() => tenants.id),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  address: text('address'),
  taxId: text('tax_id'),
  paymentTerms: text('payment_terms', { enum: ['net-15', 'net-30', 'net-60', 'due-on-receipt'] }).default('net-30'),
  preferredCurrency: text('preferred_currency').default('USDC'),
  createdAt: text('created_at').notNull(),
});

export const bills = sqliteTable('bills', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').references(() => tenants.id),
  vendorId: text('vendor_id').notNull().references(() => vendors.id),
  billNumber: text('bill_number').notNull(),
  amount: real('amount').notNull(),
  currency: text('currency').notNull().default('USDC'),
  issueDate: text('issue_date').notNull(),
  dueDate: text('due_date').notNull(),
  status: text('status', { enum: ['received', 'approved', 'paid', 'overdue'] }).notNull().default('received'),
  paidDate: text('paid_date'),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
});

// ============================================================================
// ACCOUNTING
// ============================================================================

export const chartOfAccounts = sqliteTable('chart_of_accounts', {
  id: text('id').primaryKey(),
  accountNumber: text('account_number').notNull().unique(),
  accountName: text('account_name').notNull(),
  accountType: text('account_type', { enum: ['asset', 'liability', 'equity', 'revenue', 'expense'] }).notNull(),
  subType: text('sub_type'),
  balance: real('balance').notNull().default(0),
  currency: text('currency').notNull().default('USDC'),
  status: text('status', { enum: ['active', 'inactive'] }).notNull().default('active'),
  createdAt: text('created_at').notNull(),
});

export const journalEntries = sqliteTable('journal_entries', {
  id: text('id').primaryKey(),
  entryDate: text('entry_date').notNull(),
  description: text('description').notNull(),
  status: text('status', { enum: ['draft', 'pending-approval', 'approved', 'posted'] }).notNull().default('draft'),
  approvedBy: text('approved_by'),
  approvalDate: text('approval_date'),
  createdAt: text('created_at').notNull(),
});

export const journalLineItems = sqliteTable('journal_line_items', {
  id: text('id').primaryKey(),
  journalEntryId: text('journal_entry_id').notNull().references(() => journalEntries.id),
  accountId: text('account_id').notNull().references(() => chartOfAccounts.id),
  debit: real('debit').notNull().default(0),
  credit: real('credit').notNull().default(0),
  description: text('description'),
});

// ============================================================================
// SETTLEMENT & TREASURY
// ============================================================================

export const stablecoins = sqliteTable('stablecoins', {
  id: text('id').primaryKey(),
  symbol: text('symbol').notNull().unique(),
  name: text('name').notNull(),
  decimals: integer('decimals').notNull().default(6),
  chainId: integer('chain_id').notNull().default(1),
  contractAddress: text('contract_address'),
  issuer: text('issuer'),
  currentPrice: real('current_price').notNull().default(1.0),
  marketCap: real('market_cap').default(0),
  volume24h: real('volume_24h').default(0),
  lastUpdated: text('last_updated').notNull(),
});

export const wallets = sqliteTable('wallets', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  stablecoin: text('stablecoin').notNull(),
  balance: real('balance').notNull().default(0),
  updatedAt: text('updated_at').notNull(),
});

// Generic platform-level transaction log (sends, swaps, receives).
// The underlying execution is delegated to the configured SettlementProvider.
export const platformTransactions = sqliteTable('platform_transactions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  type: text('type', { enum: ['send', 'swap', 'receive'] }).notNull(),
  fromCurrency: text('from_currency').notNull(),
  toCurrency: text('to_currency').notNull(),
  fromAmount: real('from_amount').notNull(),
  toAmount: real('to_amount').notNull(),
  exchangeRate: real('exchange_rate').notNull().default(1),
  // platformFee: fee charged by the settlement provider per transaction
  platformFee: real('platform_fee').notNull().default(0),
  recipientAddress: text('recipient_address'),
  status: text('status', { enum: ['pending', 'completed', 'failed'] }).notNull().default('pending'),
  transactionHash: text('transaction_hash'),
  createdAt: text('created_at').notNull(),
  completedAt: text('completed_at'),
});

// Treasury yield-bearing deposits (on-chain yield strategies, money market, etc.)
// The active strategy is configured via the StorageProvider / SettlementProvider.
export const treasuryDeposits = sqliteTable('treasury_deposits', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  stablecoin: text('stablecoin').notNull(),
  depositAmount: real('deposit_amount').notNull(),
  depositDate: text('deposit_date').notNull(),
  yieldEarned: real('yield_earned').notNull().default(0),
  yieldRate: real('yield_rate').notNull().default(0.05),
  status: text('status', { enum: ['active', 'withdrawn'] }).notNull().default('active'),
  withdrawalDate: text('withdrawal_date'),
  withdrawalAmount: real('withdrawal_amount'),
});

// ============================================================================
// EOR DEPOSITS (TRUST ACCOUNT)
// ============================================================================

// Upfront deposit required from each EOR client, equal to
// (gross salary + fixed allowances) × notice period (months), per employee.
export const deposits = sqliteTable('deposits', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').references(() => tenants.id),
  clientId: text('client_id').references(() => clients.id),
  employeeId: text('employee_id').references(() => employees.id),
  amount: real('amount').notNull(),
  currency: text('currency').notNull().default('MYR'),
  calculationBasis: text('calculation_basis'), // JSON: {noticeMonths, grossSalary, fixedAllowances}
  status: text('status', {
    enum: ['pending', 'received', 'held', 'drawn', 'refunded'],
  }).notNull().default('pending'),
  trustAccountRef: text('trust_account_ref'),
  receivedDate: text('received_date'),
  refundDate: text('refund_date'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Immutable ledger of every movement against a deposit — auditable.
export const depositLedger = sqliteTable('deposit_ledger', {
  id: text('id').primaryKey(),
  depositId: text('deposit_id').notNull().references(() => deposits.id),
  txType: text('tx_type', {
    enum: ['receive', 'draw', 'top_up', 'refund'],
  }).notNull(),
  amount: real('amount').notNull(),
  reference: text('reference'),
  note: text('note'),
  createdAt: text('created_at').notNull(),
});

// ============================================================================
// EOR CONTRACTS & E-SIGNATURE
// ============================================================================

export const contractTemplates = sqliteTable('contract_templates', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').references(() => tenants.id),
  country: text('country', { enum: ['MY', 'SG'] }).notNull(),
  type: text('type', {
    enum: ['tripartite', 'employee_info', 'termination'],
  }).notNull(),
  version: integer('version').notNull().default(1),
  title: text('title').notNull(),
  body: text('body').notNull(), // markdown with {{variables}}
  variables: text('variables'), // JSON array of variable keys
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const contracts = sqliteTable('contracts', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').references(() => tenants.id),
  clientId: text('client_id').references(() => clients.id),
  employeeId: text('employee_id').references(() => employees.id),
  templateId: text('template_id').notNull().references(() => contractTemplates.id),
  templateVersion: integer('template_version').notNull().default(1),
  renderedPdfS3Key: text('rendered_pdf_s3_key'),
  renderedPdfUrl: text('rendered_pdf_url'),
  status: text('status', {
    enum: ['draft', 'sent', 'partially_signed', 'signed', 'archived'],
  }).notNull().default('draft'),
  signatures: text('signatures'), // JSON array: [{party, signerName, signerEmail, signedAt, ip, method}]
  createdAt: text('created_at').notNull(),
  completedAt: text('completed_at'),
});

// ============================================================================
// TIME OFF
// ============================================================================

export const timeOffBalances = sqliteTable('time_off_balances', {
  id: text('id').primaryKey(),
  employeeId: text('employee_id').notNull().references(() => employees.id),
  type: text('type', { enum: ['vacation', 'sick', 'personal'] }).notNull(),
  totalDays: real('total_days').notNull(),
  usedDays: real('used_days').notNull().default(0),
  pendingDays: real('pending_days').notNull().default(0),
  year: integer('year').notNull(),
});

export const timeOffRequests = sqliteTable('time_off_requests', {
  id: text('id').primaryKey(),
  employeeId: text('employee_id').notNull().references(() => employees.id),
  type: text('type', { enum: ['vacation', 'sick', 'personal'] }).notNull(),
  startDate: text('start_date').notNull(),
  endDate: text('end_date').notNull(),
  days: real('days').notNull(),
  reason: text('reason'),
  status: text('status', { enum: ['pending', 'approved', 'rejected'] }).notNull().default('pending'),
  approvedBy: text('approved_by'),
  createdAt: text('created_at').notNull(),
});

// ============================================================================
// APPROVALS
// ============================================================================

export const approvals = sqliteTable('approvals', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').references(() => tenants.id),
  clientId: text('client_id').references(() => clients.id),
  type: text('type', { enum: ['expense', 'pto', 'payroll', 'payment', 'invoice'] }).notNull(),
  entityId: text('entity_id').notNull(),
  requestedBy: text('requested_by').notNull(),
  requestedByName: text('requested_by_name'),
  description: text('description').notNull(),
  amount: real('amount'),
  currency: text('currency'),
  priority: text('priority', { enum: ['low', 'medium', 'high'] }).notNull().default('medium'),
  status: text('status', { enum: ['pending', 'approved', 'rejected'] }).notNull().default('pending'),
  approvedBy: text('approved_by'),
  approvedAt: text('approved_at'),
  createdAt: text('created_at').notNull(),
});

// ============================================================================
// REPORTS & AUTOMATION
// ============================================================================

export const reports = sqliteTable('reports', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  reportType: text('report_type').notNull(),
  periodStart: text('period_start'),
  periodEnd: text('period_end'),
  data: text('data'), // JSON string
  format: text('format', { enum: ['pdf', 'excel', 'csv', 'json'] }).notNull().default('pdf'),
  status: text('status', { enum: ['generated', 'scheduled', 'sent'] }).notNull().default('generated'),
  createdAt: text('created_at').notNull(),
});

export const automationRules = sqliteTable('automation_rules', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  name: text('name').notNull(),
  trigger: text('trigger').notNull(),
  conditions: text('conditions'), // JSON string
  actions: text('actions'), // JSON string
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  lastRun: text('last_run'),
  runCount: integer('run_count').notNull().default(0),
  createdAt: text('created_at').notNull(),
});

// ============================================================================
// INTEGRATIONS
// ============================================================================

export const integrations = sqliteTable('integrations', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  provider: text('provider', { enum: ['xero', 'quickbooks', 'stripe', 'plaid'] }).notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  expiresAt: text('expires_at'),
  syncStatus: text('sync_status', { enum: ['connected', 'disconnected', 'error'] }).notNull().default('disconnected'),
  lastSyncDate: text('last_sync_date'),
  config: text('config'), // JSON string
  createdAt: text('created_at').notNull(),
});

export const webhookEndpoints = sqliteTable('webhook_endpoints', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  tenantId: text('tenant_id').references(() => tenants.id),
  url: text('url').notNull(),
  events: text('events').notNull(), // JSON-encoded string array
  status: text('status', { enum: ['active', 'disabled', 'failed'] }).notNull().default('active'),
  secret: text('secret'),
  lastDeliveryAt: text('last_delivery_at'),
  createdAt: text('created_at').notNull(),
});

// ============================================================================
// AUDIT LOG
// ============================================================================

export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').references(() => tenants.id),
  userId: text('user_id').notNull(),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  changes: text('changes'), // JSON string
  ipAddress: text('ip_address'),
  timestamp: text('timestamp').notNull(),
});

// ============================================================================
// AI CHAT
// ============================================================================

export const chatMessages = sqliteTable('chat_messages', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  role: text('role', { enum: ['user', 'assistant'] }).notNull(),
  content: text('content').notNull(),
  metadata: text('metadata'), // JSON string
  createdAt: text('created_at').notNull(),
});

// ============================================================================
// RE-EXPORTS (single barrel for all services)
// ============================================================================

export {
  documents,
  generatedPdfs,
  notificationPreferences,
  notificationLogs,
  livenessChecks,
  statutoryRates,
  payslipDeductions,
} from './schema-documents.js';

export {
  departments,
  reportingLines,
  leaveTypes,
  publicHolidays,
  timeOffApprovals,
  expenseApprovals,
  payrollBatches,
  paymentBatchItems,
  settlementTransactions,
  payrollApprovals,
  fxRates,
  settlementRuns,
  complianceReports,
  taxFilings,
} from './schema-extensions.js';

// snake_case aliases for legacy service code
export { livenessChecks as liveness_checks } from './schema-documents.js';
export { notificationLogs as notification_logs } from './schema-documents.js';
export { notificationPreferences as notification_preferences } from './schema-documents.js';
export { statutoryRates as statutory_rates } from './schema-documents.js';
export { generatedPdfs as generated_pdfs } from './schema-documents.js';
export { payslipDeductions as payslip_deductions } from './schema-documents.js';
export { settlementTransactions as settlements } from './schema-extensions.js';
