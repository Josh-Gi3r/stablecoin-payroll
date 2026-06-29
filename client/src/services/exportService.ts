import { mockEmployees, mockStablecoins, mockDashboardMetrics } from '../lib/mockData';

export interface ExportOptions {
  format: 'csv' | 'xlsx';
  includeHeaders: boolean;
  dateRange?: { start: Date; end: Date };
}

export class ExportService {
  /**
   * Export payroll data to CSV/Excel
   */
  static exportPayroll(options: ExportOptions): string {
    const headers = ['Employee ID', 'Name', 'Department', 'Salary', 'Currency', 'Tax Country', 'Status'];
    const rows = mockEmployees.map((emp: any) => [
      emp.id,
      emp.name,
      emp.department,
      emp.salary.toFixed(2),
      emp.currency,
      'US',
      emp.status
    ]);

    return this.formatData(headers, rows, options);
  }

  /**
   * Export invoices to CSV/Excel
   */
  static exportInvoices(options: ExportOptions): string {
    const headers = ['Invoice ID', 'Customer', 'Amount', 'Currency', 'Status', 'Due Date', 'Platform Fee', 'Wise Comparison'];
    const mockInvoices = [
      { id: 'INV-001', customer: 'Acme Corp', amount: 25000, currency: 'USDC', status: 'paid', dueDate: '2026-02-15' },
      { id: 'INV-002', customer: 'Tech Solutions', amount: 15000, currency: 'EURC', status: 'pending', dueDate: '2026-02-20' },
    ];
    const rows = mockInvoices.map((inv: any) => [
      inv.id,
      inv.customer,
      inv.amount.toFixed(2),
      inv.currency,
      inv.status,
      inv.dueDate,
      '$0.01',
      '97% savings vs Wise'
    ]);

    return this.formatData(headers, rows, options);
  }

  /**
   * Export expenses to CSV/Excel
   */
  static exportExpenses(options: ExportOptions): string {
    const headers = ['Expense ID', 'Category', 'Amount', 'Currency', 'Date', 'GL Account', 'Status'];
    const mockExpenses = [
      { id: 'EXP-001', category: 'Travel', amount: 1500, currency: 'USDC', date: '2026-02-01', glAccount: '6200', status: 'approved' },
      { id: 'EXP-002', category: 'Meals', amount: 250, currency: 'USDC', date: '2026-02-02', glAccount: '6210', status: 'pending' },
    ];
    const rows = mockExpenses.map((exp: any) => [
      exp.id,
      exp.category,
      exp.amount.toFixed(2),
      exp.currency,
      exp.date,
      exp.glAccount,
      exp.status
    ]);

    return this.formatData(headers, rows, options);
  }

  /**
   * Export transactions to CSV/Excel
   */
  static exportTransactions(options: ExportOptions): string {
    const headers = ['Transaction ID', 'Type', 'From Currency', 'To Currency', 'Amount', 'Received', 'Fee', 'Date', 'Status'];
    const mockTransactions = [
      { id: 'TXN-001', type: 'swap', fromCurrency: 'USDC', toCurrency: 'XSGD', amount: 10000, received: 13500, date: '2026-02-01', status: 'settled' },
      { id: 'TXN-002', type: 'send', fromCurrency: 'EURC', toCurrency: 'EURC', amount: 5000, received: 5000, date: '2026-02-02', status: 'settled' },
    ];
    const rows = mockTransactions.map((tx: any) => [
      tx.id,
      tx.type,
      tx.fromCurrency,
      tx.toCurrency,
      tx.amount.toFixed(2),
      tx.received.toFixed(2),
      '$0.01',
      tx.date,
      tx.status
    ]);

    return this.formatData(headers, rows, options);
  }

  /**
   * Export FX report to CSV/Excel
   */
  static exportFXReport(options: ExportOptions): string {
    const headers = ['Currency', 'Position', 'Average Rate', 'Current Rate', 'Unrealized Gain/Loss', 'Realized Gain/Loss'];
    const currencies = ['USDC', 'EURC', 'XSGD', 'JPYC', 'GBPC', 'AUDC'];
    const rows = currencies.map(curr => [
      curr,
      (Math.random() * 1000000).toFixed(2),
      (1 + Math.random() * 0.1).toFixed(4),
      (1 + Math.random() * 0.1).toFixed(4),
      (Math.random() * 10000 - 5000).toFixed(2),
      (Math.random() * 5000 - 2500).toFixed(2)
    ]);

    return this.formatData(headers, rows, options);
  }

  /**
   * Export accounting GL entries to CSV/Excel
   */
  static exportGLEntries(options: ExportOptions): string {
    const headers = ['Entry ID', 'Date', 'Account', 'Debit', 'Credit', 'Description', 'Reference'];
    const sampleEntries = [
      ['GL001', '2026-02-01', '1000 - Cash', '50000.00', '', 'Payroll Settlement', 'PAY-001'],
      ['GL002', '2026-02-01', '6100 - Salary Expense', '', '50000.00', 'Payroll Settlement', 'PAY-001'],
      ['GL003', '2026-02-02', '1000 - Cash', '25000.00', '', 'Invoice Payment', 'INV-001'],
      ['GL004', '2026-02-02', '4000 - Revenue', '', '25000.00', 'Invoice Payment', 'INV-001'],
    ];

    return this.formatData(headers, sampleEntries, options);
  }

  /**
   * Format data as CSV string
   */
  private static formatData(headers: string[], rows: (string | number)[][], options: ExportOptions): string {
    let csv = '';

    if (options.includeHeaders) {
      csv += headers.map(h => this.escapeCSV(h)).join(',') + '\n';
    }

    csv += rows.map(row =>
      row.map(cell => this.escapeCSV(String(cell))).join(',')
    ).join('\n');

    return csv;
  }

  /**
   * Escape CSV values
   */
  private static escapeCSV(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  /**
   * Download CSV file
   */
  static downloadCSV(data: string, filename: string): void {
    const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Download multiple files as ZIP (mock implementation)
   */
  static async downloadBatch(exports: { name: string; data: string }[], zipName: string): Promise<void> {
    // In production, would use a library like JSZip
    // For now, download each file individually
    for (const exp of exports) {
      this.downloadCSV(exp.data, `${exp.name}.csv`);
    }
  }
}
