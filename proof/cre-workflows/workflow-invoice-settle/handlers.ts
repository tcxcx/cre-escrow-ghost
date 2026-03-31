/**
 * Invoice Settlement Handlers
 *
 * Triggered after an invoice payment completes (via triggerInvoiceSettlement).
 * The DON:
 *   1. Verifies the invoice record exists in Supabase (consensus)
 *   2. Publishes a settlement attestation on-chain (consensus-signed)
 *   3. Stores the attestation tx hash back in the invoice record
 *
 * The public verification page at /invoice/[token] will show the on-chain
 * proof when attestation_tx_hash is present.
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
      invoiceId: string
      paymentTxHash: string
      amount: string
      currency: string
    }

    runtime.log(`Invoice settlement: ${input.invoiceId}`)

    // -- Step 1: Verify invoice exists in platform DB (consensus-verified) --
    const invoice = db.get(
      runtime,
      `/invoices?id=eq.${input.invoiceId}&select=id,invoice_number,amount,currency,status,customer_name,team_id,paid_at`,
      (raw) => {
        const rows = JSON.parse(raw) as Array<Record<string, unknown>>
        if (!rows[0]) throw new Error(`Invoice ${input.invoiceId} not found`)
        return rows[0]
      }
    )

    if (invoice.status !== "paid") {
      throw new Error(`Invoice ${input.invoiceId} status is ${invoice.status}, expected paid`)
    }

    runtime.log(`Verified invoice ${invoice.invoice_number}: ${invoice.amount} ${invoice.currency}`)

    // -- Step 2: Publish attestation on-chain (consensus-signed) --
    const result = publishAttestation(runtime, {
      type: "invoice_settle",
      entityId: input.invoiceId,
      data: {
        invoiceNumber: invoice.invoice_number,
        amount: input.amount,
        currency: input.currency,
        paymentTxHash: input.paymentTxHash,
        customerName: invoice.customer_name,
        teamId: invoice.team_id,
        paidAt: invoice.paid_at,
      },
      metadata: JSON.stringify({
        invoiceNumber: invoice.invoice_number,
        amount: input.amount,
        currency: input.currency,
        paymentTxHash: input.paymentTxHash,
      }),
    })

    runtime.log(`Attestation published: ${result.txHash}`)

    // -- Step 3: Store attestation tx hash back in invoice record --
    db.patch(
      runtime,
      `/invoices?id=eq.${input.invoiceId}`,
      { attestation_tx_hash: result.txHash },
      () => "ok"
    )

    runtime.log(`Invoice ${input.invoiceId} attestation stored`)
    return `Invoice ${input.invoiceId} settled on-chain: ${result.txHash}`
  })(config),
]
