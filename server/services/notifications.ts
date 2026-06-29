import db from "../db/index.js";
import * as s from "../db/schema.js";
import { eq } from "drizzle-orm";

export interface NotificationProvider {
  sendEmail(to: string, subject: string, body: string, html?: string): Promise<void>;
  sendSms(phoneNumber: string, message: string): Promise<void>;
}

/**
 * Notification service with provider abstraction
 */
export class NotificationService {
  private emailProvider: NotificationProvider | null = null;
  private smsProvider: NotificationProvider | null = null;

  /**
   * Set email provider (e.g., SendGrid, AWS SES)
   */
  setEmailProvider(provider: NotificationProvider) {
    this.emailProvider = provider;
  }

  /**
   * Set SMS provider (e.g., Twilio)
   */
  setSmsProvider(provider: NotificationProvider) {
    this.smsProvider = provider;
  }

  /**
   * Send email notification
   */
  async sendEmail(
    userId: string,
    to: string,
    subject: string,
    body: string,
    html?: string
  ): Promise<void> {
    if (!this.emailProvider) {
      console.warn("Email provider not configured");
      return;
    }

    try {
      await this.emailProvider.sendEmail(to, subject, body, html);

      // Log notification
      await this.logNotification(userId, "email", to, subject, "sent");
    } catch (error: any) {
      console.error("Failed to send email:", error);
      await this.logNotification(userId, "email", to, subject, "failed", error.message);
      throw error;
    }
  }

  /**
   * Send SMS notification
   */
  async sendSms(userId: string, phoneNumber: string, message: string): Promise<void> {
    if (!this.smsProvider) {
      console.warn("SMS provider not configured");
      return;
    }

    try {
      await this.smsProvider.sendSms(phoneNumber, message);

      // Log notification
      await this.logNotification(userId, "sms", phoneNumber, message, "sent");
    } catch (error: any) {
      console.error("Failed to send SMS:", error);
      await this.logNotification(userId, "sms", phoneNumber, message, "failed", error.message);
      throw error;
    }
  }

  /**
   * Send payslip notification
   */
  async sendPayslipNotification(employeeId: string, payslipId: string, email: string): Promise<void> {
    const subject = "Your Payslip is Ready";
    const body = `Your payslip for this period is now available. You can view and download it from your dashboard.`;
    const html = `
      <h2>Your Payslip is Ready</h2>
      <p>Your payslip for this period is now available.</p>
      <p>You can view and download it from your dashboard by logging in with your credentials.</p>
      <p>If you have any questions, please contact your HR department.</p>
    `;

    await this.sendEmail(employeeId, email, subject, body, html);
  }

  /**
   * Send settlement notification
   */
  async sendSettlementNotification(
    userId: string,
    email: string,
    settlementId: string,
    amount: number,
    currency: string
  ): Promise<void> {
    const subject = "Settlement Completed";
    const body = `Your settlement of ${amount} ${currency} has been completed successfully.`;
    const html = `
      <h2>Settlement Completed</h2>
      <p>Your settlement has been processed successfully.</p>
      <p><strong>Amount:</strong> ${amount} ${currency}</p>
      <p><strong>Settlement ID:</strong> ${settlementId}</p>
      <p>You can view the details in your dashboard.</p>
    `;

    await this.sendEmail(userId, email, subject, body, html);
  }

  /**
   * Send KYC verification notification
   */
  async sendKycVerificationNotification(userId: string, email: string, status: "verified" | "rejected"): Promise<void> {
    if (status === "verified") {
      const subject = "KYC Verification Approved";
      const body = "Your KYC verification has been approved. Your account is now fully activated.";
      const html = `
        <h2>KYC Verification Approved</h2>
        <p>Your KYC verification has been approved successfully.</p>
        <p>Your account is now fully activated and you can use all features.</p>
      `;

      await this.sendEmail(userId, email, subject, body, html);
    } else {
      const subject = "KYC Verification Rejected";
      const body = "Your KYC verification has been rejected. Please resubmit with correct documents.";
      const html = `
        <h2>KYC Verification Rejected</h2>
        <p>Your KYC verification has been rejected.</p>
        <p>Please resubmit your documents with the correct information.</p>
        <p>Contact support if you need assistance.</p>
      `;

      await this.sendEmail(userId, email, subject, body, html);
    }
  }

  /**
   * Send liveness test notification
   */
  async sendLivenessTestNotification(userId: string, email: string, phoneNumber?: string): Promise<void> {
    const subject = "Identity Verification Required";
    const body = "We need to verify your identity. Please complete the liveness test in your dashboard.";
    const html = `
      <h2>Identity Verification Required</h2>
      <p>We need to verify your identity to complete your account setup.</p>
      <p>Please complete the liveness test in your dashboard.</p>
      <p>This should take less than 2 minutes.</p>
    `;

    await this.sendEmail(userId, email, subject, body, html);

    if (phoneNumber) {
      const smsMessage = "Payroll Platform: Please complete your identity verification. Visit your dashboard to start the liveness test.";
      await this.sendSms(userId, phoneNumber, smsMessage);
    }
  }

  /**
   * Send bulk notification
   */
  async sendBulkNotification(
    userIds: string[],
    emails: string[],
    subject: string,
    body: string,
    html?: string
  ): Promise<{ successful: number; failed: number }> {
    let successful = 0;
    let failed = 0;

    for (let i = 0; i < userIds.length; i++) {
      try {
        await this.sendEmail(userIds[i], emails[i], subject, body, html);
        successful++;
      } catch (error) {
        console.error(`Failed to send email to ${emails[i]}:`, error);
        failed++;
      }
    }

    return { successful, failed };
  }

  /**
   * Log notification
   */
  private async logNotification(
    userId: string,
    type: "email" | "sms",
    recipient: string,
    content: string,
    status: "sent" | "failed",
    errorMessage?: string
  ): Promise<void> {
    try {
      await db.insert(s.notificationLogs).values({
        id: `notif-${Date.now()}`,
        userId,
        notificationType: 'payroll',
        recipient,
        channel: type,
        status,
        errorMessage,
        sentAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Failed to log notification:", error);
    }
  }

  async getNotificationPreferences(userId: string) {
    const prefs = await db
      .select()
      .from(s.notificationPreferences)
      .where(eq(s.notificationPreferences.userId, userId))
      .limit(1);

    if (prefs.length === 0) {
      const now = new Date().toISOString();
      await db.insert(s.notificationPreferences).values({
        id: `np-${Date.now()}`,
        userId,
        emailEnabled: true,
        smsEnabled: false,
        createdAt: now,
        updatedAt: now,
      });
      return { userId, emailEnabled: true, smsEnabled: false };
    }

    return prefs[0];
  }

  async updateNotificationPreferences(
    userId: string,
    preferences: {
      emailEnabled?: boolean;
      smsEnabled?: boolean;
      taxAlerts?: boolean;
      fxAlerts?: boolean;
      payrollAlerts?: boolean;
      slackEnabled?: boolean;
    },
  ): Promise<void> {
    // Ensure a row exists before updating (matches getNotificationPreferences behavior).
    await this.getNotificationPreferences(userId);
    await db
      .update(s.notificationPreferences)
      .set({ ...preferences, updatedAt: new Date().toISOString() })
      .where(eq(s.notificationPreferences.userId, userId));
  }

  async getNotificationHistory(userId: string, limit = 50, offset = 0) {
    return db
      .select()
      .from(s.notificationLogs)
      .where(eq(s.notificationLogs.userId, userId))
      .limit(limit)
      .offset(offset);
  }
}

/**
 * Mock notification provider for testing
 */
export class MockNotificationProvider implements NotificationProvider {
  async sendEmail(to: string, subject: string, body: string, html?: string): Promise<void> {
    console.log(`[MOCK] Email sent to ${to}: ${subject}`);
  }

  async sendSms(phoneNumber: string, message: string): Promise<void> {
    console.log(`[MOCK] SMS sent to ${phoneNumber}: ${message}`);
  }
}

// Export singleton instance
export const notificationService = new NotificationService();

// Set mock provider by default
notificationService.setEmailProvider(new MockNotificationProvider());
notificationService.setSmsProvider(new MockNotificationProvider());
