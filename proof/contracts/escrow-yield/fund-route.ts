// SECURITY: requires auth — fund an agreement
import { NextResponse } from 'next/server'
import { requireAuth, requireRateLimit } from '@bu/api-helpers'
import { getLimiter } from '@bu/kv/ratelimit'
import { createCustomHonoClient } from '@bu/hono-client'
import { getHonoApiUrl } from '@bu/env/app'
import { createLogger } from '@bu/logger'
import {
  getAgreementEmailContext,
  triggerFundedEmail,
} from '../../_lib/trigger-email'
import { triggerPaymentFundedNotification } from '../../_lib/trigger-notification'

const logger = createLogger({ prefix: 'api:contracts:agreements' })

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { user, supabase, error: authError } = await requireAuth()
    if (authError) return authError

    const { error: rlError } = await requireRateLimit(
      `user:${user.id}`,
      getLimiter('standard'),
    )
    if (rlError) return rlError

    const { id } = await params
    const body = await request.json()

    const {
      data: { session },
    } = await supabase.auth.getSession()
    const client = createCustomHonoClient(
      async () => session?.access_token ?? null,
      { baseUrl: getHonoApiUrl() },
    )

    const result = await client.contracts.fund(id, body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.statusCode ?? 500 },
      )
    }

    // Fire-and-forget: insert payment_released notification (escrow funded)
    triggerPaymentFundedNotification({
      supabase,
      userId: user.id,
      agreementId: id,
      contractTitle: (result.data as Record<string, unknown>)?.title as string ?? 'Contract',
    })

    // Fire-and-forget: trigger CRE escrow-yield workflow to allocate idle USDC → USYC
    // TreasuryManager handles the on-chain yield allocation via CRE workflow
    import('@/lib/cre-trigger')
      .then(({ triggerCreWorkflow }) =>
        triggerCreWorkflow({
          action: 'escrow_yield_deposit',
          payload: {
            action: 'deposit',
            agreementId: id,
            escrowAddress: (result.data as Record<string, unknown>)?.escrow_address as string ?? '',
            amount: String((result.data as Record<string, unknown>)?.funded_amount ?? body.amount ?? 0),
          },
        }),
      )
      .catch(() => {
        // CRE trigger is non-fatal — yield allocation can be retried manually
        logger.warn('CRE escrow-yield trigger failed (non-fatal)', { agreementId: id })
      })

    // Fire-and-forget: notify both parties that escrow is funded
    getAgreementEmailContext(client.contracts, id).then((ctx) => {
      if (!ctx) return
      const firstMs = ctx.milestones[0]
      const recipients = [ctx.payer, ctx.payee].filter(
        (p): p is NonNullable<typeof p> => !!p?.email,
      )
      for (const recipient of recipients) {
        triggerFundedEmail({
          recipientEmail: recipient.email!,
          recipientName: recipient.name,
          contractTitle: ctx.title,
          fundedAmount: ctx.totalAmount,
          currency: ctx.currency,
          payerName: ctx.payer?.name ?? 'Payer',
          firstMilestoneTitle: firstMs?.title ?? 'First Milestone',
          link: ctx.link,
        })
      }
    }).catch(() => { /* non-fatal */ })

    return NextResponse.json(result.data)
  } catch (error) {
    logger.error('Failed to fund agreement', {
      error: (error as Error).message,
    })
    return NextResponse.json(
      { error: 'Internal error' },
      { status: 500 },
    )
  }
}
