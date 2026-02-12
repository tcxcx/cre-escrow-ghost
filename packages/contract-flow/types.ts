/**
 * @package flow/types
 * Single source of truth for all React Flow node data interfaces.
 * Extracted from lib/contract-store.ts where they were defined
 * and then imported by 10+ node components and the validation module.
 */

import type { Node, Edge } from '@xyflow/react'

// ──────────────────────────────────────────
// Node Type Enum
// ──────────────────────────────────────────

export type NodeType =
  | 'party-payer'
  | 'party-payee'
  | 'milestone'
  | 'condition'
  | 'payment'
  | 'signature'
  | 'clause'
  | 'commission'
  | 'identity-verification'

// ──────────────────────────────────────────
// Node Data Interfaces
// ──────────────────────────────────────────

export interface PartyData {
  name: string
  email: string
  role: 'payer' | 'payee'
  walletAddress?: string
}

export interface MilestoneData {
  title: string
  description: string
  amount: number
  currency: string
  verificationCriteria: string
  aiVerificationPrompt?: string
  dueDate?: string
}

export interface ConditionData {
  type: 'if-else' | 'approval' | 'time-based'
  condition: string
  trueLabel: string
  falseLabel: string
}

export interface PaymentData {
  amount: number
  currency: string
  triggerType: 'milestone-completion' | 'manual' | 'time-based'
  milestoneId?: string
}

export interface SignatureData {
  required: boolean
  signerId: string
  signerRole: 'payer' | 'payee' | 'witness'
  signedAt?: string
}

export interface ClauseData {
  title: string
  content: string
  aiGenerated: boolean
  aiPrompt?: string
}

export interface CommissionData {
  recipientName: string
  recipientAddress: string
  percentage: number
  triggerMilestoneId?: string
}

export interface IdentityVerificationData {
  verificationType: 'kyc' | 'kyb' | 'both'
  requiredFor: 'payer' | 'payee' | 'both'
  triggerPoint: 'before_signing' | 'before_funding' | 'before_milestone'
  milestoneId?: string
  templateId?: string
  requirements: {
    kyc?: {
      governmentId: boolean
      selfie: boolean
      proofOfAddress: boolean
      accreditedInvestor?: boolean
    }
    kyb?: {
      businessRegistration: boolean
      proofOfAddress: boolean
      beneficialOwners: boolean
      authorizedSignatory: boolean
      financialStatements?: boolean
    }
    allowedCountries?: string[]
    blockedCountries?: string[]
    blockSanctioned: boolean
  }
  status: Record<string, 'not_started' | 'pending' | 'in_review' | 'approved' | 'declined' | 'expired'>
}

// ──────────────────────────────────────────
// Union & Composite Types
// ──────────────────────────────────────────

export type ContractNodeData =
  | PartyData
  | MilestoneData
  | ConditionData
  | PaymentData
  | SignatureData
  | ClauseData
  | CommissionData
  | IdentityVerificationData

export interface ContractNode extends Node {
  type: NodeType
  data: ContractNodeData & { label: string }
}

// ──────────────────────────────────────────
// Template & Settings Types
// ──────────────────────────────────────────

// ── Contract Taxonomy ─────────────────────
// Primary category = what it does on the platform
export type ContractCategory = 'payment' | 'onboarding' | 'fundraising' | 'legal'

// Tags = trait badges (additive, multiple per template)
export type ContractTag = 'legal' | 'payment' | 'ai-escrow' | 'onboarding'

export interface ContractTemplate {
  id: string
  name: string
  description: string
  icon: string
  category: ContractCategory
  tags: ContractTag[]
  nodes: ContractNode[]
  edges: Edge[]
}

export interface ContractSettings {
  yieldStrategy: 'none' | 'aave' | 'compound'
  chain: 'ethereum' | 'polygon' | 'arbitrum' | 'base'
  totalAmount: number
  currency: string
  commissions: {
    recipient: string
    percentage: number
  }[]
}

export interface SavedContract {
  id: string
  name: string
  templateId: string | null
  nodes: ContractNode[]
  edges: Edge[]
  settings: ContractSettings
  createdAt: string
  updatedAt: string
  shareId?: string
}
