/**
 * @package shared/mock-data
 * Single source of truth for all mock contract data.
 * Eliminates 3 duplicate mockContracts arrays across
 * contracts-list.tsx, contracts-widget.tsx, and active-contract-store.ts.
 *
 * In production, these are replaced by API calls.
 * For now, every component that needs mock data imports from here.
 */

import type { ContractStatus } from './navigation'

// ──────────────────────────────────────────
// Shared Mock Types
// ──────────────────────────────────────────

export interface MockContractListItem {
  id: string
  name: string
  status: ContractStatus
  payerName: string
  payeeName: string
  totalValue: number
  releasedValue: number
  milestonesTotal: number
  milestonesCompleted: number
  yieldEarned: number
  createdAt: Date
  updatedAt: Date
  currency: string
  templateType: string
  actionRequired?: string
}

export interface MockDashboardStat {
  label: string
  value: number | string
  change?: string
  changeType?: 'positive' | 'negative' | 'neutral'
}

// ──────────────────────────────────────────
// Mock Contracts
// ──────────────────────────────────────────

export const mockContracts: MockContractListItem[] = [
  {
    id: 'contract-1',
    name: 'Website Redesign',
    status: 'active',
    payerName: 'Alex Johnson',
    payeeName: 'Sarah Chen',
    totalValue: 15000,
    releasedValue: 5000,
    milestonesTotal: 4,
    milestonesCompleted: 1,
    yieldEarned: 23.45,
    createdAt: new Date('2025-12-01'),
    updatedAt: new Date('2026-01-20'),
    currency: 'USDC',
    templateType: 'freelance-service',
    actionRequired: 'Review milestone 2 submission',
  },
  {
    id: 'contract-2',
    name: 'Mobile App Development',
    status: 'pending-signatures',
    payerName: 'TechCorp Inc.',
    payeeName: 'DevStudio LLC',
    totalValue: 50000,
    releasedValue: 0,
    milestonesTotal: 6,
    milestonesCompleted: 0,
    yieldEarned: 0,
    createdAt: new Date('2026-01-15'),
    updatedAt: new Date('2026-01-28'),
    currency: 'USDC',
    templateType: 'software-development',
    actionRequired: 'Sign contract',
  },
  {
    id: 'contract-3',
    name: 'Brand Strategy Consulting',
    status: 'pending-funding',
    payerName: 'GrowthCo',
    payeeName: 'StrategyFirst',
    totalValue: 25000,
    releasedValue: 0,
    milestonesTotal: 3,
    milestonesCompleted: 0,
    yieldEarned: 0,
    createdAt: new Date('2026-01-20'),
    updatedAt: new Date('2026-01-25'),
    currency: 'USDC',
    templateType: 'consulting-retainer',
    actionRequired: 'Fund escrow',
  },
  {
    id: 'contract-4',
    name: 'Logo & Visual Identity',
    status: 'completed',
    payerName: 'StartupXYZ',
    payeeName: 'DesignPro Studio',
    totalValue: 8000,
    releasedValue: 8000,
    milestonesTotal: 3,
    milestonesCompleted: 3,
    yieldEarned: 15.72,
    createdAt: new Date('2025-10-05'),
    updatedAt: new Date('2025-12-15'),
    currency: 'USDC',
    templateType: 'freelance-service',
  },
  {
    id: 'contract-5',
    name: 'Content Marketing Package',
    status: 'disputed',
    payerName: 'MediaHouse',
    payeeName: 'ContentCreators',
    totalValue: 12000,
    releasedValue: 4000,
    milestonesTotal: 4,
    milestonesCompleted: 1,
    yieldEarned: 8.30,
    createdAt: new Date('2025-11-01'),
    updatedAt: new Date('2026-01-10'),
    currency: 'USDC',
    templateType: 'content-creation',
    actionRequired: 'Dispute in progress',
  },
  {
    id: 'contract-6',
    name: 'E-Commerce Platform',
    status: 'active',
    payerName: 'RetailBrand',
    payeeName: 'WebDevAgency',
    totalValue: 35000,
    releasedValue: 10000,
    milestonesTotal: 5,
    milestonesCompleted: 2,
    yieldEarned: 42.18,
    createdAt: new Date('2025-11-15'),
    updatedAt: new Date('2026-01-22'),
    currency: 'USDC',
    templateType: 'software-development',
  },
]

// ──────────────────────────────────────────
// Mock Dashboard Stats
// ──────────────────────────────────────────

export const mockDashboardStats: MockDashboardStat[] = [
  { label: 'Active Contracts', value: 3, change: '+2 this month', changeType: 'positive' },
  { label: 'Total Value', value: '$145,000', change: '+$35k', changeType: 'positive' },
  { label: 'Yield Earned', value: '$89.65', change: '+$23.45', changeType: 'positive' },
  { label: 'Pending Actions', value: 4, change: '2 urgent', changeType: 'negative' },
]

// ──────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────

export function getMockContractById(id: string): MockContractListItem | undefined {
  return mockContracts.find((c) => c.id === id)
}

export function getMockContractsByStatus(status: string): MockContractListItem[] {
  return mockContracts.filter((c) => c.status === status)
}
