import { z } from "zod"

const addr = z.string().regex(/^0x[a-fA-F0-9]{40}$/u)

export const configSchema = z.object({
  chainSelectorName: z.string().min(1),
  attestationContract: addr,
  gasLimit: z.string().regex(/^\d+$/),
  usdcgAddress: addr,
  usdcAddress: addr,
  treasuryManagerAddress: addr,
  usycAddress: addr,
  usycOracleAddress: addr,
  schedule: z.string().min(1),
  bufferTargetBPS: z.string().regex(/^\d+$/),
  bufferUpperBPS: z.string().regex(/^\d+$/),
  bufferLowerBPS: z.string().regex(/^\d+$/),
})

export type Config = z.infer<typeof configSchema>
