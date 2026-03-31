/**
 * Escrow Monitor Handlers
 *
 * Two handlers that monitor and verify the escrow pipeline:
 *
 * 1. Escrow Event Monitor (EVM Log) -- watches EscrowFactoryV3 for
 *    AgreementCreated, MilestoneFunded, DecisionExecuted events
 *    and posts them to Supabase escrow_events table.
 *
 * 2. Proof of Reserves (Cron, every 6h) -- fetches active escrows
 *    from Supabase, reads totalAmount on-chain for each, publishes
 *    a proof_of_reserves attestation with aggregate reserves.
 */

import {
  bytesToHex,
  type Runtime,
  type EVMLog,
  type CronPayload,
} from "@chainlink/cre-sdk"
import { keccak256, toHex, formatUnits } from "viem"
import { withLog, withCron } from "../shared/triggers"
import { supabaseClient } from "../shared/clients/presets"
import { publishAttestation } from "../shared/services/attestation"
import { readTotalAmount } from "../shared/services/escrow"
import type { Config } from "./types"

// ============================================================================
// Supabase client preset
// ============================================================================

const supa = supabaseClient<Config>()

// ============================================================================
// Event topic hashes
// ============================================================================

const AGREEMENT_CREATED_TOPIC = keccak256(
  toHex("AgreementCreated(bytes32,address,address,address,address,uint256)")
)
const MILESTONE_FUNDED_TOPIC = keccak256(
  toHex("MilestoneFunded(address,uint256,uint256)")
)
const DECISION_EXECUTED_TOPIC = keccak256(
  toHex("DecisionExecuted(uint256,uint256)")
)

/** Map topic hash to human-readable event name */
const TOPIC_TO_NAME: Record<string, string> = {
  [AGREEMENT_CREATED_TOPIC]: "AgreementCreated",
  [MILESTONE_FUNDED_TOPIC]: "MilestoneFunded",
  [DECISION_EXECUTED_TOPIC]: "DecisionExecuted",
}

// ============================================================================
// Handler 1: Escrow Event Monitor (EVM Log Trigger)
// ============================================================================

const escrowEventMonitor = withLog<Config>(
  {
    getAddresses: (config) => [config.escrowFactoryAddress],
    getTopics: () => [
      AGREEMENT_CREATED_TOPIC,
      MILESTONE_FUNDED_TOPIC,
      DECISION_EXECUTED_TOPIC,
    ],
  },
  (runtime, log) => {
    const txHash = bytesToHex(log.txHash ?? new Uint8Array(32))
    const topicHex = log.topics.length > 0
      ? bytesToHex(log.topics[0]) as string
      : ""
    const eventType = TOPIC_TO_NAME[topicHex] ?? "Unknown"
    const logData = bytesToHex(log.data)

    runtime.log(
      `Escrow event: ${eventType} tx=${txHash} block=${log.blockNumber}`
    )

    // POST event to Supabase escrow_events table
    supa.post(
      runtime,
      "/escrow_events",
      {
        event_type: eventType,
        tx_hash: txHash,
        block_number: Number(log.blockNumber),
        data: logData,
      },
      (raw) => JSON.parse(raw) as { id: string }
    )

    runtime.log(`Escrow event persisted: ${eventType} tx=${txHash}`)
    return `Escrow ${eventType} logged: ${txHash}`
  }
)

// ============================================================================
// Handler 2: Proof of Reserves (Cron Trigger, every 6h)
// ============================================================================

const proofOfReserves = withCron<Config>(
  (runtime) => {
    runtime.log("Escrow proof of reserves check starting")

    // Step 1: Fetch active escrows from Supabase
    const escrows = supa.get(
      runtime,
      "/escrow_events?event_type=eq.AgreementCreated&select=data&order=block_number.desc&limit=100",
      (raw) => JSON.parse(raw) as Array<{ data: string }>
    )

    runtime.log(`Found ${escrows.length} escrow creation events`)

    // Step 2: Read totalAmount on-chain for each escrow
    // The AgreementCreated data field contains the escrow address
    // For now, aggregate from the factory read
    let totalReserves = 0n
    let escrowCount = 0

    for (const escrow of escrows) {
      try {
        // Extract escrow address from event data (2nd indexed param = escrowAddress)
        // For AgreementCreated, the escrow address is embedded in the log data
        // We read totalAmount from each escrow contract
        if (escrow.data && escrow.data.length >= 42) {
          const escrowAddr = `0x${escrow.data.slice(26, 66)}` as string
          const amount = readTotalAmount(runtime, escrowAddr)
          totalReserves += amount
          escrowCount++
          runtime.log(
            `Escrow ${escrowAddr}: amount=${formatUnits(amount, 6)}`
          )
        }
      } catch (err) {
        runtime.log(`Failed to read escrow: ${(err as Error).message}`)
      }
    }

    runtime.log(
      `Reserves: ${escrowCount} escrows, total=${formatUnits(totalReserves, 6)}`
    )

    // Step 3: Publish proof_of_reserves attestation
    const result = publishAttestation(runtime, {
      type: "proof_of_reserves",
      entityId: `escrow-por-${Math.floor(Date.now() / 1000)}`,
      data: {
        escrowCount: escrowCount.toString(),
        totalReserves: totalReserves.toString(),
        factoryAddress: runtime.config.escrowFactoryAddress,
      },
      metadata: JSON.stringify({
        escrowCount,
        totalReserves: formatUnits(totalReserves, 6),
        factoryAddress: runtime.config.escrowFactoryAddress,
      }),
    })

    runtime.log(`Escrow proof of reserves attestation: ${result.txHash}`)
    return `Escrow PoR: count=${escrowCount} reserves=${formatUnits(totalReserves, 6)} tx=${result.txHash}`
  }
)

// ============================================================================
// Workflow Init
// ============================================================================

export const initWorkflow = (config: Config) => [
  escrowEventMonitor(config),
  proofOfReserves(config),
]
