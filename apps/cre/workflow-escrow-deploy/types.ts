import { z } from "zod"

const addr = z.string().regex(/^0x[a-fA-F0-9]{40}$/u)

export const configSchema = z.object({
  chainSelectorName: z.string().min(1),
  attestationContract: addr,
  gasLimit: z.string().regex(/^\d+$/),
  escrowFactoryAddress: addr,
  executorAgent: addr,
  owner: z.string(),
})

export type Config = z.infer<typeof configSchema>

export interface DeployPayload {
  agreementId: string
  agreementHash: string
  milestones: { amount: number; description: string }[]
  payerAddress: string
  payeeAddress: string
  tokenAddress: string
  totalAmount: number
  callbackUrl?: string
}
