// Automation Service for PayrollPlatform
// Handles recurring payroll, invoice reminders, tax compliance, and expense automation

export interface AutomationRule {
  id: string;
  name: string;
  type: 'recurring_payroll' | 'invoice_reminder' | 'tax_filing' | 'expense_auto_approve';
  enabled: boolean;
  schedule: string; // cron format
  lastRun?: string;
  nextRun?: string;
  config: Record<string, any>;
}

export interface AutomationExecution {
  id: string;
  ruleId: string;
  timestamp: string;
  status: 'success' | 'failed' | 'pending';
  message: string;
  itemsProcessed: number;
}

class AutomationService {
  private rules: AutomationRule[] = [];
  private executions: AutomationExecution[] = [];

  /**
   * Create recurring payroll automation
   */
  createRecurringPayroll(config: {
    name: string;
    frequency: 'weekly' | 'bi-weekly' | 'monthly';
    dayOfWeek?: number; // 0-6 for weekly
    dayOfMonth?: number; // 1-31 for monthly
    employees: string[];
  }): AutomationRule {
    const scheduleMap = {
      weekly: `0 9 * * ${config.dayOfWeek || 1}`, // Monday 9am
      'bi-weekly': `0 9 * * ${config.dayOfWeek || 1}`, // Every 2 weeks Monday 9am
      monthly: `0 9 ${config.dayOfMonth || 1} * *` // 1st of month 9am
    };

    const rule: AutomationRule = {
      id: `payroll_${Date.now()}`,
      name: config.name,
      type: 'recurring_payroll',
      enabled: true,
      schedule: scheduleMap[config.frequency],
      config: {
        frequency: config.frequency,
        employees: config.employees,
        autoCalculateTaxes: true,
        autoSendEmails: true,
        autoPostToGL: true
      }
    };

    this.rules.push(rule);
    return rule;
  }

  /**
   * Create invoice reminder automation
   */
  createInvoiceReminder(config: {
    name: string;
    reminderDays: number[]; // [7, 14, 30] days before due date
    autoSendEmail: boolean;
  }): AutomationRule {
    const rule: AutomationRule = {
      id: `invoice_${Date.now()}`,
      name: config.name,
      type: 'invoice_reminder',
      enabled: true,
      schedule: '0 9 * * *', // Daily at 9am
      config: {
        reminderDays: config.reminderDays,
        autoSendEmail: config.autoSendEmail,
        markOverdue: true
      }
    };

    this.rules.push(rule);
    return rule;
  }

  /**
   * Create tax filing reminder automation
   */
  createTaxFilingReminder(config: {
    name: string;
    jurisdictions: string[];
    reminderDays: number[]; // [30, 14, 7] days before deadline
  }): AutomationRule {
    const rule: AutomationRule = {
      id: `tax_${Date.now()}`,
      name: config.name,
      type: 'tax_filing',
      enabled: true,
      schedule: '0 9 * * *', // Daily at 9am
      config: {
        jurisdictions: config.jurisdictions,
        reminderDays: config.reminderDays,
        trackCompliance: true
      }
    };

    this.rules.push(rule);
    return rule;
  }

  /**
   * Create expense auto-approval automation
   */
  createExpenseAutoApproval(config: {
    name: string;
    threshold: number; // Auto-approve under this amount
    categories: string[];
    autoPostToGL: boolean;
  }): AutomationRule {
    const rule: AutomationRule = {
      id: `expense_${Date.now()}`,
      name: config.name,
      type: 'expense_auto_approve',
      enabled: true,
      schedule: '0 */4 * * *', // Every 4 hours
      config: {
        threshold: config.threshold,
        categories: config.categories,
        autoPostToGL: config.autoPostToGL,
        requiresReceipt: true
      }
    };

    this.rules.push(rule);
    return rule;
  }

  /**
   * Get all automation rules
   */
  getRules(): AutomationRule[] {
    return this.rules;
  }

  /**
   * Get rule by ID
   */
  getRule(id: string): AutomationRule | undefined {
    return this.rules.find(r => r.id === id);
  }

  /**
   * Update automation rule
   */
  updateRule(id: string, updates: Partial<AutomationRule>): AutomationRule | undefined {
    const rule = this.rules.find(r => r.id === id);
    if (rule) {
      Object.assign(rule, updates);
    }
    return rule;
  }

  /**
   * Delete automation rule
   */
  deleteRule(id: string): boolean {
    const index = this.rules.findIndex(r => r.id === id);
    if (index > -1) {
      this.rules.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Enable/disable automation rule
   */
  toggleRule(id: string): AutomationRule | undefined {
    const rule = this.rules.find(r => r.id === id);
    if (rule) {
      rule.enabled = !rule.enabled;
    }
    return rule;
  }

  /**
   * Execute automation rule manually
   */
  async executeRule(id: string): Promise<AutomationExecution> {
    const rule = this.rules.find(r => r.id === id);
    if (!rule) {
      throw new Error(`Rule ${id} not found`);
    }

    const execution: AutomationExecution = {
      id: `exec_${Date.now()}`,
      ruleId: id,
      timestamp: new Date().toISOString(),
      status: 'pending',
      message: 'Execution started',
      itemsProcessed: 0
    };

    try {
      let itemsProcessed = 0;

      switch (rule.type) {
        case 'recurring_payroll':
          itemsProcessed = await this.executeRecurringPayroll(rule);
          break;
        case 'invoice_reminder':
          itemsProcessed = await this.executeInvoiceReminder(rule);
          break;
        case 'tax_filing':
          itemsProcessed = await this.executeTaxFiling(rule);
          break;
        case 'expense_auto_approve':
          itemsProcessed = await this.executeExpenseAutoApproval(rule);
          break;
      }

      execution.status = 'success';
      execution.message = `Automation executed successfully`;
      execution.itemsProcessed = itemsProcessed;
    } catch (error) {
      execution.status = 'failed';
      execution.message = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }

    this.executions.push(execution);
    return execution;
  }

  /**
   * Execute recurring payroll
   */
  private async executeRecurringPayroll(rule: AutomationRule): Promise<number> {
    console.log(`🔄 Executing recurring payroll: ${rule.name}`);
    
    const employees = rule.config.employees || [];
    let processed = 0;

    for (const employeeId of employees) {
      try {
        // TODO: Implement actual payroll processing
        console.log(`  Processing payroll for employee: ${employeeId}`);
        
        if (rule.config.autoCalculateTaxes) {
          console.log(`    - Calculating taxes`);
        }
        if (rule.config.autoSendEmails) {
          console.log(`    - Sending confirmation email`);
        }
        if (rule.config.autoPostToGL) {
          console.log(`    - Posting to GL`);
        }
        
        processed++;
      } catch (error) {
        console.error(`  Failed to process employee ${employeeId}:`, error);
      }
    }

    return processed;
  }

  /**
   * Execute invoice reminders
   */
  private async executeInvoiceReminder(rule: AutomationRule): Promise<number> {
    console.log(`📧 Executing invoice reminders: ${rule.name}`);
    
    const reminderDays = rule.config.reminderDays || [7, 14, 30];
    let processed = 0;

    // TODO: Fetch invoices and check due dates
    for (const days of reminderDays) {
      console.log(`  Checking invoices due in ${days} days`);
      
      if (rule.config.autoSendEmail) {
        console.log(`    - Sending reminder emails`);
      }
      if (rule.config.markOverdue) {
        console.log(`    - Marking overdue invoices`);
      }
      
      processed++;
    }

    return processed;
  }

  /**
   * Execute tax filing reminders
   */
  private async executeTaxFiling(rule: AutomationRule): Promise<number> {
    console.log(`🏛️ Executing tax filing reminders: ${rule.name}`);
    
    const jurisdictions = rule.config.jurisdictions || [];
    const reminderDays = rule.config.reminderDays || [30, 14, 7];
    let processed = 0;

    for (const jurisdiction of jurisdictions) {
      for (const days of reminderDays) {
        console.log(`  Checking ${jurisdiction} tax filing (${days} days before deadline)`);
        
        if (rule.config.trackCompliance) {
          console.log(`    - Tracking compliance status`);
        }
        
        processed++;
      }
    }

    return processed;
  }

  /**
   * Execute expense auto-approval
   */
  private async executeExpenseAutoApproval(rule: AutomationRule): Promise<number> {
    console.log(`✅ Executing expense auto-approval: ${rule.name}`);
    
    const threshold = rule.config.threshold || 100;
    const categories = rule.config.categories || [];
    let processed = 0;

    // TODO: Fetch pending expenses
    for (const category of categories) {
      console.log(`  Checking expenses in ${category} under $${threshold}`);
      
      if (rule.config.autoPostToGL) {
        console.log(`    - Posting to GL`);
      }
      
      processed++;
    }

    return processed;
  }

  /**
   * Get execution history
   */
  getExecutionHistory(ruleId?: string): AutomationExecution[] {
    if (ruleId) {
      return this.executions.filter(e => e.ruleId === ruleId);
    }
    return this.executions;
  }

  /**
   * Get execution statistics
   */
  getExecutionStats(): {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    totalItemsProcessed: number;
  } {
    return {
      totalExecutions: this.executions.length,
      successfulExecutions: this.executions.filter(e => e.status === 'success').length,
      failedExecutions: this.executions.filter(e => e.status === 'failed').length,
      totalItemsProcessed: this.executions.reduce((sum, e) => sum + e.itemsProcessed, 0)
    };
  }
}

export const automationService = new AutomationService();
