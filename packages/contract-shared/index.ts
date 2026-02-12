/**
 * @package shared
 *
 * Centralized utilities shared across the BUFI platform.
 * All formatting, navigation, status configs, badges, and mock data.
 */

// Formatting utilities
export {
  formatCurrency,
  formatNumber,
  formatDate,
  formatTime,
  formatAddress,
  formatPercent,
} from './format'

// Navigation helpers
export { getContractDestination } from './navigation'
export type { ContractStatus } from './navigation'

// Status configuration maps
export {
  contractStatusConfig,
  milestoneStatusConfig,
  transactionStatusConfig,
  disputeStatusConfig,
  submissionStatusConfig,
  getStatusEntry,
} from './status'
export type { StatusEntry } from './status'

// Reusable UI components
export {
  ContractStatusBadge,
  MilestoneStatusBadge,
  DisputeStatusBadge,
  StatusDot,
} from './components'

// Mock data (dev only)
export {
  mockContracts,
  mockDashboardStats,
  getMockContractById,
  getMockContractsByStatus,
} from './mock-data'
export type { MockContractListItem, MockDashboardStat } from './mock-data'
