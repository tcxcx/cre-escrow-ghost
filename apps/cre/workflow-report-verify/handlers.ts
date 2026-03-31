/**
 * AI Report Verification Handlers
 *
 * Triggered after a financial report is compiled (via triggerReportAttestation).
 * The DON:
 *   1. Fetches the report record from Supabase (consensus)
 *   2. Hashes the source data (transactions, metrics, AI output)
 *   3. Publishes an attestation proving the report was generated from specific data
 *   4. Stores the attestation tx hash back in the report record
 *
 * The public verification page at /ai-report/[token] will show that the source
 * data was verified by N independent Chainlink nodes on a specific date.
 */

import { decodeJson, type Runtime, type HTTPPayload } from "@chainlink/cre-sdk"
import { keccak256, toHex } from "viem"
import { withHttp } from "../shared/triggers"
import { supabaseClient } from "../shared/clients/presets"
import { publishAttestation } from "../shared/services/attestation"
import type { Config } from "./types"

const db = supabaseClient<Config>()

export const initWorkflow = (config: Config) => [
  withHttp<Config>((runtime, payload) => {
    // -- Decode the trigger payload --
    const input = decodeJson(payload.input) as {
      reportId: string
      teamId: string
    }

    runtime.log(`Report verification: ${input.reportId}`)

    // -- Step 1: Fetch the report from Supabase (consensus-verified) --
    const report = db.get(
      runtime,
      `/reports?id=eq.${input.reportId}&select=id,report_number,from_date,to_date,status,team_id,transactions_data,financial_metrics,ai_analysis,created_at`,
      (raw) => {
        const rows = JSON.parse(raw) as Array<Record<string, unknown>>
        if (!rows[0]) throw new Error(`Report ${input.reportId} not found`)
        return rows[0]
      }
    )

    runtime.log(`Verified report ${report.report_number}: ${report.from_date} to ${report.to_date}`)

    // -- Step 2: Hash each data component independently --
    // This allows anyone to verify each piece separately
    const transactionsHash = keccak256(
      toHex(JSON.stringify(report.transactions_data ?? {}))
    )
    const metricsHash = keccak256(
      toHex(JSON.stringify(report.financial_metrics ?? {}))
    )
    const analysisHash = keccak256(
      toHex(JSON.stringify(report.ai_analysis ?? {}))
    )

    // Combined hash of all source data
    const combinedHash = keccak256(
      toHex(`${transactionsHash}${metricsHash}${analysisHash}`)
    )

    runtime.log(`Data hashes computed -- combined: ${combinedHash}`)

    // -- Step 3: Publish attestation on-chain (consensus-signed) --
    const result = publishAttestation(runtime, {
      type: "report_verify",
      entityId: input.reportId,
      data: {
        reportNumber: report.report_number,
        fromDate: report.from_date,
        toDate: report.to_date,
        transactionsHash,
        metricsHash,
        analysisHash,
        combinedHash,
        teamId: report.team_id,
      },
      metadata: JSON.stringify({
        reportNumber: report.report_number,
        dateRange: `${report.from_date} to ${report.to_date}`,
        transactionsHash,
        metricsHash,
        analysisHash,
      }),
    })

    runtime.log(`Report attestation published: ${result.txHash}`)

    // -- Step 4: Store attestation tx hash back in report record --
    db.patch(
      runtime,
      `/reports?id=eq.${input.reportId}`,
      { attestation_tx_hash: result.txHash },
      () => "ok"
    )

    runtime.log(`Report ${input.reportId} attestation stored`)
    return `Report ${input.reportId} verified on-chain: ${result.txHash}`
  })(config),
]
