import { z } from "zod"

const addr = z.string().regex(/^0x[a-fA-F0-9]{40}$/u)

export const configSchema = z.object({
  // Ethereum Sepolia (CRE home)
  chainSelectorName: z.string().min(1),
  attestationContract: addr,
  gasLimit: z.string().regex(/^\d+$/),
  policyEngineAddress: addr,
  // Arbitrum Sepolia (FHE chain) — monitors ConfidentialTransfer events
  fheChainSelectorName: z.string().min(1),
  ghostUsdcAddress: addr,
})

export type Config = z.infer<typeof configSchema>
