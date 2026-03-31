/**
 * Non-blocking contract email triggers
 *
 * Fires Trigger.dev tasks after lifecycle state changes.
 * All calls are fire-and-forget wrapped in try/catch so email
 * failures never break the main API flow.
 */
import { triggerSendContractEmail } from '@bu/trigger/client'
import { createLogger } from '@bu/logger'
import { getAppUrl } from '@bu/env/app'

const logger = createLogger({ prefix: 'api:contracts:email' })

type EmailPayload = Parameters<typeof triggerSendContractEmail>[0]

/**
 * Fire-and-forget email trigger. Never throws.
 */
function fireEmail(payload: EmailPayload): void {
  triggerSendContractEmail(payload).catch((err) => {
    logger.warn('Failed to trigger contract email (non-fatal)', {
      template: payload.template,
      to: payload.to,
      error: (err as Error).message,
    })
  })
}

// ============================================================================
// Agreement data helpers
// ============================================================================

interface PartyInfo {
  name: string
  email: string | undefined
  role: 'payer' | 'payee'
}

interface AgreementEmailContext {
  title: string
  totalAmount: string
  currency: string
  payer: PartyInfo | undefined
  payee: PartyInfo | undefined
  milestones: Array<{ title: string; amount: string; index: number }>
  milestoneCount: number
  link: string
}

function buildContractLink(agreementId: string): string {
  const base = getAppUrl() ? `https://${getAppUrl()}` : 'https://desk.bu.finance'
  return `${base}/contracts/${agreementId}`
}

/**
 * Fetch agreement details and extract email-relevant context.
 * Returns null if the fetch fails (caller should skip email silently).
 */
/**
 * Accepts any object with a `.get(id)` method matching the ContractsService shape.
 * This avoids importing the class directly — routes pass `client.contracts`.
 */
interface ContractsGetter {
  get(id: string): Promise<{ success: boolean; data?: Record<string, unknown> }>
}

export async function getAgreementEmailContext(
  contractsClient: ContractsGetter,
  agreementId: string,
): Promise<AgreementEmailContext | null> {
  try {
    const detail = await contractsClient.get(agreementId)
    if (!detail.success || !detail.data) return null

    const ag = detail.data as Record<string, unknown>
    const json = (ag.agreement_json ?? {}) as Record<string, unknown>
    const parties = (json.parties ?? []) as Array<{ role: string; name: string; email?: string }>
    const jsonMilestones = (json.milestones ?? []) as Array<{ title?: string; amount?: string }>
    const dbMilestones = (ag.milestones ?? []) as Array<{ title?: string; amount?: string }>
    const currency = (json.currency as string) ?? 'USDC'

    const payer = parties.find((p) => p.role === 'payer')
    const payee = parties.find((p) => p.role === 'payee')

    return {
      title: (ag.title as string) ?? 'Untitled Contract',
      totalAmount: (ag.total_amount as string) ?? '0',
      currency,
      payer: payer ? { name: payer.name, email: payer.email, role: 'payer' } : undefined,
      payee: payee ? { name: payee.name, email: payee.email, role: 'payee' } : undefined,
      milestones: dbMilestones.map((ms, i: number) => ({
        title: ms.title ?? jsonMilestones[i]?.title ?? `Milestone ${i + 1}`,
        amount: ms.amount ?? jsonMilestones[i]?.amount ?? '0',
        index: i + 1,
      })),
      milestoneCount: dbMilestones.length || jsonMilestones.length,
      link: buildContractLink(agreementId),
    }
  } catch (err) {
    logger.warn('Failed to fetch agreement for email context (non-fatal)', {
      agreementId,
      error: (err as Error).message,
    })
    return null
  }
}

// ============================================================================
// Lifecycle email triggers
// ============================================================================

export function triggerInvitationEmail(opts: {
  recipientEmail: string
  recipientName: string
  senderName: string
  senderTeamName: string
  contractTitle: string
  totalAmount: string
  currency: string
  milestoneCount: number
  link: string
}): void {
  fireEmail({
    template: 'contract-invitation',
    to: opts.recipientEmail,
    subject: `You've been invited to sign "${opts.contractTitle}"`,
    props: {
      recipientName: opts.recipientName,
      senderName: opts.senderName,
      senderTeamName: opts.senderTeamName,
      contractTitle: opts.contractTitle,
      totalAmount: opts.totalAmount,
      currency: opts.currency,
      milestoneCount: opts.milestoneCount,
      link: opts.link,
    },
  })
}

export function triggerSignedEmail(opts: {
  recipientEmail: string
  recipientName: string
  contractTitle: string
  totalAmount: string
  currency: string
  payerName: string
  payeeName: string
  signedAt: string
  link: string
}): void {
  fireEmail({
    template: 'contract-signed',
    to: opts.recipientEmail,
    subject: `Contract "${opts.contractTitle}" has been fully signed`,
    props: {
      recipientName: opts.recipientName,
      contractTitle: opts.contractTitle,
      totalAmount: opts.totalAmount,
      currency: opts.currency,
      payerName: opts.payerName,
      payeeName: opts.payeeName,
      signedAt: opts.signedAt,
      link: opts.link,
    },
  })
}

export function triggerFundedEmail(opts: {
  recipientEmail: string
  recipientName: string
  contractTitle: string
  fundedAmount: string
  currency: string
  payerName: string
  firstMilestoneTitle: string
  link: string
}): void {
  fireEmail({
    template: 'contract-funded',
    to: opts.recipientEmail,
    subject: `Escrow funded — "${opts.contractTitle}" is ready to begin`,
    props: {
      recipientName: opts.recipientName,
      contractTitle: opts.contractTitle,
      fundedAmount: opts.fundedAmount,
      currency: opts.currency,
      payerName: opts.payerName,
      firstMilestoneTitle: opts.firstMilestoneTitle,
      link: opts.link,
    },
  })
}

export function triggerDeliverableSubmittedEmail(opts: {
  recipientEmail: string
  recipientName: string
  payeeName: string
  contractTitle: string
  milestoneTitle: string
  milestoneIndex: number
  totalMilestones: number
  milestoneAmount: string
  currency: string
  link: string
}): void {
  fireEmail({
    template: 'contract-deliverable-submitted',
    to: opts.recipientEmail,
    subject: `Deliverable submitted for "${opts.milestoneTitle}"`,
    props: {
      recipientName: opts.recipientName,
      payeeName: opts.payeeName,
      contractTitle: opts.contractTitle,
      milestoneTitle: opts.milestoneTitle,
      milestoneIndex: opts.milestoneIndex,
      totalMilestones: opts.totalMilestones,
      milestoneAmount: opts.milestoneAmount,
      currency: opts.currency,
      link: opts.link,
    },
  })
}

export function triggerDisputeResolvedEmail(opts: {
  recipientEmail: string
  recipientName: string
  contractTitle: string
  milestoneTitle: string
  finalVerdict: 'APPROVE' | 'DENY' | 'PARTIAL'
  payeePercentage: number
  milestoneAmount: string
  currency: string
  arbitrationLayer: string
  summary: string
  canAppeal: boolean
  link: string
}): void {
  fireEmail({
    template: 'contract-dispute-resolved',
    to: opts.recipientEmail,
    subject: `Dispute resolved — "${opts.milestoneTitle}"`,
    props: {
      recipientName: opts.recipientName,
      contractTitle: opts.contractTitle,
      milestoneTitle: opts.milestoneTitle,
      finalVerdict: opts.finalVerdict,
      payeePercentage: opts.payeePercentage,
      milestoneAmount: opts.milestoneAmount,
      currency: opts.currency,
      arbitrationLayer: opts.arbitrationLayer,
      summary: opts.summary,
      canAppeal: opts.canAppeal,
      link: opts.link,
    },
  })
}

export function triggerVerificationResultEmail(opts: {
  recipientEmail: string
  recipientName: string
  contractTitle: string
  milestoneTitle: string
  milestoneIndex: number
  verdict: 'PASS' | 'REJECTED'
  confidence: number
  summary: string
  disputeWindowDays: number
  link: string
}): void {
  fireEmail({
    template: 'contract-verification-result',
    to: opts.recipientEmail,
    subject: `AI Verification ${opts.verdict === 'PASS' ? 'Passed' : 'Rejected'}: ${opts.milestoneTitle}`,
    props: {
      recipientName: opts.recipientName,
      contractTitle: opts.contractTitle,
      milestoneTitle: opts.milestoneTitle,
      milestoneIndex: opts.milestoneIndex,
      verdict: opts.verdict,
      confidence: opts.confidence,
      summary: opts.summary,
      disputeWindowDays: opts.disputeWindowDays,
      link: opts.link,
    },
  })
}

export function triggerCompletedEmail(opts: {
  recipientEmail: string
  recipientName: string
  contractTitle: string
  totalAmount: string
  totalReleased: string
  currency: string
  milestoneCount: number
  payerName: string
  payeeName: string
  completedAt: string
  link: string
}): void {
  fireEmail({
    template: 'contract-completed',
    to: opts.recipientEmail,
    subject: `Contract "${opts.contractTitle}" completed`,
    props: {
      recipientName: opts.recipientName,
      contractTitle: opts.contractTitle,
      totalAmount: opts.totalAmount,
      totalReleased: opts.totalReleased,
      currency: opts.currency,
      milestoneCount: opts.milestoneCount,
      payerName: opts.payerName,
      payeeName: opts.payeeName,
      completedAt: opts.completedAt,
      link: opts.link,
    },
  })
}
