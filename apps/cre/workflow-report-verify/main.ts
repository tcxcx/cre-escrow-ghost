/**
 * AI Report Data Verification -- Entry Point
 *
 * Produces an on-chain attestation proving the source data used to
 * generate a financial report. Investors and auditors can verify
 * that the report was based on real, consensus-verified data.
 * Triggered by triggerReportAttestation() from @bu/cre.
 *
 * Run: cre workflow simulate workflow-report-verify --target local-simulation
 */

import { createWorkflow } from "../shared/create-workflow"
import { configSchema } from "./types"
import { initWorkflow } from "./handlers"

export const main = createWorkflow({ configSchema, init: initWorkflow })
