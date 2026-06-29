import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { users } from "./schema.js";

/**
 * Documents table for storing file metadata
 * Stores information about uploaded documents (KYC, agreements, payslips, etc.)
 */
export const documents = sqliteTable("documents", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id"),
  clientId: text("client_id"),
  userId: text("user_id").notNull().references(() => users.id),
  employeeId: text("employee_id"),
  documentType: text("document_type", {
    enum: ["kyc_business_registration", "kyc_tax_id", "kyc_director_id", "kyc_address_proof", "kyc_bank_statement", "agreement", "payslip", "other"],
  }).notNull(),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(), // in bytes
  s3Key: text("s3_key").notNull().unique(),
  s3Url: text("s3_url"),
  uploadStatus: text("upload_status", {
    enum: ["uploading", "completed", "failed"],
  }).notNull().default("uploading"),
  virusScanStatus: text("virus_scan_status", {
    enum: ["pending", "clean", "infected"],
  }).notNull().default("pending"),
  verificationStatus: text("verification_status", {
    enum: ["pending", "verified", "rejected"],
  }).notNull().default("pending"),
  verifiedAt: text("verified_at"),
  verifiedBy: text("verified_by"),
  rejectionReason: text("rejection_reason"),
  expiryDate: text("expiry_date"), // for auto-delete
  uploadedAt: text("uploaded_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

/**
 * Generated PDFs table for storing PDF metadata
 * Stores information about generated PDFs (payslips, agreements, etc.)
 */
export const generatedPdfs = sqliteTable("generated_pdfs", {
  id: text("id").primaryKey(),
  entityType: text("entity_type", {
    enum: ["payslip", "agreement", "invoice", "report"],
  }).notNull(),
  entityId: text("entity_id").notNull(),
  pdfType: text("pdf_type").notNull(),
  s3Key: text("s3_key").notNull().unique(),
  s3Url: text("s3_url"),
  fileSize: integer("file_size"), // in bytes
  generatedAt: text("generated_at").notNull(),
  expiresAt: text("expires_at"),
  downloadCount: integer("download_count").notNull().default(0),
});

/**
 * Notification preferences table
 * Stores user notification preferences for different event types
 */
export const notificationPreferences = sqliteTable("notification_preferences", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().unique().references(() => users.id),
  emailEnabled: integer("email_enabled", { mode: "boolean" }).notNull().default(true),
  smsEnabled: integer("sms_enabled", { mode: "boolean" }).notNull().default(false),
  taxAlerts: integer("tax_alerts", { mode: "boolean" }).notNull().default(true),
  fxAlerts: integer("fx_alerts", { mode: "boolean" }).notNull().default(true),
  payrollAlerts: integer("payroll_alerts", { mode: "boolean" }).notNull().default(true),
  slackEnabled: integer("slack_enabled", { mode: "boolean" }).notNull().default(false),
  payrollNotifications: text("payroll_notifications", {
    enum: ["immediate", "daily", "weekly", "never"],
  }).notNull().default("immediate"),
  leaveNotifications: text("leave_notifications", {
    enum: ["immediate", "daily", "weekly", "never"],
  }).notNull().default("immediate"),
  documentNotifications: text("document_notifications", {
    enum: ["immediate", "daily", "weekly", "never"],
  }).notNull().default("immediate"),
  invoiceNotifications: text("invoice_notifications", {
    enum: ["immediate", "daily", "weekly", "never"],
  }).notNull().default("immediate"),
  approvalNotifications: text("approval_notifications", {
    enum: ["immediate", "daily", "weekly", "never"],
  }).notNull().default("immediate"),
  paymentNotifications: text("payment_notifications", {
    enum: ["immediate", "daily", "weekly", "never"],
  }).notNull().default("immediate"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

/**
 * Notification logs table
 * Stores audit trail of all notifications sent
 */
export const notificationLogs = sqliteTable("notification_logs", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  notificationType: text("notification_type", {
    enum: ["payroll", "leave", "document", "invoice", "approval", "payment"],
  }).notNull(),
  recipient: text("recipient").notNull(), // email or phone number
  channel: text("channel", {
    enum: ["email", "sms"],
  }).notNull(),
  status: text("status", {
    enum: ["sent", "failed", "bounced"],
  }).notNull(),
  errorMessage: text("error_message"),
  sentAt: text("sent_at").notNull(),
});

/**
 * Liveness checks table
 * Stores information about identity verification liveness checks
 */
export const livenessChecks = sqliteTable("liveness_checks", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  sessionId: text("session_id").notNull().unique(),
  provider: text("provider", {
    enum: ["idology", "onfido", "aws_rekognition"],
  }).notNull(),
  status: text("status", {
    enum: ["pending", "completed", "failed"],
  }).notNull().default("pending"),
  result: text("result", {
    enum: ["pass", "fail", "inconclusive"],
  }),
  livenessScore: real("liveness_score"), // 0-100
  initiatedAt: text("initiated_at").notNull(),
  completedAt: text("completed_at"),
  errorMessage: text("error_message"),
});

/**
 * Statutory contribution rates table
 * Stores statutory rates for different countries and schemes
 */
export const statutoryRates = sqliteTable("statutory_rates", {
  id: text("id").primaryKey(),
  country: text("country", {
    enum: ["MY", "SG", "US", "AU", "NZ", "GB", "CA", "HK", "TH", "ID", "PH", "KR", "JP", "VN", "KH", "TW", "MM", "CN"],
  }).notNull(),
  scheme: text("scheme", {
    enum: [
      "epf", "cpf", "federal_tax", "state_tax", "social_security", "medicare",
      "zakat", "hrdf", "cp38",
      "bpjs_ketenagakerjaan", "bpjs_kesehatan", "ssf",
      "nps", "nhi", "kosei_nenkin", "kenko_hoken",
    ],
  }).notNull(),
  employeeRate: real("employee_rate").notNull(), // percentage
  employerRate: real("employer_rate").notNull(), // percentage
  minSalary: real("min_salary"), // minimum salary for contribution
  maxSalary: real("max_salary"), // maximum salary for contribution
  effectiveDate: text("effective_date").notNull(),
  endDate: text("end_date"),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

/**
 * Payslip deductions breakdown table
 * Stores detailed breakdown of deductions for each payslip
 */
export const payslipDeductions = sqliteTable("payslip_deductions", {
  id: text("id").primaryKey(),
  payslipId: text("payslip_id").notNull(),
  deductionType: text("deduction_type", {
    enum: ["epf", "cpf", "federal_tax", "state_tax", "social_security", "medicare", "health_insurance", "retirement_401k", "zakat", "hrdf", "cp38", "other"],
  }).notNull(),
  amount: real("amount").notNull(),
  rate: real("rate"), // percentage applied
  baseAmount: real("base_amount"), // amount before rate applied
  calculationMethod: text("calculation_method"), // e.g., "percentage_of_gross", "fixed_amount"
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
});
