/**
 * Treasury Rebalance Check Handler
 *
 * Single cron handler that monitors the USDCg treasury buffer ratio
 * and publishes attestations about when rebalancing is needed.
 *
 * The CRE DON is read-only -- it verifies and attests, but doesn't
 * execute state-changing transactions. Shiva reads attestations and
 * executes rebalances.
 */

import { type Runtime } from "@chainlink/cre-sdk"
import { formatUnits, type Abi } from "viem"
import { withCron } from "../shared/triggers"
import { publishAttestation } from "../shared/services/attestation"
import { callView } from "../shared/services/evm"
import { TREASURY_MANAGER_ABI } from "../shared/abi/treasury-manager"
import { USDCG_ABI } from "../shared/abi/usdcg"
import { ERC20_ABI } from "../shared/abi/erc20"
import type { Config } from "./types"

// ============================================================================
// Handler: Treasury Rebalance Check (Cron Trigger)
// ============================================================================

const treasuryRebalanceCheck = withCron<Config>(
  (runtime) => {
    runtime.log("Treasury rebalance check starting")

    // 1. Read on-chain state
    const bufferRatioBPS = callView(
      runtime,
      runtime.config.treasuryManagerAddress,
      TREASURY_MANAGER_ABI as unknown as Abi,
      "getBufferRatioBPS",
    )

    const usdcBuffer = callView(
      runtime,
      runtime.config.usdcAddress,
      ERC20_ABI as unknown as Abi,
      "balanceOf",
      [runtime.config.usdcgAddress],
    )

    const yieldValue = callView(
      runtime,
      runtime.config.treasuryManagerAddress,
      TREASURY_MANAGER_ABI as unknown as Abi,
      "getYieldValueUSDC",
    )

    const totalSupply = callView(
      runtime,
      runtime.config.usdcgAddress,
      USDCG_ABI as unknown as Abi,
      "totalSupply",
    )

    // 2. Compute derived values
    const totalBacking = usdcBuffer + yieldValue
    const upperBPS = BigInt(runtime.config.bufferUpperBPS)
    const lowerBPS = BigInt(runtime.config.bufferLowerBPS)
    const targetBPS = BigInt(runtime.config.bufferTargetBPS)

    // 3. Determine action
    let action = "hold"
    let actionAmount = 0n

    if (bufferRatioBPS > upperBPS && totalSupply > 0n) {
      action = "allocate_to_yield"
      const targetBuffer = (totalSupply * targetBPS) / 10000n
      actionAmount = usdcBuffer > targetBuffer ? usdcBuffer - targetBuffer : 0n
    } else if (bufferRatioBPS < lowerBPS && totalSupply > 0n) {
      action = "redeem_from_yield"
      const targetBuffer = (totalSupply * targetBPS) / 10000n
      actionAmount = targetBuffer > usdcBuffer ? targetBuffer - usdcBuffer : 0n
    }

    runtime.log(
      `Buffer: ${formatUnits(usdcBuffer, 6)} USDC (${bufferRatioBPS} BPS) | Yield: ${formatUnits(yieldValue, 6)} | Action: ${action} ${formatUnits(actionAmount, 6)}`
    )

    // 4. Publish balance_attest attestation
    const result = publishAttestation(runtime, {
      type: "balance_attest",
      entityId: `rebalance-${Math.floor(Date.now() / 1000)}`,
      data: {
        bufferRatioBPS: bufferRatioBPS.toString(),
        usdcBuffer: usdcBuffer.toString(),
        yieldValue: yieldValue.toString(),
        totalBacking: totalBacking.toString(),
        totalSupply: totalSupply.toString(),
        action,
        actionAmount: actionAmount.toString(),
      },
      metadata: JSON.stringify({
        buffer: formatUnits(usdcBuffer, 6),
        yield: formatUnits(yieldValue, 6),
        action,
        amount: formatUnits(actionAmount, 6),
      }),
    })

    runtime.log(`Rebalance attestation: ${result.txHash}`)
    return `Treasury: buffer=${bufferRatioBPS}BPS action=${action} amount=${formatUnits(actionAmount, 6)} tx=${result.txHash}`
  }
)

// ============================================================================
// Workflow Init
// ============================================================================

export const initWorkflow = (config: Config) => [
  treasuryRebalanceCheck(config),
]
