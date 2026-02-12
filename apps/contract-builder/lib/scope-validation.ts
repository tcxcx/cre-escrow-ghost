import { z } from 'zod'

// =============================================================================
// PROJECT SCOPE DEFINITION SCHEMAS
// These schemas define the structure AI must extract and validate from user input
// =============================================================================

// Party Definition - Who is involved in the contract
export const partyDefinitionSchema = z.object({
  role: z.enum(['payer', 'payee', 'intermediary'], {
    errorMap: () => ({ message: 'Party role must be payer, payee, or intermediary' }),
  }),
  type: z.enum(['individual', 'company', 'agency'], {
    errorMap: () => ({ message: 'Party type must be individual, company, or agency' }),
  }),
  identifier: z.string().min(1, 'Party identifier/description is required'),
  responsibilities: z.array(z.string()).min(1, 'At least one responsibility must be defined'),
})

// Deliverable Definition - What must be delivered
export const deliverableSchema = z.object({
  title: z.string().min(3, 'Deliverable title must be at least 3 characters'),
  description: z.string().min(10, 'Deliverable description must be at least 10 characters'),
  type: z.enum(['digital', 'physical', 'service', 'document', 'approval'], {
    errorMap: () => ({ message: 'Deliverable type is required' }),
  }),
  acceptanceCriteria: z.array(z.string()).min(1, 'At least one acceptance criterion is required'),
  estimatedEffort: z.string().optional(),
})

// Timeline Entry - When things happen
export const timelineEntrySchema = z.object({
  phase: z.string().min(1, 'Phase name is required'),
  description: z.string().min(1, 'Phase description is required'),
  duration: z.object({
    value: z.number().min(1, 'Duration must be at least 1'),
    unit: z.enum(['hours', 'days', 'weeks', 'months'], {
      errorMap: () => ({ message: 'Duration unit must be hours, days, weeks, or months' }),
    }),
  }),
  dependencies: z.array(z.string()).default([]),
  deliverables: z.array(z.string()).min(1, 'At least one deliverable must be associated with this phase'),
})

// Payment Structure - How money flows
export const paymentStructureSchema = z.object({
  totalAmount: z.number().min(0.01, 'Total amount must be greater than 0'),
  currency: z.string().min(1, 'Currency is required'),
  breakdown: z.array(
    z.object({
      phase: z.string().min(1, 'Payment phase is required'),
      amount: z.number().min(0, 'Amount must be non-negative'),
      percentage: z.number().min(0).max(100, 'Percentage must be between 0 and 100'),
      triggerCondition: z.string().min(1, 'Payment trigger condition is required'),
      type: z.enum(['upfront', 'milestone', 'completion', 'recurring'], {
        errorMap: () => ({ message: 'Payment type is required' }),
      }),
    })
  ).min(1, 'At least one payment breakdown is required'),
}).refine(
  (data) => {
    const totalPercentage = data.breakdown.reduce((sum, b) => sum + b.percentage, 0)
    return Math.abs(totalPercentage - 100) < 0.01
  },
  { message: 'Payment percentages must sum to 100%' }
)

// Risk & Condition - What could go wrong and how to handle it
export const riskConditionSchema = z.object({
  type: z.enum(['approval', 'quality', 'timeline', 'performance', 'external'], {
    errorMap: () => ({ message: 'Risk type is required' }),
  }),
  description: z.string().min(10, 'Risk description must be at least 10 characters'),
  condition: z.string().min(5, 'Condition statement is required'),
  consequence: z.object({
    ifTrue: z.string().min(1, 'True outcome is required'),
    ifFalse: z.string().min(1, 'False outcome is required'),
  }),
  evaluationMethod: z.enum(['manual', 'automatic', 'third-party'], {
    errorMap: () => ({ message: 'Evaluation method is required' }),
  }),
})

// Commission Structure - Third-party fees (non-blocking link payments)
export const commissionSchema = z.object({
  recipient: z.string().min(1, 'Commission recipient is required'),
  recipientAddress: z.string().min(1, 'Commission recipient wallet address is required'),
  percentage: z.number().min(0).max(10, 'Commission cannot exceed 10%'),
  description: z.string().min(1, 'Commission description is required'),
  triggerEvent: z.string().min(1, 'Trigger event is required'),
  // Commissions are non-blocking link payments - they execute on contract completion
  // but do not block the main contract flow
  isNonBlocking: z.boolean().default(true),
  executionTiming: z.enum(['on-milestone', 'on-completion', 'on-signature'], {
    errorMap: () => ({ message: 'Commission execution timing is required' }),
  }).default('on-completion'),
})

// Signature Requirements - Each stakeholder must sign
export const signatureRequirementSchema = z.object({
  partyId: z.string().min(1, 'Party ID is required for signature'),
  partyRole: z.enum(['payer', 'payee', 'intermediary', 'witness'], {
    errorMap: () => ({ message: 'Party role must be specified for signature' }),
  }),
  signatureType: z.enum(['initial', 'approval', 'final', 'witness'], {
    errorMap: () => ({ message: 'Signature type is required' }),
  }),
  isRequired: z.boolean().default(true),
  order: z.number().min(1, 'Signature order must be specified'),
  dependsOn: z.array(z.string()).default([]), // Other signatures this depends on
})

// Legal Clauses - What terms govern the contract
export const legalClauseSchema = z.object({
  type: z.enum([
    'termination',
    'confidentiality',
    'intellectual-property',
    'liability',
    'dispute-resolution',
    'force-majeure',
    'amendment',
    'general',
  ], {
    errorMap: () => ({ message: 'Clause type is required' }),
  }),
  title: z.string().min(3, 'Clause title must be at least 3 characters'),
  summary: z.string().min(10, 'Clause summary must be at least 10 characters'),
  importance: z.enum(['required', 'recommended', 'optional'], {
    errorMap: () => ({ message: 'Clause importance level is required' }),
  }),
})

// =============================================================================
// COMPLETE PROJECT REQUIREMENTS SCHEMA
// This is the master schema that defines everything needed for a contract
// =============================================================================

export const projectRequirementsSchema = z.object({
  // Core Project Info
  projectType: z.enum([
    'freelance-service',
    'product-trade',
    'consulting',
    'creative-work',
    'software-development',
    'marketing-campaign',
    'licensing',
    'retainer',
    'custom',
  ], {
    errorMap: () => ({ message: 'Project type is required' }),
  }),
  
  title: z.string().min(5, 'Project title must be at least 5 characters'),
  description: z.string().min(20, 'Project description must be at least 20 characters'),
  
  // Parties
  parties: z.array(partyDefinitionSchema)
    .min(2, 'At least two parties (payer and payee) are required')
    .refine(
      (parties) => parties.some(p => p.role === 'payer'),
      { message: 'At least one payer is required' }
    )
    .refine(
      (parties) => parties.some(p => p.role === 'payee'),
      { message: 'At least one payee is required' }
    ),
  
  // Deliverables
  deliverables: z.array(deliverableSchema)
    .min(1, 'At least one deliverable is required'),
  
  // Timeline
  timeline: z.object({
    startType: z.enum(['immediate', 'on-signature', 'specific-date'], {
      errorMap: () => ({ message: 'Timeline start type is required' }),
    }),
    totalDuration: z.object({
      value: z.number().min(1, 'Duration must be at least 1'),
      unit: z.enum(['hours', 'days', 'weeks', 'months'], {
        errorMap: () => ({ message: 'Duration unit is required' }),
      }),
    }),
    phases: z.array(timelineEntrySchema)
      .min(1, 'At least one timeline phase is required'),
    hasDeadlines: z.boolean(),
    flexibilityLevel: z.enum(['strict', 'moderate', 'flexible'], {
      errorMap: () => ({ message: 'Flexibility level is required' }),
    }),
  }),
  
  // Payment
  payment: paymentStructureSchema,
  
  // Risks & Conditions
  risksAndConditions: z.array(riskConditionSchema).default([]),
  
  // Commissions (optional, non-blocking link payments)
  commissions: z.array(commissionSchema).default([]),
  
  // Signature Requirements - Every payer and payee MUST have a signature
  signatures: z.array(signatureRequirementSchema)
    .min(2, 'At least two signatures (payer and payee) are required'),
  
  // Legal Requirements
  legalClauses: z.array(legalClauseSchema)
    .min(1, 'At least one legal clause is required'),
  
  // Additional Settings
  settings: z.object({
    requiresEscrow: z.boolean().default(true),
    allowsPartialPayments: z.boolean().default(true),
    requiresApprovalForMilestones: z.boolean().default(true),
    jurisdiction: z.string().optional(),
    governingLaw: z.string().optional(),
  }),
})

export type ProjectRequirements = z.infer<typeof projectRequirementsSchema>
export type PartyDefinition = z.infer<typeof partyDefinitionSchema>
export type Deliverable = z.infer<typeof deliverableSchema>
export type TimelineEntry = z.infer<typeof timelineEntrySchema>
export type PaymentStructure = z.infer<typeof paymentStructureSchema>
export type RiskCondition = z.infer<typeof riskConditionSchema>
export type Commission = z.infer<typeof commissionSchema>
export type LegalClause = z.infer<typeof legalClauseSchema>
export type SignatureRequirement = z.infer<typeof signatureRequirementSchema>

// =============================================================================
// VALIDATION UTILITIES
// =============================================================================

export interface ScopeValidationResult {
  isValid: boolean
  requirements: ProjectRequirements | null
  errors: {
    field: string
    message: string
    severity: 'error' | 'warning'
  }[]
  completenessScore: number
  suggestions: string[]
}

export function validateProjectScope(data: unknown): ScopeValidationResult {
  const result = projectRequirementsSchema.safeParse(data)
  
  if (result.success) {
    return {
      isValid: true,
      requirements: result.data,
      errors: [],
      completenessScore: 100,
      suggestions: [],
    }
  }
  
  const errors = result.error.issues.map(issue => ({
    field: issue.path.join('.'),
    message: issue.message,
    severity: 'error' as const,
  }))
  
  // Generate suggestions based on missing fields
  const suggestions: string[] = []
  const missingFields = new Set(errors.map(e => e.field.split('.')[0]))
  
  if (missingFields.has('parties')) {
    suggestions.push('Specify who the payer (client/buyer) and payee (provider/seller) are')
  }
  if (missingFields.has('signatures')) {
    suggestions.push('Each payer and payee requires a signature - define who signs and in what order')
  }
  if (missingFields.has('deliverables')) {
    suggestions.push('Define what will be delivered - be specific about outputs and acceptance criteria')
  }
  if (missingFields.has('timeline')) {
    suggestions.push('Include timeline details - project duration, phases, and any deadlines')
  }
  if (missingFields.has('payment')) {
    suggestions.push('Specify payment amount, currency, and how payments will be structured')
  }
  
  // Calculate completeness score (simplified)
  const totalFields = 8 // Core required sections
  const validFields = totalFields - missingFields.size
  const completenessScore = Math.round((validFields / totalFields) * 100)
  
  return {
    isValid: false,
    requirements: null,
    errors,
    completenessScore,
    suggestions,
  }
}

// =============================================================================
// AI PROMPT ANALYSIS - Extract structured data from natural language
// =============================================================================

export interface PromptAnalysisResult {
  confidence: number
  extractedData: Partial<ProjectRequirements>
  missingCritical: string[]
  missingOptional: string[]
  ambiguities: string[]
  clarificationQuestions: string[]
}

export function analyzePromptCompleteness(prompt: string): PromptAnalysisResult {
  const lowerPrompt = prompt.toLowerCase()
  const extractedData: Partial<ProjectRequirements> = {}
  const missingCritical: string[] = []
  const missingOptional: string[] = []
  const ambiguities: string[] = []
  const clarificationQuestions: string[] = []
  
  // Check for project type indicators
  const projectTypeIndicators = {
    'freelance-service': ['freelance', 'contractor', 'hire', 'developer', 'designer', 'writer'],
    'product-trade': ['import', 'export', 'trade', 'supplier', 'shipment', 'goods', 'products'],
    'consulting': ['consulting', 'advisory', 'strategy', 'guidance', 'expertise'],
    'creative-work': ['creative', 'design', 'art', 'content', 'video', 'photography'],
    'software-development': ['software', 'app', 'website', 'platform', 'code', 'development'],
    'marketing-campaign': ['marketing', 'campaign', 'influencer', 'promotion', 'advertising'],
    'licensing': ['license', 'rights', 'royalty', 'intellectual property'],
    'retainer': ['retainer', 'monthly', 'ongoing', 'subscription'],
  }
  
  for (const [type, indicators] of Object.entries(projectTypeIndicators)) {
    if (indicators.some(ind => lowerPrompt.includes(ind))) {
      extractedData.projectType = type as ProjectRequirements['projectType']
      break
    }
  }
  
  if (!extractedData.projectType) {
    missingCritical.push('Project type could not be determined')
    clarificationQuestions.push('What type of project is this? (e.g., freelance work, product trade, consulting)')
  }
  
  // Check for parties
  const payerIndicators = ['client', 'buyer', 'customer', 'company', 'employer', 'I need', 'I want', 'we need']
  const payeeIndicators = ['freelancer', 'contractor', 'supplier', 'vendor', 'provider', 'developer', 'designer']
  
  const hasPayer = payerIndicators.some(ind => lowerPrompt.includes(ind))
  const hasPayee = payeeIndicators.some(ind => lowerPrompt.includes(ind))
  
  if (!hasPayer && !hasPayee) {
    missingCritical.push('Parties (payer and payee) not clearly defined')
    clarificationQuestions.push('Who are the parties involved? Who is paying and who is providing the service/goods?')
  } else if (!hasPayer) {
    missingCritical.push('Payer (client/buyer) not clearly defined')
  } else if (!hasPayee) {
    missingCritical.push('Payee (provider/seller) not clearly defined')
  }
  
  // Check for deliverables
  const deliverableIndicators = ['deliver', 'create', 'build', 'provide', 'produce', 'design', 'develop', 'write', 'milestone']
  const hasDeliverables = deliverableIndicators.some(ind => lowerPrompt.includes(ind))
  
  if (!hasDeliverables) {
    missingCritical.push('Deliverables not specified')
    clarificationQuestions.push('What are the specific deliverables or outputs expected?')
  }
  
  // Check for payment information
  const currencyRegex = /\$[\d,]+|\d+\s*(usd|usdc|eth|eur|gbp)|budget\s*(of|is|:)?\s*[\d,]+/i
  const hasPayment = currencyRegex.test(prompt) || lowerPrompt.includes('payment') || lowerPrompt.includes('pay')
  
  if (!hasPayment) {
    missingCritical.push('Payment amount or structure not specified')
    clarificationQuestions.push('What is the total budget/payment amount and how should it be structured?')
  } else {
    // Try to extract amount
    const amountMatch = prompt.match(/\$?([\d,]+)\s*(k|K|thousand|million)?/i)
    if (amountMatch) {
      let amount = parseFloat(amountMatch[1].replace(/,/g, ''))
      if (amountMatch[2]?.toLowerCase() === 'k' || amountMatch[2]?.toLowerCase() === 'thousand') {
        amount *= 1000
      } else if (amountMatch[2]?.toLowerCase() === 'million') {
        amount *= 1000000
      }
      extractedData.payment = {
        totalAmount: amount,
        currency: 'USD',
        breakdown: [],
      } as PaymentStructure
    }
  }
  
  // Check for timeline
  const timelineIndicators = ['week', 'month', 'day', 'hour', 'deadline', 'by', 'within', 'timeline', 'duration', 'phase']
  const hasTimeline = timelineIndicators.some(ind => lowerPrompt.includes(ind))
  
  if (!hasTimeline) {
    missingOptional.push('Timeline not specified')
    clarificationQuestions.push('What is the expected timeline or deadline for this project?')
  }
  
  // Check for milestone structure
  const milestoneMatch = prompt.match(/(\d+)\s*milestone/i)
  const phaseMatch = prompt.match(/(\d+)\s*phase/i)
  const milestoneCount = milestoneMatch ? parseInt(milestoneMatch[1]) : (phaseMatch ? parseInt(phaseMatch[1]) : 0)
  
  if (hasPayment && milestoneCount > 0) {
    // Check if payment split is specified
    const splitIndicators = ['split', 'tranche', 'installment', '%', 'percent', 'upfront', 'upon completion']
    const hasSplit = splitIndicators.some(ind => lowerPrompt.includes(ind))
    
    if (!hasSplit) {
      ambiguities.push('Multiple milestones detected but payment split not specified')
      clarificationQuestions.push(`How should the payment be split across the ${milestoneCount} milestones?`)
    }
  }
  
  // Check for conditions
  const conditionIndicators = ['if', 'approval', 'review', 'inspection', 'quality', 'condition', 'contingent']
  const hasConditions = conditionIndicators.some(ind => lowerPrompt.includes(ind))
  
  if (!hasConditions) {
    missingOptional.push('No conditions or approval requirements specified')
  }
  
  // Calculate confidence score
  const criticalCount = 4 // parties, deliverables, payment, timeline
  const foundCritical = criticalCount - missingCritical.length
  const confidence = Math.round((foundCritical / criticalCount) * 100)
  
  return {
    confidence,
    extractedData,
    missingCritical,
    missingOptional,
    ambiguities,
    clarificationQuestions: clarificationQuestions.slice(0, 3), // Limit to 3 questions
  }
}

// =============================================================================
// SCOPE COMPLETENESS CHECKLIST
// =============================================================================

export interface ScopeChecklistItem {
  id: string
  category: 'parties' | 'deliverables' | 'timeline' | 'payment' | 'conditions' | 'legal'
  label: string
  description: string
  isRequired: boolean
  isComplete: boolean
  value?: string
}

export function generateScopeChecklist(requirements: Partial<ProjectRequirements>): ScopeChecklistItem[] {
  const checklist: ScopeChecklistItem[] = [
    // Parties
    {
      id: 'payer',
      category: 'parties',
      label: 'Payer Defined',
      description: 'The party who will fund the contract',
      isRequired: true,
      isComplete: !!requirements.parties?.some(p => p.role === 'payer'),
      value: requirements.parties?.find(p => p.role === 'payer')?.identifier,
    },
    {
      id: 'payee',
      category: 'parties',
      label: 'Payee Defined',
      description: 'The party who will receive payment for services/goods',
      isRequired: true,
      isComplete: !!requirements.parties?.some(p => p.role === 'payee'),
      value: requirements.parties?.find(p => p.role === 'payee')?.identifier,
    },
    // Deliverables
    {
      id: 'deliverables',
      category: 'deliverables',
      label: 'Deliverables Specified',
      description: 'Clear list of what will be delivered',
      isRequired: true,
      isComplete: (requirements.deliverables?.length ?? 0) > 0,
      value: requirements.deliverables?.length ? `${requirements.deliverables.length} deliverable(s)` : undefined,
    },
    {
      id: 'acceptance-criteria',
      category: 'deliverables',
      label: 'Acceptance Criteria',
      description: 'How deliverables will be evaluated',
      isRequired: true,
      isComplete: requirements.deliverables?.every(d => d.acceptanceCriteria.length > 0) ?? false,
    },
    // Timeline
    {
      id: 'duration',
      category: 'timeline',
      label: 'Project Duration',
      description: 'Total expected project length',
      isRequired: true,
      isComplete: !!requirements.timeline?.totalDuration,
      value: requirements.timeline?.totalDuration 
        ? `${requirements.timeline.totalDuration.value} ${requirements.timeline.totalDuration.unit}` 
        : undefined,
    },
    {
      id: 'phases',
      category: 'timeline',
      label: 'Project Phases',
      description: 'Breakdown of project into phases/milestones',
      isRequired: false,
      isComplete: (requirements.timeline?.phases?.length ?? 0) > 0,
      value: requirements.timeline?.phases?.length ? `${requirements.timeline.phases.length} phase(s)` : undefined,
    },
    // Payment
    {
      id: 'total-amount',
      category: 'payment',
      label: 'Total Payment Amount',
      description: 'The full contract value',
      isRequired: true,
      isComplete: !!requirements.payment?.totalAmount,
      value: requirements.payment?.totalAmount 
        ? `${requirements.payment.totalAmount} ${requirements.payment.currency}` 
        : undefined,
    },
    {
      id: 'payment-structure',
      category: 'payment',
      label: 'Payment Structure',
      description: 'How payments are split (upfront, milestones, etc.)',
      isRequired: true,
      isComplete: (requirements.payment?.breakdown?.length ?? 0) > 0,
      value: requirements.payment?.breakdown?.length 
        ? `${requirements.payment.breakdown.length} payment(s)` 
        : undefined,
    },
    // Conditions
    {
      id: 'approval-process',
      category: 'conditions',
      label: 'Approval Process',
      description: 'How deliverables are approved',
      isRequired: false,
      isComplete: requirements.risksAndConditions?.some(r => r.type === 'approval') ?? false,
    },
    {
      id: 'quality-checks',
      category: 'conditions',
      label: 'Quality Checks',
      description: 'Quality assurance conditions',
      isRequired: false,
      isComplete: requirements.risksAndConditions?.some(r => r.type === 'quality') ?? false,
    },
    // Legal
    {
      id: 'termination-clause',
      category: 'legal',
      label: 'Termination Clause',
      description: 'Conditions for contract termination',
      isRequired: true,
      isComplete: requirements.legalClauses?.some(c => c.type === 'termination') ?? false,
    },
    {
      id: 'dispute-resolution',
      category: 'legal',
      label: 'Dispute Resolution',
      description: 'How disputes will be handled',
      isRequired: false,
      isComplete: requirements.legalClauses?.some(c => c.type === 'dispute-resolution') ?? false,
    },
  ]
  
  return checklist
}

export function calculateChecklistCompletion(checklist: ScopeChecklistItem[]): {
  total: number
  completed: number
  requiredTotal: number
  requiredCompleted: number
  percentage: number
  requiredPercentage: number
} {
  const total = checklist.length
  const completed = checklist.filter(item => item.isComplete).length
  const requiredItems = checklist.filter(item => item.isRequired)
  const requiredTotal = requiredItems.length
  const requiredCompleted = requiredItems.filter(item => item.isComplete).length
  
  return {
    total,
    completed,
    requiredTotal,
    requiredCompleted,
    percentage: Math.round((completed / total) * 100),
    requiredPercentage: Math.round((requiredCompleted / requiredTotal) * 100),
  }
}
