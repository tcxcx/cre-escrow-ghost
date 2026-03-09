export interface ImportedContract {
    id: string
    originalFileName: string
    originalFileHash: string
    uploadedAt: Date
    status: 'uploading' | 'processing' | 'review' | 'saving' | 'saved' | 'failed'
    
    // AI extraction results
    extraction?: ContractExtraction
    
    // User-confirmed template
    template?: UserTemplate
    
    // Error info
    error?: string
  }
  
  export interface ContractExtraction {
    // Detected contract type
    contractType: {
      detected: string
      confidence: number
      suggestedTemplate: string
    }
    
    // Parties
    parties: ExtractedParty[]
    
    // Payment structure
    paymentStructure: {
      type: 'milestone' | 'retainer' | 'single' | 'hourly'
      totalValue?: number
      currency?: string
      milestones: ExtractedMilestone[]
    }
    
    // Clauses
    clauses: ExtractedClause[]
    
    // Timeline
    timeline: {
      effectiveDate?: string
      termLength?: string
      renewalTerms?: string
    }
    
    // Raw text sections (for reference)
    sections: {
      title: string
      content: string
      startPage: number
    }[]
    
    // AI confidence scores
    confidence: {
      overall: number
      parties: number
      payments: number
      clauses: number
    }
  }
  
  export interface ExtractedParty {
    role: 'payer' | 'payee'
    type: 'individual' | 'company'
    nameField: string          // Field label for template
    detectedName?: string      // If name was in original doc
    additionalFields: string[] // email, address, etc.
  }
  
  export interface ExtractedMilestone {
    id: string
    name: string
    description: string
    amount?: number
    percentage?: number
    deliverables: string[]
    acceptanceCriteria: string[]
    enableAiVerification: boolean
    dueDate?: string
  }
  
  export interface ExtractedClause {
    id: string
    type: ClauseType
    detected: boolean
    confidence: number
    mappedNode: string
    originalText?: string
    enabled: boolean
  }
  
  export type ClauseType = 
    | 'nda'
    | 'ip_assignment'
    | 'termination'
    | 'liability'
    | 'non_compete'
    | 'non_solicitation'
    | 'dispute_resolution'
    | 'indemnification'
    | 'warranty'
  
  export interface UserTemplate {
    id: string
    name: string
    description: string
    category: string
    icon: string
    tags: string[]
    createdAt: Date
    updatedAt: Date
    isCustom: true
    sourceFileName?: string
    
    // Node configuration
    nodes: TemplateNode[]
    
    // Options
    requireKyc: boolean
    requireKyb: boolean
    enableYield: boolean
    yieldStrategy?: string
  }
  
  export interface TemplateNode {
    type: string
    config: Record<string, unknown>
  }
  
  // Processing step types
  export type ProcessingStep = 
    | 'parse'
    | 'extract'
    | 'identify'
    | 'map'
  
  export interface ProcessingProgress {
    currentStep: ProcessingStep
    stepProgress: number
    findings: string[]
    estimatedTimeRemaining?: number
  }
  
  // Contract type detection
  export const CONTRACT_TYPE_OPTIONS = [
    { value: 'freelance', label: 'Freelance/Independent Contractor' },
    { value: 'milestone', label: 'Milestone-Based Project' },
    { value: 'retainer', label: 'Retainer Agreement' },
    { value: 'agency', label: 'Agency/Consulting Agreement' },
    { value: 'nda', label: 'NDA/Confidentiality Agreement' },
    { value: 'sow', label: 'Statement of Work (SOW)' },
    { value: 'safe', label: 'SAFE Agreement' },
    { value: 'service', label: 'Service Agreement' },
    { value: 'other', label: 'Other' },
  ] as const
  
  export const CLAUSE_LABELS: Record<ClauseType, string> = {
    nda: 'Confidentiality / NDA',
    ip_assignment: 'Intellectual Property Assignment',
    termination: 'Termination Conditions',
    liability: 'Liability Limitation',
    non_compete: 'Non-Compete',
    non_solicitation: 'Non-Solicitation',
    dispute_resolution: 'Dispute Resolution',
    indemnification: 'Indemnification',
    warranty: 'Warranty',
  }
  
  export const CLAUSE_NODE_MAPPING: Record<ClauseType, string> = {
    nda: 'NDA Node',
    ip_assignment: 'IP Assignment Node',
    termination: 'Termination Clause Node',
    liability: 'Liability Clause Node',
    non_compete: 'Non-Compete Node',
    non_solicitation: 'Non-Solicitation Node',
    dispute_resolution: 'Dispute Resolution Node',
    indemnification: 'Indemnification Node',
    warranty: 'Warranty Node',
  }
  
  export const TEMPLATE_ICONS = [
    { icon: 'Briefcase', label: 'Briefcase' },
    { icon: 'Users', label: 'Team' },
    { icon: 'FileText', label: 'Document' },
    { icon: 'Target', label: 'Target' },
    { icon: 'Rocket', label: 'Rocket' },
    { icon: 'Shield', label: 'Shield' },
    { icon: 'Receipt', label: 'Receipt' },
    { icon: 'Database', label: 'Database' },
  ] as const

  
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

export type CommentType = 'comment' | 'suggestion' | 'question'
export type CommentStatus = 'open' | 'resolved' | 'accepted' | 'rejected'
export type AuthorRole = 'owner' | 'admin' | 'legal_reviewer' | 'counterparty' | 'viewer'

export interface ContractComment {
  id: string
  contractId: string
  
  // Location in document
  sectionId: string
  startOffset?: number
  endOffset?: number
  highlightedText?: string
  
  // Content
  type: CommentType
  content: string
  suggestedText?: string // For suggestions only
  
  // Author
  authorId: string
  authorName: string
  authorEmail?: string
  authorAvatar?: string
  authorRole: AuthorRole
  
  // Status
  status: CommentStatus
  resolvedBy?: string
  resolvedAt?: string
  
  // Threading
  parentCommentId?: string
  replies?: ContractComment[]
  
  createdAt: string
  updatedAt: string
}

export interface ReviewLink {
  id: string
  contractId: string
  token: string
  expiresAt: string
  password?: string
  permissions: {
    canComment: boolean
    canSuggest: boolean
    canApprove: boolean
  }
  createdBy: string
  createdAt: string
  viewCount: number
  lastViewedAt?: string
}

export interface ContractReviewer {
  id: string
  contractId: string
  userId?: string
  email: string
  name: string
  role: 'legal_reviewer' | 'viewer' | 'counterparty'
  canComment: boolean
  canSuggest: boolean
  canApprove: boolean
  invitedAt: string
  invitedBy: string
  lastViewedAt?: string
  approvalStatus?: 'pending' | 'approved' | 'changes_requested'
  approvedAt?: string
  approvalNotes?: string
}

export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'legal_reviewer' | 'viewer'

/**
 * Types for the batch contract upload system.
 * Covers CSV parsing, AI field mapping, recipient management,
 * and batch contract creation for grant programs and bulk sending.
 */

// ──────────────────────────────────────────
// BUFI Contract Fields (mapping targets)
// ──────────────────────────────────────────

export type BufiFieldKey =
  | 'recipientName'
  | 'recipientEmail'
  | 'recipientWallet'
  | 'recipientRole'
  | 'contractTitle'
  | 'amount'
  | 'currency'
  | 'milestoneTitle'
  | 'milestoneDescription'
  | 'milestoneDueDate'
  | 'paymentSchedule'
  | 'notes'
  | 'skip'

export interface BufiField {
  key: BufiFieldKey
  label: string
  required: boolean
  description: string
  icon: string // lucide icon name
}

export const BUFI_CONTRACT_FIELDS: BufiField[] = [
  { key: 'recipientName',        label: 'Recipient Name',        required: true,  description: 'Full name of the contract recipient',          icon: 'User' },
  { key: 'recipientEmail',       label: 'Recipient Email',       required: true,  description: 'Email address for contract delivery',           icon: 'Mail' },
  { key: 'recipientWallet',      label: 'Wallet Address',        required: false, description: 'Blockchain wallet for escrow payments',         icon: 'Wallet' },
  { key: 'recipientRole',        label: 'Role',                  required: false, description: 'Role in the contract (e.g. grantee, vendor)',   icon: 'UserCheck' },
  { key: 'contractTitle',        label: 'Contract Title',        required: false, description: 'Custom title override per recipient',           icon: 'FileText' },
  { key: 'amount',               label: 'Amount',                required: true,  description: 'Payment amount for this recipient',             icon: 'DollarSign' },
  { key: 'currency',             label: 'Currency',              required: false, description: 'Payment currency (defaults to USDC)',           icon: 'Coins' },
  { key: 'milestoneTitle',       label: 'Milestone Title',       required: false, description: 'Primary milestone name',                       icon: 'Target' },
  { key: 'milestoneDescription', label: 'Milestone Description', required: false, description: 'Description of the deliverable',               icon: 'AlignLeft' },
  { key: 'milestoneDueDate',     label: 'Due Date',              required: false, description: 'Milestone deadline',                           icon: 'Calendar' },
  { key: 'paymentSchedule',      label: 'Payment Schedule',      required: false, description: 'e.g. "50/50", "30/30/40"',                    icon: 'Clock' },
  { key: 'notes',                label: 'Notes',                 required: false, description: 'Additional notes or instructions',              icon: 'MessageSquare' },
  { key: 'skip',                 label: 'Skip (do not import)',  required: false, description: 'Ignore this column',                           icon: 'X' },
]

// ──────────────────────────────────────────
// CSV Parsing
// ──────────────────────────────────────────

export interface CsvColumn {
  name: string
  sampleValues: string[] // first 3 non-empty values
}

export interface ParsedCsv {
  columns: CsvColumn[]
  rows: Record<string, string>[]
  totalRows: number
  fileName: string
  fileSize: number
}

// ──────────────────────────────────────────
// Field Mapping
// ──────────────────────────────────────────

export interface FieldMapping {
  csvColumn: string
  bufiField: BufiFieldKey
  confidence: number // 0-1, from AI auto-mapping
  isAutoMapped: boolean
}

// ──────────────────────────────────────────
// Batch Recipients
// ──────────────────────────────────────────

export interface BatchRecipient {
  id: string
  name: string
  email: string
  walletAddress?: string
  role?: string
  contractTitle?: string
  amount: number
  currency: string
  milestoneTitle?: string
  milestoneDescription?: string
  milestoneDueDate?: string
  paymentSchedule?: string
  notes?: string
  status: 'pending' | 'sending' | 'sent' | 'signed' | 'funded' | 'error'
  errorMessage?: string
}

// ──────────────────────────────────────────
// Batch Contract
// ──────────────────────────────────────────

export interface BatchContract {
  id: string
  name: string
  templateId: string | null
  recipients: BatchRecipient[]
  totalValue: number
  currency: string
  status: 'draft' | 'reviewing' | 'sending' | 'sent' | 'completed'
  createdAt: string
  updatedAt: string
  sourceType: 'csv' | 'ai-chat' | 'manual'
  sourceFileName?: string
}

// ──────────────────────────────────────────
// Wizard Steps
// ──────────────────────────────────────────

export type BatchUploadStep = 'upload' | 'mapping' | 'review' | 'confirm'

export const BATCH_STEPS: { key: BatchUploadStep; label: string; number: number }[] = [
  { key: 'upload',  label: 'Upload',  number: 1 },
  { key: 'mapping', label: 'Mapping', number: 2 },
  { key: 'review',  label: 'Review',  number: 3 },
  { key: 'confirm', label: 'Confirm', number: 4 },
]

// ──────────────────────────────────────────
// CSV Template Definition
// ──────────────────────────────────────────

export const CSV_TEMPLATE_HEADERS = [
  'recipientName',
  'recipientEmail',
  'walletAddress',
  'amount',
  'currency',
  'milestoneTitle',
  'milestoneDescription',
  'dueDate',
  'paymentSchedule',
  'notes',
] as const

export const CSV_TEMPLATE_SAMPLE_ROW = {
  recipientName: 'Jane Doe',
  recipientEmail: 'jane@example.com',
  walletAddress: '0x1234...abcd',
  amount: '5000',
  currency: 'USDC',
  milestoneTitle: 'Phase 1 Delivery',
  milestoneDescription: 'Complete initial research and prototype',
  dueDate: '2026-04-01',
  paymentSchedule: '50/50',
  notes: 'Grant cohort Q2 2026',
}

'use client'

// =============================================================================
// BUFI Adversarial AI Arbitration System — Type Definitions
// Spec v0.1 — 4-Layer Architecture
// =============================================================================

// -- Shared ------------------------------------------------------------------

export interface AIModelInfo {
  provider: string
  modelId: string
  version: string
}

// -- Smart Contract States ---------------------------------------------------

export type MilestoneEscrowState =
  | 'FUNDED'
  | 'AI_VERIFIED'
  | 'AI_REJECTED'
  | 'RELEASED'
  | 'DISPUTED'
  | 'TRIBUNAL_DECIDED'
  | 'APPEALED'
  | 'FINAL_APPROVED'
  | 'FINAL_DENIED'
  | 'FINAL_SPLIT'

// -- Layer 1: AI Verifier ----------------------------------------------------

export type CriterionType = 'binary' | 'quantitative' | 'qualitative'
export type VerificationVerdict = 'PASS' | 'FAIL'

export interface VerificationCriterionInput {
  id: string
  description: string
  type: CriterionType
  threshold?: string
}

export interface CriterionEvaluation {
  criterionId: string
  criterionDescription: string
  met: boolean
  confidence: number
  reasoning: string
}

export interface VerificationReport {
  reportId: string
  timestamp: string
  model: AIModelInfo
  verdict: VerificationVerdict
  confidence: number
  criteriaEvaluation: CriterionEvaluation[]
  summary: string
  evidenceAnalyzed: string[]
  hash: string
}

// -- Layer 2: AI Advocates ---------------------------------------------------

export type AdvocateRole = 'pro_provider' | 'pro_client'

export interface AdvocateArgument {
  argument: string
  strength: 'strong' | 'moderate' | 'weak'
  evidence: string[]
}

export interface AdvocateCriterionAnalysis {
  criterionId: string
  criterionDescription: string
  position: 'met' | 'not_met'
  argument: string
  evidenceCited: string[]
}

export type AdvocateVerdict = 'APPROVE' | 'DENY' | 'PARTIAL'

export interface AdvocateBrief {
  briefId: string
  timestamp: string
  advocateRole: AdvocateRole
  model: AIModelInfo
  positionSummary: string
  criteriaAnalysis: AdvocateCriterionAnalysis[]
  keyArguments: AdvocateArgument[]
  recommendedVerdict: AdvocateVerdict
  recommendedAmountPct: number
  hash: string
}

// -- Layer 3: AI Tribunal ----------------------------------------------------

export type TribunalVerdict = 'APPROVE' | 'DENY' | 'PARTIAL'

export interface TribunalJudgeCriterion {
  criterionId: string
  met: boolean
  reasoning: string
}

export interface TribunalJudgeReasoning {
  summary: string
  criteriaAnalysis: TribunalJudgeCriterion[]
  responseToAdvocateA: string
  responseToAdvocateB: string
}

export interface TribunalJudgeVerdict {
  verdictId: string
  timestamp: string
  judgeIndex: 1 | 2 | 3
  model: AIModelInfo
  verdict: TribunalVerdict
  paymentPct: number
  confidence: number
  reasoning: TribunalJudgeReasoning
  hash: string
}

export interface TribunalDecision {
  direction: 'APPROVE' | 'DENY'
  paymentPct: number
  unanimous: boolean
  appealable: boolean
  vote: '3-0' | '2-1'
  verdicts: TribunalJudgeVerdict[]
  dissenter?: 1 | 2 | 3
}

// -- Layer 4: AI Supreme Court -----------------------------------------------

export interface SupremeCourtJudgeVerdict {
  verdictId: string
  timestamp: string
  judgeIndex: 1 | 2 | 3 | 4 | 5
  model: AIModelInfo
  verdict: TribunalVerdict
  paymentPct: number
  confidence: number
  reasoning: TribunalJudgeReasoning & {
    responseToTribunalMajority: string
    responseToTribunalDissent: string
    upholdsTribunal: boolean
  }
  hash: string
}

export interface SupremeCourtDecision {
  overturned: boolean
  finalDirection: 'APPROVE' | 'DENY' | 'PARTIAL'
  paymentPct: number
  vote: string // e.g. "4-1", "3-2"
  verdicts: SupremeCourtJudgeVerdict[]
}

// -- Dispute (aggregate record) ----------------------------------------------

export type DisputePhase =
  | 'dispute_window'   // After Layer 1 pass, 72h window
  | 'advocates'        // Layer 2 generating briefs
  | 'tribunal'         // Layer 3 voting
  | 'tribunal_decided' // Waiting for appeal or auto-execute
  | 'appeal_window'    // 48h appeal window (2-1 only)
  | 'supreme_court'    // Layer 4 voting
  | 'final'            // Terminal — escrow action executed

export interface DisputeRecord {
  id: string
  contractId: string
  contractName: string
  milestoneId: string
  milestoneName: string
  filedBy: 'payer' | 'payee'
  filedAt: string
  reason: string
  supportingEvidence: string[]
  disputedAmount: number
  currency: string
  phase: DisputePhase
  escrowState: MilestoneEscrowState
  
  // Layer 1
  verificationReport: VerificationReport
  
  // Layer 2 (populated when phase >= 'advocates')
  advocateBriefProvider?: AdvocateBrief
  advocateBriefClient?: AdvocateBrief
  
  // Layer 3 (populated when phase >= 'tribunal_decided')
  tribunalDecision?: TribunalDecision
  
  // Layer 4 (populated when phase >= 'final' with appeal)
  supremeCourtDecision?: SupremeCourtDecision
  
  // Timeline windows
  disputeWindowEnd?: string
  appealWindowEnd?: string
  resolvedAt?: string
  
  // Final outcome
  finalVerdict?: 'APPROVE' | 'DENY' | 'PARTIAL'
  finalPaymentPct?: number
  
  // On-chain audit
  auditTrail: AuditDocument[]
}

export interface AuditDocument {
  id: string
  layer: 1 | 2 | 3 | 4
  type: string
  title: string
  hash: string
  ipfsCid?: string
  timestamp: string
}

// -- Arbitration Config (per-contract) ---------------------------------------

export interface ArbitrationConfig {
  disputeWindowHours: number
  maxResubmissions: number
  verificationConfidenceThreshold: number
  layer1Provider: string
  layer1Model: string
  layer2Provider: string
  layer2Model: string
  tribunalProviders: [string, string, string]
  tribunalModels: [string, string, string]
  supremeCourtProviders: string[]
  supremeCourtModels: string[]
}

export const DEFAULT_ARBITRATION_CONFIG: ArbitrationConfig = {
  disputeWindowHours: 72,
  maxResubmissions: 3,
  verificationConfidenceThreshold: 80,
  layer1Provider: 'anthropic',
  layer1Model: 'claude-sonnet-4-5-20250929',
  layer2Provider: 'anthropic',
  layer2Model: 'claude-sonnet-4-5-20250929',
  tribunalProviders: ['anthropic', 'openai', 'google'],
  tribunalModels: ['claude-sonnet-4-5-20250929', 'gpt-4o', 'gemini-2.0-flash'],
  supremeCourtProviders: ['mistral', 'meta', 'cohere', 'xai', 'amazon'],
  supremeCourtModels: ['mistral-large', 'llama-3.3-70b', 'command-r-plus', 'grok-2', 'nova-pro'],
}
