// OCR and Receipt Processing Service
// Extracts data from receipts and categorizes expenses

export interface ReceiptData {
  id: string;
  vendor: string;
  date: string;
  amount: number;
  currency: string;
  category: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  tax: number;
  paymentMethod: string;
  confidence: number; // 0-100
  rawText?: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  keywords: string[];
  glAccount: string;
  glCode: string;
  taxable: boolean;
}

class OCRService {
  private receipts: ReceiptData[] = [];
  private categories: ExpenseCategory[] = [
    {
      id: 'office_supplies',
      name: 'Office Supplies',
      keywords: ['staples', 'office', 'pen', 'paper', 'supplies', 'stationery'],
      glAccount: 'Office Supplies Expense',
      glCode: '6200',
      taxable: false
    },
    {
      id: 'travel',
      name: 'Travel',
      keywords: ['uber', 'lyft', 'taxi', 'airline', 'hotel', 'airbnb', 'flight', 'travel', 'transit'],
      glAccount: 'Travel Expense',
      glCode: '6300',
      taxable: true
    },
    {
      id: 'meals',
      name: 'Meals & Entertainment',
      keywords: ['restaurant', 'cafe', 'coffee', 'lunch', 'dinner', 'food', 'pizza', 'burger', 'meal'],
      glAccount: 'Meals & Entertainment',
      glCode: '6400',
      taxable: true
    },
    {
      id: 'utilities',
      name: 'Utilities',
      keywords: ['electric', 'water', 'gas', 'internet', 'phone', 'utility', 'power'],
      glAccount: 'Utilities Expense',
      glCode: '6500',
      taxable: false
    },
    {
      id: 'software',
      name: 'Software & Subscriptions',
      keywords: ['software', 'subscription', 'saas', 'app', 'license', 'adobe', 'microsoft', 'slack'],
      glAccount: 'Software Expense',
      glCode: '6600',
      taxable: false
    }
  ];

  /**
   * Process receipt image/document
   */
  async processReceipt(file: {
    name: string;
    content: string; // base64 or raw text
    type: 'image' | 'pdf' | 'text';
  }): Promise<ReceiptData> {
    console.log(`📄 Processing receipt: ${file.name}`);

    // Mock OCR processing
    const mockReceipt = this.generateMockReceipt(file.name);

    // Auto-categorize
    mockReceipt.category = this.categorizeExpense(mockReceipt.vendor);

    this.receipts.push(mockReceipt);

    console.log(`✅ Receipt processed: ${mockReceipt.vendor} - $${mockReceipt.amount} (${mockReceipt.category})`);

    return mockReceipt;
  }

  /**
   * Generate mock receipt for demo
   */
  private generateMockReceipt(fileName: string): ReceiptData {
    const vendors = ['Starbucks', 'Amazon', 'Uber', 'United Airlines', 'Marriott', 'Whole Foods'];
    const vendor = vendors[Math.floor(Math.random() * vendors.length)];
    const amount = Math.round(Math.random() * 500 * 100) / 100;
    const tax = Math.round(amount * 0.08 * 100) / 100;

    return {
      id: `receipt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      vendor,
      date: new Date().toISOString().split('T')[0],
      amount,
      currency: 'USD',
      category: 'Uncategorized',
      items: [
        {
          description: `${vendor} Purchase`,
          quantity: 1,
          unitPrice: amount,
          total: amount
        }
      ],
      tax,
      paymentMethod: 'Credit Card',
      confidence: 85 + Math.random() * 15,
      rawText: `${vendor}\n${new Date().toLocaleDateString()}\nTotal: $${amount}\nTax: $${tax}`
    };
  }

  /**
   * Categorize expense based on vendor/description
   */
  private categorizeExpense(vendor: string): string {
    const vendorLower = vendor.toLowerCase();

    for (const category of this.categories) {
      for (const keyword of category.keywords) {
        if (vendorLower.includes(keyword)) {
          return category.name;
        }
      }
    }

    return 'Other';
  }

  /**
   * Get all receipts
   */
  getReceipts(filters?: {
    category?: string;
    startDate?: string;
    endDate?: string;
    minConfidence?: number;
  }): ReceiptData[] {
    let receipts = [...this.receipts];

    if (filters?.category) {
      receipts = receipts.filter(r => r.category === filters.category);
    }

    if (filters?.startDate) {
      receipts = receipts.filter(r => r.date >= filters.startDate!);
    }

    if (filters?.endDate) {
      receipts = receipts.filter(r => r.date <= filters.endDate!);
    }

    if (filters?.minConfidence) {
      receipts = receipts.filter(r => r.confidence >= filters.minConfidence!);
    }

    return receipts;
  }

  /**
   * Get receipt by ID
   */
  getReceipt(id: string): ReceiptData | undefined {
    return this.receipts.find(r => r.id === id);
  }

  /**
   * Update receipt category
   */
  updateReceiptCategory(id: string, category: string): ReceiptData | undefined {
    const receipt = this.receipts.find(r => r.id === id);
    if (receipt) {
      receipt.category = category;
    }
    return receipt;
  }

  /**
   * Delete receipt
   */
  deleteReceipt(id: string): boolean {
    const index = this.receipts.findIndex(r => r.id === id);
    if (index > -1) {
      this.receipts.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Get expense categories
   */
  getCategories(): ExpenseCategory[] {
    return this.categories;
  }

  /**
   * Add custom category
   */
  addCategory(category: Omit<ExpenseCategory, 'id'>): ExpenseCategory {
    const newCategory: ExpenseCategory = {
      id: `category_${Date.now()}`,
      ...category
    };
    this.categories.push(newCategory);
    return newCategory;
  }

  /**
   * Get expense summary by category
   */
  getExpenseSummary(startDate?: string, endDate?: string): {
    category: string;
    count: number;
    total: number;
    average: number;
  }[] {
    let receipts = [...this.receipts];

    if (startDate) {
      receipts = receipts.filter(r => r.date >= startDate);
    }

    if (endDate) {
      receipts = receipts.filter(r => r.date <= endDate);
    }

    const summary = new Map<string, { count: number; total: number }>();

    for (const receipt of receipts) {
      const category = receipt.category || 'Uncategorized';
      const current = summary.get(category) || { count: 0, total: 0 };
      current.count++;
      current.total += receipt.amount;
      summary.set(category, current);
    }

    return Array.from(summary.entries()).map(([category, data]) => ({
      category,
      count: data.count,
      total: data.total,
      average: data.total / data.count
    }));
  }

  /**
   * Get OCR statistics
   */
  getOCRStats(): {
    totalReceipts: number;
    averageConfidence: number;
    categorizedReceipts: number;
    uncategorizedReceipts: number;
    totalAmount: number;
  } {
    const totalReceipts = this.receipts.length;
    const averageConfidence = totalReceipts > 0
      ? this.receipts.reduce((sum, r) => sum + r.confidence, 0) / totalReceipts
      : 0;
    const categorizedReceipts = this.receipts.filter(r => r.category !== 'Uncategorized').length;
    const uncategorizedReceipts = this.receipts.filter(r => r.category === 'Uncategorized').length;
    const totalAmount = this.receipts.reduce((sum, r) => sum + r.amount, 0);

    return {
      totalReceipts,
      averageConfidence: Math.round(averageConfidence),
      categorizedReceipts,
      uncategorizedReceipts,
      totalAmount
    };
  }
}

export const ocrService = new OCRService();
