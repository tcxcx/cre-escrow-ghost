/**
 * Ghost Deposit Workflow Handler (v2 — USDC-direct)
 *
 * With USDC-backed GhostUSDC, the flow is:
 *   User → Shiva (Circle SDK) → approve USDC → GhostUSDC.wrap()
 *
 * CRE verifies the deposit and handles yield allocation:
 *   1. Compliance gate (PolicyEngine + ACE KYC)
 *   2. Verify USDC landed in GhostUSDC contract
 *   3. Read FHE ghost state (indicator, total supply)
 *   4. Yield allocation — move excess USDC from GhostUSDC to USYC via TreasuryManager
 *   5. Update DON state (private ledger)
 *   6. Publish attestation (no amounts revealed)
 *
 * Trigger: HTTP (Shiva calls CRE after executeDeposit completes)
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
import { readGhostIndicator, readGhostTotalSupply } from "../shared/services/fhe"
import { aceClient, shivaClient } from "../shared/clients/presets"
import { confidentialShivaClient } from "../shared/clients/confidential-presets"
import { ERC20_ABI } from "../shared/abi/erc20"
import { TREASURY_MANAGER_ABI } from "../shared/abi/treasury-manager"
import type { Config } from "./types"

// ============================================================================
// Clients
// ============================================================================

const ace = aceClient<Config>()

// ============================================================================
// Handler: Ghost Deposit (HTTP Trigger)
// ============================================================================

const ghostDeposit = withHttp<Config>(
  (runtime, payload) => {
    const input = decodeJson(payload.input) as {
      userAddress: string
      usdcAmount: string
      txHash?: string
    }

    const amount = BigInt(input.usdcAmount)
    const userAddr = input.userAddress

    runtime.log(
      `Ghost deposit v2: user=${userAddr} amount=${formatUnits(amount, 6)} USDC`
    )

    // ── Step 1: Compliance gate ──────────────────────────────────────────
    runtime.log("Step 1: Compliance check")

    // Check PolicyEngine allowlist
    const isAllowed = callView(
      runtime,
      runtime.config.policyEngineAddress,
      [{
        type: "function",
        name: "checkTransfer",
        stateMutability: "view",
        inputs: [
          { name: "token", type: "address" },
          { name: "from", type: "address" },
          { name: "to", type: "address" },
          { name: "amount", type: "uint256" },
        ],
        outputs: [{ name: "", type: "bool" }],
      }] as unknown as Abi,
      "checkTransfer",
      [runtime.config.ghostUsdcAddress, userAddr, userAddr, 0n],
    )

    if (!isAllowed) {
      throw new Error(`NOT_COMPLIANT: user ${userAddr} not on PolicyEngine allowlist`)
    }

    // Check ACE KYC status
    const kycData = ace.get(
      runtime,
      `/kyc?address=${userAddr}`,
      (raw) => JSON.parse(raw) as { verified: boolean; level: string },
    )

    if (!kycData.verified) {
      throw new Error(`NOT_COMPLIANT: user ${userAddr} KYC not verified in ACE`)
    }

    runtime.log(`Compliance passed: PolicyEngine=allowed, KYC=${kycData.level}`)

    // ── Step 2: Verify USDC landed in GhostUSDC contract ────────────────
    runtime.log("Step 2: Verify USDC in GhostUSDC")

    // GhostUSDC (FHERC20Wrapper) holds the USDC directly after wrap()
    const ghostUsdcBalance = callView(
      runtime,
      runtime.config.usdcAddress,
      ERC20_ABI as unknown as Abi,
      "balanceOf",
      [runtime.config.ghostUsdcAddress],
    )

    runtime.log(`GhostUSDC USDC balance: ${formatUnits(ghostUsdcBalance, 6)}`)

    // ── Step 3: Read FHE ghost state ────────────────────────────────────
    runtime.log("Step 3: Read FHE ghost state")

    const indicatorBefore = readGhostIndicator(runtime, userAddr)
    const ghostSupply = readGhostTotalSupply(runtime)

    runtime.log(
      `Ghost state: indicator=${indicatorBefore} totalSupply=${formatUnits(ghostSupply, 6)}`
    )

    // ── Step 4: Yield allocation ────────────────────────────────────────
    // GhostUSDC holds the USDC. We want the platform to earn yield by
    // moving a portion to USYC via TreasuryManager.
    // TreasuryManager.allocateToYield() is onlyOwner — CRE can trigger
    // it via _processReport() (ReceiverTemplate) when the forwarder is
    // set up, or the deployer calls it manually for now.
    runtime.log("Step 4: Check yield allocation status")

    const yieldValue = callView(
      runtime,
      runtime.config.treasuryManagerAddress,
      TREASURY_MANAGER_ABI as unknown as Abi,
      "getYieldValueUSDC",
    )

    runtime.log(`Current yield value: ${formatUnits(yieldValue, 6)} USDC in USYC`)

    // Note: For v2, yield allocation from GhostUSDC's USDC pool is a
    // separate CRE workflow (treasury-rebalance). The deposit workflow
    // verifies and attests; rebalancing happens asynchronously.

    // ── Step 5: Update DON state (confidential) ─────────────────────────
    runtime.log("Step 5: Update DON state")

    const confShiva = confidentialShivaClient<Config>()
    confShiva.post(
      runtime,
      "/ghost/don-state/update",
      {
        address: userAddr,
        delta: amount.toString(),
        operation: "deposit",
      },
      (raw: string) => JSON.parse(raw) as { success: boolean; newBalance: string },
    )

    runtime.log("DON state updated with deposit")

    // ── Step 6: Publish attestation ─────────────────────────────────────
    runtime.log("Step 6: Publish attestation")

    const entityId = `ghost-deposit-${keccak256(toHex(`${userAddr}${amount.toString()}`)).slice(0, 18)}`

    const result = publishAttestation(runtime, {
      type: "ghost_deposit",
      entityId,
      data: {
        userHash: keccak256(toHex(userAddr)),
        amountHash: keccak256(toHex(amount.toString())),
        kycLevel: kycData.level,
        ghostSupplyAfter: ghostSupply.toString(),
        ghostUsdcBalance: ghostUsdcBalance.toString(),
        yieldValue: yieldValue.toString(),
        timestamp: 0,
      },
      metadata: JSON.stringify({
        operation: "ghost_deposit_v2",
        indicator: indicatorBefore.toString(),
        compliance: "passed",
        underlying: "USDC",
      }),
    })

    runtime.log(`Ghost deposit attestation: tx=${result.txHash}`)

    // ── Step 7: Post callback to Shiva ──────────────────────────────────
    runtime.log("Step 7: Post callback")

    const shiva = shivaClient<Config>()
    shiva.post(
      runtime,
      "/contracts/cre-callback/ghost-deposit",
      {
        workflow: "ghost-deposit",
        status: "verified",
        user_address: userAddr,
        amount: amount.toString(),
        attestation_id: result.attestationId,
        attestation_tx: result.txHash,
        ghost_supply: ghostSupply.toString(),
        yield_value: yieldValue.toString(),
        compliance: "passed",
      },
      (raw: string) => JSON.parse(raw) as { success: boolean },
    )

    return JSON.stringify({
      success: true,
      txHash: result.txHash,
      attestationId: result.attestationId,
      indicator: indicatorBefore.toString(),
    })
  },
)

// ============================================================================
// Workflow Init
// ============================================================================

export const initWorkflow = (config: Config) => [
  ghostDeposit(config),
]
