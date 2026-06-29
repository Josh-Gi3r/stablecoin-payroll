import db from "../db/index.js";
import * as s from "../db/schema.js";
import { eq } from "drizzle-orm";
import {
  calculateMalaysia,
  type MyEmployeeContext,
  type Nationality as MyNationality,
  type AgeGroup as MyAgeGroup,
  type PcbCategory,
} from "./statutory/my.js";
import {
  calculateSingapore,
  ageOnFirstOfMonth,
  type SgEmployeeContext,
  type SgNationality,
  type SgWorkPass,
} from "./statutory/sg.js";

export interface StatutoryCalculation {
  epf?: number;
  cpf?: number;
  cpfEmployee?: number;
  cpfEmployer?: number;
  withholdingTax?: number;
  socialSecurity?: number;
  medicare?: number;
  federalTax?: number;
  stateTax?: number;
  zakat?: number;
  cp38?: number;
  hrdf?: number;
  // Asia-Pacific additions
  bpjsKetenagakerjaan?: number; // ID — employment social security
  bpjsKesehatan?: number;       // ID — national health insurance
  ssf?: number;                  // TH — Social Security Fund
  nps?: number;                  // KR — National Pension Service
  nhi?: number;                  // KR — National Health Insurance
  koseiNenkin?: number;          // JP — employees pension
  kenkoHoken?: number;           // JP — health insurance
  totalDeductions: number;
}

/**
 * Statutory contribution auto-calculation service
 */
export class StatutoryService {
  /**
   * Calculate statutory deductions for Malaysia.
   *
   * Routes through the Phase-2 engine in `./statutory/my` which implements:
   *   - EPF foreign-worker 2%/2% (post-Oct 2025)
   *   - EPF age 60+ split (0% EE, 4% ER)
   *   - SOCSO Cat 1 / Cat 2 with RM 6,000 cap (Oct 2024)
   *   - EIS 0.2%/0.2% with RM 6,000 cap, citizens+PR + age <60 only
   *   - HRD Corp 1% employer levy when employer is registered
   *   - PCB MTD with KA1/KA2/KA3 reliefs + child relief + zakat/CP38 offsets
   */
  async calculateMalaysianDeductions(
    employeeId: string,
    grossPay: number,
    _payFrequency: string,
  ): Promise<StatutoryCalculation> {
    const ctx = await this.loadMyContext(employeeId);
    const r = calculateMalaysia(grossPay, ctx);

    return {
      epf: r.epfEmployee,
      socialSecurity: r.socsoEmployee,
      hrdf: r.hrdfEmployer,
      withholdingTax: r.pcb,
      zakat: r.zakat,
      cp38: r.cp38,
      totalDeductions: r.totalEmployeeDeductions,
    };
  }

  private async loadMyContext(employeeId: string): Promise<MyEmployeeContext> {
    const rows = await db
      .select()
      .from(s.employees)
      .where(eq(s.employees.id, employeeId))
      .limit(1);
    const emp = rows[0];
    if (!emp) {
      // Sensible defaults for orphaned IDs (e.g. demo data without a row).
      return {
        nationality: 'malaysian',
        ageGroup: 'below_60',
        pcbCategory: 'KA1',
        zakatMonthly: 0,
        cp38Amount: 0,
        hrdfEligible: true,
      };
    }
    return {
      nationality: (emp.nationality ?? 'malaysian') as MyNationality,
      ageGroup: (emp.ageGroup ?? 'below_60') as MyAgeGroup,
      pcbCategory: (emp.taxCategory ?? 'KA1') as PcbCategory,
      zakatMonthly: emp.zakatMonthly ?? 0,
      cp38Amount: emp.cp38Amount ?? 0,
      hrdfEligible: emp.hrdfEligible ?? true,
    };
  }

  /**
   * Calculate statutory deductions for Singapore.
   *
   * Routes through the Phase-2 engine in `./statutory/sg` which implements:
   *   - CPF age-band rate table (5 bands × 3 nationalities)
   *   - Ordinary Wage ceiling S$8,000/month (2026)
   *   - Annual Wage ceiling S$102,000 with rolling YTD-OW deduction
   *   - SDL 0.25% capped at S$11.25 (min S$2)
   *   - FWL by pass type (S Pass / Work Permit)
   */
  async calculateSingaporeanDeductions(
    employeeId: string,
    grossPay: number,
    _payFrequency: string,
  ): Promise<StatutoryCalculation> {
    const ctx = await this.loadSgContext(employeeId);
    const r = calculateSingapore(
      { ordinaryWage: grossPay, additionalWage: 0 },
      ctx,
    );
    return {
      cpf: r.cpfEmployee,
      cpfEmployee: r.cpfEmployee,
      cpfEmployer: r.cpfEmployer,
      totalDeductions: r.totalEmployeeDeductions,
    };
  }

  private async loadSgContext(employeeId: string): Promise<SgEmployeeContext> {
    const rows = await db
      .select()
      .from(s.employees)
      .where(eq(s.employees.id, employeeId))
      .limit(1);
    const emp = rows[0];
    // Fallbacks: SG employee schema doesn't yet carry DOB/work-pass/PR-year, so
    // we derive nationality from `nationality` enum + ageGroup (below_60 → 30,
    // above_60 → 65 as proxy). When the SG-specific fields land, swap to those.
    const isCitizenOrPr = emp ? emp.nationality !== 'foreign' : true;
    return {
      nationality: isCitizenOrPr ? 'citizen' : 'foreign',
      ageOnFirstOfMonth: emp?.ageGroup === 'above_60' ? 65 : 30,
      workPass: 'none',
      ytdOrdinaryWages: 0,
      ytdAdditionalWages: 0,
    };
  }

  /**
   * Calculate statutory deductions for USA
   */
  async calculateUsDeductions(
    employeeId: string,
    grossPay: number,
    payFrequency: string,
    state?: string
  ): Promise<StatutoryCalculation> {
    const calculation: StatutoryCalculation = {
      totalDeductions: 0,
    };

    // Social Security - 6.2% up to annual wage base
    const socialSecurityRate = 0.062;
    const socialSecurityWageBase = 168600 / 26; // Annual base / 26 pay periods
    calculation.socialSecurity = Math.min(grossPay, socialSecurityWageBase) * socialSecurityRate;
    calculation.totalDeductions += calculation.socialSecurity;

    // Medicare - 1.45%
    const medicareRate = 0.0145;
    calculation.medicare = grossPay * medicareRate;
    calculation.totalDeductions += calculation.medicare;

    // Federal income tax - simplified calculation
    const federalTaxRate = this.calculateFederalTaxRate(grossPay, payFrequency);
    calculation.federalTax = grossPay * federalTaxRate;
    calculation.totalDeductions += calculation.federalTax;

    // State income tax (varies by state)
    if (state) {
      const stateTaxRate = this.getStateTaxRate(state);
      calculation.stateTax = grossPay * stateTaxRate;
      calculation.totalDeductions += calculation.stateTax;
    }

    return calculation;
  }

  /**
   * Indonesia — BPJS Ketenagakerjaan (2% EE / 3.7% ER) + BPJS Kesehatan (1% EE / 4% ER).
   * Rates are the headline contribution splits for JHT + pensions + health;
   * production use should refine per program (JHT, JP, JKK, JKM, JKP, JK).
   */
  async calculateIndonesianDeductions(
    _employeeId: string,
    grossPay: number,
    _payFrequency: string,
  ): Promise<StatutoryCalculation> {
    const bpjsTk = grossPay * 0.02;
    const bpjsKes = grossPay * 0.01;
    return {
      bpjsKetenagakerjaan: bpjsTk,
      bpjsKesehatan: bpjsKes,
      totalDeductions: bpjsTk + bpjsKes,
    };
  }

  /**
   * Thailand — Social Security Fund (5% EE / 5% ER, capped at THB 15,000 base
   * → max 750/month each side).
   */
  async calculateThaiDeductions(
    _employeeId: string,
    grossPay: number,
    _payFrequency: string,
  ): Promise<StatutoryCalculation> {
    const ssfBase = Math.min(grossPay, 15000);
    const ssf = ssfBase * 0.05;
    return { ssf, totalDeductions: ssf };
  }

  /**
   * South Korea — NPS (4.5% EE / 4.5% ER) + NHI (3.545% EE / 3.545% ER).
   */
  async calculateKoreanDeductions(
    _employeeId: string,
    grossPay: number,
    _payFrequency: string,
  ): Promise<StatutoryCalculation> {
    const nps = grossPay * 0.045;
    const nhi = grossPay * 0.03545;
    return { nps, nhi, totalDeductions: nps + nhi };
  }

  /**
   * Japan — Kosei Nenkin (9.15% EE / 9.15% ER) + Kenko Hoken (~5% EE / ~5% ER).
   */
  async calculateJapaneseDeductions(
    _employeeId: string,
    grossPay: number,
    _payFrequency: string,
  ): Promise<StatutoryCalculation> {
    const kosei = grossPay * 0.0915;
    const kenko = grossPay * 0.05;
    return { koseiNenkin: kosei, kenkoHoken: kenko, totalDeductions: kosei + kenko };
  }

  /**
   * Calculate deductions based on country
   */
  async calculateDeductions(
    employeeId: string,
    grossPay: number,
    country: string,
    payFrequency: string
  ): Promise<StatutoryCalculation> {
    switch (country.toUpperCase()) {
      case "MY":
        return this.calculateMalaysianDeductions(employeeId, grossPay, payFrequency);
      case "SG":
        return this.calculateSingaporeanDeductions(employeeId, grossPay, payFrequency);
      case "US":
        return this.calculateUsDeductions(employeeId, grossPay, payFrequency);
      case "ID":
        return this.calculateIndonesianDeductions(employeeId, grossPay, payFrequency);
      case "TH":
        return this.calculateThaiDeductions(employeeId, grossPay, payFrequency);
      case "KR":
        return this.calculateKoreanDeductions(employeeId, grossPay, payFrequency);
      case "JP":
        return this.calculateJapaneseDeductions(employeeId, grossPay, payFrequency);
      default:
        return { totalDeductions: 0 };
    }
  }

  /**
   * Calculate US federal tax rate
   */
  private calculateFederalTaxRate(grossPay: number, payFrequency: string): number {
    // Simplified 2024 federal tax brackets (single filer)
    // This is a rough approximation
    const annualizedIncome = this.annualizeIncome(grossPay, payFrequency);

    if (annualizedIncome <= 11000) return 0.1;
    if (annualizedIncome <= 44725) return 0.12;
    if (annualizedIncome <= 95375) return 0.22;
    if (annualizedIncome <= 182100) return 0.24;
    if (annualizedIncome <= 231250) return 0.32;
    if (annualizedIncome <= 578125) return 0.35;
    return 0.37;
  }

  /**
   * Get US state tax rate
   */
  private getStateTaxRate(state: string): number {
    const stateTaxRates: Record<string, number> = {
      CA: 0.093,
      TX: 0, // No state income tax
      FL: 0, // No state income tax
      NY: 0.0685,
      IL: 0.0495,
      // Add more states as needed
    };

    return stateTaxRates[state.toUpperCase()] || 0.05; // Default 5%
  }

  /**
   * Annualize income based on pay frequency
   */
  private annualizeIncome(grossPay: number, payFrequency: string): number {
    const frequencyMultipliers: Record<string, number> = {
      weekly: 52,
      biweekly: 26,
      "semi-monthly": 24,
      monthly: 12,
      quarterly: 4,
      annual: 1,
    };

    const multiplier = frequencyMultipliers[payFrequency.toLowerCase()] || 12;
    return grossPay * multiplier;
  }

  /**
   * Store statutory rates in database
   */
  async storeStatutoryRates(
    country: 'MY' | 'SG' | 'US' | 'AU' | 'NZ' | 'GB' | 'CA' | 'HK' | 'TH' | 'ID' | 'PH',
    scheme: 'epf' | 'cpf' | 'federal_tax' | 'state_tax' | 'social_security' | 'medicare' | 'zakat' | 'hrdf' | 'cp38',
    employeeRate: number,
    employerRate: number,
    effectiveDate: string,
    endDate?: string,
  ): Promise<void> {
    const now = new Date().toISOString();
    await db.insert(s.statutoryRates).values({
      id: `rate-${Date.now()}`,
      country,
      scheme,
      employeeRate,
      employerRate,
      effectiveDate,
      endDate,
      createdAt: now,
      updatedAt: now,
    });
  }

  async getStatutoryRates(country: string, scheme?: string) {
    const rows = await db
      .select()
      .from(s.statutoryRates)
      .where(eq(s.statutoryRates.country, country as any));
    if (scheme) return rows.filter((r) => r.scheme === scheme);
    return rows;
  }

  async updateStatutoryRate(rateId: string, employeeRate: number, endDate?: string): Promise<void> {
    await db
      .update(s.statutoryRates)
      .set({
        employeeRate,
        endDate,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(s.statutoryRates.id, rateId));
  }

  async deactivateStatutoryRate(rateId: string): Promise<void> {
    await db
      .update(s.statutoryRates)
      .set({
        endDate: new Date().toISOString().slice(0, 10),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(s.statutoryRates.id, rateId));
  }
}

// Export singleton instance
export const statutoryService = new StatutoryService();
