import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import cors from "cors";
import { client } from "./db/index.js";
import * as schema from "./db/schema.js";
import { seed } from "./db/seed.js";
import authRoutes from "./routes/auth.js";
import apiRoutes from "./routes/api.js";
import clientsRoutes from "./routes/clients.js";
import depositsRoutes from "./routes/deposits.js";
import contractsRoutes from "./routes/contracts.js";
import statutoryRoutes from "./routes/statutory.js";
import pdfsRoutes from "./routes/pdfs.js";
import notificationsRoutes from "./routes/notifications.js";
import livenessRoutes from "./routes/liveness.js";
import adminAnalyticsRoutes from "./routes/admin-analytics.js";
import settlementRoutes from "./routes/settlement.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initDatabase() {
  // Create all tables
  const tables = [
    `CREATE TABLE IF NOT EXISTS tenants (
      id TEXT PRIMARY KEY, type TEXT NOT NULL, name TEXT NOT NULL,
      country TEXT NOT NULL DEFAULT 'MY', status TEXT NOT NULL DEFAULT 'active',
      configuration TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES tenants(id),
      operator_tenant_id TEXT NOT NULL REFERENCES tenants(id),
      name TEXT NOT NULL, country TEXT NOT NULL DEFAULT 'MY',
      registration_number TEXT, tax_id TEXT, bank_account TEXT,
      primary_contact_name TEXT, primary_contact_email TEXT, primary_contact_phone TEXT,
      service_plan TEXT NOT NULL DEFAULT 'basic',
      mode TEXT NOT NULL DEFAULT 'eor',
      service_fee_pct REAL NOT NULL DEFAULT 0.05,
      notice_default_months INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL,
      name TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'employee',
      tenant_id TEXT, client_id TEXT,
      company TEXT NOT NULL DEFAULT 'Payroll Platform',
      avatar_url TEXT, is_guest INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY, user_id TEXT REFERENCES users(id),
      first_name TEXT NOT NULL, last_name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT,
      department TEXT NOT NULL, position TEXT NOT NULL,
      employment_type TEXT NOT NULL, hire_date TEXT NOT NULL, termination_date TEXT,
      status TEXT NOT NULL DEFAULT 'active', salary REAL NOT NULL,
      salary_type TEXT NOT NULL, pay_frequency TEXT NOT NULL,
      currency TEXT NOT NULL DEFAULT 'USDC', tax_filing_status TEXT,
      federal_withholding REAL DEFAULT 0, state_withholding REAL DEFAULT 0,
      bank_account_type TEXT, health_insurance REAL DEFAULT 0,
      retirement_401k REAL DEFAULT 0, other_deductions REAL DEFAULT 0,
      emergency_contact_name TEXT, emergency_contact_phone TEXT,
      country TEXT DEFAULT 'US', created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS payroll_runs (
      id TEXT PRIMARY KEY, pay_period_start TEXT NOT NULL, pay_period_end TEXT NOT NULL,
      pay_date TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'draft',
      total_gross_pay REAL NOT NULL DEFAULT 0, total_deductions REAL NOT NULL DEFAULT 0,
      total_taxes REAL NOT NULL DEFAULT 0, total_net_pay REAL NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'USDC', created_at TEXT NOT NULL, processed_at TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS payslips (
      id TEXT PRIMARY KEY, employee_id TEXT NOT NULL REFERENCES employees(id),
      payroll_run_id TEXT NOT NULL REFERENCES payroll_runs(id),
      gross_pay REAL NOT NULL, federal_tax REAL NOT NULL DEFAULT 0,
      state_tax REAL NOT NULL DEFAULT 0, social_security_tax REAL NOT NULL DEFAULT 0,
      medicare_tax REAL NOT NULL DEFAULT 0, health_insurance_deduction REAL NOT NULL DEFAULT 0,
      retirement_401k_deduction REAL NOT NULL DEFAULT 0, other_deductions REAL NOT NULL DEFAULT 0,
      net_pay REAL NOT NULL, currency TEXT NOT NULL DEFAULT 'USDC',
      payment_method TEXT NOT NULL DEFAULT 'stablecoin',
      payment_status TEXT NOT NULL DEFAULT 'pending', created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT,
      address TEXT, city TEXT, state TEXT, zip_code TEXT, country TEXT,
      tax_id TEXT, payment_terms TEXT DEFAULT 'net-30',
      preferred_currency TEXT DEFAULT 'USDC', created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY, invoice_number TEXT NOT NULL UNIQUE,
      customer_id TEXT REFERENCES customers(id),
      issue_date TEXT NOT NULL, due_date TEXT NOT NULL,
      currency TEXT NOT NULL DEFAULT 'USDC', status TEXT NOT NULL DEFAULT 'draft',
      subtotal REAL NOT NULL DEFAULT 0, tax_rate REAL NOT NULL DEFAULT 0,
      tax_amount REAL NOT NULL DEFAULT 0, total REAL NOT NULL DEFAULT 0,
      amount_paid REAL NOT NULL DEFAULT 0, amount_due REAL NOT NULL DEFAULT 0,
      platform_fee REAL NOT NULL DEFAULT 0.01, notes TEXT,
      created_at TEXT NOT NULL, sent_at TEXT, paid_at TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS invoice_line_items (
      id TEXT PRIMARY KEY, invoice_id TEXT NOT NULL REFERENCES invoices(id),
      description TEXT NOT NULL, quantity REAL NOT NULL,
      unit_price REAL NOT NULL, amount REAL NOT NULL,
      taxable INTEGER NOT NULL DEFAULT 1
    )`,
    `CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY, invoice_id TEXT REFERENCES invoices(id),
      amount REAL NOT NULL, payment_method TEXT NOT NULL,
      payment_date TEXT NOT NULL, transaction_id TEXT,
      status TEXT NOT NULL DEFAULT 'pending', created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY, employee_id TEXT NOT NULL REFERENCES employees(id),
      description TEXT NOT NULL, category TEXT NOT NULL,
      amount REAL NOT NULL, currency TEXT NOT NULL DEFAULT 'USDC',
      date TEXT NOT NULL, vendor TEXT,
      status TEXT NOT NULL DEFAULT 'draft', approved_by TEXT,
      reimbursement_date TEXT, notes TEXT, created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS receipts (
      id TEXT PRIMARY KEY, expense_id TEXT NOT NULL REFERENCES expenses(id),
      file_name TEXT NOT NULL, file_url TEXT NOT NULL,
      upload_date TEXT NOT NULL, ocr_vendor TEXT,
      ocr_amount REAL, ocr_date TEXT, ocr_category TEXT, parsed_at TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS vendors (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT,
      phone TEXT, address TEXT, tax_id TEXT,
      payment_terms TEXT DEFAULT 'net-30',
      preferred_currency TEXT DEFAULT 'USDC', created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS bills (
      id TEXT PRIMARY KEY, vendor_id TEXT NOT NULL REFERENCES vendors(id),
      bill_number TEXT NOT NULL, amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'USDC',
      issue_date TEXT NOT NULL, due_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'received',
      paid_date TEXT, notes TEXT, created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS chart_of_accounts (
      id TEXT PRIMARY KEY, account_number TEXT NOT NULL UNIQUE,
      account_name TEXT NOT NULL, account_type TEXT NOT NULL,
      sub_type TEXT, balance REAL NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'USDC',
      status TEXT NOT NULL DEFAULT 'active', created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS journal_entries (
      id TEXT PRIMARY KEY, entry_date TEXT NOT NULL,
      description TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'draft',
      approved_by TEXT, approval_date TEXT, created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS journal_line_items (
      id TEXT PRIMARY KEY,
      journal_entry_id TEXT NOT NULL REFERENCES journal_entries(id),
      account_id TEXT NOT NULL REFERENCES chart_of_accounts(id),
      debit REAL NOT NULL DEFAULT 0, credit REAL NOT NULL DEFAULT 0,
      description TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS stablecoins (
      id TEXT PRIMARY KEY, symbol TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
      decimals INTEGER NOT NULL DEFAULT 6, chain_id INTEGER NOT NULL DEFAULT 1,
      contract_address TEXT, issuer TEXT,
      current_price REAL NOT NULL DEFAULT 1.0,
      market_cap REAL DEFAULT 0, volume_24h REAL DEFAULT 0,
      last_updated TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS wallets (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
      stablecoin TEXT NOT NULL, balance REAL NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS platform_transactions (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
      type TEXT NOT NULL, from_currency TEXT NOT NULL, to_currency TEXT NOT NULL,
      from_amount REAL NOT NULL, to_amount REAL NOT NULL,
      exchange_rate REAL NOT NULL DEFAULT 1, platform_fee REAL NOT NULL DEFAULT 0.01,
      recipient_address TEXT, status TEXT NOT NULL DEFAULT 'pending',
      transaction_hash TEXT, created_at TEXT NOT NULL, completed_at TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS treasury_deposits (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
      stablecoin TEXT NOT NULL, deposit_amount REAL NOT NULL,
      deposit_date TEXT NOT NULL, yield_earned REAL NOT NULL DEFAULT 0,
      yield_rate REAL NOT NULL DEFAULT 0.05,
      status TEXT NOT NULL DEFAULT 'active',
      withdrawal_date TEXT, withdrawal_amount REAL
    )`,
    `CREATE TABLE IF NOT EXISTS time_off_balances (
      id TEXT PRIMARY KEY, employee_id TEXT NOT NULL REFERENCES employees(id),
      type TEXT NOT NULL, total_days REAL NOT NULL,
      used_days REAL NOT NULL DEFAULT 0, pending_days REAL NOT NULL DEFAULT 0,
      year INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS time_off_requests (
      id TEXT PRIMARY KEY, employee_id TEXT NOT NULL REFERENCES employees(id),
      type TEXT NOT NULL, start_date TEXT NOT NULL, end_date TEXT NOT NULL,
      days REAL NOT NULL, reason TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      approved_by TEXT, created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS approvals (
      id TEXT PRIMARY KEY, type TEXT NOT NULL, entity_id TEXT NOT NULL,
      requested_by TEXT NOT NULL, requested_by_name TEXT,
      description TEXT NOT NULL, amount REAL, currency TEXT,
      priority TEXT NOT NULL DEFAULT 'medium',
      status TEXT NOT NULL DEFAULT 'pending',
      approved_by TEXT, approved_at TEXT, created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
      report_type TEXT NOT NULL, period_start TEXT, period_end TEXT,
      data TEXT, format TEXT NOT NULL DEFAULT 'pdf',
      status TEXT NOT NULL DEFAULT 'generated', created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS automation_rules (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
      name TEXT NOT NULL, trigger TEXT NOT NULL,
      conditions TEXT, actions TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      last_run TEXT, run_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS integrations (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
      provider TEXT NOT NULL, access_token TEXT, refresh_token TEXT,
      expires_at TEXT, sync_status TEXT NOT NULL DEFAULT 'disconnected',
      last_sync_date TEXT, config TEXT, created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS webhook_endpoints (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
      tenant_id TEXT REFERENCES tenants(id),
      url TEXT NOT NULL, events TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active', secret TEXT,
      last_delivery_at TEXT, created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, action TEXT NOT NULL,
      entity_type TEXT NOT NULL, entity_id TEXT NOT NULL,
      changes TEXT, ip_address TEXT, timestamp TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
      role TEXT NOT NULL, content TEXT NOT NULL,
      metadata TEXT, created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
      document_type TEXT NOT NULL, file_name TEXT NOT NULL, mime_type TEXT NOT NULL,
      file_size INTEGER NOT NULL, s3_key TEXT NOT NULL UNIQUE, s3_url TEXT,
      upload_status TEXT NOT NULL DEFAULT 'uploading',
      virus_scan_status TEXT NOT NULL DEFAULT 'pending',
      verification_status TEXT NOT NULL DEFAULT 'pending',
      verified_at TEXT, verified_by TEXT, rejection_reason TEXT, expiry_date TEXT,
      uploaded_at TEXT NOT NULL, updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS generated_pdfs (
      id TEXT PRIMARY KEY, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL,
      pdf_type TEXT NOT NULL, s3_key TEXT NOT NULL UNIQUE, s3_url TEXT,
      file_size INTEGER, generated_at TEXT NOT NULL, expires_at TEXT, download_count INTEGER NOT NULL DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS notification_preferences (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL UNIQUE REFERENCES users(id),
      email_enabled INTEGER NOT NULL DEFAULT 1, sms_enabled INTEGER NOT NULL DEFAULT 0,
      payroll_notifications TEXT NOT NULL DEFAULT 'immediate',
      leave_notifications TEXT NOT NULL DEFAULT 'immediate',
      document_notifications TEXT NOT NULL DEFAULT 'immediate',
      invoice_notifications TEXT NOT NULL DEFAULT 'immediate',
      approval_notifications TEXT NOT NULL DEFAULT 'immediate',
      payment_notifications TEXT NOT NULL DEFAULT 'immediate',
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS notification_logs (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
      notification_type TEXT NOT NULL, recipient TEXT NOT NULL, channel TEXT NOT NULL,
      status TEXT NOT NULL, error_message TEXT, sent_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS liveness_checks (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
      session_id TEXT NOT NULL UNIQUE, provider TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending', result TEXT,
      liveness_score REAL, initiated_at TEXT NOT NULL, completed_at TEXT, error_message TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS statutory_rates (
      id TEXT PRIMARY KEY, country TEXT NOT NULL, scheme TEXT NOT NULL,
      employee_rate REAL NOT NULL, employer_rate REAL NOT NULL,
      min_salary REAL, max_salary REAL, effective_date TEXT NOT NULL, end_date TEXT,
      notes TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS payslip_deductions (
      id TEXT PRIMARY KEY, payslip_id TEXT NOT NULL, deduction_type TEXT NOT NULL,
      amount REAL NOT NULL, rate REAL, base_amount REAL, calculation_method TEXT,
      notes TEXT, created_at TEXT NOT NULL
    )`,
    // ── EOR: Deposits & ledger ─────────────────────────────
    `CREATE TABLE IF NOT EXISTS deposits (
      id TEXT PRIMARY KEY, tenant_id TEXT, client_id TEXT, employee_id TEXT,
      amount REAL NOT NULL, currency TEXT NOT NULL DEFAULT 'MYR',
      calculation_basis TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      trust_account_ref TEXT, received_date TEXT, refund_date TEXT,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS deposit_ledger (
      id TEXT PRIMARY KEY, deposit_id TEXT NOT NULL REFERENCES deposits(id),
      tx_type TEXT NOT NULL, amount REAL NOT NULL,
      reference TEXT, note TEXT, created_at TEXT NOT NULL
    )`,
    // ── EOR: Contract templates & signed contracts ─────────
    `CREATE TABLE IF NOT EXISTS contract_templates (
      id TEXT PRIMARY KEY, tenant_id TEXT, country TEXT NOT NULL,
      type TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1,
      title TEXT NOT NULL, body TEXT NOT NULL, variables TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS contracts (
      id TEXT PRIMARY KEY, tenant_id TEXT, client_id TEXT, employee_id TEXT,
      template_id TEXT NOT NULL, template_version INTEGER NOT NULL DEFAULT 1,
      rendered_pdf_s3_key TEXT, rendered_pdf_url TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      signatures TEXT,
      created_at TEXT NOT NULL, completed_at TEXT
    )`,
  ];

  for (const sql of tables) {
    await client.execute(sql);
  }

  // Idempotent column additions for existing deployments. Each ALTER is wrapped
  // in a try/catch because SQLite raises if the column already exists.
  const columnAdditions: Array<[string, string, string]> = [
    ['users', 'tenant_id', 'TEXT'],
    ['users', 'client_id', 'TEXT'],
    ['employees', 'tenant_id', 'TEXT'],
    ['employees', 'client_id', 'TEXT'],
    ['employees', 'nationality', "TEXT DEFAULT 'malaysian'"],
    ['employees', 'resident_status', "TEXT DEFAULT 'resident'"],
    ['employees', 'tax_category', "TEXT DEFAULT 'KA1'"],
    ['employees', 'age_group', "TEXT DEFAULT 'below_60'"],
    ['employees', 'zakat_monthly', 'REAL DEFAULT 0'],
    ['employees', 'cp38_amount', 'REAL DEFAULT 0'],
    ['employees', 'hrdf_eligible', 'INTEGER DEFAULT 1'],
    ['employees', 'notice_period_months', 'INTEGER NOT NULL DEFAULT 1'],
    ['employees', 'fixed_allowances', 'TEXT'],
    ['employees', 'emergency_contact_relationship', 'TEXT'],
    ['employees', 'nric', 'TEXT'],
    ['employees', 'date_of_birth', 'TEXT'],
    ['employees', 'residential_address', 'TEXT'],
    ['employees', 'bank_account', 'TEXT'],
    ['employees', 'epf_beneficiary', 'TEXT'],
    ['payroll_runs', 'tenant_id', 'TEXT'],
    ['payroll_runs', 'client_id', 'TEXT'],
    ['payslips', 'tenant_id', 'TEXT'],
    ['payslips', 'client_id', 'TEXT'],
    ['payslips', 'epf_employee', 'REAL NOT NULL DEFAULT 0'],
    ['payslips', 'epf_employer', 'REAL NOT NULL DEFAULT 0'],
    ['payslips', 'socso_employee', 'REAL NOT NULL DEFAULT 0'],
    ['payslips', 'socso_employer', 'REAL NOT NULL DEFAULT 0'],
    ['payslips', 'eis_employee', 'REAL NOT NULL DEFAULT 0'],
    ['payslips', 'eis_employer', 'REAL NOT NULL DEFAULT 0'],
    ['payslips', 'pcb_mtd', 'REAL NOT NULL DEFAULT 0'],
    ['payslips', 'hrdf', 'REAL NOT NULL DEFAULT 0'],
    ['payslips', 'wht', 'REAL NOT NULL DEFAULT 0'],
    ['payslips', 'zakat', 'REAL NOT NULL DEFAULT 0'],
    ['payslips', 'cp38', 'REAL NOT NULL DEFAULT 0'],
    ['payslips', 'total_employer_cost', 'REAL NOT NULL DEFAULT 0'],
    ['invoices', 'tenant_id', 'TEXT'],
    ['invoices', 'client_id', 'TEXT'],
    ['invoices', 'payroll_run_id', 'TEXT'],
    ['invoices', 'service_fee_pct', 'REAL NOT NULL DEFAULT 0.05'],
    ['invoices', 'service_fee_amount', 'REAL NOT NULL DEFAULT 0'],
    ['customers', 'tenant_id', 'TEXT'],
    ['expenses', 'tenant_id', 'TEXT'],
    ['expenses', 'client_id', 'TEXT'],
    ['vendors', 'tenant_id', 'TEXT'],
    ['bills', 'tenant_id', 'TEXT'],
    ['approvals', 'tenant_id', 'TEXT'],
    ['approvals', 'client_id', 'TEXT'],
    ['audit_logs', 'tenant_id', 'TEXT'],
    ['documents', 'tenant_id', 'TEXT'],
    ['documents', 'client_id', 'TEXT'],
    ['documents', 'employee_id', 'TEXT'],
    // Phase 1: clients.mode for 4-tier product (payroll / hr / payroll_hr / eor)
    ['clients', 'mode', "TEXT NOT NULL DEFAULT 'eor'"],
    ['clients', 'default_pay_frequency', 'TEXT'],
    ['clients', 'default_currency', 'TEXT'],
    ['clients', 'epf_employer_number', 'TEXT'],
    ['clients', 'socso_employer_number', 'TEXT'],
    ['clients', 'lhdn_employer_number', 'TEXT'],
    ['notification_preferences', 'tax_alerts', 'INTEGER NOT NULL DEFAULT 1'],
    ['notification_preferences', 'fx_alerts', 'INTEGER NOT NULL DEFAULT 1'],
    ['notification_preferences', 'payroll_alerts', 'INTEGER NOT NULL DEFAULT 1'],
    ['notification_preferences', 'slack_enabled', 'INTEGER NOT NULL DEFAULT 0'],
  ];

  for (const [table, column, def] of columnAdditions) {
    try {
      await client.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${def}`);
    } catch (err: any) {
      // "duplicate column" is expected on re-runs — swallow it; rethrow anything else
      if (!/duplicate column|already exists/i.test(err?.message ?? '')) {
        throw err;
      }
    }
  }

  // Check if seeded
  const result = await client.execute("SELECT count(*) as c FROM users");
  if (result.rows[0].c === 0) {
    await seed();
  }
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(cookieParser());
  app.use(cors({ origin: true, credentials: true }));

  // Initialize database
  await initDatabase();
  console.log("Database initialized");

  // API Routes
  app.use("/api/auth", authRoutes);
  app.use("/api/clients", clientsRoutes);
  app.use("/api/deposits", depositsRoutes);
  app.use("/api/contracts", contractsRoutes);
  app.use("/api/statutory", statutoryRoutes);
  app.use("/api/pdfs", pdfsRoutes);
  app.use("/api/notifications", notificationsRoutes);
  app.use("/api/liveness", livenessRoutes);
  app.use("/api/admin-analytics", adminAnalyticsRoutes);
  app.use("/api/settlement", settlementRoutes);
  app.use("/api", apiRoutes);

  // Serve static files from dist/public in production
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  // Handle client-side routing - serve index.html for all routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Payroll Platform server running on http://localhost:${port}/`);
    console.log(`API available at http://localhost:${port}/api`);
  });
}

startServer().catch(console.error);
