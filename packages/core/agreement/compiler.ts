/**
 * Agreement Compiler — React Flow graph → AgreementJSON
 *
 * Compiles the contract-builder's nodes + edges into the canonical
 * AgreementJSON format that CRE workflows operate on.
 *
 * Node type mapping (per plan section 3.1):
 *   party-payer / party-payee → parties[]
 *   signature → signatures[]
 *   milestone → milestones[]
 *   payment → payments[]
 *   commission → commissions[]
 *   condition → conditions[]
 *   clause → clauses[]
 *   identity-verification → identityVerification[]
 *
 * Edge semantics:
 *   milestone → payment: resolves payment.milestoneId
 *   condition → payment: payment is condition-gated
 */

import type { AgreementJSON } from './schema'
import { STABLECOIN_DECIMALS } from '@repo/erc-8004/types'

// ── Input Types (from React Flow) ──────────────────────────────────────────

interface GraphNode {
  id: string
  type: string
  data: Record<string, unknown> & { label: string }
}

interface GraphEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
}

interface CompilerInput {
  nodes: GraphNode[]
  edges: GraphEdge[]
  settings?: {
    chain?: string
    currency?: string
    yieldStrategy?: string
    totalAmount?: number
  }
  templateId?: string
  title?: string
}

// ── Compiler ───────────────────────────────────────────────────────────────

/**
 * Compile a React Flow graph into an AgreementJSON.
 *
 * This is the bridge between the visual contract builder UI and the
 * canonical format that CRE workflows consume.
 */
export function compileGraphToAgreement(input: CompilerInput): AgreementJSON {
  const { nodes, edges, settings, templateId, title } = input

  const agreementId = `agr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  // Extract nodes by type
  const partyNodes = nodes.filter((n) => n.type === 'party-payer' || n.type === 'party-payee')
  const milestoneNodes = nodes.filter((n) => n.type === 'milestone')
  const paymentNodes = nodes.filter((n) => n.type === 'payment')
  const signatureNodes = nodes.filter((n) => n.type === 'signature')
  const commissionNodes = nodes.filter((n) => n.type === 'commission')
  const conditionNodes = nodes.filter((n) => n.type === 'condition')
  const clauseNodes = nodes.filter((n) => n.type === 'clause')
  const idVerificationNodes = nodes.filter((n) => n.type === 'identity-verification')

  // Build edge lookup: source -> targets
  const edgesBySource = new Map<string, string[]>()
  for (const edge of edges) {
    const targets = edgesBySource.get(edge.source) ?? []
    targets.push(edge.target)
    edgesBySource.set(edge.source, targets)
  }

  // Build reverse edge lookup: target -> sources
  const edgesByTarget = new Map<string, string[]>()
  for (const edge of edges) {
    const sources = edgesByTarget.get(edge.target) ?? []
    sources.push(edge.source)
    edgesByTarget.set(edge.target, sources)
  }

  // ── Compile parties ────────────────────────────────────────────────────

  const parties = partyNodes.map((node) => ({
    partyId: node.id,
    role: (node.data.role as 'payer' | 'payee') ?? (node.type === 'party-payer' ? 'payer' : 'payee'),
    name: (node.data.name as string) ?? node.data.label,
    email: (node.data.email as string) ?? undefined,
    walletAddress: (node.data.walletAddress as string) ?? undefined,
  }))

  // ── Compile signatures ─────────────────────────────────────────────────

  const signatures = signatureNodes.map((node) => ({
    signatureId: node.id,
    required: (node.data.required as boolean) ?? true,
    signerRole: (node.data.signerRole as 'payer' | 'payee' | 'witness') ?? 'payer',
    signerEmail: node.data.signerEmail as string | undefined,
  }))

  // ── Compile milestones ─────────────────────────────────────────────────

  const currency = (settings?.currency ?? 'USDC') as 'USDC' | 'EURC'

  const milestones = milestoneNodes.map((node, index) => {
    const amountHuman = (node.data.amount as number) ?? 0
    const amount = String(Math.round(amountHuman * 10 ** STABLECOIN_DECIMALS))

    return {
      milestoneId: node.id,
      title: (node.data.title as string) ?? node.data.label,
      description: (node.data.description as string) ?? '',
      amount,
      dueDate: (node.data.dueDate as string) ?? null,
      deliverables: [] as Array<{ type: 'pdf' | 'image' | 'zip' | 'github' | 'figma' | 'url' | 'other'; description: string; required: boolean }>,
      acceptanceCriteria: (node.data.verificationCriteria as string)
        ? [{
            criterionId: `${node.id}_c0`,
            text: node.data.verificationCriteria as string,
            type: 'qualitative' as const,
            weight: 1,
          }]
        : [],
      aiVerificationPrompt: (node.data.aiVerificationPrompt as string) ?? null,
      dispute: {
        disputeWindowSeconds: 604800,
        appealWindowSeconds: 259200,
        evidenceWindowSeconds: 604800,
        maxResubmissions: 3,
        verificationConfidenceThreshold: 80,
      },
    }
  })

  // ── Compile payments (resolve milestoneId via edges) ────────────────────

  const payments = paymentNodes.map((node) => {
    // Find upstream milestone via edges (milestone -> ... -> payment)
    const sources = edgesByTarget.get(node.id) ?? []
    const upstreamMilestone = sources.find((srcId) =>
      milestoneNodes.some((m) => m.id === srcId)
    )

    const amountHuman = (node.data.amount as number) ?? 0
    const amount = String(Math.round(amountHuman * 10 ** STABLECOIN_DECIMALS))

    return {
      paymentId: node.id,
      triggerType: (node.data.triggerType as 'milestone-completion' | 'manual' | 'time-based') ?? 'milestone-completion',
      amount,
      milestoneId: upstreamMilestone ?? (node.data.milestoneId as string) ?? null,
    }
  })

  // ── Compile commissions ────────────────────────────────────────────────

  const commissions = commissionNodes.map((node) => ({
    commissionId: node.id,
    recipientName: (node.data.recipientName as string) ?? '',
    recipientAddress: (node.data.recipientAddress as string) ?? '',
    percentageBps: Math.round(((node.data.percentage as number) ?? 0) * 100),
    trigger: 'on-completion' as const,
    triggerMilestoneId: (node.data.triggerMilestoneId as string) ?? null,
  }))

  // ── Compile conditions ─────────────────────────────────────────────────

  const conditions = conditionNodes.map((node) => {
    const targets = edgesBySource.get(node.id) ?? []
    return {
      conditionId: node.id,
      type: (node.data.type as 'if-else' | 'approval' | 'time-based') ?? 'approval',
      expr: (node.data.condition as string) ?? '',
      trueLabel: (node.data.trueLabel as string) ?? 'Proceed',
      falseLabel: (node.data.falseLabel as string) ?? 'Review',
      targets,
    }
  })

  // ── Compile clauses ────────────────────────────────────────────────────

  const clauses = clauseNodes.map((node) => ({
    clauseId: node.id,
    title: (node.data.title as string) ?? node.data.label,
    content: (node.data.content as string) ?? '',
    aiGenerated: (node.data.aiGenerated as boolean) ?? false,
  }))

  // ── Compile identity verification ──────────────────────────────────────

  const identityVerification = idVerificationNodes.map((node) => ({
    verificationType: (node.data.verificationType as 'kyc' | 'kyb' | 'both') ?? 'kyc',
    requiredFor: (node.data.requiredFor as 'payer' | 'payee' | 'both') ?? 'both',
    triggerPoint: (node.data.triggerPoint as 'before_signing' | 'before_funding' | 'before_milestone') ?? 'before_signing',
    milestoneId: (node.data.milestoneId as string) ?? null,
    requirements: {
      blockSanctioned: true,
    },
  }))

  // ── Assemble AgreementJSON ─────────────────────────────────────────────

  return {
    schemaVersion: '1.0' as const,
    agreementId,
    templateId: templateId ?? null,
    title: title ?? 'Untitled Agreement',
    category: 'business',
    hasAiEscrow: milestones.length > 0,
    chain: (settings?.chain as AgreementJSON['chain']) ?? 'avalanche',
    currency,
    parties,
    signatures,
    milestones,
    payments,
    commissions,
    conditions,
    clauses,
    identityVerification,
    agentPolicy: {
      selectionPolicy: { diversity: true, minReputationScore: 0 },
    },
    fees: {
      protocolFeeBps: 50,
      maxCommissionTotalBps: 1000,
    },
    hashing: { algo: 'sha256' as const },
    storage: {},
  }
}
