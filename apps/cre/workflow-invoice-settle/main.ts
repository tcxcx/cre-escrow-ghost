/**
 * Invoice Settlement Proof -- Entry Point
 *
 * Produces an on-chain attestation when an invoice is paid.
 * Triggered by triggerInvoiceSettlement() from @bu/cre.
 *
 * Run: cre workflow simulate workflow-invoice-settle --target local-simulation
 */

import { createWorkflow } from "../shared/create-workflow"
import { configSchema } from "./types"
import { initWorkflow } from "./handlers"

export const main = createWorkflow({ configSchema, init: initWorkflow })
