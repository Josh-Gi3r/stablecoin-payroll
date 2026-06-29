import express from "express";
import { eq, and, gte, lt } from "drizzle-orm";
import db from "../db/index.js";
import * as s from "../db/schema.js";
import { statutoryService } from "../services/statutory.js";
import { authMiddleware, requireRole, buildTenantScope } from "../middleware/auth.js";
import {
  exportLhdnPcb,
  exportKwspECaruman,
  exportPerkesoAssist,
  exportHrdCorpEtris,
  type MyEmployeeFilingRecord,
  type MyEmployerProfile,
  type MyFilingPeriod,
} from "../services/my-filings.js";

const router = express.Router();

/**
 * GET /api/statutory/filings
 * List the schemes a client should file for the current month, with status.
 *
 * Status logic is intentionally simple here — `filed` once a payroll run for
 * the period has been approved AND a manual proof-of-submission flag is set
 * (we don't have that yet, so for now: 'due_soon' if pay run approved this
 * month, 'overdue' if past 15th MY / 14th SG with no run, otherwise 'filed').
 *
 * Returns one row per (clientId, scheme) for the active scope. EOR + payroll
 * clients in MY get EPF, SOCSO+EIS, PCB, HRDF, WHT. SG clients get CPF, SDL,
 * FWL.
 */
router.get(
  "/filings",
  authMiddleware,
  async (req, res) => {
    try {
      const year = parseInt(String(req.query.year ?? new Date().getFullYear()), 10);
      const month = parseInt(String(req.query.month ?? (new Date().getMonth() + 1)), 10);
      if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
        return res.status(400).json({ error: "Invalid year/month" });
      }

      // Resolve target clients: super_admin sees all, others see their own.
      let targetClients: { id: string; name: string; country: 'MY' | 'SG'; mode: string }[];
      if (req.user?.role === "super_admin") {
        targetClients = await db.select().from(s.clients);
      } else if (req.user?.clientId) {
        targetClients = await db.select().from(s.clients).where(eq(s.clients.id, req.user.clientId));
      } else {
        return res.json([]);
      }

      // Determine status from the latest payroll run in the period.
      const periodStart = `${year}-${String(month).padStart(2, "0")}-01`;
      const nextMonth = month === 12 ? 1 : month + 1;
      const nextYear = month === 12 ? year + 1 : year;
      const periodEnd = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;

      const filings: any[] = [];
      const today = new Date();
      const dueDateMy = new Date(year, month, 15);  // 15th of next month
      const dueDateSg = new Date(year, month, 14);

      for (const client of targetClients) {
        const runsForPeriod = await db
          .select()
          .from(s.payrollRuns)
          .where(
            and(
              eq(s.payrollRuns.clientId, client.id),
              gte(s.payrollRuns.payDate, periodStart),
              lt(s.payrollRuns.payDate, periodEnd),
            ),
          );
        const approved = runsForPeriod.some((r) => r.status === "approved" || r.status === "paid" || r.status === "processed");
        const dueDate = client.country === "SG" ? dueDateSg : dueDateMy;
        const daysUntil = Math.floor((dueDate.getTime() - today.getTime()) / 86400000);
        const status =
          approved ? "filed"
            : daysUntil < 0 ? "overdue"
              : "due_soon";

        const schemes = client.country === "SG"
          ? [{ scheme: "CPF" }, { scheme: "SDL" }, { scheme: "FWL" }]
          : [{ scheme: "EPF (KWSP)" }, { scheme: "SOCSO + EIS" }, { scheme: "PCB (LHDN)" }, { scheme: "HRDF" }, { scheme: "WHT" }];

        for (const { scheme } of schemes) {
          filings.push({
            id: `F-${client.id}-${scheme}-${year}${String(month).padStart(2, "0")}`,
            client: client.name,
            clientId: client.id,
            scheme,
            country: client.country,
            amount: "—",
            dueDate: `${dueDate.getDate()} ${dueDate.toLocaleString("en", { month: "short" })} ${dueDate.getFullYear()}`,
            daysUntil,
            status,
          });
        }
      }

      res.json(filings);
    } catch (error: any) {
      console.error("Error listing filings:", error);
      res.status(500).json({ error: error.message || "Failed to list filings" });
    }
  },
);

/**
 * POST /api/statutory/calculate
 * Calculate statutory deductions for employee
 */
router.post("/calculate", async (req, res) => {
  try {
    const { employeeId, grossPay, country, payFrequency } = req.body;

    if (!employeeId || !grossPay || !country || !payFrequency) {
      return res.status(400).json({ error: "Missing required fields: employeeId, grossPay, country, payFrequency" });
    }

    const deductions = await statutoryService.calculateDeductions(employeeId, grossPay, country, payFrequency);

    res.json({
      success: true,
      employeeId,
      grossPay,
      country,
      deductions,
    });
  } catch (error: any) {
    console.error("Error calculating statutory deductions:", error);
    res.status(500).json({ error: error.message || "Failed to calculate deductions" });
  }
});

/**
 * POST /api/statutory/rates/store
 * Store statutory rates in database
 */
router.post("/rates/store", async (req, res) => {
  try {
    const { country, scheme, employeeRate, employerRate, effectiveDate, endDate } = req.body;

    if (!country || !scheme || employeeRate === undefined || employerRate === undefined || !effectiveDate) {
      return res.status(400).json({ error: "Missing required fields (country, scheme, employeeRate, employerRate, effectiveDate)" });
    }

    await statutoryService.storeStatutoryRates(
      country,
      scheme,
      Number(employeeRate),
      Number(employerRate),
      String(effectiveDate),
      endDate ? String(endDate) : undefined,
    );

    res.json({
      success: true,
      message: "Statutory rate stored",
      country,
      scheme,
      employeeRate,
      employerRate,
    });
  } catch (error: any) {
    console.error("Error storing statutory rate:", error);
    res.status(500).json({ error: error.message || "Failed to store rate" });
  }
});

/**
 * GET /api/statutory/rates/:country
 * Get statutory rates for country
 */
router.get("/rates/:country", async (req, res) => {
  try {
    const { country } = req.params;
    const { contributionType } = req.query;

    const rates = await statutoryService.getStatutoryRates(country, contributionType as string);

    res.json({
      success: true,
      country,
      contributionType: contributionType || "all",
      rates,
    });
  } catch (error: any) {
    console.error("Error getting statutory rates:", error);
    res.status(500).json({ error: error.message || "Failed to get rates" });
  }
});

/**
 * PATCH /api/statutory/rates/:rateId
 * Update statutory rate
 */
router.patch("/rates/:rateId", async (req, res) => {
  try {
    const { rateId } = req.params;
    const { employeeRate, endDate } = req.body;

    if (employeeRate === undefined) {
      return res.status(400).json({ error: "Missing required field: employeeRate" });
    }

    await statutoryService.updateStatutoryRate(rateId, Number(employeeRate), endDate ? String(endDate) : undefined);

    res.json({
      success: true,
      message: "Statutory rate updated",
      rateId,
      employeeRate,
    });
  } catch (error: any) {
    console.error("Error updating statutory rate:", error);
    res.status(500).json({ error: error.message || "Failed to update rate" });
  }
});

/**
 * DELETE /api/statutory/rates/:rateId
 * Deactivate statutory rate
 */
router.delete("/rates/:rateId", async (req, res) => {
  try {
    const { rateId } = req.params;

    await statutoryService.deactivateStatutoryRate(rateId);

    res.json({
      success: true,
      message: "Statutory rate deactivated",
      rateId,
    });
  } catch (error: any) {
    console.error("Error deactivating statutory rate:", error);
    res.status(500).json({ error: error.message || "Failed to deactivate rate" });
  }
});

/**
 * GET /api/statutory/filings/:format?year=2026&month=4
 *   format = lhdn-pcb | kwsp-ecaruman | perkeso-assist | hrdcorp-etris
 *
 * Builds the agency-specific filing file for the active client + period
 * by aggregating payslip rows. Tenant-scoped: only payslips belonging to
 * the caller's clientId/tenantId are included (super_admin sees all when
 * a clientId is passed via ?clientId=).
 */
router.get(
  "/filings/:format",
  authMiddleware,
  requireRole("super_admin", "client_admin", "finance", "hr"),
  async (req, res) => {
    try {
      const format = req.params.format as
        | "lhdn-pcb" | "kwsp-ecaruman" | "perkeso-assist" | "hrdcorp-etris";
      const year = parseInt(String(req.query.year ?? new Date().getFullYear()), 10);
      const month = parseInt(String(req.query.month ?? (new Date().getMonth() + 1)), 10);
      if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
        return res.status(400).json({ error: "Invalid year/month" });
      }

      // Resolve target client. Client-scoped users use their own; super_admin
      // may target a different client via ?clientId=.
      const targetClientId = req.user?.role === "super_admin"
        ? (req.query.clientId as string | undefined) ?? req.user?.clientId ?? null
        : req.user?.clientId ?? null;
      if (!targetClientId) {
        return res.status(400).json({ error: "clientId is required" });
      }

      const [client] = await db.select().from(s.clients).where(eq(s.clients.id, targetClientId));
      if (!client) return res.status(404).json({ error: "Client not found" });
      if (client.country !== "MY") {
        return res.status(400).json({ error: "MY filings only — client country is " + client.country });
      }

      // Pull payslips for the period.
      const periodStart = `${year}-${String(month).padStart(2, "0")}-01`;
      const nextMonth = month === 12 ? 1 : month + 1;
      const nextYear = month === 12 ? year + 1 : year;
      const periodEnd = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;
      const scope = buildTenantScope(req, {
        tenantId: s.payslips.tenantId,
        clientId: s.payslips.clientId,
      });
      const periodWhere = and(
        gte(s.payslips.createdAt, periodStart),
        lt(s.payslips.createdAt, periodEnd),
      );
      const where = scope ? and(periodWhere, scope, eq(s.payslips.clientId, targetClientId)) : and(periodWhere, eq(s.payslips.clientId, targetClientId));
      const slips = await db.select().from(s.payslips).where(where);

      // Map each payslip to a filing record by joining its employee.
      const records: MyEmployeeFilingRecord[] = [];
      for (const slip of slips) {
        const [emp] = await db.select().from(s.employees).where(eq(s.employees.id, slip.employeeId));
        if (!emp) continue;
        records.push({
          employeeId: emp.id,
          employeeName: `${emp.firstName} ${emp.lastName}`,
          nric: (emp as any).nric ?? "000000000000",
          grossWage: slip.grossPay ?? 0,
          epfEmployee: (slip as any).epf ?? 0,
          epfEmployer: (slip as any).epfEmployer ?? 0,
          socsoEmployee: (slip as any).socso ?? 0,
          socsoEmployer: (slip as any).socsoEmployer ?? 0,
          eisEmployee: (slip as any).eis ?? 0,
          eisEmployer: (slip as any).eisEmployer ?? 0,
          pcb: (slip as any).pcb ?? 0,
          hrdfEmployer: (slip as any).hrdf ?? 0,
          zakat: (slip as any).zakat ?? 0,
          cp38: (slip as any).cp38 ?? 0,
        });
      }

      const employer: MyEmployerProfile = {
        name: client.name,
        registrationNumber: client.registrationNumber ?? "",
        taxFileNumber: client.taxId ?? "",
        epfEmployerNumber: (client as any).epfEmployerNumber ?? "",
        socsoEmployerCode: (client as any).socsoEmployerCode ?? "",
        hrdfEmployerCode: (client as any).hrdfEmployerCode ?? "",
      };
      const period: MyFilingPeriod = { year, month };

      let content: string;
      let filename: string;
      let contentType = "text/plain; charset=utf-8";
      switch (format) {
        case "lhdn-pcb":
          content = exportLhdnPcb(employer, period, records);
          filename = `LHDN_PCB_${employer.taxFileNumber || "client"}_${year}${String(month).padStart(2, "0")}.txt`;
          break;
        case "kwsp-ecaruman":
          content = exportKwspECaruman(employer, period, records);
          filename = `KWSP_ECARUMAN_${employer.epfEmployerNumber || "client"}_${year}${String(month).padStart(2, "0")}.txt`;
          break;
        case "perkeso-assist":
          content = exportPerkesoAssist(employer, period, records);
          filename = `PERKESO_ASSIST_${employer.socsoEmployerCode || "client"}_${year}${String(month).padStart(2, "0")}.csv`;
          contentType = "text/csv; charset=utf-8";
          break;
        case "hrdcorp-etris":
          content = exportHrdCorpEtris(employer, period, records);
          filename = `HRDCORP_ETRIS_${employer.hrdfEmployerCode || "client"}_${year}${String(month).padStart(2, "0")}.csv`;
          contentType = "text/csv; charset=utf-8";
          break;
        default:
          return res.status(400).json({ error: "Unknown filing format: " + format });
      }

      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.send(content);
    } catch (error: any) {
      console.error("Error generating MY filing:", error);
      res.status(500).json({ error: error.message || "Failed to generate filing" });
    }
  },
);

export default router;
