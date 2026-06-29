import express from "express";
import { notificationService } from "../services/notifications.js";

const router = express.Router();

/**
 * POST /api/notifications/send-payslip
 * Send payslip notification to employee
 */
router.post("/send-payslip", async (req, res) => {
  try {
    const { employeeId, payslipId, email } = req.body;

    if (!employeeId || !payslipId || !email) {
      return res.status(400).json({ error: "Missing required fields: employeeId, payslipId, email" });
    }

    await notificationService.sendPayslipNotification(employeeId, payslipId, email);

    res.json({
      success: true,
      message: "Payslip notification sent",
      employeeId,
      payslipId,
    });
  } catch (error: any) {
    console.error("Error sending payslip notification:", error);
    res.status(500).json({ error: error.message || "Failed to send notification" });
  }
});

/**
 * POST /api/notifications/send-settlement
 * Send settlement notification
 */
router.post("/send-settlement", async (req, res) => {
  try {
    const { userId, email, settlementId, amount, currency } = req.body;

    if (!userId || !email || !settlementId || !amount || !currency) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    await notificationService.sendSettlementNotification(userId, email, settlementId, amount, currency);

    res.json({
      success: true,
      message: "Settlement notification sent",
      userId,
      settlementId,
    });
  } catch (error: any) {
    console.error("Error sending settlement notification:", error);
    res.status(500).json({ error: error.message || "Failed to send notification" });
  }
});

/**
 * POST /api/notifications/send-kyc-verification
 * Send KYC verification notification
 */
router.post("/send-kyc-verification", async (req, res) => {
  try {
    const { userId, email, status } = req.body;

    if (!userId || !email || !status) {
      return res.status(400).json({ error: "Missing required fields: userId, email, status" });
    }

    if (!["verified", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Invalid status. Must be 'verified' or 'rejected'" });
    }

    await notificationService.sendKycVerificationNotification(userId, email, status);

    res.json({
      success: true,
      message: "KYC verification notification sent",
      userId,
      status,
    });
  } catch (error: any) {
    console.error("Error sending KYC verification notification:", error);
    res.status(500).json({ error: error.message || "Failed to send notification" });
  }
});

/**
 * POST /api/notifications/send-liveness-test
 * Send liveness test notification
 */
router.post("/send-liveness-test", async (req, res) => {
  try {
    const { userId, email, phoneNumber } = req.body;

    if (!userId || !email) {
      return res.status(400).json({ error: "Missing required fields: userId, email" });
    }

    await notificationService.sendLivenessTestNotification(userId, email, phoneNumber);

    res.json({
      success: true,
      message: "Liveness test notification sent",
      userId,
    });
  } catch (error: any) {
    console.error("Error sending liveness test notification:", error);
    res.status(500).json({ error: error.message || "Failed to send notification" });
  }
});

/**
 * POST /api/notifications/send-bulk
 * Send bulk notifications
 */
router.post("/send-bulk", async (req, res) => {
  try {
    const { userIds, emails, subject, body, html } = req.body;

    if (!userIds || !emails || !subject || !body) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (userIds.length !== emails.length) {
      return res.status(400).json({ error: "userIds and emails arrays must have the same length" });
    }

    const result = await notificationService.sendBulkNotification(userIds, emails, subject, body, html);

    res.json({
      success: true,
      message: "Bulk notifications sent",
      ...result,
    });
  } catch (error: any) {
    console.error("Error sending bulk notifications:", error);
    res.status(500).json({ error: error.message || "Failed to send notifications" });
  }
});

/**
 * GET /api/notifications/preferences/:userId
 * Get notification preferences
 */
router.get("/preferences/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const preferences = await notificationService.getNotificationPreferences(userId);

    res.json({
      success: true,
      preferences,
    });
  } catch (error: any) {
    console.error("Error getting notification preferences:", error);
    res.status(500).json({ error: error.message || "Failed to get preferences" });
  }
});

/**
 * PATCH /api/notifications/preferences/:userId
 * Update notification preferences
 */
router.patch("/preferences/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { emailEnabled, smsEnabled, taxAlerts, fxAlerts, payrollAlerts, slackEnabled } = req.body;

    await notificationService.updateNotificationPreferences(userId, {
      emailEnabled,
      smsEnabled,
      taxAlerts,
      fxAlerts,
      payrollAlerts,
      slackEnabled,
    });

    res.json({
      success: true,
      message: "Preferences updated",
      userId,
    });
  } catch (error: any) {
    console.error("Error updating notification preferences:", error);
    res.status(500).json({ error: error.message || "Failed to update preferences" });
  }
});

/**
 * GET /api/notifications/history/:userId
 * Get notification history
 */
router.get("/history/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = "50", offset = "0" } = req.query;

    const history = await notificationService.getNotificationHistory(userId, parseInt(limit as string), parseInt(offset as string));

    res.json({
      success: true,
      userId,
      history,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  } catch (error: any) {
    console.error("Error getting notification history:", error);
    res.status(500).json({ error: error.message || "Failed to get history" });
  }
});

export default router;
