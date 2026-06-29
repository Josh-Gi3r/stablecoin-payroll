// Accounting Integration Service for Xero and QuickBooks
// Syncs GL entries, financial statements, and compliance data

export interface GLEntry {
  id: string;
  date: string;
  description: string;
  account: string;
  accountCode: string;
  debit: number;
  credit: number;
  reference: string;
  source: 'payroll' | 'invoicing' | 'expenses' | 'settlement' | 'treasury';
  externalId?: string;
}

export interface AccountingConnection {
  id: string;
  type: 'xero' | 'quickbooks';
  name: string;
  status: 'connected' | 'disconnected' | 'error';
  lastSync?: string;
  accessToken?: string;
  refreshToken?: string;
  tenantId?: string;
  realmId?: string;
}

class AccountingIntegrationService {
  private connections: AccountingConnection[] = [];
  private glEntries: GLEntry[] = [];
  private syncLog: Array<{
    timestamp: string;
    connection: string;
    status: 'success' | 'failed';
    entriesSynced: number;
    error?: string;
  }> = [];

  /**
   * Connect to Xero
   */
  connectXero(config: {
    name: string;
    clientId: string;
    clientSecret: string;
  }): AccountingConnection {
    const connection: AccountingConnection = {
      id: `xero_${Date.now()}`,
      type: 'xero',
      name: config.name,
      status: 'connected',
      lastSync: new Date().toISOString(),
      accessToken: 'mock_xero_token_' + Math.random().toString(36).substr(2, 9),
      tenantId: 'mock_tenant_' + Math.random().toString(36).substr(2, 9)
    };

    this.connections.push(connection);
    console.log(`✅ Connected to Xero: ${config.name}`);
    return connection;
  }

  /**
   * Connect to QuickBooks
   */
  connectQuickBooks(config: {
    name: string;
    clientId: string;
    clientSecret: string;
  }): AccountingConnection {
    const connection: AccountingConnection = {
      id: `qb_${Date.now()}`,
      type: 'quickbooks',
      name: config.name,
      status: 'connected',
      lastSync: new Date().toISOString(),
      accessToken: 'mock_qb_token_' + Math.random().toString(36).substr(2, 9),
      realmId: 'mock_realm_' + Math.random().toString(36).substr(2, 9)
    };

    this.connections.push(connection);
    console.log(`✅ Connected to QuickBooks: ${config.name}`);
    return connection;
  }

  /**
   * Get all accounting connections
   */
  getConnections(): AccountingConnection[] {
    return this.connections;
  }

  /**
   * Disconnect accounting system
   */
  disconnect(connectionId: string): boolean {
    const index = this.connections.findIndex(c => c.id === connectionId);
    if (index > -1) {
      this.connections.splice(index, 1);
      console.log(`❌ Disconnected: ${connectionId}`);
      return true;
    }
    return false;
  }

  /**
   * Create GL entry from transaction
   */
  createGLEntry(entry: Omit<GLEntry, 'id'>): GLEntry {
    const glEntry: GLEntry = {
      id: `gl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...entry
    };

    this.glEntries.push(glEntry);
    return glEntry;
  }

  /**
   * Create GL entries from payroll
   */
  createPayrollGLEntries(payrollData: {
    date: string;
    employeeCount: number;
    grossPay: number;
    taxes: number;
    deductions: number;
    netPay: number;
  }): GLEntry[] {
    const entries: GLEntry[] = [];

    // Salary expense
    entries.push(this.createGLEntry({
      date: payrollData.date,
      description: `Payroll - Gross Salary (${payrollData.employeeCount} employees)`,
      account: 'Salary Expense',
      accountCode: '6100',
      debit: payrollData.grossPay,
      credit: 0,
      reference: `PAYROLL_${payrollData.date}`,
      source: 'payroll'
    }));

    // Payroll liability
    entries.push(this.createGLEntry({
      date: payrollData.date,
      description: 'Payroll Payable',
      account: 'Payroll Payable',
      accountCode: '2100',
      debit: 0,
      credit: payrollData.netPay,
      reference: `PAYROLL_${payrollData.date}`,
      source: 'payroll'
    }));

    // Tax liability
    entries.push(this.createGLEntry({
      date: payrollData.date,
      description: 'Payroll Taxes Payable',
      account: 'Tax Payable',
      accountCode: '2110',
      debit: 0,
      credit: payrollData.taxes,
      reference: `PAYROLL_${payrollData.date}`,
      source: 'payroll'
    }));

    // Deductions
    if (payrollData.deductions > 0) {
      entries.push(this.createGLEntry({
        date: payrollData.date,
        description: 'Payroll Deductions',
        account: 'Deductions Payable',
        accountCode: '2120',
        debit: 0,
        credit: payrollData.deductions,
        reference: `PAYROLL_${payrollData.date}`,
        source: 'payroll'
      }));
    }

    return entries;
  }

  /**
   * Create GL entries from invoicing
   */
  createInvoicingGLEntries(invoiceData: {
    date: string;
    invoiceId: string;
    amount: number;
    currency: string;
    customer: string;
  }): GLEntry[] {
    const entries: GLEntry[] = [];

    // Revenue
    entries.push(this.createGLEntry({
      date: invoiceData.date,
      description: `Revenue - ${invoiceData.customer} (${invoiceData.currency})`,
      account: 'Revenue',
      accountCode: '4000',
      debit: invoiceData.amount,
      credit: 0,
      reference: invoiceData.invoiceId,
      source: 'invoicing'
    }));

    // Accounts receivable
    entries.push(this.createGLEntry({
      date: invoiceData.date,
      description: `Accounts Receivable - ${invoiceData.customer}`,
      account: 'Accounts Receivable',
      accountCode: '1200',
      debit: 0,
      credit: invoiceData.amount,
      reference: invoiceData.invoiceId,
      source: 'invoicing'
    }));

    return entries;
  }

  /**
   * Create GL entries from expenses
   */
  createExpenseGLEntries(expenseData: {
    date: string;
    expenseId: string;
    amount: number;
    category: string;
    description: string;
  }): GLEntry[] {
    const entries: GLEntry[] = [];

    const accountMap: { [key: string]: { account: string; code: string } } = {
      'Office Supplies': { account: 'Office Supplies Expense', code: '6200' },
      'Travel': { account: 'Travel Expense', code: '6300' },
      'Meals': { account: 'Meals & Entertainment', code: '6400' },
      'Utilities': { account: 'Utilities Expense', code: '6500' },
      'Other': { account: 'Miscellaneous Expense', code: '6900' }
    };

    const accountInfo = accountMap[expenseData.category] || accountMap['Other'];

    // Expense
    entries.push(this.createGLEntry({
      date: expenseData.date,
      description: expenseData.description,
      account: accountInfo.account,
      accountCode: accountInfo.code,
      debit: expenseData.amount,
      credit: 0,
      reference: expenseData.expenseId,
      source: 'expenses'
    }));

    // Cash/Bank
    entries.push(this.createGLEntry({
      date: expenseData.date,
      description: `Payment - ${expenseData.description}`,
      account: 'Cash',
      accountCode: '1000',
      debit: 0,
      credit: expenseData.amount,
      reference: expenseData.expenseId,
      source: 'expenses'
    }));

    return entries;
  }

  /**
   * Create GL entries from settlement
   */
  createSettlementGLEntries(settlementData: {
    date: string;
    transactionId: string;
    fromCurrency: string;
    toCurrency: string;
    fromAmount: number;
    toAmount: number;
    fee: number;
  }): GLEntry[] {
    const entries: GLEntry[] = [];

    // Settlement fee
    entries.push(this.createGLEntry({
      date: settlementData.date,
      description: `Platform Settlement Fee - ${settlementData.fromCurrency}/${settlementData.toCurrency}`,
      account: 'Settlement Fees',
      accountCode: '6800',
      debit: settlementData.fee,
      credit: 0,
      reference: settlementData.transactionId,
      source: 'settlement'
    }));

    // FX gain/loss
    const fxGainLoss = settlementData.toAmount - settlementData.fromAmount;
    if (fxGainLoss !== 0) {
      entries.push(this.createGLEntry({
        date: settlementData.date,
        description: `FX ${fxGainLoss > 0 ? 'Gain' : 'Loss'} - ${settlementData.fromCurrency}/${settlementData.toCurrency}`,
        account: fxGainLoss > 0 ? 'FX Gain' : 'FX Loss',
        accountCode: fxGainLoss > 0 ? '7000' : '6700',
        debit: fxGainLoss > 0 ? fxGainLoss : 0,
        credit: fxGainLoss > 0 ? 0 : Math.abs(fxGainLoss),
        reference: settlementData.transactionId,
        source: 'settlement'
      }));
    }

    return entries;
  }

  /**
   * Sync GL entries to accounting system
   */
  async syncToAccounting(connectionId: string): Promise<{ success: boolean; entriesSynced: number; error?: string }> {
    const connection = this.connections.find(c => c.id === connectionId);
    if (!connection) {
      return { success: false, entriesSynced: 0, error: 'Connection not found' };
    }

    try {
      console.log(`🔄 Syncing to ${connection.type.toUpperCase()}: ${connection.name}`);

      const unsyncedEntries = this.glEntries.filter(e => !e.externalId);
      let synced = 0;

      for (const entry of unsyncedEntries) {
        try {
          // Mock API call
          const externalId = `${connection.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          entry.externalId = externalId;
          synced++;

          console.log(`  ✓ Synced: ${entry.description} (${entry.accountCode})`);
        } catch (error) {
          console.error(`  ✗ Failed to sync: ${entry.description}`);
        }
      }

      connection.lastSync = new Date().toISOString();

      this.syncLog.push({
        timestamp: new Date().toISOString(),
        connection: connection.name,
        status: 'success',
        entriesSynced: synced
      });

      return { success: true, entriesSynced: synced };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';

      this.syncLog.push({
        timestamp: new Date().toISOString(),
        connection: connection.name,
        status: 'failed',
        entriesSynced: 0,
        error: errorMsg
      });

      return { success: false, entriesSynced: 0, error: errorMsg };
    }
  }

  /**
   * Get GL entries
   */
  getGLEntries(filters?: {
    source?: string;
    startDate?: string;
    endDate?: string;
    account?: string;
  }): GLEntry[] {
    let entries = [...this.glEntries];

    if (filters?.source) {
      entries = entries.filter(e => e.source === filters.source);
    }

    if (filters?.startDate) {
      entries = entries.filter(e => e.date >= filters.startDate!);
    }

    if (filters?.endDate) {
      entries = entries.filter(e => e.date <= filters.endDate!);
    }

    if (filters?.account) {
      entries = entries.filter(e => e.account === filters.account);
    }

    return entries;
  }

  /**
   * Get sync history
   */
  getSyncHistory(): typeof this.syncLog {
    return this.syncLog;
  }

  /**
   * Get sync statistics
   */
  getSyncStats(): {
    totalSyncs: number;
    successfulSyncs: number;
    failedSyncs: number;
    totalEntriesSynced: number;
  } {
    return {
      totalSyncs: this.syncLog.length,
      successfulSyncs: this.syncLog.filter(s => s.status === 'success').length,
      failedSyncs: this.syncLog.filter(s => s.status === 'failed').length,
      totalEntriesSynced: this.syncLog.reduce((sum, s) => sum + s.entriesSynced, 0)
    };
  }
}

export const accountingIntegrationService = new AccountingIntegrationService();
