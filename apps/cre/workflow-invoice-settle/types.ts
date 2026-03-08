/**
 * Invoice Settlement Workflow Config
 *
 * Validates config.json at startup. The workflow needs:
 * - Supabase access to verify the invoice record
 * - Chain access to verify the payment transaction
 * - Attestation contract to write the settlement proof
 */

import { z } from "zod"

export const configSchema = z.object({
  // Chain config for on-chain verification + attestation write
  chainSelectorName: z.string().min(1),
  attestationContract: z.string().regex(/^0x[a-fA-F0-9]{40}$/u),
  gasLimit: z.string().regex(/^\d+$/),

})

export type Config = z.infer<typeof configSchema>
