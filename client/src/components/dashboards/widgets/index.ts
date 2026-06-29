/**
 * Reusable dashboard widgets composed by mode-aware ClientDashboard,
 * OperatorDashboard, and EmployeeDashboard.
 */
export { AnimatedNumber, Sparkline, GlassTooltip } from './utilities';
export { SettlementSavingsHero, type CorridorSaving, type ProtocolStat } from './SettlementSavingsHero';
export { KpiStrip, type KpiItem } from './KpiStrip';
export { PayrollCostTrend, type PayrollTrendPoint } from './PayrollCostTrend';
export { GrossToNetWaterfall, type WaterfallStep, type WaterfallType } from './GrossToNetWaterfall';
export { DepartmentBar, type DepartmentDatum } from './DepartmentBar';
export { CurrencyHoldings, type CurrencyHolding } from './CurrencyHoldings';
export { PendingApprovalsCard, type PendingApprovalItem } from './PendingApprovalsCard';
export { QuickActions, type QuickAction } from './QuickActions';
export { TopEarnersBubble, type BubbleItem } from './TopEarnersBubble';
export {
  StatutoryContributions,
  type StatutoryContributionItem,
  type StatutoryShareTile,
  type StatutoryDeadline,
} from './StatutoryContributions';
export { PlatformVsWiseSavings, type PlatformVsWiseRow } from './PlatformVsWiseSavings';
export { StatutoryFilingStatus, type FilingStatusRow, type FilingStatus } from './StatutoryFilingStatus';
export { RecentActivity, type RecentActivityItem } from './RecentActivity';
export { TrustDepositCard } from './TrustDepositCard';
export { PlatformInvoicesCard, type PlatformInvoiceItem } from './PlatformInvoicesCard';
export { NeedsYouCard, type NeedsYouAction } from './NeedsYouCard';
