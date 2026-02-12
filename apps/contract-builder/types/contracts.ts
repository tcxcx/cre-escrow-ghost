// Contract lifecycle types for BUFI Contracts

export type ContractStatus = 
  | 'draft'           // In builder, not yet sent
  | 'pending_sign'    // Sent for signatures
  | 'active'          // Both signed, funded, work in progress
  | 'completed'       // All milestones released
  | 'disputed'        // In arbitration
  | 'cancelled'       // Terminated early

export type MilestoneStatus = 
  | 'pending'         // Not yet active
  | 'active'          // Ready for submission
  | 'submitted'       // Files uploaded, awaiting verification
  | 'verifying'       // AI verification in progress
  | 'approved'        // Passed verification
  | 'rejected'        // Failed verification (may have retries)
  | 'released'        // Payment sent
  | 'disputed'        // Manual arbitration required

export type YieldRecipientType = 'payer' | 'payee' | 'split' | 'performance'

export type YieldStrategy = 'aave-v3' | 'compound-v3' | 'none'

export type BonusTrigger = 'first_attempt' | 'early_delivery' | 'high_confidence' | 'perfect_score'

export type ClawbackTrigger = 'retry_required' | 'late_delivery' | 'dispute' | 'cancellation'

// Party information
export interface Party {
  id: string
  name: string
  bufiHandle: string        // e.g., "acme.bufi.eth"
  walletAddress: string     // e.g., "0x7f3a...8b2c"
  email: string
  role: 'payer' | 'payee'
  avatarUrl?: string
}

// Signature record
export interface Signature {
  partyId: string
  role: 'payer' | 'payee'
  signed: boolean
  signedAt?: Date
  txHash?: string
  blockNumber?: number
}

// Yield configuration
export interface YieldBonus {
  id: string
  trigger: BonusTrigger
  beneficiary: 'payee' | 'payer'
  percentage: number
  description: string
}

export interface YieldClawback {
  id: string
  trigger: ClawbackTrigger
  beneficiary: 'payer'
  percentage: number
  description: string
}

export interface PerformanceRules {
  bonuses: YieldBonus[]
  clawbacks: YieldClawback[]
}

export interface YieldConfiguration {
  strategy: YieldStrategy
  recipientType: YieldRecipientType
  payerPercentage: number
  payeePercentage: number
  performanceRules?: PerformanceRules
}

export interface AppliedBonus {
  bonusId: string
  milestoneId?: string
  amount: number
  appliedAt: Date
  reason: string
}

export interface AppliedClawback {
  clawbackId: string
  milestoneId?: string
  amount: number
  appliedAt: Date
  reason: string
}

export interface YieldStatus {
  totalAccrued: number
  currentApy: number
  projectedPayerYield: number
  projectedPayeeYield: number
  bonusesApplied: AppliedBonus[]
  clawbacksApplied: AppliedClawback[]
  finalPayerYield?: number
  finalPayeeYield?: number
  settlementTxHash?: string
}

// Deliverable types
export type DeliverableType = 'pdf' | 'image' | 'figma' | 'github' | 'url' | 'zip' | 'other'

export interface DeliverableRequirement {
  id: string
  type: DeliverableType
  description: string
  required: boolean
}

export interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  url: string
  ipfsHash?: string
  deliverableType: string
}

export interface SubmissionLink {
  id: string
  url: string
  type: 'figma' | 'github' | 'notion' | 'other'
  validated: boolean
}

// AI Verification
export interface CriterionResult {
  criterion: string
  passed: boolean
  status: 'pass' | 'fail' | 'partial'
  finding: string
  evidence?: string
}

export interface VerificationProof {
  txHash: string
  blockNumber: number
  chainId: string
  donNodesCount: number
  consensusReached: boolean
  timestamp: Date
}

export interface AIVerificationReport {
  passed: boolean
  confidence: number
  summary: string
  criteriaResults: CriterionResult[]
  suggestions?: string[]
  verificationProof: VerificationProof
}

// Submission
export interface Submission {
  id: string
  milestoneId: string
  attemptNumber: number
  files: UploadedFile[]
  links: SubmissionLink[]
  notes?: string
  ipfsHash?: string
  status: 'pending' | 'verifying' | 'approved' | 'rejected'
  verificationReport?: AIVerificationReport
  submittedAt: Date
  verifiedAt?: Date
}

// Milestone
export interface Milestone {
  id: string
  contractId: string
  name: string
  description: string
  orderIndex: number
  amount: number
  percentage: number
  verificationCriteria: string
  requiredDeliverables: DeliverableRequirement[]
  status: MilestoneStatus
  maxRetries: number
  currentAttempt: number
  submissions: Submission[]
  dueDate?: Date
  createdAt: Date
  completedAt?: Date
}

// Commission
export interface Commission {
  id: string
  recipientName: string
  recipientAddress: string
  percentage: number
}

// Escrow status
export interface EscrowStatus {
  totalDeposited: number
  currentBalance: number
  totalReleased: number
  yieldEarned: number
  lastUpdated: Date
}

// Main Contract interface
export interface Contract {
  id: string
  name: string
  contractNumber: string        // e.g., "BUFI-2026-0042"
  templateType: string
  status: ContractStatus
  
  // Parties
  payer: Party
  payee: Party
  
  // Signatures
  payerSignature?: Signature
  payeeSignature?: Signature
  
  // Financial
  totalAmount: number
  chain: string
  commissions: Commission[]
  
  // Yield
  yieldConfiguration: YieldConfiguration
  yieldStatus?: YieldStatus
  
  // Milestones
  milestones: Milestone[]
  
  // Escrow
  escrow?: EscrowStatus
  smartContractAddress?: string
  
  // Metadata
  createdAt: Date
  updatedAt: Date
  signedAt?: Date
  fundedAt?: Date
  completedAt?: Date
  
  // Content (for preview/PDF)
  scopeOfWork?: string
  terms?: string
  
  // Legal clauses (customizable per contract)
  governingLaw?: string
  jurisdiction?: string
  disputeMethod?: 'arbitration' | 'mediation' | 'litigation'
  terminationNoticeDays?: number
  confidentialityDuration?: string
  
  // Verification preferences
  verificationType?: 'ai' | 'manual' | 'hybrid'
}

// Contract list item (for index page)
export interface ContractListItem {
  id: string
  name: string
  status: ContractStatus
  totalAmount: number
  counterpartyName: string
  counterpartyHandle: string
  milestonesComplete: number
  milestonesTotal: number
  progress: number
  hasUserSigned: boolean
  hasCounterpartySigned: boolean
  updatedAt: Date
}

// Payment record
export interface PaymentRecord {
  id: string
  milestoneId?: string
  milestoneName?: string
  type: 'escrow_deposit' | 'milestone_release' | 'yield_distribution' | 'commission'
  amount: number
  recipient: string
  txHash: string
  timestamp: Date
}

// Dispute
export interface Dispute {
  id: string
  contractId: string
  milestoneId?: string
  raisedBy: 'payer' | 'payee'
  reason: string
  status: 'open' | 'resolved' | 'arbitration'
  resolution?: string
  createdAt: Date
  resolvedAt?: Date
}
