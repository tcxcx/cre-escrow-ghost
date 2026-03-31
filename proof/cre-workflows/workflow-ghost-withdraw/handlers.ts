/**
 * Ghost Withdraw Workflow Handler (v2 — USDC-direct)
 *
 * With USDC-backed GhostUSDC, the withdraw flow is:
 *   User → Shiva (Circle SDK) → GhostUSDC.unwrap() → FHE decrypt → claimUnwrapped() → USDC returned
 *
 * CRE verifies the withdrawal:
 *   1. Validate DON state (balance check, no blocks)
 *   2. Read FHE ghost state before unwrap
 *   3. Check claim status (FHE decrypt progress)
 *   4. Verify backing (USDC in GhostUSDC + USYC yield via TreasuryManager)
 *   5. Update DON state
 *   6. Publish attestation (no amounts revealed)
 *
 * Trigger: HTTP (Shiva calls CRE when user requests withdrawal)
 */

import {
  decodeJson,
  type Runtime,
  type HTTPPayload,
} from "@chainlink/cre-sdk"
import { formatUnits, keccak256, toHex, type Abi } from "viem"
import { withHttp } from "../shared/triggers"
import { publishAttestation } from "../shared/services/attestation"
import { callView } from "../shared/services/evm"
import { readGhostIndicator, readGhostTotalSupply, readUserClaims, readClaim } from "../shared/services/fhe"
import { shivaClient } from "../shared/clients/presets"
import { confidentialShivaClient } from "../shared/clients/confidential-presets"
import { ERC20_ABI } from "../shared/abi/erc20"
import { TREASURY_MANAGER_ABI } from "../shared/abi/treasury-manager"
import type { Config } from "./types"

// ============================================================================
// Clients
// ============================================================================

const confShiva = confidentialShivaClient<Config>()

// ============================================================================
// Handler: Ghost Withdraw (HTTP Trigger)
// ============================================================================

const ghostWithdraw = withHttp<Config>(
  (runtime, payload) => {
    const input = decodeJson(payload.input) as {
      userAddress: string
      amount: string
    }

    const amount = BigInt(input.amount)
    const userAddr = input.userAddress

    runtime.log(
      `Ghost withdraw v2: user=${userAddr} amount=${formatUnits(amount, 6)}`
    )

    // ── Step 1: Validate DON state (confidential) ───────────────────────
    runtime.log("Step 1: Validate DON state")

    const donState = confShiva.post(
      runtime,
      "/ghost/don-state/query",
      { address: userAddr },
      (raw: string) => JSON.parse(raw) as {
        balance: string
        verified: boolean
        blocked: boolean
      },
    )

    if (donState.blocked) {
      throw new Error(`BLOCKED: user ${userAddr} has a withdrawal block`)
    }

    const donBalance = BigInt(donState.balance)
    if (donBalance < amount) {
      throw new Error(
        `INSUFFICIENT: DON balance ${formatUnits(donBalance, 6)} < requested ${formatUnits(amount, 6)}`
      )
    }

    runtime.log(`DON state: balance=${formatUnits(donBalance, 6)} verified=${donState.verified}`)

    // ── Step 2: Read current ghost state ─────────────────────────────────
    runtime.log("Step 2: Read ghost state before unwrap")

    const indicatorBefore = readGhostIndicator(runtime, userAddr)
    const ghostSupply = readGhostTotalSupply(runtime)

    runtime.log(
      `Ghost state: indicator=${indicatorBefore} totalSupply=${formatUnits(ghostSupply, 6)}`
    )

    // ── Step 3: FHE unwrap (async) ───────────────────────────────────────
    runtime.log("Step 3: FHE unwrap initiated")

    // The actual unwrap transaction is initiated by Shiva API.
    // CRE monitors the claim state and orchestrates the downstream steps.
    const claims = readUserClaims(runtime, userAddr)
    runtime.log(`User has ${claims.length} total claims`)

    // ── Step 4: Verify claim status ──────────────────────────────────────
    runtime.log("Step 4: Check claim status")

    let activeClaim: { claimId: bigint; amount: bigint; ctHash: bigint } | null = null
    for (let i = claims.length - 1; i >= 0; i--) {
      const claim = readClaim(runtime, claims[i]!)
      if (!claim.claimed && claim.amount === amount) {
        activeClaim = { claimId: claims[i]!, amount: claim.amount, ctHash: claim.ctHash }
        break
      }
    }

    if (!activeClaim) {
      throw new Error(`NO_ACTIVE_CLAIM: no unclaimed claim found for user ${userAddr} amount ${formatUnits(amount, 6)}`)
    }

    runtime.log(
      `Active claim found: id=${activeClaim.claimId} amount=${formatUnits(activeClaim.amount, 6)} ctHash=${activeClaim.ctHash}`
    )

    // ── Step 5: Verify backing (USDC in GhostUSDC + USYC yield) ────────
    runtime.log("Step 5: Verify backing for withdrawal")

    // With USDC-direct GhostUSDC, the backing is:
    // 1. USDC held by GhostUSDC contract (available for immediate claims)
    // 2. USYC held by TreasuryManager (yield, redeemable to USDC)
    const ghostUsdcBalance = callView(
      runtime,
      runtime.config.usdcAddress,
      ERC20_ABI as unknown as Abi,
      "balanceOf",
      [runtime.config.ghostUsdcAddress],
    )

    const yieldValue = callView(
      runtime,
      runtime.config.treasuryManagerAddress,
      TREASURY_MANAGER_ABI as unknown as Abi,
      "getYieldValueUSDC",
    )

    const totalBacking = ghostUsdcBalance + yieldValue

    runtime.log(
      `Backing: GhostUSDC USDC=${formatUnits(ghostUsdcBalance, 6)} yield=${formatUnits(yieldValue, 6)} total=${formatUnits(totalBacking, 6)}`
    )

    if (ghostUsdcBalance < amount) {
      runtime.log(
        `WARNING: GhostUSDC USDC buffer (${formatUnits(ghostUsdcBalance, 6)}) < withdrawal (${formatUnits(amount, 6)}). ` +
        `TreasuryManager must redeem USYC before claim can succeed.`
      )
    }

    // ── Step 6: Update DON state (confidential) ─────────────────────────
    runtime.log("Step 6: Update DON state")

    confShiva.post(
      runtime,
      "/ghost/don-state/update",
      {
        address: userAddr,
        delta: `-${amount.toString()}`,
        operation: "withdraw",
      },
      (raw: string) => JSON.parse(raw) as { success: boolean; newBalance: string },
    )

    runtime.log("DON state updated with withdrawal")

    // ── Step 7: Publish attestation ──────────────────────────────────────
    runtime.log("Step 7: Publish attestation")

    const entityId = `ghost-withdraw-${keccak256(toHex(`${userAddr}${amount.toString()}`)).slice(0, 18)}`

    const result = publishAttestation(runtime, {
      type: "ghost_withdraw",
      entityId,
      data: {
        userHash: keccak256(toHex(userAddr)),
        amountHash: keccak256(toHex(amount.toString())),
        ghostSupplyBefore: ghostSupply.toString(),
        ghostUsdcBalance: ghostUsdcBalance.toString(),
        yieldBacking: yieldValue.toString(),
        totalBacking: totalBacking.toString(),
        claimId: activeClaim?.claimId.toString() ?? "pending",
        timestamp: 0,
      },
      metadata: JSON.stringify({
        operation: "ghost_withdraw_v2",
        indicator: indicatorBefore.toString(),
        underlying: "USDC",
      }),
    })

    runtime.log(`Ghost withdraw attestation: tx=${result.txHash}`)

    // ── Step 8: Post callback to Shiva ──────────────────────────────────
    runtime.log("Post callback to Shiva")
    const shiva = shivaClient<Config>()
    shiva.post(
      runtime,
      "/contracts/cre-callback/ghost-withdraw",
      {
        workflow: "ghost-withdraw",
        status: "verified",
        user_address: userAddr,
        attestation_id: result.attestationId,
        attestation_tx: result.txHash,
      },
      (raw: string) => JSON.parse(raw) as { success: boolean },
    )

    return JSON.stringify({
      success: true,
      txHash: result.txHash,
      attestationId: result.attestationId,
      claimId: activeClaim?.claimId.toString() ?? null,
      ctHash: activeClaim?.ctHash.toString() ?? null,
    })
  },
)

// ============================================================================
// Workflow Init
// ============================================================================

export const initWorkflow = (config: Config) => [
  ghostWithdraw(config),
]
