import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { users, employees, payrollRuns, timeOffRequests, expenses } from './schema.js';

/**
 * PHASE 2: SCHEMA EXTENSIONS
 * 
 * New tables to support:
 * - Organization structure (departments, reporting lines)
 * - Leave management (leave types, public holidays)
 * - Settlement tracking (payment batches, settlement transactions)
 * - Enhanced payroll (batch approvals, FX tracking)
 * - Enhanced expenses (approval workflow)
 */

// ============================================================================
// ORGANIZATION STRUCTURE
// ============================================================================

export const departments = sqliteTable('departments', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  managerId: text('manager_id').references(() => employees.id),
  parentDepartmentId: text('parent_department_id'),
  budget: real('budget').default(0),
  currency: text('currency').notNull().default('USDC'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Add foreign key constraint for self-reference
// departments.parentDepartmentId references departments.id

export const reportingLines = sqliteTable('reporting_lines', {
  id: text('id').primaryKey(),
  employeeId: text('employee_id').notNull().references(() => employees.id),
  supervisorId: text('supervisor_id').notNull().references(() => employees.id),
  effectiveDate: text('effective_date').notNull(),
  endDate: text('end_date'),
  createdAt: text('created_at').notNull(),
});

// ============================================================================
// LEAVE MANAGEMENT
// ============================================================================

export const leaveTypes = sqliteTable('leave_types', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  code: text('code').notNull().unique(),
  description: text('description'),
  daysPerYear: real('days_per_year').notNull(),
  carryoverDays: real('carryover_days').notNull().default(0),
  requiresApproval: integer('requires_approval', { mode: 'boolean' }).notNull().default(true),
  isPublicHoliday: integer('is_public_holiday', { mode: 'boolean' }).notNull().default(false),
  country: text('country').notNull().default('US'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
});

export const publicHolidays = sqliteTable('public_holidays', {
  id: text('id').primaryKey(),
  country: text('country').notNull(),
  name: text('name').notNull(),
  date: text('date').notNull(),
  year: integer('year').notNull(),
  isRecurring: integer('is_recurring', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
});

// ============================================================================
// ENHANCED TIME OFF
// ============================================================================

export const timeOffApprovals = sqliteTable('time_off_approvals', {
  id: text('id').primaryKey(),
  timeOffRequestId: text('time_off_request_id').notNull().references(() => timeOffRequests.id),
  supervisorId: text('supervisor_id').notNull().references(() => employees.id),
  status: text('status', { enum: ['pending', 'approved', 'rejected'] }).notNull().default('pending'),
  approvalNotes: text('approval_notes'),
  rejectionReason: text('rejection_reason'),
  approvedAt: text('approved_at'),
  createdAt: text('created_at').notNull(),
});

// ============================================================================
// ENHANCED EXPENSES
// ============================================================================

export const expenseApprovals = sqliteTable('expense_approvals', {
  id: text('id').primaryKey(),
  expenseId: text('expense_id').notNull().references(() => expenses.id),
  supervisorId: text('supervisor_id').notNull().references(() => employees.id),
  status: text('status', { enum: ['pending', 'approved', 'rejected'] }).notNull().default('pending'),
  approvalNotes: text('approval_notes'),
  rejectionReason: text('rejection_reason'),
  approvedAt: text('approved_at'),
  createdAt: text('created_at').notNull(),
});

export const receipts = sqliteTable('receipts', {
  id: text('id').primaryKey(),
  expenseId: text('expense_id').notNull().references(() => expenses.id),
  fileName: text('file_name').notNull(),
  fileUrl: text('file_url').notNull(),
  fileType: text('file_type').notNull(),
  fileSize: integer('file_size').notNull(),
  uploadedAt: text('uploaded_at').notNull(),
});

// ============================================================================
// PAYROLL BATCH & SETTLEMENT
// ============================================================================

export const payrollBatches = sqliteTable('payroll_batches', {
  id: text('id').primaryKey(),
  payrollRunId: text('payroll_run_id').notNull().references(() => payrollRuns.id),
  batchNumber: text('batch_number').notNull(),
  totalAmount: real('total_amount').notNull(),
  currency: text('currency').notNull().default('USDC'),
  paymentMethod: text('payment_method', { enum: ['stablecoin', 'bank-transfer', 'check'] }).notNull().default('stablecoin'),
  status: text('status', { enum: ['draft', 'pending-approval', 'approved', 'processing', 'completed', 'failed'] }).notNull().default('draft'),
  approvedBy: text('approved_by').references(() => users.id),
  approvalDate: text('approval_date'),
  batchFileUrl: text('batch_file_url'),
  batchFileHash: text('batch_file_hash'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const paymentBatchItems = sqliteTable('payment_batch_items', {
  id: text('id').primaryKey(),
  payrollBatchId: text('payroll_batch_id').notNull().references(() => payrollBatches.id),
  employeeId: text('employee_id').notNull().references(() => employees.id),
  payslipId: text('payslip_id').notNull(),
  amount: real('amount').notNull(),
  currency: text('currency').notNull().default('USDC'),
  recipientAddress: text('recipient_address'),
  status: text('status', { enum: ['pending', 'processing', 'completed', 'failed'] }).notNull().default('pending'),
  transactionHash: text('transaction_hash'),
  createdAt: text('created_at').notNull(),
});

export const settlementTransactions = sqliteTable('settlement_transactions', {
  id: text('id').primaryKey(),
  paymentBatchItemId: text('payment_batch_item_id').notNull().references(() => paymentBatchItems.id),
  fromCurrency: text('from_currency').notNull(),
  toCurrency: text('to_currency').notNull(),
  fromAmount: real('from_amount').notNull(),
  toAmount: real('to_amount').notNull(),
  exchangeRate: real('exchange_rate').notNull(),
  fxGainLoss: real('fx_gain_loss').notNull().default(0),
  platformFee: real('platform_fee').notNull().default(0.01),
  status: text('status', { enum: ['pending', 'completed', 'failed'] }).notNull().default('pending'),
  transactionHash: text('transaction_hash'),
  settlementDate: text('settlement_date'),
  createdAt: text('created_at').notNull(),
});

// ============================================================================
// PAYROLL APPROVAL WORKFLOW
// ============================================================================

export const payrollApprovals = sqliteTable('payroll_approvals', {
  id: text('id').primaryKey(),
  payrollRunId: text('payroll_run_id').notNull().references(() => payrollRuns.id),
  approverUserId: text('approver_user_id').notNull().references(() => users.id),
  status: text('status', { enum: ['pending', 'approved', 'rejected'] }).notNull().default('pending'),
  approvalNotes: text('approval_notes'),
  rejectionReason: text('rejection_reason'),
  approvedAt: text('approved_at'),
  createdAt: text('created_at').notNull(),
});

// ============================================================================
// FX & SETTLEMENT TRACKING
// ============================================================================

export const fxRates = sqliteTable('fx_rates', {
  id: text('id').primaryKey(),
  fromCurrency: text('from_currency').notNull(),
  toCurrency: text('to_currency').notNull(),
  rate: real('rate').notNull(),
  source: text('source').notNull(),
  timestamp: text('timestamp').notNull(),
  createdAt: text('created_at').notNull(),
});

export const settlementRuns = sqliteTable('settlement_runs', {
  id: text('id').primaryKey(),
  runDate: text('run_date').notNull(),
  totalTransactions: integer('total_transactions').notNull(),
  totalAmount: real('total_amount').notNull(),
  totalFxGainLoss: real('total_fx_gain_loss').notNull().default(0),
  status: text('status', { enum: ['pending', 'processing', 'completed', 'failed'] }).notNull().default('pending'),
  completedAt: text('completed_at'),
  createdAt: text('created_at').notNull(),
});

// ============================================================================
// COMPLIANCE & REPORTING
// ============================================================================

export const complianceReports = sqliteTable('compliance_reports', {
  id: text('id').primaryKey(),
  reportType: text('report_type', { enum: ['tax-filing', 'payroll-summary', 'employee-records', 'audit-trail'] }).notNull(),
  country: text('country').notNull(),
  periodStart: text('period_start').notNull(),
  periodEnd: text('period_end').notNull(),
  status: text('status', { enum: ['draft', 'ready', 'filed', 'error'] }).notNull().default('draft'),
  filedDate: text('filed_date'),
  fileUrl: text('file_url'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const taxFilings = sqliteTable('tax_filings', {
  id: text('id').primaryKey(),
  employeeId: text('employee_id').notNull().references(() => employees.id),
  country: text('country').notNull(),
  taxYear: integer('tax_year').notNull(),
  totalIncome: real('total_income').notNull(),
  totalTaxWithheld: real('total_tax_withheld').notNull(),
  status: text('status', { enum: ['pending', 'filed', 'verified'] }).notNull().default('pending'),
  filedDate: text('filed_date'),
  createdAt: text('created_at').notNull(),
});
