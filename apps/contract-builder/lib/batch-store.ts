import { create } from 'zustand'
import type {
  BatchUploadStep,
  ParsedCsv,
  FieldMapping,
  BatchRecipient,
  BufiFieldKey,
  CsvColumn,
} from '@/types/batch'
import { CSV_TEMPLATE_HEADERS, CSV_TEMPLATE_SAMPLE_ROW } from '@/types/batch'

// ──────────────────────────────────────────
// CSV Parser (client-side, no dependency)
// ──────────────────────────────────────────

export function parseCsvText(text: string, fileName: string, fileSize: number): ParsedCsv {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) throw new Error('CSV must have at least a header row and one data row.')

  const headers = parseCsvLine(lines[0])
  const rows: Record<string, string>[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i])
    const row: Record<string, string> = {}
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] ?? ''
    }
    rows.push(row)
  }

  const columns: CsvColumn[] = headers.map((name) => ({
    name,
    sampleValues: rows
      .map((r) => r[name])
      .filter(Boolean)
      .slice(0, 3),
  }))

  return { columns, rows, totalRows: rows.length, fileName, fileSize }
}

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

// ──────────────────────────────────────────
// CSV Template Generator
// ──────────────────────────────────────────

export function generateCsvTemplate(): string {
  const headers = CSV_TEMPLATE_HEADERS.join(',')
  const sampleRow = CSV_TEMPLATE_HEADERS.map(
    (h) => CSV_TEMPLATE_SAMPLE_ROW[h as keyof typeof CSV_TEMPLATE_SAMPLE_ROW] ?? ''
  ).join(',')
  return `${headers}\n${sampleRow}`
}

export function downloadCsvTemplate() {
  const csv = generateCsvTemplate()
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'bufi-batch-contract-template.csv'
  link.click()
  URL.revokeObjectURL(url)
}

// ──────────────────────────────────────────
// Auto-mapping heuristic (local, before AI)
// ──────────────────────────────────────────

const COLUMN_HINTS: Record<string, BufiFieldKey> = {
  name: 'recipientName',
  recipientname: 'recipientName',
  fullname: 'recipientName',
  full_name: 'recipientName',
  recipient: 'recipientName',
  email: 'recipientEmail',
  recipientemail: 'recipientEmail',
  mail: 'recipientEmail',
  wallet: 'recipientWallet',
  walletaddress: 'recipientWallet',
  wallet_address: 'recipientWallet',
  address: 'recipientWallet',
  role: 'recipientRole',
  title: 'contractTitle',
  contracttitle: 'contractTitle',
  contract_title: 'contractTitle',
  amount: 'amount',
  value: 'amount',
  payment: 'amount',
  currency: 'currency',
  milestone: 'milestoneTitle',
  milestonetitle: 'milestoneTitle',
  milestone_title: 'milestoneTitle',
  description: 'milestoneDescription',
  milestonedescription: 'milestoneDescription',
  milestone_description: 'milestoneDescription',
  duedate: 'milestoneDueDate',
  due_date: 'milestoneDueDate',
  deadline: 'milestoneDueDate',
  date: 'milestoneDueDate',
  schedule: 'paymentSchedule',
  paymentschedule: 'paymentSchedule',
  payment_schedule: 'paymentSchedule',
  notes: 'notes',
  note: 'notes',
  comment: 'notes',
  comments: 'notes',
}

export function autoMapColumns(columns: CsvColumn[]): FieldMapping[] {
  const usedFields = new Set<BufiFieldKey>()

  return columns.map((col) => {
    const normalized = col.name.toLowerCase().replace(/[^a-z0-9]/g, '')
    const match = COLUMN_HINTS[normalized]
    if (match && !usedFields.has(match)) {
      usedFields.add(match)
      return { csvColumn: col.name, bufiField: match, confidence: 0.9, isAutoMapped: true }
    }
    return { csvColumn: col.name, bufiField: 'skip' as BufiFieldKey, confidence: 0, isAutoMapped: false }
  })
}

// ──────────────────────────────────────────
// Build recipients from mappings + CSV rows
// ──────────────────────────────────────────

export function buildRecipients(csv: ParsedCsv, mappings: FieldMapping[]): BatchRecipient[] {
  const fieldLookup = new Map<BufiFieldKey, string>()
  for (const m of mappings) {
    if (m.bufiField !== 'skip') {
      fieldLookup.set(m.bufiField, m.csvColumn)
    }
  }

  const get = (row: Record<string, string>, field: BufiFieldKey) => {
    const col = fieldLookup.get(field)
    return col ? (row[col] ?? '').trim() : ''
  }

  return csv.rows.map((row, i) => ({
    id: `batch-${Date.now()}-${i}`,
    name: get(row, 'recipientName'),
    email: get(row, 'recipientEmail'),
    walletAddress: get(row, 'recipientWallet') || undefined,
    role: get(row, 'recipientRole') || undefined,
    contractTitle: get(row, 'contractTitle') || undefined,
    amount: Number.parseFloat(get(row, 'amount')) || 0,
    currency: get(row, 'currency') || 'USDC',
    milestoneTitle: get(row, 'milestoneTitle') || undefined,
    milestoneDescription: get(row, 'milestoneDescription') || undefined,
    milestoneDueDate: get(row, 'milestoneDueDate') || undefined,
    paymentSchedule: get(row, 'paymentSchedule') || undefined,
    notes: get(row, 'notes') || undefined,
    status: 'pending' as const,
  }))
}

// ──────────────────────────────────────────
// Zustand Store
// ──────────────────────────────────────────

interface BatchState {
  // Wizard
  step: BatchUploadStep
  setStep: (step: BatchUploadStep) => void

  // File
  file: File | null
  setFile: (file: File | null) => void

  // Parsed CSV
  parsedCsv: ParsedCsv | null
  setParsedCsv: (csv: ParsedCsv | null) => void

  // Mappings
  mappings: FieldMapping[]
  setMappings: (mappings: FieldMapping[]) => void
  updateMapping: (csvColumn: string, bufiField: BufiFieldKey) => void

  // Recipients
  recipients: BatchRecipient[]
  setRecipients: (recipients: BatchRecipient[]) => void
  removeRecipient: (id: string) => void

  // Template
  selectedTemplateId: string | null
  setSelectedTemplateId: (id: string | null) => void

  // Input mode
  inputMode: 'csv' | 'ai-chat'
  setInputMode: (mode: 'csv' | 'ai-chat') => void

  // Sending state
  isSending: boolean
  sendProgress: number
  setSending: (sending: boolean, progress?: number) => void

  // Reset
  reset: () => void
}

const initialState = {
  step: 'upload' as BatchUploadStep,
  file: null as File | null,
  parsedCsv: null as ParsedCsv | null,
  mappings: [] as FieldMapping[],
  recipients: [] as BatchRecipient[],
  selectedTemplateId: null as string | null,
  inputMode: 'csv' as 'csv' | 'ai-chat',
  isSending: false,
  sendProgress: 0,
}

export const useBatchStore = create<BatchState>()((set, get) => ({
  ...initialState,

  setStep: (step) => set({ step }),
  setFile: (file) => set({ file }),
  setParsedCsv: (parsedCsv) => set({ parsedCsv }),
  setMappings: (mappings) => set({ mappings }),

  updateMapping: (csvColumn, bufiField) => {
    set({
      mappings: get().mappings.map((m) =>
        m.csvColumn === csvColumn
          ? { ...m, bufiField, confidence: 1, isAutoMapped: false }
          : m
      ),
    })
  },

  setRecipients: (recipients) => set({ recipients }),
  removeRecipient: (id) => set({ recipients: get().recipients.filter((r) => r.id !== id) }),
  setSelectedTemplateId: (id) => set({ selectedTemplateId: id }),
  setInputMode: (inputMode) => set({ inputMode }),
  setSending: (isSending, progress = 0) => set({ isSending, sendProgress: progress }),

  reset: () => set(initialState),
}))
