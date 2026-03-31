/**
 * Payroll Attestation Workflow Config
 *
 * Validates config.json at startup. The workflow needs:
 * - Supabase access to verify the payroll record and recipients
 * - Chain access to verify individual USDC transfers
 * - Attestation contract to write batch + per-recipient proofs
 */

import { z } from "zod"

export const configSchema = z.object({
  // Chain config for on-chain verification + attestation write
  chainSelectorName: z.string().min(1),
  attestationContract: z.string().regex(/^0x[a-fA-F0-9]{40}$/u),
  gasLimit: z.string().regex(/^\d+$/),

})

export type Config = z.infer<typeof configSchema>
