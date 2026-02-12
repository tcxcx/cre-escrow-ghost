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
