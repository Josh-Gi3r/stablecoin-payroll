import express from "express";
import { adminAnalyticsService } from "../services/admin-analytics.js";

const router = express.Router();

/**
 * GET /api/admin/payroll-summary/:companyId
 * Get payroll summary for company
 */
router.get("/payroll-summary/:companyId", async (req, res) => {
  try {
    const { companyId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: "Missing required query parameters: startDate, endDate" });
    }

    const summary = await adminAnalyticsService.getPayrollSummary(companyId, String(startDate), String(endDate));

    res.json({
      success: true,
      companyId,
      summary,
    });
  } catch (error: any) {
    console.error("Error getting payroll summary:", error);
    res.status(500).json({ error: error.message || "Failed to get payroll summary" });
  }
});

/**
 * GET /api/admin/payroll-run/:payrollRunId
 * Get payroll run details
 */
router.get("/payroll-run/:payrollRunId", async (req, res) => {
  try {
    const { payrollRunId } = req.params;

    const details = await adminAnalyticsService.getPayrollRunDetails(payrollRunId);

    res.json({
      success: true,
      payrollRunId,
      details,
    });
  } catch (error: any) {
    console.error("Error getting payroll run details:", error);
    res.status(500).json({ error: error.message || "Failed to get payroll run details" });
  }
});

/**
 * GET /api/admin/employee-history/:employeeId
 * Get employee payroll history
 */
router.get("/employee-history/:employeeId", async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { limit = "50", offset = "0" } = req.query;

    const history = await adminAnalyticsService.getEmployeePayrollHistory(employeeId, parseInt(limit as string), parseInt(offset as string));

    res.json({
      success: true,
      employeeId,
      history,
    });
  } catch (error: any) {
    console.error("Error getting employee payroll history:", error);
    res.status(500).json({ error: error.message || "Failed to get employee history" });
  }
});

/**
 * GET /api/admin/deduction-breakdown/:payrollRunId
 * Get deduction breakdown for payroll run
 */
router.get("/deduction-breakdown/:payrollRunId", async (req, res) => {
  try {
    const { payrollRunId } = req.params;

    const breakdown = await adminAnalyticsService.getDeductionBreakdown(payrollRunId);

    res.json({
      success: true,
      payrollRunId,
      breakdown,
    });
  } catch (error: any) {
    console.error("Error getting deduction breakdown:", error);
    res.status(500).json({ error: error.message || "Failed to get deduction breakdown" });
  }
});

/**
 * GET /api/admin/settlement-analytics/:companyId
 * Get settlement analytics
 */
router.get("/settlement-analytics/:companyId", async (req, res) => {
  try {
    const { companyId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: "Missing required query parameters: startDate, endDate" });
    }

    const analytics = await adminAnalyticsService.getSettlementAnalytics(companyId, String(startDate), String(endDate));

    res.json({
      success: true,
      companyId,
      analytics,
    });
  } catch (error: any) {
    console.error("Error getting settlement analytics:", error);
    res.status(500).json({ error: error.message || "Failed to get settlement analytics" });
  }
});

/**
 * GET /api/admin/employee-distribution/:companyId
 * Get employee distribution by country
 */
router.get("/employee-distribution/:companyId", async (req, res) => {
  try {
    const { companyId } = req.params;

    const distribution = await adminAnalyticsService.getEmployeeDistribution(companyId);

    res.json({
      success: true,
      companyId,
      distribution,
    });
  } catch (error: any) {
    console.error("Error getting employee distribution:", error);
    res.status(500).json({ error: error.message || "Failed to get employee distribution" });
  }
});

/**
 * GET /api/admin/top-earners/:companyId
 * Get top earners
 */
router.get("/top-earners/:companyId", async (req, res) => {
  try {
    const { companyId } = req.params;
    const { limit = "10" } = req.query;

    const topEarners = await adminAnalyticsService.getTopEarners(companyId, parseInt(limit as string));

    res.json({
      success: true,
      companyId,
      topEarners,
    });
  } catch (error: any) {
    console.error("Error getting top earners:", error);
    res.status(500).json({ error: error.message || "Failed to get top earners" });
  }
});

/**
 * GET /api/admin/payroll-trends/:companyId
 * Get payroll trends over time
 */
router.get("/payroll-trends/:companyId", async (req, res) => {
  try {
    const { companyId } = req.params;
    const { months = "12" } = req.query;

    const trends = await adminAnalyticsService.getPayrollTrends(companyId, parseInt(months as string));

    res.json({
      success: true,
      companyId,
      trends,
    });
  } catch (error: any) {
    console.error("Error getting payroll trends:", error);
    res.status(500).json({ error: error.message || "Failed to get payroll trends" });
  }
});

export default router;
