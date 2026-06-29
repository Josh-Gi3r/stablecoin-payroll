import { db } from './index.js';
import * as schema from './schema.js';
import { hashSync } from 'bcryptjs';
import { randomBytes } from 'crypto';

const now = new Date().toISOString();

// ---------------------------------------------------------------------------
// Demo seed passwords
// ---------------------------------------------------------------------------
// The seed uses a random password by default so no plaintext credential is
// committed. Set SEED_PASSWORD env var to a known value for repeatable dev logins.
// The generated password is printed once at seed time.
const seedPassword = process.env.SEED_PASSWORD ?? randomBytes(16).toString('hex');
if (!process.env.SEED_PASSWORD) {
  console.log(`[seed] Generated demo password: ${seedPassword}`);
  console.log('[seed] Set SEED_PASSWORD env var to pin this value for dev convenience.');
}
const pw = hashSync(seedPassword, 10);

// ---------------------------------------------------------------------------
// Well-known IDs
// ---------------------------------------------------------------------------
// Operator tenant = the company running this payroll platform.
const OPERATOR_TENANT_ID = process.env.OPERATOR_TENANT_ID ?? 'tnt-operator';
const OPERATOR_NAME = process.env.OPERATOR_NAME ?? 'Payroll Platform';

// Four demo client tenants exercise all four service modes:
//   Acme  (MY) — eor          Employer-of-Record (full statutory + deposit)
//   Beta  (MY) — payroll_hr   Full SaaS; client is own employer
//   Gamma (SG) — payroll      Payroll-only SaaS
//   Delta (SG) — hr           HR-only SaaS
const DEMO_CLIENT_TENANT_ID = 'tnt-acme-my';
const DEMO_CLIENT_ID = 'cli-acme-my';
const BETA_TENANT_ID = 'tnt-beta-my';
const BETA_CLIENT_ID = 'cli-beta-my';
const GAMMA_TENANT_ID = 'tnt-gamma-sg';
const GAMMA_CLIENT_ID = 'cli-gamma-sg';
const DELTA_TENANT_ID = 'tnt-delta-sg';
const DELTA_CLIENT_ID = 'cli-delta-sg';

export async function seed() {
  console.log('Seeding database...');

  // ── Tenants ────────────────────────────────────────────
  await db.insert(schema.tenants).values([
    {
      id: OPERATOR_TENANT_ID,
      type: 'operator' as const,
      name: OPERATOR_NAME,
      country: 'MY' as const,
      status: 'active' as const,
      configuration: JSON.stringify({ operator: true }),
      createdAt: now,
      updatedAt: now,
    },
    {
      id: DEMO_CLIENT_TENANT_ID,
      type: 'client' as const,
      name: 'Acme Sdn Bhd',
      country: 'MY' as const,
      status: 'active' as const,
      configuration: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: BETA_TENANT_ID,
      type: 'client' as const,
      name: 'Beta Works',
      country: 'MY' as const,
      status: 'active' as const,
      configuration: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: GAMMA_TENANT_ID,
      type: 'client' as const,
      name: 'Gamma Pte',
      country: 'SG' as const,
      status: 'active' as const,
      configuration: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: DELTA_TENANT_ID,
      type: 'client' as const,
      name: 'Delta Studio',
      country: 'SG' as const,
      status: 'active' as const,
      configuration: null,
      createdAt: now,
      updatedAt: now,
    },
  ]).onConflictDoNothing();

  // ── Clients ────────────────────────────────────────────
  await db.insert(schema.clients).values([
    {
      id: DEMO_CLIENT_ID,
      tenantId: DEMO_CLIENT_TENANT_ID,
      operatorTenantId: OPERATOR_TENANT_ID,
      name: 'Acme Sdn Bhd',
      country: 'MY' as const,
      registrationNumber: '202401001234',
      taxId: 'C12345678901',
      bankAccount: JSON.stringify({ bankName: 'Demo Bank', accountName: 'Acme Sdn Bhd', accountNumber: '514012345678', branch: 'KL Main' }),
      primaryContactName: 'Nur Hana',
      primaryContactEmail: 'finance@acme.my',
      primaryContactPhone: '+60-3-2100-0000',
      servicePlan: 'basic' as const,
      mode: 'eor' as const,
      serviceFeePct: 0.05,
      noticeDefaultMonths: 1,
      status: 'active' as const,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: BETA_CLIENT_ID,
      tenantId: BETA_TENANT_ID,
      operatorTenantId: OPERATOR_TENANT_ID,
      name: 'Beta Works',
      country: 'MY' as const,
      registrationNumber: '202301008888',
      taxId: 'C98765432101',
      bankAccount: JSON.stringify({ bankName: 'Demo Bank', accountName: 'Beta Works Sdn Bhd', accountNumber: '800012345678', branch: 'PJ Branch' }),
      primaryContactName: 'Rajesh Kumar',
      primaryContactEmail: 'admin@beta.my',
      primaryContactPhone: '+60-3-7800-0000',
      servicePlan: 'basic' as const,
      mode: 'payroll_hr' as const,
      serviceFeePct: 0,
      noticeDefaultMonths: 1,
      status: 'active' as const,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: GAMMA_CLIENT_ID,
      tenantId: GAMMA_TENANT_ID,
      operatorTenantId: OPERATOR_TENANT_ID,
      name: 'Gamma Pte',
      country: 'SG' as const,
      registrationNumber: '202410001A',
      taxId: 'T2410001A',
      bankAccount: JSON.stringify({ bankName: 'Demo Bank', accountName: 'Gamma Pte Ltd', accountNumber: '0012345678', branch: 'MBS' }),
      primaryContactName: 'Wei Chen',
      primaryContactEmail: 'admin@gamma.sg',
      primaryContactPhone: '+65-6800-0000',
      servicePlan: 'basic' as const,
      mode: 'payroll' as const,
      serviceFeePct: 0,
      noticeDefaultMonths: 1,
      status: 'active' as const,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: DELTA_CLIENT_ID,
      tenantId: DELTA_TENANT_ID,
      operatorTenantId: OPERATOR_TENANT_ID,
      name: 'Delta Studio',
      country: 'SG' as const,
      registrationNumber: '202312345Z',
      taxId: 'T2312345Z',
      bankAccount: JSON.stringify({ bankName: 'Demo Bank', accountName: 'Delta Studio Pte', accountNumber: '5012345678', branch: 'Raffles' }),
      primaryContactName: 'Aisha Tan',
      primaryContactEmail: 'admin@delta.sg',
      primaryContactPhone: '+65-6500-0000',
      servicePlan: 'basic' as const,
      mode: 'hr' as const,
      serviceFeePct: 0,
      noticeDefaultMonths: 1,
      status: 'active' as const,
      createdAt: now,
      updatedAt: now,
    },
  ]).onConflictDoNothing();

  // ── Users ──────────────────────────────────────────────
  // All demo users share the seedPassword (see top of file).
  const userRows = [
    // Operator
    { id: 'usr-001', email: 'admin@operator.local',   password_hash: pw, name: 'Alex Rivera',  role: 'super_admin'  as const, tenantId: OPERATOR_TENANT_ID,    clientId: null,            company: OPERATOR_NAME,  isGuest: false, createdAt: now, updatedAt: now },
    { id: 'usr-002', email: 'finance@operator.local', password_hash: pw, name: 'Jordan Blake', role: 'finance'      as const, tenantId: OPERATOR_TENANT_ID,    clientId: null,            company: OPERATOR_NAME,  isGuest: false, createdAt: now, updatedAt: now },
    { id: 'usr-003', email: 'hr@operator.local',      password_hash: pw, name: 'Priya Menon',  role: 'hr'           as const, tenantId: OPERATOR_TENANT_ID,    clientId: null,            company: OPERATOR_NAME,  isGuest: false, createdAt: now, updatedAt: now },
    // Acme — EOR
    { id: 'usr-004', email: 'admin@acme.my',          password_hash: pw, name: 'Tan Wei Ming', role: 'client_admin' as const, tenantId: DEMO_CLIENT_TENANT_ID, clientId: DEMO_CLIENT_ID,  company: 'Acme Sdn Bhd', isGuest: false, createdAt: now, updatedAt: now },
    { id: 'usr-005', email: 'finance@acme.my',        password_hash: pw, name: 'Sarah Lim',    role: 'finance'      as const, tenantId: DEMO_CLIENT_TENANT_ID, clientId: DEMO_CLIENT_ID,  company: 'Acme Sdn Bhd', isGuest: false, createdAt: now, updatedAt: now },
    { id: 'usr-006', email: 'hr@acme.my',             password_hash: pw, name: 'Aisha Bakar',  role: 'hr'           as const, tenantId: DEMO_CLIENT_TENANT_ID, clientId: DEMO_CLIENT_ID,  company: 'Acme Sdn Bhd', isGuest: false, createdAt: now, updatedAt: now },
    { id: 'usr-007', email: 'employee@acme.my',       password_hash: pw, name: 'Jane Doe',     role: 'employee'     as const, tenantId: DEMO_CLIENT_TENANT_ID, clientId: DEMO_CLIENT_ID,  company: 'Acme Sdn Bhd', isGuest: false, createdAt: now, updatedAt: now },
    // Beta — Payroll+HR
    { id: 'usr-008', email: 'admin@beta.my',          password_hash: pw, name: 'Rajesh Kumar', role: 'client_admin' as const, tenantId: BETA_TENANT_ID,        clientId: BETA_CLIENT_ID,  company: 'Beta Works',   isGuest: false, createdAt: now, updatedAt: now },
    { id: 'usr-009', email: 'employee@beta.my',       password_hash: pw, name: 'Mei Lin',      role: 'employee'     as const, tenantId: BETA_TENANT_ID,        clientId: BETA_CLIENT_ID,  company: 'Beta Works',   isGuest: false, createdAt: now, updatedAt: now },
    // Gamma — Payroll SG
    { id: 'usr-010', email: 'admin@gamma.sg',         password_hash: pw, name: 'Wei Chen',     role: 'client_admin' as const, tenantId: GAMMA_TENANT_ID,       clientId: GAMMA_CLIENT_ID, company: 'Gamma Pte',    isGuest: false, createdAt: now, updatedAt: now },
    // Delta — HR SG
    { id: 'usr-011', email: 'admin@delta.sg',         password_hash: pw, name: 'Aisha Tan',    role: 'client_admin' as const, tenantId: DELTA_TENANT_ID,       clientId: DELTA_CLIENT_ID, company: 'Delta Studio', isGuest: false, createdAt: now, updatedAt: now },
  ];
  for (const u of userRows) await db.insert(schema.users).values(u).onConflictDoNothing();

  // ── Employees ──────────────────────────────────────────
  const empData = [
    { id: 'emp-001', userId: 'usr-007', firstName: 'Jane',   lastName: 'Doe',          email: 'employee@acme.my', phone: '+60-12-345-6789', department: 'Engineering', position: 'Senior Software Engineer', employmentType: 'full-time' as const, salary: 8500, salaryType: 'salaried' as const, payFrequency: 'monthly' as const, currency: 'MYR', country: 'MY', nationality: 'malaysian' as const, residentStatus: 'resident' as const, taxCategory: 'KA1' as const, ageGroup: 'below_60' as const, hrdfEligible: true  },
    { id: 'emp-002', userId: null,      firstName: 'Siti',   lastName: 'Nabilah',      email: 'siti.n@acme.my',   phone: '+60-11-987-6543', department: 'Product',     position: 'Product Manager',         employmentType: 'full-time' as const, salary: 7200, salaryType: 'salaried' as const, payFrequency: 'monthly' as const, currency: 'MYR', country: 'MY', nationality: 'malaysian' as const, residentStatus: 'resident' as const, taxCategory: 'KA2' as const, ageGroup: 'below_60' as const, hrdfEligible: true  },
    { id: 'emp-003', userId: null,      firstName: 'Rajesh', lastName: 'Kumar',        email: 'rajesh.k@acme.my', phone: '+60-16-234-5678', department: 'Design',      position: 'Lead Designer',           employmentType: 'full-time' as const, salary: 6800, salaryType: 'salaried' as const, payFrequency: 'monthly' as const, currency: 'MYR', country: 'MY', nationality: 'pr'        as const, residentStatus: 'resident' as const, taxCategory: 'KA1' as const, ageGroup: 'below_60' as const, hrdfEligible: true  },
    { id: 'emp-004', userId: null,      firstName: 'Wei',    lastName: 'Liang',        email: 'wei.l@acme.my',    phone: '+60-17-345-6789', department: 'Engineering', position: 'Backend Engineer',        employmentType: 'full-time' as const, salary: 9000, salaryType: 'salaried' as const, payFrequency: 'monthly' as const, currency: 'MYR', country: 'MY', nationality: 'malaysian' as const, residentStatus: 'resident' as const, taxCategory: 'KA1' as const, ageGroup: 'below_60' as const, hrdfEligible: true  },
    { id: 'emp-005', userId: null,      firstName: 'Nurul',  lastName: 'Ain',          email: 'nurul.a@acme.my',  phone: '+60-19-456-7890', department: 'Finance',     position: 'Financial Analyst',       employmentType: 'full-time' as const, salary: 5500, salaryType: 'salaried' as const, payFrequency: 'monthly' as const, currency: 'MYR', country: 'MY', nationality: 'malaysian' as const, residentStatus: 'resident' as const, taxCategory: 'KA3' as const, ageGroup: 'below_60' as const, hrdfEligible: true  },
    { id: 'emp-006', userId: null,      firstName: 'Farid',  lastName: 'Hassan',       email: 'farid.h@acme.my',  phone: '+60-13-567-8901', department: 'Marketing',   position: 'Marketing Lead',          employmentType: 'full-time' as const, salary: 6200, salaryType: 'salaried' as const, payFrequency: 'monthly' as const, currency: 'MYR', country: 'MY', nationality: 'malaysian' as const, residentStatus: 'resident' as const, taxCategory: 'KA1' as const, ageGroup: 'below_60' as const, hrdfEligible: true  },
    { id: 'emp-007', userId: null,      firstName: 'Mei',    lastName: 'Lin',          email: 'mei.l@acme.my',    phone: '+60-14-678-9012', department: 'Operations',  position: 'Operations Manager',      employmentType: 'full-time' as const, salary: 7800, salaryType: 'salaried' as const, payFrequency: 'monthly' as const, currency: 'MYR', country: 'MY', nationality: 'malaysian' as const, residentStatus: 'resident' as const, taxCategory: 'KA2' as const, ageGroup: 'below_60' as const, hrdfEligible: true  },
    { id: 'emp-008', userId: null,      firstName: 'Ravi',   lastName: 'Subramaniam', email: 'ravi.s@acme.my',   phone: '+60-18-789-0123', department: 'Engineering', position: 'Frontend Engineer',       employmentType: 'full-time' as const, salary: 5800, salaryType: 'salaried' as const, payFrequency: 'monthly' as const, currency: 'MYR', country: 'MY', nationality: 'foreign'   as const, residentStatus: 'resident' as const, taxCategory: 'KA1' as const, ageGroup: 'below_60' as const, hrdfEligible: false },
  ];
  for (const e of empData) {
    await db.insert(schema.employees).values({
      ...e,
      tenantId: DEMO_CLIENT_TENANT_ID,
      clientId: DEMO_CLIENT_ID,
      hireDate: '2022-01-15',
      status: 'active',
      taxFilingStatus: 'single',
      federalWithholding: 0,
      stateWithholding: 0,
      healthInsurance: 0,
      retirement401k: 0,
      otherDeductions: 0,
      zakatMonthly: 0,
      cp38Amount: 0,
      noticePeriodMonths: 1,
      fixedAllowances: JSON.stringify([{ label: 'Transport', amount: 300 }]),
      createdAt: now,
      updatedAt: now,
    }).onConflictDoNothing();
  }

  // ── Stablecoins ────────────────────────────────────────
  // Token addresses are well-known public mainnet addresses.
  // Edit config/currencies.ts to add or swap supported tokens.
  const coins = [
    { id: 'usdc', symbol: 'USDC', name: 'USD Coin',                decimals: 6, chainId: 1,   contractAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', issuer: 'Circle',  currentPrice: 1.0,  marketCap: 35e9,  volume24h: 8.5e9 },
    { id: 'myr',  symbol: 'MYR',  name: 'Malaysian Ringgit Stablecoin (example)', decimals: 6, chainId: 137, contractAddress: '0x0000000000000000000000000000000000000001', issuer: 'Example Issuer', currentPrice: 0.22, marketCap: 2e8,   volume24h: 1.2e7 },
    { id: 'xsgd', symbol: 'xSGD', name: 'Singapore Dollar (xSGD)', decimals: 6, chainId: 1,   contractAddress: '0x70e8dE73cE538DA2427A8f87cC2Efb3030d2d02E', issuer: 'Xfers',   currentPrice: 0.74, marketCap: 5e8,   volume24h: 8.5e7 },
    { id: 'eurc', symbol: 'EURC', name: 'Euro Coin',               decimals: 6, chainId: 1,   contractAddress: '0x60a3E35Cc302bFA44Cb288Bc5a4F3873666a5a38', issuer: 'Circle',  currentPrice: 1.08, marketCap: 2.5e9, volume24h: 4.5e8 },
    { id: 'usdt', symbol: 'USDT', name: 'Tether USD',              decimals: 6, chainId: 1,   contractAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7', issuer: 'Tether',  currentPrice: 1.0,  marketCap: 120e9, volume24h: 40e9  },
  ];
  for (const c of coins) await db.insert(schema.stablecoins).values({ ...c, lastUpdated: now }).onConflictDoNothing();

  // ── Wallets ────────────────────────────────────────────
  const walletData = [
    { userId: 'usr-001', stablecoin: 'USDT', balance: 500000  },
    { userId: 'usr-001', stablecoin: 'MYR',        balance: 1200000 },
    { userId: 'usr-001', stablecoin: 'xSGD', balance: 85000   },
    { userId: 'usr-001', stablecoin: 'USDC', balance: 150000  },
    { userId: 'usr-001', stablecoin: 'EURC', balance: 80000   },
  ];
  for (let i = 0; i < walletData.length; i++) {
    await db.insert(schema.wallets).values({ id: `wal-${i + 1}`, ...walletData[i], updatedAt: now }).onConflictDoNothing();
  }

  // ── Customers ──────────────────────────────────────────
  const custData = [
    { id: 'cust-001', name: 'Acme Corp',           email: 'billing@acme.com',    phone: '+1-555-1000',     country: 'US', paymentTerms: 'net-30' as const, preferredCurrency: 'USDC' },
    { id: 'cust-002', name: 'TechFlow GmbH',        email: 'finance@techflow.de', phone: '+49-30-12345',    country: 'DE', paymentTerms: 'net-30' as const, preferredCurrency: 'EURC' },
    { id: 'cust-003', name: 'Sakura Labs',          email: 'ap@sakura.jp',        phone: '+81-3-1234-5678', country: 'JP', paymentTerms: 'net-60' as const, preferredCurrency: 'USDC' },
    { id: 'cust-004', name: 'Marina Bay Solutions', email: 'pay@mbs.sg',          phone: '+65-6123-4567',   country: 'SG', paymentTerms: 'net-15' as const, preferredCurrency: 'XSGD' },
  ];
  for (const c of custData) await db.insert(schema.customers).values({ ...c, createdAt: now }).onConflictDoNothing();

  // ── Invoices ───────────────────────────────────────────
  const invData = [
    { id: 'inv-001', invoiceNumber: 'INV-2026-001', customerId: 'cust-001', currency: 'USDC', status: 'paid'    as const, subtotal: 15200, taxRate: 0,    taxAmount: 0,    total: 15200, amountPaid: 15200, amountDue: 0,     issueDate: '2026-01-15', dueDate: '2026-02-15', paidAt: '2026-02-01' },
    { id: 'inv-002', invoiceNumber: 'INV-2026-002', customerId: 'cust-002', currency: 'EURC', status: 'sent'    as const, subtotal: 18000, taxRate: 0.19, taxAmount: 3420, total: 21420, amountPaid: 0,     amountDue: 21420, issueDate: '2026-02-01', dueDate: '2026-03-03' },
    { id: 'inv-003', invoiceNumber: 'INV-2026-003', customerId: 'cust-003', currency: 'USDC', status: 'overdue' as const, subtotal: 5000,  taxRate: 0,    taxAmount: 0,    total: 5000,  amountPaid: 0,     amountDue: 5000,  issueDate: '2026-01-01', dueDate: '2026-01-31' },
    { id: 'inv-004', invoiceNumber: 'INV-2026-004', customerId: 'cust-004', currency: 'XSGD', status: 'draft'   as const, subtotal: 32000, taxRate: 0.09, taxAmount: 2880, total: 34880, amountPaid: 0,     amountDue: 34880, issueDate: '2026-02-10', dueDate: '2026-02-25' },
  ];
  for (const inv of invData) await db.insert(schema.invoices).values({ ...inv, platformFee: 0.01, createdAt: now }).onConflictDoNothing();

  // ── Invoice Line Items ─────────────────────────────────
  const lineItems = [
    { id: 'li-001', invoiceId: 'inv-001', description: 'Platform Integration - Phase 1',  quantity: 1,  unitPrice: 15200, amount: 15200, taxable: false },
    { id: 'li-002', invoiceId: 'inv-002', description: 'Monthly SaaS License x 12 seats', quantity: 12, unitPrice: 1500,  amount: 18000, taxable: true  },
    { id: 'li-003', invoiceId: 'inv-003', description: 'Consulting Services - Dec 2025',   quantity: 40, unitPrice: 125,   amount: 5000,  taxable: false },
    { id: 'li-004', invoiceId: 'inv-004', description: 'Enterprise Setup + Onboarding',    quantity: 1,  unitPrice: 32000, amount: 32000, taxable: true  },
  ];
  for (const li of lineItems) await db.insert(schema.invoiceLineItems).values(li).onConflictDoNothing();

  // ── Expenses ───────────────────────────────────────────
  const expData = [
    { id: 'exp-001', employeeId: 'emp-001', description: 'Client dinner',              category: 'Meals',     amount: 245,   currency: 'USDC', date: '2026-02-05', vendor: 'Restaurant',   status: 'approved'   as const, notes: 'Business development dinner' },
    { id: 'exp-002', employeeId: 'emp-001', description: 'Flight to Singapore',        category: 'Travel',    amount: 1850,  currency: 'USDC', date: '2026-02-08', vendor: 'Airlines',     status: 'submitted'  as const, notes: 'Client visit' },
    { id: 'exp-003', employeeId: 'emp-002', description: 'Conference registration',    category: 'Education', amount: 599,   currency: 'USDC', date: '2026-02-01', vendor: 'TechConf',    status: 'reimbursed' as const, notes: 'Annual conference' },
    { id: 'exp-004', employeeId: 'emp-003', description: 'Design software subscription', category: 'Software', amount: 49.99, currency: 'EURC', date: '2026-02-10', vendor: 'Figma',     status: 'approved'   as const, notes: 'Monthly Figma Pro' },
    { id: 'exp-005', employeeId: 'emp-005', description: 'Office supplies',            category: 'Office',    amount: 127.5, currency: 'XSGD', date: '2026-02-09', vendor: 'OfficeWorks', status: 'submitted'  as const, notes: 'Printer cartridges' },
  ];
  for (const e of expData) await db.insert(schema.expenses).values({ ...e, createdAt: now }).onConflictDoNothing();

  // ── Vendors ────────────────────────────────────────────
  const vendorData = [
    { id: 'vnd-001', name: 'AWS',          email: 'billing@aws.amazon.com', paymentTerms: 'net-30'         as const, preferredCurrency: 'USDC' },
    { id: 'vnd-002', name: 'Google Cloud', email: 'billing@google.com',     paymentTerms: 'net-30'         as const, preferredCurrency: 'USDC' },
    { id: 'vnd-003', name: 'WeWork',       email: 'invoices@wework.com',    paymentTerms: 'net-15'         as const, preferredCurrency: 'USDC' },
    { id: 'vnd-004', name: 'Figma',        email: 'billing@figma.com',      paymentTerms: 'due-on-receipt' as const, preferredCurrency: 'USDC' },
    { id: 'vnd-005', name: 'Notion',       email: 'billing@notion.so',      paymentTerms: 'net-30'         as const, preferredCurrency: 'USDC' },
  ];
  for (const v of vendorData) await db.insert(schema.vendors).values({ ...v, createdAt: now }).onConflictDoNothing();

  // ── Bills ──────────────────────────────────────────────
  const billData = [
    { id: 'bill-001', vendorId: 'vnd-001', billNumber: 'AWS-2026-02', amount: 4250, currency: 'USDC', status: 'received' as const, issueDate: '2026-02-01', dueDate: '2026-03-03' },
    { id: 'bill-002', vendorId: 'vnd-002', billNumber: 'GCP-2026-02', amount: 1800, currency: 'USDC', status: 'approved' as const, issueDate: '2026-02-01', dueDate: '2026-03-03' },
    { id: 'bill-003', vendorId: 'vnd-003', billNumber: 'WW-2026-FEB', amount: 8500, currency: 'USDC', status: 'paid'     as const, issueDate: '2026-01-15', dueDate: '2026-01-30', paidDate: '2026-01-28' },
    { id: 'bill-004', vendorId: 'vnd-004', billNumber: 'FIG-2026-02', amount: 450,  currency: 'USDC', status: 'overdue'  as const, issueDate: '2026-01-10', dueDate: '2026-01-10' },
    { id: 'bill-005', vendorId: 'vnd-005', billNumber: 'NOT-2026-02', amount: 320,  currency: 'USDC', status: 'received' as const, issueDate: '2026-02-05', dueDate: '2026-03-07' },
  ];
  for (const b of billData) await db.insert(schema.bills).values({ ...b, createdAt: now }).onConflictDoNothing();

  // ── Payroll Runs ───────────────────────────────────────
  const prData = [
    { id: 'pr-001', payPeriodStart: '2026-01-01', payPeriodEnd: '2026-01-15', payDate: '2026-01-20', status: 'paid'             as const, totalGrossPay: 48500, totalDeductions: 5400, totalTaxes: 9700, totalNetPay: 33400, currency: 'USDC' },
    { id: 'pr-002', payPeriodStart: '2026-01-16', payPeriodEnd: '2026-01-31', payDate: '2026-02-05', status: 'paid'             as const, totalGrossPay: 48500, totalDeductions: 5400, totalTaxes: 9700, totalNetPay: 33400, currency: 'USDC' },
    { id: 'pr-003', payPeriodStart: '2026-02-01', payPeriodEnd: '2026-02-15', payDate: '2026-02-20', status: 'pending-approval' as const, totalGrossPay: 48500, totalDeductions: 5400, totalTaxes: 9700, totalNetPay: 33400, currency: 'USDC' },
  ];
  for (const pr of prData) await db.insert(schema.payrollRuns).values({ ...pr, tenantId: DEMO_CLIENT_TENANT_ID, clientId: DEMO_CLIENT_ID, createdAt: now }).onConflictDoNothing();

  // ── Payslips ───────────────────────────────────────────
  let slipIdx = 0;
  for (const pr of prData) {
    for (const emp of empData.slice(0, 3)) {
      slipIdx++;
      const gross = emp.salary / 24;
      const fedTax = gross * 0.12;
      const stateTax = gross * 0.04;
      const ssTax = gross * 0.062;
      const medTax = gross * 0.0145;
      const net = gross - fedTax - stateTax - ssTax - medTax - 500 - 1000;
      await db.insert(schema.payslips).values({
        id: `slip-${String(slipIdx).padStart(3, '0')}`,
        tenantId: DEMO_CLIENT_TENANT_ID,
        clientId: DEMO_CLIENT_ID,
        employeeId: emp.id,
        payrollRunId: pr.id,
        grossPay: Math.round(gross * 100) / 100,
        federalTax: Math.round(fedTax * 100) / 100,
        stateTax: Math.round(stateTax * 100) / 100,
        socialSecurityTax: Math.round(ssTax * 100) / 100,
        medicareTax: Math.round(medTax * 100) / 100,
        healthInsuranceDeduction: 500,
        retirement401kDeduction: 1000,
        otherDeductions: 0,
        netPay: Math.round(net * 100) / 100,
        currency: emp.currency,
        paymentMethod: 'stablecoin',
        paymentStatus: pr.status === 'paid' ? 'paid' : 'pending',
        createdAt: now,
      }).onConflictDoNothing();
    }
  }

  // ── Chart of Accounts ──────────────────────────────────
  const coaData = [
    { id: 'coa-001', accountNumber: '1000', accountName: 'Cash & Equivalents',  accountType: 'asset'     as const, subType: 'current',   balance: 500000 },
    { id: 'coa-002', accountNumber: '1100', accountName: 'Accounts Receivable', accountType: 'asset'     as const, subType: 'current',   balance: 26420  },
    { id: 'coa-003', accountNumber: '1200', accountName: 'Stablecoin Holdings', accountType: 'asset'     as const, subType: 'current',   balance: 475000 },
    { id: 'coa-004', accountNumber: '2000', accountName: 'Accounts Payable',    accountType: 'liability' as const, subType: 'current',   balance: 15320  },
    { id: 'coa-005', accountNumber: '2100', accountName: 'Payroll Liabilities', accountType: 'liability' as const, subType: 'current',   balance: 33400  },
    { id: 'coa-006', accountNumber: '3000', accountName: 'Retained Earnings',   accountType: 'equity'    as const, subType: 'retained',  balance: 890000 },
    { id: 'coa-007', accountNumber: '4000', accountName: 'Service Revenue',     accountType: 'revenue'   as const, subType: 'operating', balance: 58200  },
    { id: 'coa-008', accountNumber: '5000', accountName: 'Salary Expense',      accountType: 'expense'   as const, subType: 'operating', balance: 97000  },
    { id: 'coa-009', accountNumber: '5100', accountName: 'Software & Tools',    accountType: 'expense'   as const, subType: 'operating', balance: 6820   },
    { id: 'coa-010', accountNumber: '5200', accountName: 'Office & Rent',       accountType: 'expense'   as const, subType: 'operating', balance: 8500   },
  ];
  for (const c of coaData) await db.insert(schema.chartOfAccounts).values({ ...c, currency: 'USDC', status: 'active', createdAt: now }).onConflictDoNothing();

  // ── Platform Transactions ──────────────────────────────
  const txData = [
    { id: 'ptx-001', userId: 'usr-001', type: 'send' as const, fromCurrency: 'USDC', toCurrency: 'USDC', fromAmount: 15200, toAmount: 15200, exchangeRate: 1,      recipientAddress: '0xAcme...1234',    status: 'completed' as const },
    { id: 'ptx-002', userId: 'usr-001', type: 'swap' as const, fromCurrency: 'USDC', toCurrency: 'EURC', fromAmount: 50000, toAmount: 46296, exchangeRate: 0.9259, status: 'completed' as const },
    { id: 'ptx-003', userId: 'usr-001', type: 'send' as const, fromCurrency: 'EURC', toCurrency: 'EURC', fromAmount: 18000, toAmount: 18000, exchangeRate: 1,      recipientAddress: '0xTechFlow...5678', status: 'completed' as const },
    { id: 'ptx-004', userId: 'usr-001', type: 'swap' as const, fromCurrency: 'USDC', toCurrency: 'XSGD', fromAmount: 25000, toAmount: 33783, exchangeRate: 1.3513, status: 'pending'   as const },
  ];
  for (const tx of txData) await db.insert(schema.platformTransactions).values({ ...tx, platformFee: 0.01, createdAt: now }).onConflictDoNothing();

  // ── Treasury Deposits ──────────────────────────────────
  const depData = [
    { id: 'fic-001', userId: 'usr-001', stablecoin: 'USDC', depositAmount: 100000, yieldEarned: 1250,   yieldRate: 0.05, status: 'active' as const },
    { id: 'fic-002', userId: 'usr-001', stablecoin: 'EURC', depositAmount: 50000,  yieldEarned: 625,    yieldRate: 0.05, status: 'active' as const },
    { id: 'fic-003', userId: 'usr-001', stablecoin: 'XSGD', depositAmount: 25000,  yieldEarned: 312.50, yieldRate: 0.05, status: 'active' as const },
  ];
  for (const f of depData) await db.insert(schema.treasuryDeposits).values({ ...f, depositDate: '2025-12-01' }).onConflictDoNothing();

  // ── Time Off Balances ──────────────────────────────────
  for (const emp of empData) {
    const types = [
      { type: 'vacation' as const, total: 20 },
      { type: 'sick'     as const, total: 10 },
      { type: 'personal' as const, total: 5  },
    ];
    for (let i = 0; i < types.length; i++) {
      await db.insert(schema.timeOffBalances).values({
        id: `tob-${emp.id}-${types[i].type}`,
        employeeId: emp.id,
        type: types[i].type,
        totalDays: types[i].total,
        usedDays: Math.floor(Math.random() * 5),
        pendingDays: Math.random() > 0.7 ? 2 : 0,
        year: 2026,
      }).onConflictDoNothing();
    }
  }

  // ── Time Off Requests ──────────────────────────────────
  const torData = [
    { id: 'tor-001', employeeId: 'emp-001', type: 'vacation' as const, startDate: '2026-03-10', endDate: '2026-03-14', days: 5, reason: 'Spring break', status: 'pending'  as const },
    { id: 'tor-002', employeeId: 'emp-003', type: 'sick'     as const, startDate: '2026-02-20', endDate: '2026-02-21', days: 2, reason: 'Doctor',       status: 'approved' as const },
    { id: 'tor-003', employeeId: 'emp-005', type: 'personal' as const, startDate: '2026-02-28', endDate: '2026-02-28', days: 1, reason: 'Moving day',   status: 'pending'  as const },
  ];
  for (const t of torData) await db.insert(schema.timeOffRequests).values({ ...t, createdAt: now }).onConflictDoNothing();

  // ── Approvals ──────────────────────────────────────────
  const appData = [
    { id: 'apr-001', type: 'expense' as const, entityId: 'exp-002', requestedBy: 'emp-001', requestedByName: 'Jane Doe',     description: 'Flight to Singapore - $1,850',   amount: 1850,   currency: 'USDC', priority: 'high'   as const },
    { id: 'apr-002', type: 'pto'     as const, entityId: 'tor-001', requestedBy: 'emp-001', requestedByName: 'Jane Doe',     description: 'Vacation: Mar 10-14 (5 days)',                             priority: 'medium' as const },
    { id: 'apr-003', type: 'payroll' as const, entityId: 'pr-003',  requestedBy: 'usr-002', requestedByName: 'Jordan Blake', description: 'Feb 1-15 Payroll Run - $33,400', amount: 33400,  currency: 'USDC', priority: 'high'   as const },
    { id: 'apr-004', type: 'expense' as const, entityId: 'exp-005', requestedBy: 'emp-005', requestedByName: 'Nurul Ain',   description: 'Office supplies - 127.50 XSGD',  amount: 127.50, currency: 'XSGD', priority: 'low'    as const },
    { id: 'apr-005', type: 'payment' as const, entityId: 'ptx-004', requestedBy: 'usr-001', requestedByName: 'Alex Rivera', description: 'Swap $25,000 USDC → XSGD',       amount: 25000,  currency: 'USDC', priority: 'medium' as const },
    { id: 'apr-006', type: 'pto'     as const, entityId: 'tor-003', requestedBy: 'emp-005', requestedByName: 'Nurul Ain',   description: 'Personal day: Feb 28',                                     priority: 'low'    as const },
  ];
  for (const a of appData) await db.insert(schema.approvals).values({ ...a, status: 'pending', createdAt: now }).onConflictDoNothing();

  // ── Automation Rules ───────────────────────────────────
  const autoData = [
    { id: 'auto-001', userId: 'usr-001', name: 'Auto-approve expenses under $100', trigger: 'expense.submitted', conditions: '{"amount_lt": 100}', actions: '{"action": "approve"}',            isActive: true  },
    { id: 'auto-002', userId: 'usr-001', name: 'Notify overdue invoices',           trigger: 'invoice.overdue',   conditions: '{}',                 actions: '{"action": "send_reminder"}',      isActive: true  },
    { id: 'auto-003', userId: 'usr-001', name: 'Monthly payroll scheduling',        trigger: 'schedule.monthly',  conditions: '{"day": 1}',         actions: '{"action": "create_payroll_run"}', isActive: false },
  ];
  for (const a of autoData) await db.insert(schema.automationRules).values({ ...a, runCount: 0, createdAt: now }).onConflictDoNothing();

  // ── Contract Templates ─────────────────────────────────
  // {{operator_entity_name}} is replaced at render time with OPERATOR_NAME.
  const templates = [
    {
      id: 'ct-tripartite-my-v1', tenantId: OPERATOR_TENANT_ID, country: 'MY' as const,
      type: 'tripartite' as const, version: 1,
      title: 'Tripartite Employment Agreement (MY)',
      body: `# TRIPARTITE EMPLOYMENT AGREEMENT\n## {{operator_entity_name}} — Malaysia\n\nMade on {{effective_date}} between:\n1. **{{operator_entity_name}}** ("Legal Employer")\n2. **{{client_name}}** (Co. No. {{client_registration_number}}) ("Client")\n3. **{{employee_full_name}}** ("Employee")\n\n## 1. EMPLOYMENT STATUS\nThe Legal Employer is the statutory employer for EPF, SOCSO, EIS, PCB.\nThe Client retains operational control.\n\n## 2. POSITION\n- Title: {{employee_position}}, Dept: {{employee_department}}\n- Hire date: {{employee_hire_date}}\n\n## 3. COMPENSATION\n- Gross monthly salary: {{employee_currency}} {{employee_salary}}\n- Service fee: Client pays 5% of gross payout\n\n## 4. DEPOSIT\n{{notice_period_months}} month(s) gross salary deposit maintained by Client.\n\n## 5. NOTICE\n{{notice_period_months}} month(s) notice or salary in lieu.\n\n## 6. LAW\nLaws of Malaysia.\n\n---\nLegal Employer: ___________________\nClient ({{client_name}}): ___________________\nEmployee ({{employee_full_name}}): ___________________`,
      variables: JSON.stringify(['effective_date','operator_entity_name','client_name','client_registration_number','employee_full_name','employee_position','employee_department','employee_currency','employee_salary','employee_hire_date','notice_period_months']),
      active: true, createdAt: now, updatedAt: now,
    },
    {
      id: 'ct-empinfo-my-v1', tenantId: OPERATOR_TENANT_ID, country: 'MY' as const,
      type: 'employee_info' as const, version: 1,
      title: 'Employee Information Form (MY)',
      body: `# EMPLOYEE INFORMATION FORM\n## {{operator_entity_name}} — Malaysia\n\n### Part A: Personal\n- Name: **{{employee_full_name}}**\n- Email: {{employee_email}}\n- Phone: {{employee_phone}}\n- Hire Date: {{employee_hire_date}}\n\n### Part B: Employment\n- Position: {{employee_position}} / Dept: {{employee_department}}\n- Gross Salary: {{employee_currency}} {{employee_salary}}\n- Notice: {{notice_period_months}} month(s)\n\n### Part C: Statutory\n- LHDN: _______________\n- EPF: _______________\n- SOCSO (NRIC): _______________\n\nEmployee signature: ___________________    Date: ___________`,
      variables: JSON.stringify(['employee_full_name','employee_email','employee_phone','employee_hire_date','employee_position','employee_department','employee_currency','employee_salary','notice_period_months']),
      active: true, createdAt: now, updatedAt: now,
    },
    {
      id: 'ct-termination-my-v1', tenantId: OPERATOR_TENANT_ID, country: 'MY' as const,
      type: 'termination' as const, version: 1,
      title: 'Termination / Resignation Notice (MY)',
      body: `# NOTICE OF TERMINATION\n## {{operator_entity_name}} — Malaysia\n\nDate: {{effective_date}}\n\nDear {{employee_full_name}},\n\nThis is formal notice of termination of your employment as **{{employee_position}}**, effective {{effective_date}}.\n\nNotice period: {{notice_period_months}} month(s).\n\nFinal settlement will be processed in the next payroll cycle following your last day.\n\nFor {{operator_entity_name}}: ___________________\nDate: ___________`,
      variables: JSON.stringify(['effective_date','employee_full_name','employee_position','notice_period_months','operator_entity_name']),
      active: true, createdAt: now, updatedAt: now,
    },
    {
      id: 'ct-tripartite-sg-v1', tenantId: OPERATOR_TENANT_ID, country: 'SG' as const,
      type: 'tripartite' as const, version: 1,
      title: 'Tripartite Employment Agreement (SG)',
      body: `# TRIPARTITE EMPLOYMENT AGREEMENT (KEY EMPLOYMENT TERMS)\n## {{operator_entity_name}} — Singapore\n\nMade on {{effective_date}} between:\n1. **{{operator_entity_name}}** ("Legal Employer")\n2. **{{client_name}}** (UEN: {{client_registration_number}}) ("Client")\n3. **{{employee_full_name}}** (NRIC/FIN: {{employee_id_number}}) ("Employee")\n\n## KEY EMPLOYMENT TERMS (per MOM Employment Act, Part IV)\n\n### Job\n- Title: {{employee_position}} / Dept: {{employee_department}}\n- Place of work: {{work_location}}\n\n### Hours\n- {{working_hours_per_week}} hours/week (5-day week, Mon–Fri)\n\n### Salary\n- Gross monthly: SGD {{employee_salary}}\n\n### Statutory\n- CPF: Employee 20% / Employer 17% (OW ceiling S$8,000/month)\n- SDL: 0.25% employer-only\n\n### Leave\nPer EA and CDCSA: 7+ days annual, 14 sick, 60 hospitalisation, 16-week maternity, 2-week paternity.\n\n### Notice\n{{notice_period_months}} month(s).\n\n### Law\nSingapore.\n\n---\nFor {{operator_entity_name}}: ___________________________\nFor {{client_name}}: ___________________________\nEmployee: ___________________________`,
      variables: JSON.stringify(['effective_date','operator_entity_name','client_name','client_registration_number','employee_full_name','employee_id_number','employee_position','employee_department','work_location','working_hours_per_week','employee_salary','notice_period_months']),
      active: true, createdAt: now, updatedAt: now,
    },
  ];
  for (const t of templates) await db.insert(schema.contractTemplates).values(t).onConflictDoNothing();

  // ── Statutory Rates ────────────────────────────────────
  const statutoryRateRows = [
    // Malaysia
    { id: 'sr-my-epf',      country: 'MY' as const, scheme: 'epf'                  as const, employeeRate: 0.11,    employerRate: 0.13,    effectiveDate: '2020-01-01' },
    { id: 'sr-my-socso',    country: 'MY' as const, scheme: 'social_security'       as const, employeeRate: 0.005,   employerRate: 0.0175,  effectiveDate: '2020-01-01' },
    { id: 'sr-my-eis',      country: 'MY' as const, scheme: 'hrdf'                 as const, employeeRate: 0.002,   employerRate: 0.002,   effectiveDate: '2020-01-01' },
    { id: 'sr-my-pcb',      country: 'MY' as const, scheme: 'federal_tax'          as const, employeeRate: 0,       employerRate: 0,       effectiveDate: '2020-01-01' },
    // Singapore
    { id: 'sr-sg-cpf',      country: 'SG' as const, scheme: 'cpf'                  as const, employeeRate: 0.20,    employerRate: 0.17,    effectiveDate: '2020-01-01' },
    // Indonesia
    { id: 'sr-id-bpjs-tk',  country: 'ID' as const, scheme: 'bpjs_ketenagakerjaan' as const, employeeRate: 0.02,   employerRate: 0.037,   effectiveDate: '2020-01-01' },
    { id: 'sr-id-bpjs-kes', country: 'ID' as const, scheme: 'bpjs_kesehatan'       as const, employeeRate: 0.01,   employerRate: 0.04,    effectiveDate: '2020-01-01' },
    // Thailand
    { id: 'sr-th-ssf',      country: 'TH' as const, scheme: 'ssf'                  as const, employeeRate: 0.05,   employerRate: 0.05,    effectiveDate: '2020-01-01' },
    // South Korea
    { id: 'sr-kr-nps',      country: 'KR' as const, scheme: 'nps'                  as const, employeeRate: 0.045,  employerRate: 0.045,   effectiveDate: '2020-01-01' },
    { id: 'sr-kr-nhi',      country: 'KR' as const, scheme: 'nhi'                  as const, employeeRate: 0.03545, employerRate: 0.03545, effectiveDate: '2020-01-01' },
    // Japan
    { id: 'sr-jp-kosei',    country: 'JP' as const, scheme: 'kosei_nenkin'         as const, employeeRate: 0.0915, employerRate: 0.0915,  effectiveDate: '2020-01-01' },
    { id: 'sr-jp-kenko',    country: 'JP' as const, scheme: 'kenko_hoken'          as const, employeeRate: 0.05,   employerRate: 0.05,    effectiveDate: '2020-01-01' },
  ];
  for (const r of statutoryRateRows) {
    await db.insert(schema.statutoryRates).values({ ...r, createdAt: now, updatedAt: now }).onConflictDoNothing();
  }

  console.log('Seed complete!');
}
