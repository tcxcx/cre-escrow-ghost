import { z } from "zod"

const addr = z.string().regex(/^0x[a-fA-F0-9]{40}$/u)

export const configSchema = z.object({
  // Ethereum Sepolia (CRE home, compliance + yield)
  chainSelectorName: z.string().min(1),
  attestationContract: addr,
  gasLimit: z.string().regex(/^\d+$/),
  usdcAddress: addr,
  policyEngineAddress: addr,
  treasuryManagerAddress: addr,
  // Arbitrum Sepolia (FHE chain) — GhostUSDC wraps USDC directly
  fheChainSelectorName: z.string().min(1),
  ghostUsdcAddress: addr,
  owner: addr,
})

export type Config = z.infer<typeof configSchema>
