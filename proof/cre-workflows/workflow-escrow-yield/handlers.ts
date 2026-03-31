/**
 * Escrow Yield Handlers
 *
 * Deposit/redeem escrow funds to Deframe yield strategies (Pods).
 * Regular clients only -- financial ops, no IP confidentiality needed.
 *
 * Single HTTP handler:
 *   - deposit: read escrow totalAmount -> pick best Deframe strategy -> execute deposit via Motora
 *   - redeem: fetch yield position -> execute withdraw via Motora
 */

import { decodeJson, type Runtime, type HTTPPayload } from "@chainlink/cre-sdk"
import { formatUnits, type Abi } from "viem"
import { withHttp } from "../shared/triggers"
import { motoraClient, supabaseClient } from "../shared/clients/presets"
import { publishAttestation } from "../shared/services/attestation"
import { callView } from "../shared/services/evm"
import { readTotalAmount } from "../shared/services/escrow"
import { TREASURY_MANAGER_ABI } from "../shared/abi/treasury-manager"
import type { Config, YieldPayload } from "./types"

// ============================================================================
// Platform clients
// ============================================================================

const motora = motoraClient<Config>()
const supabase = supabaseClient<Config>()

// ============================================================================
// Types
// ============================================================================

interface Agreement {
  id: string
  agreement_json: {
    yieldStrategy?: {
      enabled: boolean
      strategyId?: string
    }
  }
  yield_position?: {
    strategyId: string
    amount: string
    depositedAt: string
  }
}

interface DeframeStrategy {
  id: string
  name: string
  apy: number
  asset: string
  network: string
}

interface EarnExecuteResponse {
  txHash: string
  status: string
}

// ============================================================================
// Helpers
// ============================================================================

function fetchAgreement(
  runtime: Runtime<Config>,
  agreementId: string
): Agreement {
  return supabase.get(
    runtime,
    `/agreements?select=id,agreement_json,yield_position&id=eq.${agreementId}`,
    (raw) => {
      const rows = JSON.parse(raw) as Agreement[]
      if (rows.length === 0) {
        throw new Error(`Agreement not found: ${agreementId}`)
      }
      return rows[0]
    }
  )
}

function fetchStrategies(
  runtime: Runtime<Config>
): DeframeStrategy[] {
  return motora.get(
    runtime,
    "/earn/strategies?asset=USDC&network=base",
    (raw) => JSON.parse(raw) as DeframeStrategy[]
  )
}

function pickBestStrategy(
  strategies: DeframeStrategy[],
  preferredId?: string
): DeframeStrategy {
  if (preferredId) {
    const match = strategies.find((s) => s.id === preferredId)
    if (match) return match
  }
  // Sort by APY descending, pick highest
  const sorted = [...strategies].sort((a, b) => b.apy - a.apy)
  if (sorted.length === 0) {
    throw new Error("No Deframe strategies available for USDC on Base")
  }
  return sorted[0]
}

function executeEarn(
  runtime: Runtime<Config>,
  strategyId: string,
  action: "lend" | "withdraw",
  amount: string,
  wallet: string
): EarnExecuteResponse {
  return motora.post(
    runtime,
    "/earn/execute",
    { strategyId, action, amount, wallet },
    (raw) => JSON.parse(raw) as EarnExecuteResponse
  )
}

function updateAgreementYieldPosition(
  runtime: Runtime<Config>,
  agreementId: string,
  yieldPosition: Record<string, unknown>
): void {
  supabase.patch(
    runtime,
    `/agreements?id=eq.${agreementId}`,
    { yield_position: yieldPosition },
    () => undefined
  )
}

// ============================================================================
// Deposit Flow
// ============================================================================

function handleDeposit(
  runtime: Runtime<Config>,
  payload: YieldPayload
): string {
  const { agreementId, escrowAddress, strategyId } = payload

  runtime.log(`Yield deposit: agreement=${agreementId} escrow=${escrowAddress}`)

  // 1. Fetch agreement from Supabase
  const agreement = fetchAgreement(runtime, agreementId)

  // 2. Check yieldStrategy is enabled
  const yieldConfig = agreement.agreement_json?.yieldStrategy
  if (!yieldConfig?.enabled) {
    throw new Error(
      `Yield strategy not enabled for agreement ${agreementId}`
    )
  }

  // 3. Read escrow totalAmount on-chain
  const totalAmount = readTotalAmount(runtime, escrowAddress)
  const amountStr = payload.amount ?? totalAmount.toString()

  runtime.log(
    `Escrow total: ${formatUnits(totalAmount, 6)} USDC, depositing: ${amountStr}`
  )

  // 4. Query Deframe strategies via Motora
  const strategies = fetchStrategies(runtime)
  runtime.log(`Found ${strategies.length} Deframe strategies`)

  // 5. Pick best strategy (or use specified strategyId)
  const chosen = pickBestStrategy(
    strategies,
    strategyId ?? yieldConfig.strategyId
  )
  runtime.log(
    `Selected strategy: ${chosen.name} (${chosen.id}) APY=${chosen.apy}%`
  )

  // 6. Execute deposit via Motora
  const result = executeEarn(
    runtime,
    chosen.id,
    "lend",
    amountStr,
    escrowAddress
  )
  runtime.log(`Deposit executed: tx=${result.txHash} status=${result.status}`)

  // 7. Update Supabase with yield position
  updateAgreementYieldPosition(runtime, agreementId, {
    strategyId: chosen.id,
    strategyName: chosen.name,
    apy: chosen.apy,
    amount: amountStr,
    depositedAt: new Date().toISOString(),
    txHash: result.txHash,
  })

  // 7b. Verify TreasuryManager yield state on-chain
  // Read current yield value and backing to include in attestation
  const yieldValue = callView(
    runtime,
    runtime.config.treasuryManagerAddress,
    TREASURY_MANAGER_ABI as unknown as Abi,
    "getYieldValueUSDC",
  )

  const [usdcBuffer, yieldInUsyc, totalBacking] = callView(
    runtime,
    runtime.config.treasuryManagerAddress,
    TREASURY_MANAGER_ABI as unknown as Abi,
    "getTotalBacking",
  ) as unknown as [bigint, bigint, bigint]

  runtime.log(
    `TreasuryManager state: yieldValue=${formatUnits(yieldValue, 6)} buffer=${formatUnits(usdcBuffer, 6)} total=${formatUnits(totalBacking, 6)}`
  )

  // 8. Publish attestation
  const attestation = publishAttestation(runtime, {
    type: "escrow_yield_deposit",
    entityId: `yield-deposit-${agreementId}`,
    data: {
      agreementId,
      escrowAddress,
      strategyId: chosen.id,
      strategyName: chosen.name,
      apy: chosen.apy.toString(),
      amount: amountStr,
      txHash: result.txHash,
      treasuryYieldValue: yieldValue.toString(),
      treasuryUsdcBuffer: usdcBuffer.toString(),
      treasuryTotalBacking: totalBacking.toString(),
    },
    metadata: JSON.stringify({
      agreementId,
      strategyId: chosen.id,
      amount: amountStr,
      treasuryManager: runtime.config.treasuryManagerAddress,
    }),
  })

  runtime.log(`Deposit attestation: ${attestation.txHash}`)
  return `Yield deposit: strategy=${chosen.name} amount=${amountStr} tx=${result.txHash} attestation=${attestation.txHash}`
}

// ============================================================================
// Redeem Flow
// ============================================================================

function handleRedeem(
  runtime: Runtime<Config>,
  payload: YieldPayload
): string {
  const { agreementId, escrowAddress } = payload

  runtime.log(`Yield redeem: agreement=${agreementId} escrow=${escrowAddress}`)

  // 1. Fetch yield position from Supabase
  const agreement = fetchAgreement(runtime, agreementId)
  const position = agreement.yield_position

  if (!position) {
    throw new Error(
      `No yield position found for agreement ${agreementId}`
    )
  }

  runtime.log(
    `Redeeming: strategy=${position.strategyId} amount=${position.amount}`
  )

  // 2. Execute redeem via Motora
  const result = executeEarn(
    runtime,
    position.strategyId,
    "withdraw",
    payload.amount ?? position.amount,
    escrowAddress
  )
  runtime.log(`Redeem executed: tx=${result.txHash} status=${result.status}`)

  // 3. Update Supabase (clear yield position)
  updateAgreementYieldPosition(runtime, agreementId, {
    strategyId: position.strategyId,
    amount: position.amount,
    depositedAt: position.depositedAt,
    redeemedAt: new Date().toISOString(),
    redeemTxHash: result.txHash,
    closed: true,
  })

  // 4. Publish attestation
  const attestation = publishAttestation(runtime, {
    type: "escrow_yield_redeem",
    entityId: `yield-redeem-${agreementId}`,
    data: {
      agreementId,
      escrowAddress,
      strategyId: position.strategyId,
      amount: payload.amount ?? position.amount,
      txHash: result.txHash,
    },
    metadata: JSON.stringify({
      agreementId,
      strategyId: position.strategyId,
      amount: payload.amount ?? position.amount,
    }),
  })

  runtime.log(`Redeem attestation: ${attestation.txHash}`)
  return `Yield redeem: strategy=${position.strategyId} amount=${payload.amount ?? position.amount} tx=${result.txHash} attestation=${attestation.txHash}`
}

// ============================================================================
// HTTP Handler
// ============================================================================

const escrowYieldHandler = withHttp<Config>(
  (runtime, payload) => {
    const input = decodeJson(payload.input) as YieldPayload

    if (!input.action || !input.agreementId || !input.escrowAddress) {
      throw new Error(
        "Missing required fields: action, agreementId, escrowAddress"
      )
    }

    switch (input.action) {
      case "deposit":
        return handleDeposit(runtime, input)
      case "redeem":
        return handleRedeem(runtime, input)
      default:
        throw new Error(`Unknown action: ${(input as { action: string }).action}`)
    }
  }
)

// ============================================================================
// Workflow Init
// ============================================================================

export const initWorkflow = (config: Config) => [
  escrowYieldHandler(config),
]
