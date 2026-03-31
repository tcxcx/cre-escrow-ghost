/**
 * Invoice Settlement Proof -- Entry Point
 *
 * Produces an on-chain attestation when an invoice is paid.
 * Triggered by triggerInvoiceSettlement() from @bu/cre.
 *
 * Run: cre workflow simulate workflow-invoice-settle --target local-simulation
 */

import { Runner } from "@chainlink/cre-sdk"
import { configSchema, type Config } from "./types"
import { initWorkflow } from "./handlers"

export async function main() {
  const runner = await Runner.newRunner<Config>({ configSchema })
  await runner.run(initWorkflow)
}
