/**
 * AI Report Verification Workflow Config
 *
 * Validates config.json at startup. The workflow needs:
 * - Supabase access to fetch the report and its source data
 * - Chain access for attestation writes
 * - Attestation contract to prove source data integrity
 */

import { z } from "zod"

export const configSchema = z.object({
  // Chain config for attestation write
  chainSelectorName: z.string().min(1),
  attestationContract: z.string().regex(/^0x[a-fA-F0-9]{40}$/u),
  gasLimit: z.string().regex(/^\d+$/),

})

export type Config = z.infer<typeof configSchema>
