import { z } from "zod"

const addr = z.string().regex(/^0x[a-fA-F0-9]{40}$/u)

export const configSchema = z.object({
  chainSelectorName: z.string().min(1),
  attestationContract: addr,
  gasLimit: z.string().regex(/^\d+$/),
  escrowFactoryAddress: addr,
  treasuryManagerAddress: addr,
  executorAgent: addr,
  owner: z.string(),
})

export type Config = z.infer<typeof configSchema>

export interface YieldPayload {
  action: "deposit" | "redeem"
  agreementId: string
  escrowAddress: string
  milestoneIndex?: number
  strategyId?: string
  amount?: string
}
