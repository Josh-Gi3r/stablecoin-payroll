import PDFDocument from "pdfkit";
import db from "../db/index.js";
import * as s from "../db/schema.js";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { uploadDocument, getSignedDownloadUrl, deleteDocument } from "./s3.js";

export class PDFService {
  private async renderToBuffer(build: (doc: PDFKit.PDFDocument) => void): Promise<Buffer> {
    const doc = new PDFDocument({ size: "A4", margin: 40 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    return new Promise<Buffer>((resolve, reject) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);
      build(doc);
      doc.end();
    });
  }

  private sumDeductions(p: typeof s.payslips.$inferSelect): Record<string, number> {
    const fields: Record<string, number> = {
      'EPF (employee)': p.epfEmployee ?? 0,
      'SOCSO (employee)': p.socsoEmployee ?? 0,
      'EIS (employee)': p.eisEmployee ?? 0,
      'PCB / MTD': p.pcbMtd ?? 0,
      'Zakat': p.zakat ?? 0,
      'CP38': p.cp38 ?? 0,
      'Federal tax': p.federalTax ?? 0,
      'State tax': p.stateTax ?? 0,
      'Social security': p.socialSecurityTax ?? 0,
      'Medicare': p.medicareTax ?? 0,
      'Health insurance': p.healthInsuranceDeduction ?? 0,
      '401(k)': p.retirement401kDeduction ?? 0,
      'Other': p.otherDeductions ?? 0,
    };
    // Strip zero-valued rows for a tidy payslip
    return Object.fromEntries(Object.entries(fields).filter(([, v]) => v > 0));
  }

  async generatePayslip(payslipId: string): Promise<Buffer> {
    const [ps] = await db.select().from(s.payslips).where(eq(s.payslips.id, payslipId));
    if (!ps) throw new Error(`Payslip not found: ${payslipId}`);

    const [emp] = await db.select().from(s.employees).where(eq(s.employees.id, ps.employeeId));
    if (!emp) throw new Error(`Employee not found: ${ps.employeeId}`);

    const [run] = await db.select().from(s.payrollRuns).where(eq(s.payrollRuns.id, ps.payrollRunId));

    const deductions = this.sumDeductions(ps);
    const totalDeductions = Object.values(deductions).reduce((a, b) => a + b, 0);

    return this.renderToBuffer((doc) => {
      doc.fontSize(24).font("Helvetica-Bold").text("PAYSLIP", { align: "center" });
      doc.moveDown(0.5);

      doc.fontSize(10).font("Helvetica");
      doc.text(`Client: ${ps.clientId ?? '—'}`);
      doc.text(`Employee: ${emp.firstName} ${emp.lastName}`);
      doc.text(`Employee ID: ${emp.id}`);
      if (run) {
        doc.text(`Period: ${run.payPeriodStart} to ${run.payPeriodEnd}`);
        doc.text(`Pay date: ${run.payDate}`);
      }
      doc.moveDown(1);

      doc.fontSize(12).font("Helvetica-Bold").text("EARNINGS", { underline: true });
      doc.fontSize(10).font("Helvetica");
      doc.text(`Gross pay: ${ps.currency} ${ps.grossPay.toFixed(2)}`);
      doc.moveDown(0.5);

      doc.fontSize(12).font("Helvetica-Bold").text("DEDUCTIONS", { underline: true });
      doc.fontSize(10).font("Helvetica");
      for (const [label, amount] of Object.entries(deductions)) {
        doc.text(`${label}: ${ps.currency} ${amount.toFixed(2)}`);
      }
      doc.moveDown(0.5);

      doc.fontSize(12).font("Helvetica-Bold").text("SUMMARY", { underline: true });
      doc.fontSize(10).font("Helvetica");
      doc.text(`Gross pay: ${ps.currency} ${ps.grossPay.toFixed(2)}`);
      doc.text(`Total deductions: ${ps.currency} ${totalDeductions.toFixed(2)}`);
      doc.fontSize(11).font("Helvetica-Bold");
      doc.text(`Net pay: ${ps.currency} ${ps.netPay.toFixed(2)}`);

      doc.moveDown(1);
      doc
        .fontSize(8)
        .font("Helvetica")
        .fillColor("#666666")
        .text("This is an electronically generated payslip and does not require a signature.", { align: "center" });
    });
  }

  /**
   * Render a signed contract (tripartite / employee info / termination notice)
   * to PDF. Substitutes template variables, then appends the signature block.
   */
  async generateContract(contractId: string): Promise<Buffer> {
    const [contract] = await db.select().from(s.contracts).where(eq(s.contracts.id, contractId));
    if (!contract) throw new Error(`Contract not found: ${contractId}`);

    const [template] = await db
      .select()
      .from(s.contractTemplates)
      .where(eq(s.contractTemplates.id, contract.templateId));
    if (!template) throw new Error(`Template not found: ${contract.templateId}`);

    const { renderTemplate, buildContextForEmployee } = await import("./contracts.js");
    const ctx = contract.employeeId ? await buildContextForEmployee(contract.employeeId) : {};
    const body = renderTemplate(template.body, ctx);

    type Signature = {
      party: 'operator' | 'client' | 'employee';
      signerName: string;
      signerEmail: string;
      signedAt: string;
      ip?: string;
      method: string;
    };
    const signatures: Signature[] = contract.signatures ? JSON.parse(contract.signatures) : [];

    return this.renderToBuffer((doc) => {
      doc.fontSize(18).font("Helvetica-Bold").text(template.title, { align: "center" });
      doc.moveDown(0.5);
      doc.fontSize(9).font("Helvetica").fillColor("#666666")
        .text(`Version ${template.version} · Contract ${contract.id}`, { align: "center" });
      doc.moveDown(1);
      doc.fillColor("black");

      // Render the markdown-ish template body as paragraphs.
      const lines = body.split('\n');
      for (const line of lines) {
        if (line.startsWith('## ')) {
          doc.moveDown(0.4);
          doc.fontSize(12).font("Helvetica-Bold").text(line.replace(/^##\s+/, ''));
          doc.fontSize(10).font("Helvetica");
        } else if (line.startsWith('# ')) {
          doc.moveDown(0.4);
          doc.fontSize(14).font("Helvetica-Bold").text(line.replace(/^#\s+/, ''));
          doc.fontSize(10).font("Helvetica");
        } else if (line.startsWith('- ')) {
          doc.fontSize(10).font("Helvetica").text(`  • ${line.slice(2)}`);
        } else if (line.trim() === '---') {
          doc.moveDown(0.5);
          doc.strokeColor("#cccccc").moveTo(doc.x, doc.y).lineTo(555, doc.y).stroke();
          doc.moveDown(0.5);
        } else {
          doc.fontSize(10).font("Helvetica").text(line, { align: "left" });
        }
      }

      doc.moveDown(1.5);
      doc.fontSize(12).font("Helvetica-Bold").text("SIGNATURES", { underline: true });
      doc.fontSize(10).font("Helvetica");
      if (signatures.length === 0) {
        doc.fillColor("#666666").text("(Awaiting signatures)");
        doc.fillColor("black");
      } else {
        for (const sig of signatures) {
          doc.moveDown(0.3);
          doc.font("Helvetica-Bold").text(sig.party.toUpperCase());
          doc.font("Helvetica").text(`Signed by: ${sig.signerName} (${sig.signerEmail})`);
          doc.fillColor("#666666").text(
            `At: ${sig.signedAt}${sig.ip ? ` · IP: ${sig.ip}` : ''} · Method: ${sig.method}`,
          );
          doc.fillColor("black");
        }
      }

      doc.moveDown(2);
      doc
        .fontSize(8)
        .font("Helvetica")
        .fillColor("#999999")
        .text(`Rendered on ${new Date().toISOString()}`, { align: "center" });
    });
  }

  async generateSettlementReport(settlementId: string): Promise<Buffer> {
    const [sett] = await db
      .select()
      .from(s.settlementTransactions)
      .where(eq(s.settlementTransactions.id, settlementId));
    if (!sett) throw new Error(`Settlement not found: ${settlementId}`);

    return this.renderToBuffer((doc) => {
      doc.fontSize(16).font("Helvetica-Bold").text("SETTLEMENT REPORT", { align: "center" });
      doc.moveDown(1);
      doc.fontSize(10).font("Helvetica");
      doc.text(`Settlement ID: ${sett.id}`);
      doc.text(`Date: ${sett.createdAt}`);
      doc.text(`Status: ${sett.status}`);
      doc.moveDown(1);

      doc.fontSize(12).font("Helvetica-Bold").text("TRANSACTION SUMMARY", { underline: true });
      doc.fontSize(10).font("Helvetica");
      doc.text(`From: ${sett.fromCurrency}`);
      doc.text(`To: ${sett.toCurrency}`);
      doc.text(`Amount: ${sett.fromAmount.toFixed(2)} ${sett.fromCurrency}`);
      doc.text(`Received: ${sett.toAmount.toFixed(2)} ${sett.toCurrency}`);
      doc.moveDown(1);

      doc.fontSize(12).font("Helvetica-Bold").text("FX DETAILS", { underline: true });
      doc.fontSize(10).font("Helvetica");
      doc.text(`Exchange rate: ${sett.exchangeRate.toFixed(6)}`);
      doc.text(`Fee: ${sett.platformFee.toFixed(4)} ${sett.toCurrency}`);
      doc.text(`FX gain/loss: ${sett.fxGainLoss.toFixed(2)} ${sett.toCurrency}`);
      doc.moveDown(2);

      doc
        .fontSize(8)
        .font("Helvetica")
        .fillColor("#999999")
        .text(`Generated on ${new Date().toISOString()}`, { align: "center" });
    });
  }

  async generateBatchPayslips(payrollRunId: string): Promise<Map<string, Buffer>> {
    const payslips = await db.select().from(s.payslips).where(eq(s.payslips.payrollRunId, payrollRunId));
    const pdfMap = new Map<string, Buffer>();
    for (const payslip of payslips) {
      try {
        pdfMap.set(payslip.id, await this.generatePayslip(payslip.id));
      } catch (error) {
        console.error(`Failed to generate payslip ${payslip.id}:`, error);
      }
    }
    return pdfMap;
  }

  /**
   * Upload a generated PDF buffer to S3 and record it in generated_pdfs.
   */
  async uploadPdfToS3(
    pdfBuffer: Buffer,
    entityType: 'payslip' | 'agreement' | 'invoice' | 'report',
    entityId: string,
    pdfType: string,
    userId = 'system',
  ): Promise<string> {
    const fileName = `${entityType}-${entityId}-${Date.now()}.pdf`;
    const { s3Key, s3Url } = await uploadDocument(pdfBuffer, userId, entityType, fileName);

    await db.insert(s.generatedPdfs).values({
      id: `pdf-${nanoid(8)}`,
      entityType,
      entityId,
      pdfType,
      s3Key,
      s3Url,
      fileSize: pdfBuffer.length,
      generatedAt: new Date().toISOString(),
      downloadCount: 0,
    });

    return s3Url;
  }

  async getPdfSignedUrl(pdfId: string): Promise<string> {
    const [pdf] = await db.select().from(s.generatedPdfs).where(eq(s.generatedPdfs.id, pdfId));
    if (!pdf) throw new Error(`PDF not found: ${pdfId}`);
    await db
      .update(s.generatedPdfs)
      .set({ downloadCount: pdf.downloadCount + 1 })
      .where(eq(s.generatedPdfs.id, pdfId));
    return getSignedDownloadUrl(pdf.s3Key);
  }

  async deletePdf(pdfId: string): Promise<void> {
    const [pdf] = await db.select().from(s.generatedPdfs).where(eq(s.generatedPdfs.id, pdfId));
    if (!pdf) throw new Error(`PDF not found: ${pdfId}`);
    await deleteDocument(pdf.s3Key);
    await db.delete(s.generatedPdfs).where(eq(s.generatedPdfs.id, pdfId));
  }
}

export const pdfService = new PDFService();
