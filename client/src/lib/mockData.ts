import { Employee, Customer, Invoice, Expense, Stablecoin, DashboardMetrics } from '@/types';

// ============================================================================
// MOCK EMPLOYEES
// ============================================================================

export const mockEmployees: Employee[] = [
  {
    id: 'emp-001',
    firstName: 'Sarah',
    lastName: 'Johnson',
    email: 'sarah.johnson@company.com',
    phone: '+1-555-0101',
    department: 'Engineering',
    position: 'Senior Software Engineer',
    employmentType: 'full-time',
    hireDate: new Date('2022-01-15'),
    status: 'active',
    salary: 120000,
    salaryType: 'salaried',
    payFrequency: 'bi-weekly',
    currency: 'USDC',
    ssn: '123-45-6789',
    taxFilingStatus: 'single',
    federalWithholding: 1200,
    stateWithholding: 400,
    bankAccountNumber: '1234567890',
    bankRoutingNumber: '021000021',
    bankAccountType: 'checking',
    healthInsurance: 500,
    retirement401k: 1000,
    otherDeductions: 0,
    emergencyContactName: 'John Johnson',
    emergencyContactPhone: '+1-555-0102',
    createdAt: new Date('2022-01-15'),
    updatedAt: new Date('2026-02-07'),
  },
  {
    id: 'emp-002',
    firstName: 'Michael',
    lastName: 'Chen',
    email: 'michael.chen@company.com',
    phone: '+1-555-0103',
    department: 'Product',
    position: 'Product Manager',
    employmentType: 'full-time',
    hireDate: new Date('2021-06-01'),
    status: 'active',
    salary: 110000,
    salaryType: 'salaried',
    payFrequency: 'bi-weekly',
    currency: 'USDC',
    ssn: '234-56-7890',
    taxFilingStatus: 'married',
    federalWithholding: 1100,
    stateWithholding: 350,
    bankAccountNumber: '0987654321',
    bankRoutingNumber: '021000021',
    bankAccountType: 'checking',
    healthInsurance: 600,
    retirement401k: 1200,
    otherDeductions: 0,
    emergencyContactName: 'Lisa Chen',
    emergencyContactPhone: '+1-555-0104',
    createdAt: new Date('2021-06-01'),
    updatedAt: new Date('2026-02-07'),
  },
];

// ============================================================================
// MOCK STABLECOINS
// ============================================================================

export const mockStablecoins: Stablecoin[] = [
  {
    id: 'usdc',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    chainId: 1,
    contractAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    issuer: 'Circle',
    currentPrice: 1.0,
    marketCap: 35000000000,
    volume24h: 8500000000,
    lastUpdated: new Date(),
  },
  {
    id: 'eurc',
    symbol: 'EURC',
    name: 'Euro Coin',
    decimals: 6,
    chainId: 1,
    contractAddress: '0x60a3E35Cc302bFA44Cb288Bc5a4F3873666a5a38',
    issuer: 'Circle',
    currentPrice: 1.08,
    marketCap: 2500000000,
    volume24h: 450000000,
    lastUpdated: new Date(),
  },
  {
    id: 'xsgd',
    symbol: 'XSGD',
    name: 'Singapore Dollar',
    decimals: 6,
    chainId: 1,
    contractAddress: '0x70e8dE73cE538DA2427A8f87cC2Efb3030d2d02E',
    issuer: 'Xfers',
    currentPrice: 0.74,
    marketCap: 500000000,
    volume24h: 85000000,
    lastUpdated: new Date(),
  },
];

export function getStablecoinBySymbol(symbol: string): Stablecoin | undefined {
  return mockStablecoins.find((coin) => coin.symbol === symbol);
}

// ============================================================================
// MOCK DASHBOARD METRICS
// ============================================================================

export const mockDashboardMetrics: DashboardMetrics = {
  payroll: {
    totalEmployees: 2,
    nextPayrollDate: new Date('2026-02-20'),
    totalPayrollCost: 230000,
    currency: 'USDC',
  },
  invoicing: {
    totalInvoices: 3,
    outstandingAmount: 23000,
    paidAmount: 35200,
    overdueAmount: 5000,
    overdueCount: 1,
  },
  expenses: {
    totalExpenses: 3,
    pendingApproval: 1,
    approvedAmount: 1750,
    reimbursedAmount: 1750,
  },
  treasury: {
    totalBalance: 500000,
    balanceByStablecoin: {
      USDC: 300000,
      EURC: 100000,
      XSGD: 75000,
    },
    totalYield: 2500,
    yieldRate: 0.05,
  },
  financials: {
    revenue: 58200,
    expenses: 2100,
    netIncome: 56100,
    cashFlow: 45000,
  },
};
