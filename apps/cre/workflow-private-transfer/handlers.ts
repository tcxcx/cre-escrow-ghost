/**
 * Private Transfer Pipeline Handlers (USDCg)
 *
 * Three handlers that register and monitor the Ghost Mode private transfer pipeline:
 *
 * 1. Vault Event Monitor (EVM Log) -- watches Deposit/Withdraw on ACE Vault
 * 2. Private Transfer Verifier (HTTP) -- on-demand transfer verification
 * 3. Proof of Reserves (Cron) -- periodic USDCg backing check (USDC buffer + USYC yield)
 */

import {
  decodeJson,
  bytesToHex,
  type Runtime,
  type EVMLog,
  type HTTPPayload,
  type CronPayload,
} from "@chainlink/cre-sdk"
import {
  decodeEventLog,
  toEventSelector,
  formatUnits,
  type Abi,
} from "viem"
import { withLog, withHttp, withCron } from "../shared/triggers"
import { aceClient } from "../shared/clients/presets"
import { publishAttestation } from "../shared/services/attestation"
import { callView } from "../shared/services/evm"
import { VAULT_ABI } from "../shared/abi/vault"
import { USDCG_ABI } from "../shared/abi/usdcg"
import { TREASURY_MANAGER_ABI } from "../shared/abi/treasury-manager"
import { ERC20_ABI } from "../shared/abi/erc20"
import type { Config } from "./types"

// ============================================================================
// ACE API client + on-chain read helpers
// ============================================================================

const ace = aceClient<Config>()

/** Read USDCg totalSupply */
function readTotalSupply(runtime: Runtime<Config>): bigint {
  return callView(runtime, runtime.config.usdcgAddress, USDCG_ABI as unknown as Abi, "totalSupply")
}

/** Read USDC balance held by USDCg contract (liquid buffer) */
function readUsdcBuffer(runtime: Runtime<Config>): bigint {
  return callView(
    runtime,
    runtime.config.usdcAddress,
    ERC20_ABI as unknown as Abi,
    "balanceOf",
    [runtime.config.usdcgAddress],
  )
}

/** Read USYC yield valued in USDC via TreasuryManager */
function readYieldValue(runtime: Runtime<Config>): bigint {
  return callView(
    runtime,
    runtime.config.treasuryManagerAddress,
    TREASURY_MANAGER_ABI as unknown as Abi,
    "getYieldValueUSDC",
  )
}

// ============================================================================
// Event topic hashes for Vault Deposit/Withdraw
// ============================================================================

const DEPOSIT_TOPIC = toEventSelector("Deposit(address,address,uint256)")
const WITHDRAW_TOPIC = toEventSelector("Withdraw(address,address,uint256)")

// ============================================================================
// Handler 1: Vault Event Monitor (EVM Log Trigger)
// ============================================================================

const vaultEventMonitor = withLog<Config>(
  {
    getAddresses: (config) => [config.vaultAddress],
    getTopics: () => [DEPOSIT_TOPIC, WITHDRAW_TOPIC],
  },
  (runtime, log) => {
    // Decode the event
    const decoded = decodeEventLog({
      abi: VAULT_ABI,
      data: bytesToHex(log.data) as `0x${string}`,
      topics: log.topics.map(
        (t) => bytesToHex(t) as `0x${string}`
      ),
    })

    const eventName = decoded.eventName
    const { token, account, amount } = decoded.args as {
      token: string
      account: string
      amount: bigint
    }

    runtime.log(`Vault ${eventName}: token=${token} account=${account} amount=${amount}`)

    // Only process USDCg events
    if (token.toLowerCase() !== runtime.config.usdcgAddress.toLowerCase()) {
      runtime.log(`Skipping non-USDCg token: ${token}`)
      return `Skipped non-USDCg ${eventName} event`
    }

    // Cross-reference off-chain balance via ACE API
    const balanceData = ace.get(
      runtime,
      `/balances?account=${account}&token=${token}`,
      (raw) => JSON.parse(raw) as { balance: string; verified: boolean }
    )

    runtime.log(`ACE balance for ${account}: ${balanceData.balance} (verified=${balanceData.verified})`)

    // Publish attestation
    const result = publishAttestation(runtime, {
      type: "transfer_verify",
      entityId: `vault-${eventName.toLowerCase()}-${account}-${amount}`,
      data: {
        event: eventName,
        token,
        account,
        amount: amount.toString(),
        offChainBalance: balanceData.balance,
        offChainVerified: balanceData.verified,
      },
      metadata: JSON.stringify({
        event: eventName,
        account,
        amount: amount.toString(),
      }),
    })

    runtime.log(`Attestation published: ${result.txHash}`)
    return `Vault ${eventName} verified: ${result.txHash}`
  }
)

// ============================================================================
// Handler 2: Private Transfer Verifier (HTTP Trigger)
// ============================================================================

const privateTransferVerifier = withHttp<Config>(
  (runtime, payload) => {
    const input = decodeJson(payload.input) as {
      sender: string
      recipient: string
      token: string
      amount: string
      txId: string
    }

    runtime.log(`Transfer verify: ${input.txId} (${input.amount} ${input.token})`)

    // Step 1: Verify off-chain via ACE API
    const txData = ace.get(
      runtime,
      `/transactions?txId=${input.txId}`,
      (raw) => JSON.parse(raw) as {
        status: string
        amount: string
        sender: string
        recipient: string
        verified: boolean
      }
    )

    if (!txData.verified) {
      throw new Error(`Transaction ${input.txId} not verified by ACE`)
    }

    runtime.log(`ACE verified: status=${txData.status} amount=${txData.amount}`)

    // Step 2: Verify USDCg backing holds (USDC buffer + USYC yield)
    const totalSupply = readTotalSupply(runtime)
    const usdcBuffer = readUsdcBuffer(runtime)
    const yieldValue = readYieldValue(runtime)
    const totalBacking = usdcBuffer + yieldValue
    const backingRatio = totalBacking > 0n && totalSupply > 0n
      ? Number(totalBacking * 10000n / totalSupply) / 10000
      : 0

    runtime.log(
      `Backing: buffer=${formatUnits(usdcBuffer, 6)} yield=${formatUnits(yieldValue, 6)} total=${formatUnits(totalBacking, 6)} / USDCg=${formatUnits(totalSupply, 6)} ratio=${backingRatio}`
    )

    if (backingRatio < 1.0) {
      runtime.log(`WARNING: Backing ratio below 1.0: ${backingRatio}`)
    }

    // Step 3: Publish attestation
    const result = publishAttestation(runtime, {
      type: "transfer_verify",
      entityId: input.txId,
      data: {
        sender: input.sender,
        recipient: input.recipient,
        token: input.token,
        amount: input.amount,
        aceVerified: txData.verified,
        aceStatus: txData.status,
        backingRatio: backingRatio.toString(),
        totalSupply: totalSupply.toString(),
        usdcBuffer: usdcBuffer.toString(),
        yieldValue: yieldValue.toString(),
        totalBacking: totalBacking.toString(),
      },
      metadata: JSON.stringify({
        txId: input.txId,
        amount: input.amount,
        backingRatio: backingRatio.toString(),
      }),
    })

    runtime.log(`Transfer attestation published: ${result.txHash}`)
    return `Transfer ${input.txId} verified: ${result.txHash}`
  }
)

// ============================================================================
// Handler 3: Proof of Reserves (Cron Trigger)
// ============================================================================

const proofOfReserves = withCron<Config>(
  (runtime) => {
    runtime.log("Proof of reserves check starting")

    // Read on-chain state
    const totalSupply = readTotalSupply(runtime)
    const usdcBuffer = readUsdcBuffer(runtime)
    const yieldValue = readYieldValue(runtime)
    const totalBacking = usdcBuffer + yieldValue

    const backingRatio = totalSupply > 0n
      ? Number(totalBacking * 10000n / totalSupply) / 10000
      : 1.0

    const isFullyBacked = backingRatio >= 1.0
    const revenue = totalBacking > totalSupply ? totalBacking - totalSupply : 0n

    runtime.log(
      `Reserves: buffer=${formatUnits(usdcBuffer, 6)} yield=${formatUnits(yieldValue, 6)} total=${formatUnits(totalBacking, 6)} supply=${formatUnits(totalSupply, 6)} ratio=${backingRatio} revenue=${formatUnits(revenue, 6)}`
    )

    // Publish proof_of_reserves attestation
    const result = publishAttestation(runtime, {
      type: "proof_of_reserves",
      entityId: `por-${Math.floor(Date.now() / 1000)}`,
      data: {
        totalSupply: totalSupply.toString(),
        usdcBuffer: usdcBuffer.toString(),
        yieldValue: yieldValue.toString(),
        totalBacking: totalBacking.toString(),
        backingRatio: backingRatio.toString(),
        isFullyBacked,
        revenue: revenue.toString(),
        usdcgAddress: runtime.config.usdcgAddress,
        treasuryManagerAddress: runtime.config.treasuryManagerAddress,
      },
      metadata: JSON.stringify({
        totalSupply: formatUnits(totalSupply, 6),
        usdcBuffer: formatUnits(usdcBuffer, 6),
        yieldValue: formatUnits(yieldValue, 6),
        totalBacking: formatUnits(totalBacking, 6),
        backingRatio: backingRatio.toString(),
        isFullyBacked,
        revenue: formatUnits(revenue, 6),
      }),
    })

    runtime.log(`Proof of reserves attestation: ${result.txHash}`)
    return `Proof of reserves: ratio=${backingRatio} backed=${isFullyBacked} revenue=${formatUnits(revenue, 6)} tx=${result.txHash}`
  }
)

// ============================================================================
// Workflow Init
// ============================================================================

export const initWorkflow = (config: Config) => [
  vaultEventMonitor(config),
  privateTransferVerifier(config),
  proofOfReserves(config),
]
