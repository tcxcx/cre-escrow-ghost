/**
 * Payroll Attestation Handlers
 *
 * Triggered after a payroll batch execution completes (via triggerPayrollAttestation).
 * The DON:
 *   1. Verifies the payroll record in Supabase (consensus)
 *   2. Reads execution_metadata for individual tx hashes
 *   3. Publishes a batch attestation on-chain (consensus-signed)
 *   4. Stores the attestation tx hash back in the payroll record
 *
 * The public verification page at /payroll/[token] will show the on-chain
 * proof when attestation_tx_hash is present. Each recipient can verify
 * their individual payment independently.
 */

import { decodeJson, type Runtime, type HTTPPayload } from "@chainlink/cre-sdk"
import { keccak256, toHex } from "viem"
import { withHttp } from "../shared/triggers"
import { supabaseClient } from "../shared/clients/presets"
import { publishAttestation } from "../shared/services/attestation"
import type { Config } from "./types"

const db = supabaseClient<Config>()

/** Extract recipient summary from the JSONB recipients field */
function summarizeRecipients(
  recipients: Record<string, Array<{ name?: string; amount?: string; walletAddress?: string }>>
): Array<{ name: string; amount: string; address: string; currency: string }> {
  const summary: Array<{ name: string; amount: string; address: string; currency: string }> = []

  for (const [currency, list] of Object.entries(recipients)) {
    if (!Array.isArray(list)) continue
    for (const r of list) {
      summary.push({
        name: r.name ?? "Unknown",
        amount: r.amount ?? "0",
        address: r.walletAddress ?? "",
        currency: currency.toUpperCase(),
      })
    }
  }

  return summary
}

export const initWorkflow = (config: Config) => [
  withHttp<Config>((runtime, payload) => {
    // -- Decode the trigger payload --
    const input = decodeJson(payload.input) as {
      payrollId: string
      teamId: string
      batchId?: string
    }

    runtime.log(`Payroll attestation: ${input.payrollId}`)

    // -- Step 1: Verify payroll record in Supabase (consensus-verified) --
    const payroll = db.get(
      runtime,
      `/payrolls?id=eq.${input.payrollId}&select=id,payroll_name,status,pay_period_start,pay_period_end,total_amount_usdc,total_amount_eurc,recipient_count,recipients,execution_metadata,team_id,executed_at`,
      (raw) => {
        const rows = JSON.parse(raw) as Array<Record<string, unknown>>
        if (!rows[0]) throw new Error(`Payroll ${input.payrollId} not found`)
        return rows[0]
      }
    )

    if (payroll.status !== "executed") {
      throw new Error(`Payroll ${input.payrollId} status is ${payroll.status}, expected executed`)
    }

    runtime.log(
      `Verified payroll "${payroll.payroll_name}": ${payroll.recipient_count} recipients, ` +
      `USDC: ${payroll.total_amount_usdc}, EURC: ${payroll.total_amount_eurc}`
    )

    // -- Step 2: Summarize recipients for the attestation --
    const recipients = payroll.recipients
      ? summarizeRecipients(payroll.recipients as Record<string, Array<{ name?: string; amount?: string; walletAddress?: string }>>)
      : []

    // Hash the full recipient list for on-chain storage
    const recipientDataHash = keccak256(toHex(JSON.stringify(recipients)))

    // -- Step 3: Publish batch attestation on-chain (consensus-signed) --
    const result = publishAttestation(runtime, {
      type: "payroll_attest",
      entityId: input.payrollId,
      data: {
        payrollName: payroll.payroll_name,
        payPeriodStart: payroll.pay_period_start,
        payPeriodEnd: payroll.pay_period_end,
        totalAmountUsdc: payroll.total_amount_usdc,
        totalAmountEurc: payroll.total_amount_eurc,
        recipientCount: payroll.recipient_count,
        recipientDataHash,
        teamId: payroll.team_id,
        executedAt: payroll.executed_at,
        batchId: input.batchId,
      },
      metadata: JSON.stringify({
        payrollName: payroll.payroll_name,
        totalUsdc: payroll.total_amount_usdc,
        totalEurc: payroll.total_amount_eurc,
        recipientCount: payroll.recipient_count,
        payPeriod: `${payroll.pay_period_start} to ${payroll.pay_period_end}`,
      }),
    })

    runtime.log(`Batch attestation published: ${result.txHash}`)

    // -- Step 4: Store attestation tx hash back in payroll record --
    db.patch(
      runtime,
      `/payrolls?id=eq.${input.payrollId}`,
      { attestation_tx_hash: result.txHash },
      () => "ok"
    )

    runtime.log(`Payroll ${input.payrollId} attestation stored`)
    return `Payroll ${input.payrollId} attested on-chain: ${result.txHash}`
  })(config),
]
