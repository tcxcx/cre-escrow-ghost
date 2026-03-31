// SECURITY: requires auth — allocate escrow funds to yield strategy
import { NextResponse } from 'next/server'
import { requireAuth, requireRateLimit, getErrorMessage } from '@bu/api-helpers'
import { getLimiter } from '@bu/kv/ratelimit'
import { createLogger } from '@bu/logger'
import { getShivaUrl } from '@/lib/shiva-actions'
import { getContractById } from '@bu/supabase/queries/contracts'
import { getTeamMembershipByUserAndTeam } from '@bu/supabase/queries/teams'
import { getPrimaryTeamWalletByTeamId } from '@bu/supabase/queries/wallets'

const logger = createLogger({ prefix: 'api:contracts:escrow:yield:allocate' })

/** Map Circle blockchain identifiers to EVM chain IDs */
const BLOCKCHAIN_TO_CHAIN_ID: Record<string, number> = {
  'ETH-SEPOLIA': 11155111,
  ETH: 1,
  BASE: 8453,
  ARB: 42161,
  OP: 10,
  MATIC: 137,
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { user, supabase, error: authError } = await requireAuth()
    if (authError) return authError

    const { error: rlError } = await requireRateLimit(
      `user:${user.id}`,
      getLimiter('critical'),
    )
    if (rlError) return rlError

    const { id } = await params
    const body = await request.json()
    const { amount, strategyId, strategyNetwork } = body as {
      amount: number
      strategyId: string
      strategyNetwork?: string
    }

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Amount must be a positive number' },
        { status: 400 },
      )
    }

    if (!strategyId) {
      return NextResponse.json(
        { success: false, error: 'Strategy ID is required' },
        { status: 400 },
      )
    }

    // 1. Verify the user owns this contract
    const { data: contract, error: contractError } = await getContractById(supabase, id)

    if (contractError || !contract) {
      return NextResponse.json(
        { success: false, error: 'Contract not found' },
        { status: 404 },
      )
    }

    const { data: membership } = await getTeamMembershipByUserAndTeam(
      supabase,
      user.id,
      contract.team_id,
    )

    if (!membership) {
      return NextResponse.json(
        { success: false, error: 'Not authorized for this contract' },
        { status: 403 },
      )
    }

    // 2. Verify escrow has sufficient funded balance for allocation
    if (amount > contract.funded_amount) {
      return NextResponse.json(
        { success: false, error: 'Insufficient idle escrow balance' },
        { status: 400 },
      )
    }

    // 3. Get the payer's wallet for executing the DeFi transaction
    const wallet = await getPrimaryTeamWalletByTeamId(supabase, contract.team_id)

    if (!wallet?.circle_wallet_id || !wallet?.wallet_address) {
      return NextResponse.json(
        { success: false, error: 'No wallet found for yield allocation' },
        { status: 400 },
      )
    }

    const walletChainId = BLOCKCHAIN_TO_CHAIN_ID[wallet.blockchain ?? 'ETH'] ?? 1

    // 4. Get session token for Shiva auth
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.access_token) {
      return NextResponse.json(
        { success: false, error: 'Missing session token' },
        { status: 401 },
      )
    }

    logger.info('Yield allocation requested', {
      contractId: id,
      userId: user.id,
      amount,
      strategyId,
      walletId: wallet.circle_wallet_id,
    })

    // 5. Call Shiva /earn/execute to allocate funds to the yield strategy
    const shivaUrl = await getShivaUrl()

    const shivaResponse = await fetch(`${shivaUrl}/earn/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        walletId: wallet.circle_wallet_id,
        walletAddress: wallet.wallet_address,
        walletChainId,
        strategyId,
        action: 'lend',
        amount: amount.toString(),
        currency: 'USDC',
        strategyNetwork,
      }),
    })

    const result = await shivaResponse.json()

    if (!result.success) {
      logger.error('Shiva earn execution failed', {
        contractId: id,
        error: result.error,
      })
      return NextResponse.json(
        { success: false, error: result.error ?? 'Yield allocation failed' },
        { status: shivaResponse.status >= 400 ? shivaResponse.status : 500 },
      )
    }

    // 6. Trigger CRE workflow-escrow-yield for TreasuryManager on-chain yield allocation (non-fatal)
    // CRE calls TreasuryManager.allocateToYield() to move idle USDC → USYC
    import('@/lib/cre-trigger')
      .then(({ triggerCreWorkflow }) =>
        triggerCreWorkflow({
          action: 'escrow_yield_deposit',
          payload: {
            action: 'deposit',
            agreementId: id,
            escrowAddress: wallet.wallet_address,
            strategyId,
            amount: amount.toString(),
            transactionId: result.transactionId,
          },
        }),
      )
      .catch(() => {
        // CRE trigger is non-fatal — yield allocation verified asynchronously
        logger.warn('CRE escrow-yield trigger failed (non-fatal)', { contractId: id })
      })

    return NextResponse.json({
      success: true,
      contractId: id,
      amount,
      strategyId,
      transactionId: result.transactionId,
      status: 'depositing',
    })
  } catch (error) {
    logger.error('Yield allocation failed', {
      error: (error as Error).message,
    })
    return NextResponse.json(
      { success: false, error: getErrorMessage(error) },
      { status: 500 },
    )
  }
}
