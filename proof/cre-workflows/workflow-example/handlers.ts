/**
 * Workflow Handlers
 *
 * This file defines the trigger-to-handler bindings for this workflow.
 * Business logic is composed from shared primitives:
 *
 *   - Triggers:  withCron, withHttp, withLog
 *   - Clients:   shivaClient, motoraClient, supabaseClient
 *   - Services:  publishAttestation, resolveEvmClient
 *   - Utils:     getRequiredSecret, toBase64
 *
 * Pattern: initWorkflow(config) returns an array of handlers.
 */

import { withCron } from "../shared/triggers"
import { shivaClient } from "../shared/clients/presets"
import { publishAttestation } from "../shared/services/attestation"
import type { Config } from "./types"

// Pre-create the platform client (typed to this workflow's config)
const shiva = shivaClient<Config>()

/**
 * Initialize the workflow -- wire triggers to handlers.
 * Returns an array of handler(trigger, callback) pairs.
 */
export const initWorkflow = (config: Config) => [
  // Example: Cron trigger that runs on the configured schedule
  withCron<Config>((runtime) => {
    runtime.log("Workflow triggered by cron schedule")

    // ================================================================
    // Step 1: Fetch data from platform API (consensus-verified)
    // ================================================================
    // const data = shiva.get(runtime, "/transfers/latest", JSON.parse)
    // runtime.log(`Fetched transfer: ${data.id}`)

    // ================================================================
    // Step 2: Read on-chain data (consensus-verified)
    // ================================================================
    // const evmClient = resolveEvmClient(runtime.config)
    // const callResult = evmClient.read(...)

    // ================================================================
    // Step 3: Verify and publish attestation on-chain
    // ================================================================
    // const result = publishAttestation(runtime, {
    //   type: "transfer_verify",
    //   entityId: data.id,
    //   data: { amount: data.amount, verified: true },
    // })
    // runtime.log(`Attestation tx: ${result.txHash}`)

    return "Workflow execution complete"
  })(config),
]
