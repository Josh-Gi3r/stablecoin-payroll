import express from "express";
import { livenessService } from "../services/liveness.js";

const router = express.Router();

/**
 * POST /api/liveness/initialize
 * Initialize liveness test for user
 */
router.post("/initialize", async (req, res) => {
  try {
    const { userId, email } = req.body;

    if (!userId || !email) {
      return res.status(400).json({ error: "Missing required fields: userId, email" });
    }

    const result = await livenessService.initializeTest(userId, email);

    res.json({
      success: true,
      message: "Liveness test initialized",
      testId: result.testId,
      testUrl: result.testUrl,
    });
  } catch (error: any) {
    console.error("Error initializing liveness test:", error);
    res.status(500).json({ error: error.message || "Failed to initialize liveness test" });
  }
});

/**
 * POST /api/liveness/verify
 * Verify liveness test result
 */
router.post("/verify", async (req, res) => {
  try {
    const { testId, sessionId } = req.body;

    if (!testId || !sessionId) {
      return res.status(400).json({ error: "Missing required fields: testId, sessionId" });
    }

    const result = await livenessService.verifyTest(testId, sessionId);

    res.json({
      success: true,
      message: "Liveness test verified",
      verified: result.verified,
      confidence: result.confidence,
    });
  } catch (error: any) {
    console.error("Error verifying liveness test:", error);
    res.status(500).json({ error: error.message || "Failed to verify liveness test" });
  }
});

/**
 * GET /api/liveness/result/:testId
 * Get liveness test result
 */
router.get("/result/:testId", async (req, res) => {
  try {
    const { testId } = req.params;

    const result = await livenessService.getTestResult(testId);

    res.json({
      success: true,
      result,
    });
  } catch (error: any) {
    console.error("Error getting liveness test result:", error);
    res.status(500).json({ error: error.message || "Failed to get test result" });
  }
});

/**
 * GET /api/liveness/history/:userId
 * Get liveness check history for user
 */
router.get("/history/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = "50", offset = "0" } = req.query;

    const history = await livenessService.getCheckHistory(userId, parseInt(limit as string), parseInt(offset as string));

    res.json({
      success: true,
      userId,
      history,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  } catch (error: any) {
    console.error("Error getting liveness check history:", error);
    res.status(500).json({ error: error.message || "Failed to get history" });
  }
});

/**
 * GET /api/liveness/latest/:userId
 * Get latest liveness check for user
 */
router.get("/latest/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const latestCheck = await livenessService.getLatestCheck(userId);

    if (!latestCheck) {
      return res.status(404).json({ error: "No liveness checks found for user" });
    }

    res.json({
      success: true,
      userId,
      latestCheck,
    });
  } catch (error: any) {
    console.error("Error getting latest liveness check:", error);
    res.status(500).json({ error: error.message || "Failed to get latest check" });
  }
});

/**
 * GET /api/liveness/verified/:userId
 * Check if user is verified
 */
router.get("/verified/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const verified = await livenessService.isUserVerified(userId);

    res.json({
      success: true,
      userId,
      verified,
    });
  } catch (error: any) {
    console.error("Error checking user verification status:", error);
    res.status(500).json({ error: error.message || "Failed to check verification status" });
  }
});

/**
 * POST /api/liveness/require-verification/:userId
 * Require liveness verification for user
 */
router.post("/require-verification/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    await livenessService.requireVerification(userId);

    res.json({
      success: true,
      message: "User marked for liveness verification",
      userId,
    });
  } catch (error: any) {
    console.error("Error requiring verification:", error);
    res.status(500).json({ error: error.message || "Failed to require verification" });
  }
});

export default router;
