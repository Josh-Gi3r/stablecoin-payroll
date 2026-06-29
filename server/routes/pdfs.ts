import express from "express";
import { PDFService } from "../services/pdf.js";
import db from "../db/index.js";
import * as s from "../db/schema.js";
import { eq } from "drizzle-orm";

const router = express.Router();
const pdfService = new PDFService();

/**
 * POST /api/pdfs/payslip/:payslipId
 * Generate payslip PDF and upload to S3
 */
router.post("/payslip/:payslipId", async (req, res) => {
  try {
    const { payslipId } = req.params;

    // Generate PDF
    const pdfBuffer = await pdfService.generatePayslip(payslipId);

    // Upload to S3
    const s3Url = await pdfService.uploadPdfToS3(pdfBuffer, "payslip", payslipId, "payslip");

    res.json({
      success: true,
      pdfType: "payslip",
      entityId: payslipId,
      s3Url,
      generatedAt: new Date(),
    });
  } catch (error: any) {
    console.error("Error generating payslip PDF:", error);
    res.status(500).json({ error: error.message || "Failed to generate payslip PDF" });
  }
});

/**
 * POST /api/pdfs/contract/:contractId
 * Generate signed contract PDF (tripartite / employee info / termination) and upload to S3.
 */
router.post("/contract/:contractId", async (req, res) => {
  try {
    const { contractId } = req.params;
    const pdfBuffer = await pdfService.generateContract(contractId);
    const s3Url = await pdfService.uploadPdfToS3(pdfBuffer, "agreement", contractId, "contract");

    res.json({
      success: true,
      pdfType: "contract",
      entityId: contractId,
      s3Url,
      generatedAt: new Date(),
    });
  } catch (error: any) {
    console.error("Error generating contract PDF:", error);
    res.status(500).json({ error: error.message || "Failed to generate contract PDF" });
  }
});

/**
 * POST /api/pdfs/settlement/:settlementId
 * Generate settlement report PDF and upload to S3
 */
router.post("/settlement/:settlementId", async (req, res) => {
  try {
    const { settlementId } = req.params;

    // Generate PDF
    const pdfBuffer = await pdfService.generateSettlementReport(settlementId);

    // Upload to S3
    const s3Url = await pdfService.uploadPdfToS3(pdfBuffer, "report", settlementId, "settlement_report");

    res.json({
      success: true,
      pdfType: "settlement_report",
      entityId: settlementId,
      s3Url,
      generatedAt: new Date(),
    });
  } catch (error: any) {
    console.error("Error generating settlement report PDF:", error);
    res.status(500).json({ error: error.message || "Failed to generate settlement report PDF" });
  }
});

/**
 * POST /api/pdfs/batch-payslips/:payrollRunId
 * Generate batch payslips for a payroll run
 */
router.post("/batch-payslips/:payrollRunId", async (req, res) => {
  try {
    const { payrollRunId } = req.params;

    // Generate batch PDFs
    const pdfMap = await pdfService.generateBatchPayslips(payrollRunId);

    // Upload all PDFs to S3
    const results = [];
    for (const [payslipId, pdfBuffer] of Array.from(pdfMap)) {
      try {
        const s3Url = await pdfService.uploadPdfToS3(pdfBuffer, "payslip", payslipId, "payslip");
        results.push({
          payslipId,
          s3Url,
          status: "success",
        });
      } catch (error: any) {
        results.push({
          payslipId,
          status: "failed",
          error: error.message,
        });
      }
    }

    res.json({
      success: true,
      payrollRunId,
      totalGenerated: pdfMap.size,
      results,
      generatedAt: new Date(),
    });
  } catch (error: any) {
    console.error("Error generating batch payslips:", error);
    res.status(500).json({ error: error.message || "Failed to generate batch payslips" });
  }
});

/**
 * GET /api/pdfs/:pdfId/download
 * Get signed URL for PDF download
 */
router.get("/:pdfId/download", async (req, res) => {
  try {
    const { pdfId } = req.params;

    // Get signed URL
    const signedUrl = await pdfService.getPdfSignedUrl(pdfId);

    res.json({
      success: true,
      pdfId,
      signedUrl,
      expiresIn: 3600, // 1 hour
    });
  } catch (error: any) {
    console.error("Error getting PDF signed URL:", error);
    res.status(404).json({ error: error.message || "PDF not found" });
  }
});

/**
 * GET /api/pdfs/user/:userId
 * List generated PDFs for a user
 */
router.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { pdfType, limit = "50", offset = "0" } = req.query;

    // Build query
    let query = db.select().from(s.generatedPdfs);

    if (pdfType) {
      // This would need to join with the entity tables to filter by user
      // For now, return all PDFs (in production, add proper user filtering)
    }

    const pdfs = await query.limit(parseInt(limit as string)).offset(parseInt(offset as string));

    res.json({
      success: true,
      userId,
      pdfs,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      total: pdfs.length,
    });
  } catch (error: any) {
    console.error("Error listing PDFs:", error);
    res.status(500).json({ error: error.message || "Failed to list PDFs" });
  }
});

/**
 * DELETE /api/pdfs/:pdfId
 * Delete a PDF (admin only)
 */
router.delete("/:pdfId", async (req, res) => {
  try {
    const { pdfId } = req.params;

    // Delete PDF
    await pdfService.deletePdf(pdfId);

    res.json({
      success: true,
      message: "PDF deleted successfully",
      pdfId,
    });
  } catch (error: any) {
    console.error("Error deleting PDF:", error);
    res.status(404).json({ error: error.message || "PDF not found" });
  }
});

export default router;
