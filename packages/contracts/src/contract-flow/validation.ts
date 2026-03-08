/**
 * @package flow/validation
 * Zod validation schemas for all React Flow node types.
 * Extracted from lib/contract-validation.ts.
 */

import { z } from 'zod'
import type { ContractNode, NodeType } from './types'

// ──────────────────────────────────────────
// Node Validation Schemas
// ──────────────────────────────────────────

export const partySchema = z.object({
  label: z.string().min(1, 'Label is required'),
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  role: z.enum(['payer', 'payee']),
  walletAddress: z.string().optional(),
})

export const milestoneSchema = z.object({
  label: z.string().min(1, 'Label is required'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  amount: z.number().min(0, 'Amount must be positive'),
  currency: z.string().min(1, 'Currency is required'),
  verificationCriteria: z.string().min(1, 'Verification criteria is required'),
  aiVerificationPrompt: z.string().optional(),
  dueDate: z.string().optional(),
})

export const conditionSchema = z.object({
  label: z.string().min(1, 'Label is required'),
  type: z.enum(['if-else', 'approval', 'time-based']),
  condition: z.string().min(1, 'Condition is required'),
  trueLabel: z.string().min(1, 'True branch label is required'),
  falseLabel: z.string().min(1, 'False branch label is required'),
})

export const paymentSchema = z.object({
  label: z.string().min(1, 'Label is required'),
  amount: z.number().min(0, 'Amount must be positive'),
  currency: z.string().min(1, 'Currency is required'),
  triggerType: z.enum(['milestone-completion', 'manual', 'time-based']),
  milestoneId: z.string().optional(),
})

export const signatureSchema = z.object({
  label: z.string().min(1, 'Label is required'),
  required: z.boolean(),
  signerId: z.string().optional(),
  signerRole: z.enum(['payer', 'payee', 'witness']),
  signerEmail: z.string().optional(),
  signedAt: z.string().optional(),
  blockchainTxId: z.string().optional(),
})

export const clauseSchema = z.object({
  label: z.string().min(1, 'Label is required'),
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
  aiGenerated: z.boolean(),
  aiPrompt: z.string().optional(),
})

export const commissionSchema = z.object({
  label: z.string().min(1, 'Label is required'),
  recipientName: z.string().min(1, 'Recipient name is required'),
  recipientAddress: z.string().min(1, 'Wallet address is required'),
  percentage: z.number().min(0).max(10, 'Commission cannot exceed 10%'),
  triggerMilestoneId: z.string().optional(),
})

export const identityVerificationSchema = z.object({
  label: z.string().optional(),
  verificationType: z.enum(['kyc', 'kyb', 'both']),
  requiredFor: z.enum(['payer', 'payee', 'both']),
  triggerPoint: z.enum(['before_signing', 'before_funding', 'before_milestone']),
  milestoneId: z.string().optional(),
  templateId: z.string().optional(),
  requirements: z
    .object({
      kyc: z
        .object({
          governmentId: z.boolean(),
          selfie: z.boolean(),
          proofOfAddress: z.boolean(),
          accreditedInvestor: z.boolean().optional(),
        })
        .optional(),
      kyb: z
        .object({
          businessRegistration: z.boolean(),
          proofOfAddress: z.boolean(),
          beneficialOwners: z.boolean(),
          authorizedSignatory: z.boolean(),
          financialStatements: z.boolean().optional(),
        })
        .optional(),
      allowedCountries: z.array(z.string()).optional(),
      blockedCountries: z.array(z.string()).optional(),
      blockSanctioned: z.boolean(),
    })
    .refine((data) => data.kyc || data.kyb, {
      message: 'At least one verification type (KYC or KYB) must be configured',
    }),
  status: z
    .record(z.enum(['not_started', 'pending', 'in_review', 'approved', 'declined', 'expired']))
    .optional(),
})

// ──────────────────────────────────────────
// Schema Registry
// ──────────────────────────────────────────

export const schemaMap: Record<NodeType, z.ZodSchema> = {
  'party-payer': partySchema,
  'party-payee': partySchema,
  milestone: milestoneSchema,
  condition: conditionSchema,
  payment: paymentSchema,
  signature: signatureSchema,
  clause: clauseSchema,
  commission: commissionSchema,
  'identity-verification': identityVerificationSchema,
}

// ──────────────────────────────────────────
// Validation Helpers
// ──────────────────────────────────────────

// ──────────────────────────────────────────
// Per-Node Validation
// ──────────────────────────────────────────

export interface ValidationResult {
  isValid: boolean
  errors: Record<string, string[]>
}

export function validateNode(node: ContractNode): ValidationResult {
  const schema = schemaMap[node.type]
  if (!schema) {
    return { isValid: true, errors: {} }
  }

  try {
    const result = schema.safeParse(node.data)

    if (result.success) {
      return { isValid: true, errors: {} }
    }

    const errors: Record<string, string[]> = {}
    const zodErrors = result.error?.errors ?? result.error?.issues ?? []

    for (const error of zodErrors) {
      const path = error.path?.join('.') || 'general'
      if (!errors[path]) {
        errors[path] = []
      }
      errors[path].push(error.message)
    }

    return { isValid: false, errors }
  } catch {
    return { isValid: false, errors: { general: ['Validation failed'] } }
  }
}

// ──────────────────────────────────────────
// Structural (Contract-Level) Validation
// ──────────────────────────────────────────

export interface ValidationError {
  message: string
  tip: string
  nodeType?: NodeType
  action?: 'add-node' | 'edit-node' | 'connect-nodes'
}

export interface ContractValidationResult {
  isValid: boolean
  nodeErrors: Record<string, ValidationResult>
  invalidNodeIds: string[]
  structuralErrors: ValidationError[]
  warnings: ValidationError[]
  missingNodeTypes: NodeType[]
}

export function validateContract(nodes: ContractNode[]): ContractValidationResult {
  const nodeErrors: Record<string, ValidationResult> = {}
  const invalidNodeIds: string[] = []
  const structuralErrors: ValidationError[] = []
  const warnings: ValidationError[] = []
  const missingNodeTypes: NodeType[] = []

  // Validate individual nodes
  for (const node of nodes) {
    const result = validateNode(node)
    nodeErrors[node.id] = result
    if (!result.isValid) {
      invalidNodeIds.push(node.id)
    }
  }

  // Get party nodes
  const payerNodes = nodes.filter((n) => n.type === 'party-payer')
  const payeeNodes = nodes.filter((n) => n.type === 'party-payee')
  const signatureNodes = nodes.filter((n) => n.type === 'signature')

  // Validate: At least one payer
  if (payerNodes.length === 0) {
    structuralErrors.push({
      message: 'Contract requires at least one Payer',
      tip: 'Drag a Payer node from the palette onto the canvas',
      nodeType: 'party-payer',
      action: 'add-node',
    })
    missingNodeTypes.push('party-payer')
  }

  // Validate: At least one payee
  if (payeeNodes.length === 0) {
    structuralErrors.push({
      message: 'Contract requires at least one Payee',
      tip: 'Drag a Payee node from the palette onto the canvas',
      nodeType: 'party-payee',
      action: 'add-node',
    })
    missingNodeTypes.push('party-payee')
  }

  // Validate: Dual-signature requirement
  const payerSignatures = signatureNodes.filter((s) => {
    const data = s.data as { signerRole?: string }
    return data.signerRole === 'payer'
  })

  const payeeSignatures = signatureNodes.filter((s) => {
    const data = s.data as { signerRole?: string }
    return data.signerRole === 'payee'
  })

  if (payerNodes.length > 0 && payerSignatures.length < payerNodes.length) {
    structuralErrors.push({
      message: `Payer signature required (${payerSignatures.length}/${payerNodes.length})`,
      tip: 'Add a Signature node with role "Payer" - each party receives an email to sign via Bufi blockchain stamp',
      nodeType: 'signature',
      action: 'add-node',
    })
    if (!missingNodeTypes.includes('signature')) {
      missingNodeTypes.push('signature')
    }
  }

  if (payeeNodes.length > 0 && payeeSignatures.length < payeeNodes.length) {
    structuralErrors.push({
      message: `Payee signature required (${payeeSignatures.length}/${payeeNodes.length})`,
      tip: 'Add a Signature node with role "Payee" - each party receives an email to sign via Bufi blockchain stamp',
      nodeType: 'signature',
      action: 'add-node',
    })
    if (!missingNodeTypes.includes('signature')) {
      missingNodeTypes.push('signature')
    }
  }

  if (payerNodes.length > 0 && payeeNodes.length > 0 && (payerSignatures.length === 0 || payeeSignatures.length === 0)) {
    const missingSide = payerSignatures.length === 0 ? 'Payer' : 'Payee'
    structuralErrors.push({
      message: `Both parties must sign - ${missingSide} signature missing`,
      tip: 'Contracts require signatures from both Payer and Payee for blockchain verification',
      nodeType: 'signature',
      action: 'add-node',
    })
  }

  // Validate commission total doesn't exceed 10%
  const commissionNodes = nodes.filter((n) => n.type === 'commission')
  const totalCommission = commissionNodes.reduce((sum, node) => {
    const data = node.data as { percentage?: number }
    return sum + (data.percentage || 0)
  }, 0)

  if (totalCommission > 10) {
    structuralErrors.push({
      message: `Total commission (${totalCommission}%) exceeds maximum 10%`,
      tip: 'Click on commission nodes and reduce their percentages so the total is 10% or less',
      action: 'edit-node',
    })
  }

  // Warning: No milestones
  const milestoneNodes = nodes.filter((n) => n.type === 'milestone')
  if (milestoneNodes.length === 0 && nodes.length > 0) {
    warnings.push({
      message: 'Consider adding Milestone nodes to define deliverables',
      tip: 'Milestones help break down work into verifiable checkpoints with payments',
      nodeType: 'milestone',
      action: 'add-node',
    })
  }

  return {
    isValid: invalidNodeIds.length === 0 && structuralErrors.length === 0,
    nodeErrors,
    invalidNodeIds,
    structuralErrors,
    warnings,
    missingNodeTypes,
  }
}

// ──────────────────────────────────────────
// Required Fields Map
// ──────────────────────────────────────────

export const requiredFieldsByType: Record<NodeType, string[]> = {
  'party-payer': ['name', 'email'],
  'party-payee': ['name', 'email'],
  milestone: ['title', 'description', 'verificationCriteria'],
  condition: ['condition'],
  payment: ['amount'],
  signature: [],
  clause: ['title', 'content'],
  commission: ['recipientName', 'recipientAddress', 'percentage'],
  'identity-verification': ['verificationType', 'requiredFor', 'requirements'],
}
