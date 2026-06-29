import db from "../db/index.js";
import * as s from "../db/schema.js";
import { eq, and, gte, lte } from "drizzle-orm";

/**
 * Admin analytics & drill-down service.
 *
 * Scopes: we use `clientId` (the EOR client) as the primary scoping identity.
 * Legacy callers may pass a string called `companyId` — treated as the client.
 */
export class AdminAnalyticsService {
  private computeDeductions(p: typeof s.payslips.$inferSelect): number {
    return (
      (p.epfEmployee ?? 0) +
      (p.socsoEmployee ?? 0) +
      (p.eisEmployee ?? 0) +
      (p.pcbMtd ?? 0) +
      (p.zakat ?? 0) +
      (p.cp38 ?? 0) +
      (p.federalTax ?? 0) +
      (p.stateTax ?? 0) +
      (p.socialSecurityTax ?? 0) +
      (p.medicareTax ?? 0) +
      (p.healthInsuranceDeduction ?? 0) +
      (p.retirement401kDeduction ?? 0) +
      (p.otherDeductions ?? 0)
    );
  }

  async getPayrollSummary(clientId: string, startDate: string, endDate: string) {
    const payslips = await db
      .select()
      .from(s.payslips)
      .where(
        and(
          eq(s.payslips.clientId, clientId),
          gte(s.payslips.createdAt, startDate),
          lte(s.payslips.createdAt, endDate),
        ),
      );

    // Hydrate employee country via a single lookup map
    const empRows = await db.select().from(s.employees).where(eq(s.employees.clientId, clientId));
    const empById = new Map(empRows.map((e) => [e.id, e]));

    const summary = {
      totalPayslips: payslips.length,
      totalGrossPay: 0,
      totalNetPay: 0,
      totalDeductions: 0,
      averageGrossPay: 0,
      averageNetPay: 0,
      byCountry: {} as Record<string, any>,
      byCurrency: {} as Record<string, any>,
    };

    const countryMap = new Map<string, { count: number; totalGrossPay: number; totalNetPay: number; totalDeductions: number }>();
    const currencyMap = new Map<string, { count: number; totalGrossPay: number; totalNetPay: number }>();

    for (const payslip of payslips) {
      const deductions = this.computeDeductions(payslip);
      summary.totalGrossPay += payslip.grossPay;
      summary.totalNetPay += payslip.netPay;
      summary.totalDeductions += deductions;

      const country = empById.get(payslip.employeeId)?.country ?? 'UNKNOWN';
      const countryData = countryMap.get(country) ?? { count: 0, totalGrossPay: 0, totalNetPay: 0, totalDeductions: 0 };
      countryData.count++;
      countryData.totalGrossPay += payslip.grossPay;
      countryData.totalNetPay += payslip.netPay;
      countryData.totalDeductions += deductions;
      countryMap.set(country, countryData);

      const currencyData = currencyMap.get(payslip.currency) ?? { count: 0, totalGrossPay: 0, totalNetPay: 0 };
      currencyData.count++;
      currencyData.totalGrossPay += payslip.grossPay;
      currencyData.totalNetPay += payslip.netPay;
      currencyMap.set(payslip.currency, currencyData);
    }

    summary.byCountry = Object.fromEntries(countryMap);
    summary.byCurrency = Object.fromEntries(currencyMap);
    summary.averageGrossPay = payslips.length > 0 ? summary.totalGrossPay / payslips.length : 0;
    summary.averageNetPay = payslips.length > 0 ? summary.totalNetPay / payslips.length : 0;

    return summary;
  }

  async getPayrollRunDetails(payrollRunId: string) {
    const [run] = await db.select().from(s.payrollRuns).where(eq(s.payrollRuns.id, payrollRunId));
    if (!run) throw new Error(`Payroll run not found: ${payrollRunId}`);

    const payslips = await db
      .select()
      .from(s.payslips)
      .where(eq(s.payslips.payrollRunId, payrollRunId));

    const details = [];
    for (const payslip of payslips) {
      const [employee] = await db
        .select()
        .from(s.employees)
        .where(eq(s.employees.id, payslip.employeeId));
      if (employee) details.push({ payslip, employee });
    }

    return {
      payrollRun: run,
      payslips: details,
      totalPayslips: payslips.length,
      totalGrossPay: payslips.reduce((sum, p) => sum + p.grossPay, 0),
      totalNetPay: payslips.reduce((sum, p) => sum + p.netPay, 0),
      totalDeductions: payslips.reduce((sum, p) => sum + this.computeDeductions(p), 0),
    };
  }

  async getEmployeePayrollHistory(employeeId: string, limit = 50, offset = 0) {
    const payslips = await db
      .select()
      .from(s.payslips)
      .where(eq(s.payslips.employeeId, employeeId))
      .limit(limit)
      .offset(offset);

    const trends = {
      averageGrossPay: payslips.length > 0 ? payslips.reduce((sum, p) => sum + p.grossPay, 0) / payslips.length : 0,
      averageNetPay: payslips.length > 0 ? payslips.reduce((sum, p) => sum + p.netPay, 0) / payslips.length : 0,
      averageDeductions:
        payslips.length > 0
          ? payslips.reduce((sum, p) => sum + this.computeDeductions(p), 0) / payslips.length
          : 0,
    };

    return { payslips, trends, total: payslips.length };
  }

  /**
   * Deduction breakdown per payroll run — sums each deduction column across all
   * payslips in the run. Replaces the legacy "deductions JSON" shape.
   */
  async getDeductionBreakdown(payrollRunId: string) {
    const payslips = await db
      .select()
      .from(s.payslips)
      .where(eq(s.payslips.payrollRunId, payrollRunId));

    const keys: (keyof typeof s.payslips.$inferSelect)[] = [
      'epfEmployee', 'socsoEmployee', 'eisEmployee', 'pcbMtd',
      'zakat', 'cp38', 'federalTax', 'stateTax',
      'socialSecurityTax', 'medicareTax',
      'healthInsuranceDeduction', 'retirement401kDeduction', 'otherDeductions',
    ];

    const breakdown: Record<string, number> = {};
    for (const k of keys) breakdown[k as string] = 0;
    for (const p of payslips) {
      for (const k of keys) {
        breakdown[k as string] += (p as any)[k] ?? 0;
      }
    }
    return breakdown;
  }

  async getSettlementAnalytics(_clientId: string, startDate: string, endDate: string) {
    const settlements = await db
      .select()
      .from(s.settlementTransactions)
      .where(
        and(
          gte(s.settlementTransactions.createdAt, startDate),
          lte(s.settlementTransactions.createdAt, endDate),
        ),
      );

    const analytics = {
      totalSettlements: settlements.length,
      totalAmount: 0,
      byStatus: {} as Record<string, number>,
      byCurrency: {} as Record<string, { count: number; totalAmount: number }>,
      averageFee: 0,
      totalFees: 0,
    };

    for (const settlement of settlements) {
      analytics.totalAmount += settlement.toAmount;
      analytics.totalFees += settlement.platformFee;

      analytics.byStatus[settlement.status] = (analytics.byStatus[settlement.status] ?? 0) + 1;

      const cc = analytics.byCurrency[settlement.toCurrency] ?? { count: 0, totalAmount: 0 };
      cc.count++;
      cc.totalAmount += settlement.toAmount;
      analytics.byCurrency[settlement.toCurrency] = cc;
    }

    analytics.averageFee = settlements.length > 0 ? analytics.totalFees / settlements.length : 0;
    return analytics;
  }

  async getEmployeeDistribution(clientId: string) {
    const employees = await db.select().from(s.employees).where(eq(s.employees.clientId, clientId));
    const distribution: Record<string, number> = {};
    for (const employee of employees) {
      const c = employee.country ?? 'UNKNOWN';
      distribution[c] = (distribution[c] ?? 0) + 1;
    }
    return distribution;
  }

  async getTopEarners(clientId: string, limit = 10) {
    const payslips = await db
      .select()
      .from(s.payslips)
      .where(eq(s.payslips.clientId, clientId));

    const earnings: Record<string, { totalGrossPay: number; count: number }> = {};
    for (const p of payslips) {
      const row = earnings[p.employeeId] ?? { totalGrossPay: 0, count: 0 };
      row.totalGrossPay += p.grossPay;
      row.count++;
      earnings[p.employeeId] = row;
    }

    return Object.entries(earnings)
      .map(([employeeId, data]) => ({
        employeeId,
        totalGrossPay: data.totalGrossPay,
        averageGrossPay: data.totalGrossPay / data.count,
        payslipsCount: data.count,
      }))
      .sort((a, b) => b.totalGrossPay - a.totalGrossPay)
      .slice(0, limit);
  }

  async getPayrollTrends(clientId: string, months = 12) {
    const trends: Record<string, any> = {};
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = date.toISOString().slice(0, 7); // YYYY-MM
      const start = new Date(date.getFullYear(), date.getMonth(), 1).toISOString();
      const end = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString();

      const payslips = await db
        .select()
        .from(s.payslips)
        .where(
          and(
            eq(s.payslips.clientId, clientId),
            gte(s.payslips.createdAt, start),
            lte(s.payslips.createdAt, end),
          ),
        );

      trends[monthKey] = {
        totalGrossPay: payslips.reduce((sum, p) => sum + p.grossPay, 0),
        totalNetPay: payslips.reduce((sum, p) => sum + p.netPay, 0),
        totalDeductions: payslips.reduce((sum, p) => sum + this.computeDeductions(p), 0),
        payslipsCount: payslips.length,
      };
    }
    return trends;
  }
}

export const adminAnalyticsService = new AdminAnalyticsService();
