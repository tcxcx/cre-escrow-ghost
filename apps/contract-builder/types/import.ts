// types/import.ts

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
