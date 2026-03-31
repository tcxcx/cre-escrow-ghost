# Contract ↔ Escrow Wiring Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Wire the contract builder UI to CRE escrow workflows end-to-end — deploy on Eth Sepolia (wired) + Arbitrum Sepolia (demo for judges).

**Architecture:** Layered Vertical — 4 dependency-ordered layers. Each layer is one PR. Layer 1 deploys contracts + CRE workflow. Layer 2 wires funding UI + public page. Layer 3 adds dispute CRE wiring + fallback attestation. Layer 4 integrates Deframe yield + agreement hash.

**Tech Stack:** Hardhat (Solidity deploy), CRE SDK (workflow handlers), Hono (Shiva endpoints), Next.js App Router (UI), wagmi/viem (on-chain tx), Zustand (state), Dub (share links), jose (JWT)

**Design doc:** `docs/plans/2026-03-08-contract-escrow-wiring-design.md`

---

## Layer 1: On-Chain Foundation

### Task 1: Deploy EscrowFactory to Eth Sepolia

**Files:**
- Create: `apps/cre/scripts/deploy-escrow-factory.ts`
- Modify: `apps/cre/shared/addresses.ts:87-88`
- Modify: `.deployer-wallet.json` (read deployer key)

**Step 1: Write the deploy script**

```typescript
// apps/cre/scripts/deploy-escrow-factory.ts
import { createWalletClient, createPublicClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'
import { readFileSync } from 'fs'
import { ESCROW_FACTORY_V3_ABI } from '@bu/contracts/escrow'
import {
  BU_ATTESTATION,
  POLICY_ENGINE,
  DEPLOYER,
  USDC,
} from '../shared/addresses'

const wallet = JSON.parse(readFileSync('.deployer-wallet.json', 'utf-8'))
const account = privateKeyToAccount(wallet.privateKey as `0x${string}`)

const publicClient = createPublicClient({ chain: sepolia, transport: http() })
const walletClient = createWalletClient({ account, chain: sepolia, transport: http() })

async function main() {
  console.log('Deploying EscrowFactory to Eth Sepolia...')
  console.log('Deployer:', account.address)

  // Read the compiled bytecode from Hardhat artifacts
  const artifact = JSON.parse(
    readFileSync('contracts/artifacts/EscrowFactory.json', 'utf-8')
  )

  const hash = await walletClient.deployContract({
    abi: artifact.abi,
    bytecode: artifact.bytecode as `0x${string}`,
    args: [POLICY_ENGINE, BU_ATTESTATION, DEPLOYER],
  })

  const receipt = await publicClient.waitForTransactionReceipt({ hash })
  console.log('EscrowFactory deployed at:', receipt.contractAddress)
  console.log('Tx hash:', hash)
  console.log('\nUpdate apps/cre/shared/addresses.ts with this address.')
}

main().catch(console.error)
```

**Step 2: Run the deploy**

```bash
cd apps/cre && bun run scripts/deploy-escrow-factory.ts
```

Expected: Deployed address printed. Copy it.

**Step 3: Update addresses registry**

Replace line 87-88 in `apps/cre/shared/addresses.ts`:
```typescript
/** EscrowFactory — Eth Sepolia (wired) */
export const ESCROW_FACTORY = '0x<DEPLOYED_ADDRESS>' as const
```

**Step 4: Commit**

```bash
git add apps/cre/scripts/deploy-escrow-factory.ts apps/cre/shared/addresses.ts
git commit -m "feat(cre): deploy EscrowFactory to Eth Sepolia"
```

---

### Task 2: Deploy EscrowFactory to Arbitrum Sepolia (demo only)

**Files:**
- Create: `apps/cre/scripts/deploy-escrow-factory-arb.ts`
- Modify: `apps/cre/shared/addresses.ts`

**Step 1: Copy deploy script for Arbitrum Sepolia**

Same as Task 1 but with `arbitrumSepolia` chain from `viem/chains` and a public RPC.

```typescript
// apps/cre/scripts/deploy-escrow-factory-arb.ts
import { createWalletClient, createPublicClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { arbitrumSepolia } from 'viem/chains'
import { readFileSync } from 'fs'

const wallet = JSON.parse(readFileSync('.deployer-wallet.json', 'utf-8'))
const account = privateKeyToAccount(wallet.privateKey as `0x${string}`)

const publicClient = createPublicClient({ chain: arbitrumSepolia, transport: http() })
const walletClient = createWalletClient({ account, chain: arbitrumSepolia, transport: http() })

async function main() {
  console.log('Deploying EscrowFactory to Arbitrum Sepolia (demo)...')

  const artifact = JSON.parse(
    readFileSync('contracts/artifacts/EscrowFactory.json', 'utf-8')
  )

  // Use deployer as placeholder for all constructor args on demo chain
  const hash = await walletClient.deployContract({
    abi: artifact.abi,
    bytecode: artifact.bytecode as `0x${string}`,
    args: [account.address, account.address, account.address],
  })

  const receipt = await publicClient.waitForTransactionReceipt({ hash })
  console.log('EscrowFactory (Arb Sepolia) deployed at:', receipt.contractAddress)
  console.log('Tx hash:', hash)
}

main().catch(console.error)
```

**Step 2: Run deploy and record address**

```bash
cd apps/cre && bun run scripts/deploy-escrow-factory-arb.ts
```

**Step 3: Add Arb address to registry**

Add after `ESCROW_FACTORY` in `apps/cre/shared/addresses.ts`:
```typescript
/** EscrowFactory — Arbitrum Sepolia (demo only, not wired) */
export const ESCROW_FACTORY_ARB = '0x<ARB_DEPLOYED_ADDRESS>' as const
```

**Step 4: Commit**

```bash
git add apps/cre/scripts/deploy-escrow-factory-arb.ts apps/cre/shared/addresses.ts
git commit -m "feat(cre): deploy EscrowFactory to Arb Sepolia (demo)"
```

---

### Task 3: Create `workflow-escrow-deploy` CRE workflow

**Files:**
- Create: `apps/cre/workflow-escrow-deploy/types.ts`
- Create: `apps/cre/workflow-escrow-deploy/handlers.ts`
- Create: `apps/cre/workflow-escrow-deploy/main.ts`
- Create: `apps/cre/workflow-escrow-deploy/config.json`

**Step 1: Define types**

```typescript
// apps/cre/workflow-escrow-deploy/types.ts
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
```

**Step 2: Write the handler**

```typescript
// apps/cre/workflow-escrow-deploy/handlers.ts
import { decodeJson, type Runtime, type HTTPPayload } from "@chainlink/cre-sdk"
import { withHttp } from "../shared/triggers"
import { supabaseClient } from "../shared/clients/presets"
import { publishAttestation } from "../shared/services/attestation"
import { callView } from "../shared/services/evm"
import { ESCROW_FACTORY_ABI } from "../shared/abi/escrow-factory"
import {
  EVMClient,
  getNetwork,
  hexToBase64,
  bytesToHex,
} from "@chainlink/cre-sdk"
import {
  encodeAbiParameters,
  parseAbiParameters,
  parseEventLogs,
} from "viem"
import type { Config, DeployPayload } from "./types"

function handleDeploy(runtime: Runtime<Config>, payload: HTTPPayload) {
  const body = decodeJson<DeployPayload>(payload.body)
  runtime.log(`Deploying escrow for agreement: ${body.agreementId}`)

  const config = runtime.config

  // Encode createEscrow call data
  const milestoneAmounts = body.milestones.map((m) => BigInt(m.amount * 1_000_000))
  const milestoneDescs = body.milestones.map((m) => m.description)

  const callData = encodeAbiParameters(
    parseAbiParameters(
      "bytes32 agreementHash, address payer, address payee, address token, uint256 totalAmount, uint256[] milestoneAmounts, string[] milestoneDescriptions"
    ),
    [
      body.agreementHash as `0x${string}`,
      body.payerAddress as `0x${string}`,
      body.payeeAddress as `0x${string}`,
      body.tokenAddress as `0x${string}`,
      BigInt(body.totalAmount * 1_000_000),
      milestoneAmounts,
      milestoneDescs,
    ]
  )

  // Sign via CRE consensus and write on-chain
  const reportData = encodeAbiParameters(
    parseAbiParameters("uint8 actionType, bytes data"),
    [6, callData] // actionType 6 = CREATE_ESCROW (new)
  )

  const reportResponse = runtime
    .report({
      encodedPayload: hexToBase64(reportData),
      encoderName: "evm",
      signingAlgo: "ecdsa",
      hashingAlgo: "keccak256",
    })
    .result()

  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName: config.chainSelectorName,
    isTestnet: true,
  })

  if (!network) {
    throw new Error(`Network not found: ${config.chainSelectorName}`)
  }

  const evmClient = new EVMClient(network.chainSelector.selector)

  const writeResult = evmClient
    .writeReport(runtime, {
      receiver: config.escrowFactoryAddress,
      report: reportResponse,
      gasConfig: { gasLimit: config.gasLimit },
    })
    .result()

  const txHash = bytesToHex(writeResult.txHash ?? new Uint8Array(32))
  runtime.log(`Escrow deploy tx: ${txHash}`)

  // Publish attestation
  publishAttestation(runtime, {
    type: "escrow_finalize" as const, // Reuse closest type until escrow_deploy is added
    entityId: body.agreementId,
    data: {
      action: "deploy",
      agreementHash: body.agreementHash,
      totalAmount: body.totalAmount,
      milestoneCount: body.milestones.length,
    },
    metadata: JSON.stringify({ txHash, chain: config.chainSelectorName }),
  })

  // POST callback to Shiva with the escrow address
  const supa = supabaseClient<Config>()
  // The escrow address is emitted as an event log — read from tx receipt
  // For now, store callback for Shiva to poll
  runtime.log(`Deploy complete. Agreement ${body.agreementId} tx: ${txHash}`)
}

export function initWorkflow(config: Config) {
  return [withHttp<Config>((runtime, payload) => handleDeploy(runtime, payload))(config)]
}
```

**Step 3: Write main.ts entry point**

```typescript
// apps/cre/workflow-escrow-deploy/main.ts
import { createWorkflow } from "../shared/create-workflow"
import { configSchema } from "./types"
import { initWorkflow } from "./handlers"

export const main = createWorkflow({ configSchema, init: initWorkflow })
```

**Step 4: Write config.json**

```json
{
  "chainSelectorName": "ethereum-testnet-sepolia",
  "attestationContract": "0xC3C7A1bd7556ba93729f859F0f1D1Cb60aeEc72C",
  "gasLimit": "800000",
  "escrowFactoryAddress": "0x<DEPLOYED_ADDRESS>",
  "executorAgent": "0x09Ce8E2B3Fede2727dA4392Ea8Fe618305ba0474",
  "owner": "bu-escrow-deploy"
}
```

**Step 5: Commit**

```bash
git add apps/cre/workflow-escrow-deploy/
git commit -m "feat(cre): add workflow-escrow-deploy for on-chain escrow creation"
```

---

### Task 4: Add Shiva endpoint + App API route for deploy-escrow

**Files:**
- Modify: `apps/shiva/src/services/cre-trigger.service.ts:37-45`
- Modify: `apps/shiva/src/controllers/contracts.controller.ts`
- Create: `apps/app/src/app/api/contracts/agreements/[id]/deploy-escrow/route.ts`
- Modify: `packages/supabase/src/mutations/contract-mutations.ts`

**Step 1: Add 'deploy' to CRE workflow map**

In `apps/shiva/src/services/cre-trigger.service.ts`, add to `workflowMap` (line 37-45):

```typescript
const workflowMap: Record<string, string> = {
  analyze: 'workflow-escrow-verify',
  verify: 'workflow-escrow-verify',
  deploy: 'workflow-escrow-deploy',    // NEW
  dispute: 'workflow-escrow-dispute',
  finalize: 'workflow-escrow-finalize',
  reputation: 'workflow-escrow-finalize',
  yield: 'workflow-escrow-yield',
  monitor: 'workflow-escrow-monitor',
}
```

**Step 2: Add deployEscrow method to contracts controller**

In `apps/shiva/src/controllers/contracts.controller.ts`, add new method:

```typescript
async deployEscrow(c: Context): Promise<Response> {
  const { id } = c.req.param()
  const supabase = c.get('supabase')

  // Fetch agreement
  const { data: agreement } = await supabase
    .from('escrow_agreements_v3')
    .select('*')
    .eq('id', id)
    .single()

  if (!agreement) {
    return c.json({ error: 'Agreement not found' }, 404)
  }

  if (agreement.escrow_address) {
    return c.json({ error: 'Escrow already deployed', escrowAddress: agreement.escrow_address }, 409)
  }

  const agreementJson = agreement.agreement_json as Record<string, unknown>
  const milestones = (agreementJson.milestones as Array<{ title: string; amount: number; acceptanceCriteria?: string }>) ?? []

  const result = await triggerCreWorkflowWithFallback(
    {
      action: 'deploy',
      agreementId: id,
      agreementHash: agreement.agreement_hash ?? '',
      milestones: milestones.map((m) => ({
        amount: m.amount,
        description: m.title,
      })),
      payerAddress: agreement.payer_address ?? '',
      payeeAddress: agreement.payee_address ?? '',
      tokenAddress: agreement.token_address ?? '',
      totalAmount: agreement.total_amount,
    },
    async () => {
      // Fallback: return pending status (escrow deploys are non-critical to block on)
      return { status: 'pending', message: 'CRE unavailable, deploy queued' }
    },
  )

  return c.json({ success: true, data: result })
}
```

Wire the route in Shiva's router: `POST /contracts/:id/deploy-escrow` → `controller.deployEscrow`

**Step 3: Create App API route**

```typescript
// apps/app/src/app/api/contracts/agreements/[id]/deploy-escrow/route.ts
// SECURITY: requires auth — deploy escrow for agreement
import { NextResponse } from 'next/server'
import { requireAuth, requireRateLimit } from '@bu/api-helpers'
import { getLimiter } from '@bu/kv/ratelimit'
import { createCustomHonoClient } from '@bu/hono-client'
import { getHonoApiUrl } from '@bu/env/app'
import { createLogger } from '@bu/logger'

const logger = createLogger({ prefix: 'api:contracts:deploy-escrow' })

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const { user, supabase, error: authError } = await requireAuth()
    if (authError) return authError

    const { error: rlError } = await requireRateLimit(
      `user:${user.id}`,
      getLimiter('standard'),
    )
    if (rlError) return rlError

    const {
      data: { session },
    } = await supabase.auth.getSession()
    const client = createCustomHonoClient(
      async () => session?.access_token ?? null,
      { baseUrl: getHonoApiUrl() },
    )

    const result = await client.contracts.deployEscrow(id)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.statusCode ?? 500 },
      )
    }

    return NextResponse.json(result.data)
  } catch (error) {
    logger.error('Failed to deploy escrow', {
      error: (error as Error).message,
    })
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
```

**Step 4: Add updateAgreementEscrowAddress mutation**

In `packages/supabase/src/mutations/contract-mutations.ts`, add:

```typescript
export async function updateAgreementEscrowAddress(
  supabase: Client,
  agreementId: string,
  escrowAddress: string,
) {
  const { data, error } = await supabase
    .from('escrow_agreements_v3')
    .update({ escrow_address: escrowAddress } as Record<string, unknown>)
    .eq('id', agreementId)
    .select()
    .single()

  if (error) {
    logger.error({ err: error }, 'Error updating escrow address')
    throw error
  }

  return { data, error: null }
}
```

Export from `packages/supabase/src/mutations/index.ts`.

**Step 5: Commit**

```bash
git add apps/shiva/src/services/cre-trigger.service.ts \
  apps/shiva/src/controllers/contracts.controller.ts \
  apps/app/src/app/api/contracts/agreements/\[id\]/deploy-escrow/ \
  packages/supabase/src/mutations/contract-mutations.ts \
  packages/supabase/src/mutations/index.ts
git commit -m "feat(contracts): add deploy-escrow endpoint + CRE trigger wiring"
```

---

## Layer 2: Core Flow (Funding UI + Public Page)

### Task 5: Wire escrow funding with dual-wallet pattern

**Files:**
- Modify: `apps/app/src/components/contract/contracts/funding/funding-view.tsx:70-79`
- Modify: `apps/app/src/components/contract/contracts/funding/usdc-approval-modal.tsx`

**Step 1: Import shared payment components into funding-view**

Replace the TODO block (lines 70-79) in `funding-view.tsx` with the invoice dual-wallet pattern:

```typescript
import { PaymentMethodSelector } from '@/components/invoice-payment/payment-method-selector'
import { ExternalWalletConnector } from '@/components/invoice-payment/external-wallet-connector'
import { usePaymentMethod } from '@/hooks/use-payment-method'
```

**Step 2: Add payment method selection and external wallet flow**

Inside the `FundingView` component, add after the amount display section:

```typescript
const { paymentMethod, setPaymentMethod, canUseBufiConnect } = usePaymentMethod()
const [externalWalletAddress, setExternalWalletAddress] = useState<string | null>(null)
const [isExternalWalletConnected, setIsExternalWalletConnected] = useState(false)
```

Replace the funding action section with:

```tsx
{/* Payment Method Selection */}
<PaymentMethodSelector
  value={paymentMethod}
  onChange={setPaymentMethod}
  canUseBufiConnect={canUseBufiConnect}
/>

{paymentMethod === 'external' ? (
  <>
    <ExternalWalletConnector
      onConnect={(address) => {
        setExternalWalletAddress(address)
        setIsExternalWalletConnected(true)
      }}
      onDisconnect={() => {
        setExternalWalletAddress(null)
        setIsExternalWalletConnected(false)
      }}
    />
    {isExternalWalletConnected && (
      <Button
        className="w-full"
        onClick={handleExternalFund}
        disabled={!escrowAddress}
      >
        Approve & Fund Escrow
      </Button>
    )}
  </>
) : (
  /* BuFi wallet path — workspace selector + wallet selector + fund button */
  /* Reuse the same workspace/wallet selection pattern from invoice-details-view */
  <Button
    className="w-full"
    onClick={() => fundEscrow(amountDue, '')}
    disabled={!escrowAddress}
  >
    Fund Escrow
  </Button>
)}
```

**Step 3: Add external wallet funding handler**

```typescript
const handleExternalFund = async () => {
  if (!escrowAddress || !externalWalletAddress) return
  setFunding(true)
  try {
    // Step 1: Approve USDC
    const approveHash = await writeContractAsync({
      address: tokenAddress as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [escrowAddress as `0x${string}`, BigInt(amountDue * 1_000_000)],
    })
    await waitForTransactionReceipt({ hash: approveHash })

    // Step 2: Fund escrow
    const fundHash = await writeContractAsync({
      address: escrowAddress as `0x${string}`,
      abi: ESCROW_WITH_AGENT_V3_ABI,
      functionName: 'fund',
      args: [],
      value: BigInt(0),
    })
    await waitForTransactionReceipt({ hash: fundHash })

    // Step 3: Record in DB
    await fundEscrow(amountDue, fundHash)
  } catch (err) {
    console.error('Funding failed:', err)
  } finally {
    setFunding(false)
  }
}
```

**Step 4: Verify build**

```bash
npx turbo run build --filter=@bu/app --force 2>&1 | tail -20
```

**Step 5: Commit**

```bash
git add apps/app/src/components/contract/contracts/funding/
git commit -m "feat(contracts): wire escrow funding with dual wallet (bufi + external)"
```

---

### Task 6: Create public contract verification page

**Files:**
- Create: `apps/app/src/app/[locale]/(public)/contracts/[token]/page.tsx`
- Create: `apps/app/src/app/[locale]/(public)/contracts/[token]/layout.tsx`
- Create: `apps/app/src/components/contract/contracts/public/contract-public-view.tsx`
- Modify: `packages/supabase/src/queries/index.ts`

**Step 1: Add getAgreementByToken query**

In `packages/supabase/src/queries/index.ts` (or a new `contracts.ts` query file):

```typescript
export async function getAgreementByToken(supabase: Client, token: string) {
  const { data, error } = await supabase
    .from('escrow_agreements_v3')
    .select('*')
    .eq('token', token)
    .single()

  return { data, error }
}
```

**Step 2: Create the public page (copy invoice pattern)**

```typescript
// apps/app/src/app/[locale]/(public)/contracts/[token]/page.tsx
import { verify } from '@bu/invoice/token'
import { notFound } from 'next/navigation'
import { createClient } from '@bu/supabase/job'
import { ContractPublicView } from '@/components/contract/contracts/public/contract-public-view'

export default async function ContractPublicPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  let agreementId: string
  try {
    const payload = await verify(token)
    agreementId = payload.id as string
  } catch {
    notFound()
  }

  const supabase = createClient()
  const { data: agreement } = await supabase
    .from('escrow_agreements_v3')
    .select('*')
    .eq('id', agreementId)
    .single()

  if (!agreement) notFound()

  return <ContractPublicView agreement={agreement} token={token} />
}
```

**Step 3: Create layout (copy invoice layout)**

```typescript
// apps/app/src/app/[locale]/(public)/contracts/[token]/layout.tsx
import { UserProvider } from '@/store/user/provider'
import { NuqsAdapter } from 'nuqs/adapters/next/app'

export default function ContractPublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <UserProvider data={null}>
      <NuqsAdapter>
        <main className="min-h-screen bg-background">
          {children}
        </main>
      </NuqsAdapter>
    </UserProvider>
  )
}
```

**Step 4: Create ContractPublicView component**

Reuses `escrow-balance-card.tsx` and `milestone-detail.tsx` in read-only mode:

```typescript
// apps/app/src/components/contract/contracts/public/contract-public-view.tsx
'use client'

import { EscrowBalanceCard } from '../escrow/escrow-balance-card'
import { Badge } from '@bu/ui/badge'
import { FileText, User, Building2, ExternalLink } from 'lucide-react'
import { Button } from '@bu/ui/button'

interface ContractPublicViewProps {
  agreement: Record<string, unknown>
  token: string
}

export function ContractPublicView({ agreement, token }: ContractPublicViewProps) {
  const agreementJson = agreement.agreement_json as Record<string, unknown>
  const milestones = (agreementJson?.milestones as Array<Record<string, unknown>>) ?? []
  const escrowAddress = agreement.escrow_address as string | null

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
          <FileText className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">{agreement.title as string}</h1>
        <Badge className="mt-2">{agreement.status as string}</Badge>
      </div>

      {/* Escrow Balance (reuse existing component) */}
      {escrowAddress && (
        <EscrowBalanceCard
          totalAmount={agreement.total_amount as number}
          releasedAmount={0}
          pendingAmount={agreement.funded_amount as number}
          currency="USDC"
          yieldEarned={0}
          yieldApy={0}
          yieldStrategy="none"
        />
      )}

      {/* Milestones */}
      <div className="mt-6 space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Milestones
        </h2>
        {milestones.map((m, i) => (
          <div key={i} className="p-4 rounded-lg border border-purple-500/20 bg-purple-500/5">
            <div className="flex justify-between">
              <span className="text-sm font-medium">{m.title as string}</span>
              <span className="text-sm font-bold text-purple-400">
                ${((m.amount as number) ?? 0).toLocaleString()}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* On-chain verification link */}
      {escrowAddress && (
        <div className="mt-6">
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() =>
              window.open(
                `https://sepolia.etherscan.io/address/${escrowAddress}`,
                '_blank',
              )
            }
          >
            <ExternalLink className="w-4 h-4" />
            Verify on Etherscan
          </Button>
        </div>
      )}
    </div>
  )
}
```

**Step 5: Verify build and commit**

```bash
npx turbo run build --filter=@bu/app --force 2>&1 | tail -20
git add apps/app/src/app/\[locale\]/\(public\)/contracts/ \
  apps/app/src/components/contract/contracts/public/ \
  packages/supabase/src/queries/
git commit -m "feat(contracts): add public contract verification page at /contracts/[token]"
```

---

## Layer 3: Verification Integrity

### Task 7: Wire `workflow-escrow-dispute` into Shiva

**Files:**
- Modify: `apps/shiva/src/controllers/contracts.controller.ts` (around line 579)

**Step 1: Replace inline AI calls in fileDispute with CRE trigger**

Find the `fileDispute` method (line ~506) and locate where `runAdvocates` is called directly (line ~579). Replace the inline arbitration block with:

```typescript
// Replace direct AI calls with CRE workflow trigger
const disputeResult = await triggerCreWorkflowWithFallback(
  {
    action: 'dispute',
    agreementId: id,
    escrowAddress: agreement.escrow_address,
    milestoneIndex,
    disputeReason: body.reason,
    evidence: body.evidence ?? [],
    filedBy: userId,
  },
  async () => {
    // Fallback: run existing inline arbitration (unchanged)
    const advocateBriefs = await runAdvocates(advocateInput, DEFAULT_ARBITRATION_CONFIG)
    const tribunalVerdict = await runTribunal(tribunalInput, DEFAULT_ARBITRATION_CONFIG)
    return { advocateBriefs, tribunalVerdict }
  },
)
```

The rest of the method (storing results, updating status) stays the same — it just consumes `disputeResult` instead of inline variables.

**Step 2: Verify build**

```bash
npx turbo run build --filter=shiva --force 2>&1 | tail -20
```

**Step 3: Commit**

```bash
git add apps/shiva/src/controllers/contracts.controller.ts
git commit -m "feat(contracts): wire workflow-escrow-dispute into Shiva dispute flow"
```

---

### Task 8: Add BUAttestation to fallback verification path

**Files:**
- Modify: `apps/shiva/src/controllers/contracts.controller.ts` (after fallback AI verification)

**Step 1: Add attestation publishing to verification fallback**

In the `submitDeliverable` method, find where `triggerCreWorkflowWithFallback` is called (line ~408). The fallback function `runVerification()` runs when CRE is down. After the fallback returns, add attestation:

```typescript
const verification = await triggerCreWorkflowWithFallback(
  { action: 'verify', /* ... existing payload ... */ },
  async () => {
    const result = await runVerification(verificationInput, DEFAULT_ARBITRATION_CONFIG)

    // Publish attestation from fallback path
    try {
      await publishFallbackAttestation({
        type: 'escrow_verify',
        agreementId: id,
        milestoneIndex,
        verdict: result,
        source: 'fallback',
      })
    } catch (attestError) {
      logger.warn('Fallback attestation failed (non-blocking)', {
        error: (attestError as Error).message,
      })
    }

    return result
  },
)
```

**Step 2: Create publishFallbackAttestation helper**

Add to `apps/shiva/src/services/` or inline in the controller:

```typescript
import { createWalletClient, http, encodeAbiParameters, parseAbiParameters, keccak256, toHex } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'
import { BU_ATTESTATION_ABI } from '@bu/contracts/escrow'

async function publishFallbackAttestation(params: {
  type: string
  agreementId: string
  milestoneIndex: number
  verdict: unknown
  source: string
}) {
  const deployerKey = getEnvVar('CRE_ETH_PRIVATE_KEY')
  if (!deployerKey) return // Skip if no key configured

  const account = privateKeyToAccount(deployerKey as `0x${string}`)
  const client = createWalletClient({ account, chain: sepolia, transport: http() })

  const dataHash = keccak256(toHex(JSON.stringify(params.verdict)))
  const timestamp = BigInt(Math.floor(Date.now() / 1000))

  const data = encodeAbiParameters(
    parseAbiParameters('uint8 opType, string entityId, bytes32 dataHash, uint256 timestamp, string metadata'),
    [11, params.agreementId, dataHash, timestamp, JSON.stringify({ source: params.source, milestone: params.milestoneIndex })],
  )

  await client.writeContract({
    address: '0xC3C7A1bd7556ba93729f859F0f1D1Cb60aeEc72C',
    abi: BU_ATTESTATION_ABI,
    functionName: 'onReport',
    args: [data],
  })
}
```

**Step 3: Verify build and commit**

```bash
npx turbo run build --filter=shiva --force 2>&1 | tail -20
git add apps/shiva/src/controllers/contracts.controller.ts apps/shiva/src/services/
git commit -m "feat(contracts): add BUAttestation to fallback verification path"
```

---

## Layer 4: Polish

### Task 9: Integrate Deframe yield strategies into contract settings

**Files:**
- Modify: `packages/contracts/src/contract-flow/index.ts` (YieldStrategy type)
- Modify: `apps/app/src/components/contract/contract-builder/settings-panel.tsx`
- Modify: `apps/app/src/components/contract/contracts/escrow/yield-projection-chart.tsx`
- Modify: `apps/app/src/components/contract/contracts/escrow/escrow-balance-card.tsx`

**Step 1: Update YieldStrategy type**

In `packages/contracts/src/contract-flow/index.ts`, find the `ContractSettings` type and update:

```typescript
export type YieldStrategy =
  | { enabled: false }
  | { enabled: true; strategyId: string; strategyName: string; apy: number; podAddress: string }

export interface ContractSettings {
  yieldStrategy: YieldStrategy  // was: 'aave' | 'compound' | 'none'
  chain: string
  totalAmount: number
  currency: string
  commissions: unknown[]
}
```

**Step 2: Update settings panel to show Deframe strategies**

In `settings-panel.tsx`, replace the yield dropdown with an embedded strategy picker:

```tsx
import { useHighestApy } from '@/hooks/use-highest-apy'
// Reuse the earn opportunity list component or fetch strategies directly

const { data: highestApy } = useHighestApy()

{/* Yield Strategy */}
<div className="space-y-2">
  <Label>Escrow Yield</Label>
  <div className="flex items-center justify-between">
    <span className="text-sm text-muted-foreground">
      Earn yield on escrowed funds via Deframe
    </span>
    <Switch
      checked={settings.yieldStrategy.enabled}
      onCheckedChange={(checked) => {
        if (!checked) {
          setSettings({ yieldStrategy: { enabled: false } })
        }
        // When enabled, show strategy picker below
      }}
    />
  </div>
  {settings.yieldStrategy.enabled && (
    /* Embed strategy list from EarnContent or fetch directly */
    <StrategyPicker
      onSelect={(strategy) => {
        setSettings({
          yieldStrategy: {
            enabled: true,
            strategyId: strategy.id,
            strategyName: strategy.name,
            apy: strategy.apy,
            podAddress: strategy.address,
          },
        })
      }}
    />
  )}
</div>
```

**Step 3: Update yield chart and balance card labels**

In `yield-projection-chart.tsx` and `escrow-balance-card.tsx`:
- Replace hardcoded "AAVE V3" with `strategy.strategyName`
- Read APY from `strategy.apy` instead of hardcoded value

**Step 4: Verify build and commit**

```bash
npx turbo run build --filter=@bu/app --force 2>&1 | tail -20
git add packages/contracts/src/contract-flow/ \
  apps/app/src/components/contract/contract-builder/settings-panel.tsx \
  apps/app/src/components/contract/contracts/escrow/
git commit -m "feat(contracts): integrate Deframe yield strategies into contract settings"
```

---

### Task 10: Create escrow_yield_positions table + persist positions

**Files:**
- Supabase migration (apply to all 3 projects)
- Modify: `packages/supabase/src/types/db.ts`
- Modify: `packages/supabase/src/mutations/contract-mutations.ts`

**Step 1: Apply migration**

```sql
CREATE TABLE IF NOT EXISTS escrow_yield_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id text NOT NULL REFERENCES escrow_agreements_v3(id),
  strategy_id text NOT NULL,
  strategy_name text NOT NULL,
  pod_address text NOT NULL,
  apy_at_entry numeric NOT NULL,
  deposited_amount numeric NOT NULL,
  deposited_at timestamptz NOT NULL DEFAULT now(),
  redeemed_at timestamptz,
  tx_hash_deposit text NOT NULL,
  tx_hash_redeem text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_escrow_yield_positions_agreement
  ON escrow_yield_positions (agreement_id);
```

Apply to all 3 Supabase projects: `cmrpdkvogpxyneidmtnu`, `fmjglnghnzigobtwsuxo`, `neelcqufuyjrwloutsua`.

**Step 2: Add types to db.ts**

Add `escrow_yield_positions` table type to `packages/supabase/src/types/db.ts` following the existing pattern (Row, Insert, Update).

**Step 3: Add upsert mutation**

In `packages/supabase/src/mutations/contract-mutations.ts`:

```typescript
export async function upsertYieldPosition(
  supabase: Client,
  params: {
    agreementId: string
    strategyId: string
    strategyName: string
    podAddress: string
    apyAtEntry: number
    depositedAmount: number
    txHashDeposit: string
  },
) {
  const { data, error } = await supabase
    .from('escrow_yield_positions')
    .upsert({
      agreement_id: params.agreementId,
      strategy_id: params.strategyId,
      strategy_name: params.strategyName,
      pod_address: params.podAddress,
      apy_at_entry: params.apyAtEntry,
      deposited_amount: params.depositedAmount,
      tx_hash_deposit: params.txHashDeposit,
    } as Record<string, unknown>, { onConflict: 'agreement_id,strategy_id' })
    .select()
    .single()

  if (error) {
    logger.error({ err: error }, 'Error upserting yield position')
    throw error
  }

  return { data, error: null }
}
```

**Step 4: Commit**

```bash
git add packages/supabase/src/types/db.ts packages/supabase/src/mutations/
git commit -m "feat(contracts): add escrow_yield_positions table + mutation"
```

---

### Task 11: Extend agreement hash to include commissions + conditions

**Files:**
- Modify: `packages/contracts/src/agreement/compiler.ts`

**Step 1: Find the hash computation in compiler.ts**

Look for where `hashing` is computed (around line 239). Update to include commissions and conditions in the hash input:

```typescript
import { keccak256, toHex, encodeAbiParameters, parseAbiParameters } from 'viem'

// Encode all contract terms for hashing
const termsData = encodeAbiParameters(
  parseAbiParameters('string title, bytes32[] milestoneHashes, bytes32[] partyHashes, bytes32[] commissionHashes, bytes32[] conditionHashes'),
  [
    title,
    milestones.map((m) => keccak256(toHex(JSON.stringify(m)))),
    parties.map((p) => keccak256(toHex(JSON.stringify(p)))),
    commissions.map((c) => keccak256(toHex(JSON.stringify(c)))),
    conditions.map((c) => keccak256(toHex(JSON.stringify(c)))),
  ],
)

const agreementHash = keccak256(termsData)
```

**Step 2: Verify build**

```bash
npx turbo run build --filter=@bu/contracts --force 2>&1 | tail -20
```

**Step 3: Commit**

```bash
git add packages/contracts/src/agreement/compiler.ts
git commit -m "feat(contracts): include commissions+conditions in agreement hash"
```

---

## Final Verification

### Task 12: End-to-end smoke test

**Step 1: Verify all builds pass**

```bash
npx turbo run build --filter=@bu/app --filter=@bu/contracts --filter=shiva --force
```

**Step 2: Verify the user journey works in dev**

1. Create a contract in the builder
2. Deploy escrow (check Etherscan for tx)
3. Fund via external wallet (USDC approve + fund)
4. Share link → open public page → verify contract details
5. Submit deliverable → verify CRE or fallback attestation
6. Check yield strategy selection shows Deframe options

**Step 3: Final commit if any fixes needed**

```bash
git add -A && git commit -m "fix: address smoke test issues"
```
