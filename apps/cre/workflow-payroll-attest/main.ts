/**
 * Payroll Attestation -- Entry Point
 *
 * Produces an on-chain attestation when a payroll batch is executed.
 * Each recipient gets a verifiable proof of payment.
 * Triggered by triggerPayrollAttestation() from @bu/cre.
 *
 * Run: cre workflow simulate workflow-payroll-attest --target local-simulation
 */

import { createWorkflow } from "../shared/create-workflow"
import { configSchema } from "./types"
import { initWorkflow } from "./handlers"

export const main = createWorkflow({ configSchema, init: initWorkflow })
