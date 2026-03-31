/**
 * Payroll Attestation -- Entry Point
 *
 * Produces an on-chain attestation when a payroll batch is executed.
 * Each recipient gets a verifiable proof of payment.
 * Triggered by triggerPayrollAttestation() from @bu/cre.
 *
 * Run: cre workflow simulate workflow-payroll-attest --target local-simulation
 */

import { Runner } from "@chainlink/cre-sdk"
import { configSchema, type Config } from "./types"
import { initWorkflow } from "./handlers"

export async function main() {
  const runner = await Runner.newRunner<Config>({ configSchema })
  await runner.run(initWorkflow)
}
