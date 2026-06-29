// Multi-Currency FX Reporting Service
// Tracks FX gains/losses, revaluation, and compliance reporting

export interface FXTransaction {
  id: string;
  date: string;
  fromCurrency: string;
  toCurrency: string;
  fromAmount: number;
  toAmount: number;
  exchangeRate: number;
  transactionType: 'payroll' | 'invoice' | 'expense' | 'settlement';
  fxGainLoss: number;
  realized: boolean;
}

export interface CurrencyPosition {
  currency: string;
  quantity: number;
  costBasis: number;
  currentValue: number;
  unrealizedGainLoss: number;
  lastValuationDate: string;
}

export interface FXReport {
  reportDate: string;
  reportingCurrency: string;
  totalRealizedGainLoss: number;
  totalUnrealizedGainLoss: number;
  currencyPositions: CurrencyPosition[];
  transactions: FXTransaction[];
  complianceStatus: {
    country: string;
    requiresReporting: boolean;
    filingDeadline: string;
    status: 'pending' | 'filed' | 'completed';
  }[];
}

class FXReportingService {
  private transactions: FXTransaction[] = [];
  private positions: Map<string, CurrencyPosition> = new Map();
  private exchangeRates: Map<string, number> = new Map([
    ['USD/EUR', 0.92],
    ['USD/GBP', 0.79],
    ['USD/JPY', 149.50],
    ['USD/CAD', 1.36],
    ['USD/AUD', 1.53],
    ['USD/SGD', 1.34],
    ['USD/HKD', 7.81],
    ['USD/INR', 83.12],
    ['USD/MXN', 17.05],
    ['USD/BRL', 4.97]
  ]);

  /**
   * Record FX transaction
   */
  recordTransaction(transaction: Omit<FXTransaction, 'id' | 'fxGainLoss'>): FXTransaction {
    const fxGainLoss = transaction.toAmount - (transaction.fromAmount * transaction.exchangeRate);
    
    const newTransaction: FXTransaction = {
      id: `fx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...transaction,
      fxGainLoss
    };

    this.transactions.push(newTransaction);

    // Update positions
    this.updatePositions(newTransaction);

    console.log(`📊 FX Transaction recorded: ${transaction.fromCurrency} → ${transaction.toCurrency} (Gain/Loss: $${fxGainLoss.toFixed(2)})`);

    return newTransaction;
  }

  /**
   * Update currency positions
   */
  private updatePositions(transaction: FXTransaction): void {
    // Reduce from currency
    const fromPos = this.positions.get(transaction.fromCurrency) || {
      currency: transaction.fromCurrency,
      quantity: 0,
      costBasis: 0,
      currentValue: 0,
      unrealizedGainLoss: 0,
      lastValuationDate: new Date().toISOString().split('T')[0]
    };

    fromPos.quantity -= transaction.fromAmount;
    this.positions.set(transaction.fromCurrency, fromPos);

    // Increase to currency
    const toPos = this.positions.get(transaction.toCurrency) || {
      currency: transaction.toCurrency,
      quantity: 0,
      costBasis: 0,
      currentValue: 0,
      unrealizedGainLoss: 0,
      lastValuationDate: new Date().toISOString().split('T')[0]
    };

    toPos.quantity += transaction.toAmount;
    toPos.costBasis += transaction.fromAmount * transaction.exchangeRate;
    this.positions.set(transaction.toCurrency, toPos);
  }

  /**
   * Revalue positions at current rates
   */
  revaluePositions(currentRates: Map<string, number>): void {
    this.positions.forEach((position, currency) => {
      const rate = currentRates.get(`USD/${currency}`) || 1;
      position.currentValue = position.quantity / rate;
      position.unrealizedGainLoss = position.currentValue - position.costBasis;
      position.lastValuationDate = new Date().toISOString().split('T')[0];
    });
  }

  /**
   * Get FX gain/loss summary
   */
  getFXSummary(startDate?: string, endDate?: string): {
    realizedGainLoss: number;
    unrealizedGainLoss: number;
    totalGainLoss: number;
    transactionCount: number;
  } {
    let transactions = [...this.transactions];

    if (startDate) {
      transactions = transactions.filter(t => t.date >= startDate);
    }

    if (endDate) {
      transactions = transactions.filter(t => t.date <= endDate);
    }

    const realizedGainLoss = transactions
      .filter(t => t.realized)
      .reduce((sum, t) => sum + t.fxGainLoss, 0);

    let unrealizedGainLoss = 0;
    this.positions.forEach(pos => {
      unrealizedGainLoss += pos.unrealizedGainLoss;
    });

    return {
      realizedGainLoss,
      unrealizedGainLoss,
      totalGainLoss: realizedGainLoss + unrealizedGainLoss,
      transactionCount: transactions.length
    };
  }

  /**
   * Get FX report by country
   */
  getFXReport(reportingCurrency: string = 'USD', country?: string): FXReport {
    const complianceStatus = [
      { country: 'US', requiresReporting: true, filingDeadline: '2026-04-15', status: 'pending' as const },
      { country: 'UK', requiresReporting: true, filingDeadline: '2026-01-31', status: 'pending' as const },
      { country: 'Canada', requiresReporting: true, filingDeadline: '2026-06-15', status: 'pending' as const },
      { country: 'Australia', requiresReporting: true, filingDeadline: '2026-05-31', status: 'pending' as const },
      { country: 'Singapore', requiresReporting: true, filingDeadline: '2026-11-30', status: 'pending' as const }
    ];

    return {
      reportDate: new Date().toISOString().split('T')[0],
      reportingCurrency,
      totalRealizedGainLoss: this.getFXSummary().realizedGainLoss,
      totalUnrealizedGainLoss: this.getFXSummary().unrealizedGainLoss,
      currencyPositions: this.getPositions(),
      transactions: this.transactions,
      complianceStatus: country
        ? complianceStatus.filter(c => c.country === country)
        : complianceStatus
    };
  }

  /**
   * Get positions
   */
  getPositions(): CurrencyPosition[] {
    const positions: CurrencyPosition[] = [];
    this.positions.forEach(pos => positions.push(pos));
    return positions;
  }

  /**
   * Get transactions
   */
  getTransactions(filters?: {
    currency?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
  }): FXTransaction[] {
    let transactions = [...this.transactions];

    if (filters?.currency) {
      transactions = transactions.filter(
        t => t.fromCurrency === filters.currency || t.toCurrency === filters.currency
      );
    }

    if (filters?.type) {
      transactions = transactions.filter(t => t.transactionType === filters.type);
    }

    if (filters?.startDate) {
      transactions = transactions.filter(t => t.date >= filters.startDate!);
    }

    if (filters?.endDate) {
      transactions = transactions.filter(t => t.date <= filters.endDate!);
    }

    return transactions;
  }

  /**
   * Get exchange rate
   */
  getExchangeRate(fromCurrency: string, toCurrency: string): number {
    const key = `${fromCurrency}/${toCurrency}`;
    return this.exchangeRates.get(key) || 1;
  }

  /**
   * Update exchange rates
   */
  updateExchangeRates(rates: Map<string, number>): void {
    this.exchangeRates = rates;
  }

  /**
   * Get compliance report
   */
  getComplianceReport(country: string): {
    country: string;
    filingDeadline: string;
    totalGainLoss: number;
    currenciesInvolved: string[];
    transactionCount: number;
    status: string;
  } {
    const transactions = this.getTransactions();
    const currencies = new Set<string>();

    transactions.forEach(t => {
      currencies.add(t.fromCurrency);
      currencies.add(t.toCurrency);
    });

    return {
      country,
      filingDeadline: '2026-04-15',
      totalGainLoss: this.getFXSummary().totalGainLoss,
      currenciesInvolved: Array.from(currencies),
      transactionCount: transactions.length,
      status: 'pending'
    };
  }
}

export const fxReportingService = new FXReportingService();
