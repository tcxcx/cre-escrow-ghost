import { z } from "zod"

const addr = z.string().regex(/^0x[a-fA-F0-9]{40}$/u)

export const configSchema = z.object({
  chainSelectorName: z.string().min(1),
  attestationContract: addr,
  gasLimit: z.string().regex(/^\d+$/),
  vaultAddress: addr,
  usdcgAddress: addr,
  usdcAddress: addr,
  treasuryManagerAddress: addr,
  usycAddress: addr,
  usycOracleAddress: addr,
  policyEngineAddress: addr,
  schedule: z.string().min(1),
})

export type Config = z.infer<typeof configSchema>
