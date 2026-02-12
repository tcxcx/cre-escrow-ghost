/**
 * AgreementJSON — Canonical agreement schema
 *
 * This is the single source of truth that CRE workflows operate on.
 * Both React Flow template graphs and uploaded PDF/DOCX documents
 * compile to this same schema.
 *
 * All amounts use 6-decimal integer strings (USDC/EURC native format).
 * 1 USDC = "1000000"
 */

import { z } from 'zod'

// ── Sub-schemas ────────────────────────────────────────────────────────────

export const PartySchema = z.object({
  partyId: z.string(),
  role: z.enum(['payer', 'payee']),
  name: z.string(),
  email: z.string().optional(),
  walletAddress: z.string().optional(),
  kyc: z.object({
    required: z.boolean(),
    status: z.enum(['not_started', 'pending', 'in_review', 'approved', 'declined', 'expired']).default('not_started'),
  }).optional(),
})

export const SignatureSchema = z.object({
  signatureId: z.string(),
  required: z.boolean(),
  signerRole: z.enum(['payer', 'payee', 'witness']),
  signerEmail: z.string().optional(),
})

export const AcceptanceCriterionSchema = z.object({
  criterionId: z.string(),
  text: z.string(),
  type: z.enum(['binary', 'quantitative', 'qualitative']).default('qualitative'),
  threshold: z.string().optional(),
  weight: z.number().default(1),
})

export const DeliverableSchema = z.object({
  type: z.enum(['pdf', 'image', 'zip', 'github', 'figma', 'url', 'other']),
  description: z.string(),
  required: z.boolean().default(true),
})

export const DisputeConfigSchema = z.object({
  disputeWindowSeconds: z.number().default(604800), // 7 days
  appealWindowSeconds: z.number().default(259200),  // 3 days
  evidenceWindowSeconds: z.number().default(604800), // 7 days
  maxResubmissions: z.number().default(3),
  verificationConfidenceThreshold: z.number().default(80),
})

export const MilestoneSchema = z.object({
  milestoneId: z.string(),
  title: z.string(),
  description: z.string().default(''),
  /** Amount in 6-decimal token units (e.g., "1000000" = 1 USDC) */
  amount: z.string(),
  dueDate: z.string().nullable().default(null),
  deliverables: z.array(DeliverableSchema).default([]),
  acceptanceCriteria: z.array(AcceptanceCriterionSchema).default([]),
  aiVerificationPrompt: z.string().nullable().default(null),
  dispute: DisputeConfigSchema.default({}),
})

export const PaymentSchema = z.object({
  paymentId: z.string(),
  triggerType: z.enum(['milestone-completion', 'manual', 'time-based']),
  amount: z.string(),
  milestoneId: z.string().nullable().default(null),
})

export const CommissionSchema = z.object({
  commissionId: z.string(),
  recipientName: z.string(),
  recipientAddress: z.string(),
  /** Basis points (e.g., 1000 = 10%) */
  percentageBps: z.number(),
  trigger: z.enum(['on-milestone', 'on-completion', 'on-signature']),
  triggerMilestoneId: z.string().nullable().default(null),
})

export const IdentityVerificationSchema = z.object({
  verificationType: z.enum(['kyc', 'kyb', 'both']),
  requiredFor: z.enum(['payer', 'payee', 'both']),
  triggerPoint: z.enum(['before_signing', 'before_funding', 'before_milestone']),
  milestoneId: z.string().nullable().default(null),
  requirements: z.object({
    blockSanctioned: z.boolean().default(true),
  }).default({}),
})

export const AgentPolicySchema = z.object({
  executorAgentId: z.string().optional(),
  verifierAgentIds: z.array(z.string()).default([]),
  advocateAgentIds: z.array(z.string()).default([]),
  tribunalPoolAgentIds: z.array(z.string()).default([]),
  supremeCourtPoolAgentIds: z.array(z.string()).default([]),
  selectionPolicy: z.object({
    diversity: z.boolean().default(true),
    minReputationScore: z.number().default(0),
  }).default({}),
})

export const FeesSchema = z.object({
  /** Protocol fee in basis points (e.g., 50 = 0.5%) */
  protocolFeeBps: z.number().default(50),
  /** Maximum total commission bps (e.g., 1000 = 10%) */
  maxCommissionTotalBps: z.number().default(1000),
  jurorFee: z.object({
    mode: z.enum(['fixed', 'bps']),
    value: z.string(),
  }).optional(),
})

export const ConditionSchema = z.object({
  conditionId: z.string(),
  type: z.enum(['if-else', 'approval', 'time-based']),
  expr: z.string(),
  trueLabel: z.string().default('Proceed'),
  falseLabel: z.string().default('Review'),
  targets: z.array(z.string()).default([]),
})

export const ClauseSchema = z.object({
  clauseId: z.string(),
  title: z.string(),
  content: z.string(),
  aiGenerated: z.boolean().default(false),
})

// ── Root AgreementJSON Schema ──────────────────────────────────────────────

export const AgreementJSONSchema = z.object({
  schemaVersion: z.literal('1.0'),
  agreementId: z.string(),
  templateId: z.string().nullable().default(null),
  title: z.string(),
  category: z.enum(['freelance', 'business', 'creator', 'trade', 'legal', 'fundraising', 'team']).default('business'),
  hasAiEscrow: z.boolean().default(true),
  chain: z.enum(['ethereum', 'polygon', 'arbitrum', 'base', 'avalanche']).default('avalanche'),
  currency: z.enum(['USDC', 'EURC']).default('USDC'),

  parties: z.array(PartySchema),
  signatures: z.array(SignatureSchema).default([]),
  milestones: z.array(MilestoneSchema).default([]),
  payments: z.array(PaymentSchema).default([]),
  commissions: z.array(CommissionSchema).default([]),
  conditions: z.array(ConditionSchema).default([]),
  clauses: z.array(ClauseSchema).default([]),
  identityVerification: z.array(IdentityVerificationSchema).default([]),
  agentPolicy: AgentPolicySchema.default({}),
  fees: FeesSchema.default({}),

  hashing: z.object({
    algo: z.literal('sha256').default('sha256'),
    agreementHash: z.string().optional(),
  }).default({}),

  storage: z.object({
    agreementUri: z.string().optional(),
    rawDocUri: z.string().optional(),
  }).default({}),
})

// ── Type Exports ───────────────────────────────────────────────────────────

export type AgreementJSON = z.infer<typeof AgreementJSONSchema>
export type Party = z.infer<typeof PartySchema>
export type Milestone = z.infer<typeof MilestoneSchema>
export type AcceptanceCriterion = z.infer<typeof AcceptanceCriterionSchema>
export type Deliverable = z.infer<typeof DeliverableSchema>
export type Payment = z.infer<typeof PaymentSchema>
export type Commission = z.infer<typeof CommissionSchema>
export type Condition = z.infer<typeof ConditionSchema>
export type Clause = z.infer<typeof ClauseSchema>
export type Signature = z.infer<typeof SignatureSchema>
export type AgentPolicy = z.infer<typeof AgentPolicySchema>
export type Fees = z.infer<typeof FeesSchema>
export type DisputeConfig = z.infer<typeof DisputeConfigSchema>
