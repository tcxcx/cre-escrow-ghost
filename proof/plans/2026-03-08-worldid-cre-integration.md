# WorldID + CRE Contract Verification — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add WorldID proof-of-personhood and Persona KYC as optional verification toggles in the contract builder's identity-verification node, with CRE on-chain attestation for WorldID proofs on Arbitrum Sepolia.

**Architecture:** WorldID and Persona are optional toggles inside the existing KYC requirements section of the identity-verification node. When WorldID is enabled, the signing flow presents an IDKit widget that verifies the user via World API v4 with RP signatures. On successful verification, the backend triggers a CRE workflow that publishes an on-chain attestation to BUAttestation.sol on Arbitrum Sepolia — enabling World ID on a chain where it's not natively supported.

**Tech Stack:** `@worldcoin/idkit` (frontend), World API v4 (backend verification), CRE SDK (on-chain attestation), existing `@bu/api-helpers` + `@bu/kv` patterns.

---

## Task 1: Add `worldid_verify` attestation type

**Files:**
- Modify: `packages/cre/src/types/attestation.ts`
- Modify: `apps/cre/shared/types.ts`

**Step 1: Add type to canonical attestation types**

In `packages/cre/src/types/attestation.ts`, add `"worldid_verify"` to the `AttestationType` union:

```typescript
export type AttestationType =
  | "transfer_verify"
  // ... existing types ...
  | "allowlist_sync"
  | "worldid_verify"
```

**Step 2: Add opType mapping in shared/types.ts**

In `apps/cre/shared/types.ts`, add to `ATTESTATION_OP_TYPES`:

```typescript
  allowlist_sync: 19,
  worldid_verify: 20,
```

**Step 3: Commit**

```bash
git add packages/cre/src/types/attestation.ts apps/cre/shared/types.ts
git commit -m "feat(cre): add worldid_verify attestation type"
```

---

## Task 2: Add `worldId` and `persona` to IdentityVerificationData type

**Files:**
- Modify: `packages/contracts/src/contract-flow/types.ts`

**Step 1: Update the requirements interface**

Add `worldId` and `persona` booleans to `IdentityVerificationData.requirements.kyc`:

```typescript
export interface IdentityVerificationData {
  verificationType: 'kyc' | 'kyb' | 'both'
  requiredFor: 'payer' | 'payee' | 'both'
  triggerPoint: 'before_signing' | 'before_funding' | 'before_milestone'
  milestoneId?: string
  templateId?: string
  requirements: {
    kyc?: {
      governmentId: boolean
      selfie: boolean
      proofOfAddress: boolean
      accreditedInvestor?: boolean
      worldId?: boolean
      persona?: boolean
    }
    kyb?: {
      businessRegistration: boolean
      proofOfAddress: boolean
      beneficialOwners: boolean
      authorizedSignatory: boolean
      financialStatements?: boolean
    }
    allowedCountries?: string[]
    blockedCountries?: string[]
    blockSanctioned: boolean
  }
  status: Record<string, 'not_started' | 'pending' | 'in_review' | 'approved' | 'declined' | 'expired'>
}
```

**Step 2: Commit**

```bash
git add packages/contracts/src/contract-flow/types.ts
git commit -m "feat(contracts): add worldId and persona to verification requirements"
```

---

## Task 3: Add WorldID + Persona toggles in properties panel

**Files:**
- Modify: `apps/app/src/components/contract/contract-builder/properties-panel.tsx`

**Step 1: Add Globe import**

Add `Globe` to the lucide-react imports (line ~30-40):

```typescript
import {
  // ... existing imports ...
  ShieldCheck,
  Globe,
} from 'lucide-react'
```

**Step 2: Add WorldID + Persona toggles inside IdentityVerificationFields**

After the existing KYC requirements toggles (after the "Accredited Investor" toggle, around line 841), add:

```tsx
            <div className="flex items-center justify-between">
              <Label className="text-xs text-purpleDanis">Persona KYC</Label>
              <Switch
                checked={kycRequirements.persona ?? false}
                onCheckedChange={(checked) => updateRequirement('kyc', 'persona', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs text-purpleDanis">World ID (Proof of Personhood)</Label>
              <Switch
                checked={kycRequirements.worldId ?? false}
                onCheckedChange={(checked) => updateRequirement('kyc', 'worldId', checked)}
              />
            </div>
```

**Step 3: Replace the "Powered by Persona" card (lines 907-916) with a dynamic providers card**

Replace the static Persona card with:

```tsx
      {/* Verification Providers */}
      <div className="space-y-2">
        {(kycRequirements.persona ?? false) && (
          <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-medium text-cyan-400">Persona KYC</span>
            </div>
            <p className="text-xs text-purpleDanis">
              Identity verification via Persona — government ID, selfie, and document checks.
            </p>
          </div>
        )}
        {(kycRequirements.worldId ?? false) && (
          <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
            <div className="flex items-center gap-2 mb-1">
              <Globe className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-medium text-indigo-400">World ID + CRE</span>
            </div>
            <p className="text-xs text-purpleDanis">
              Proof of personhood verified on-chain via Chainlink CRE attestation on Arbitrum.
            </p>
          </div>
        )}
        {!(kycRequirements.persona ?? false) && !(kycRequirements.worldId ?? false) && (
          <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-medium text-cyan-400">Powered by Persona</span>
            </div>
            <p className="text-xs text-purpleDanis">
              Identity verification is handled securely via Persona integration with real-time status updates.
            </p>
          </div>
        )}
      </div>
```

**Step 4: Commit**

```bash
git add apps/app/src/components/contract/contract-builder/properties-panel.tsx
git commit -m "feat(contract-builder): add WorldID and Persona KYC toggles in properties panel"
```

---

## Task 4: Show WorldID + Persona badges on the identity verification node

**Files:**
- Modify: `apps/app/src/components/contract/contract-builder/nodes/identity-verification-node.tsx`

**Step 1: Add Globe import**

```typescript
import { ShieldCheck, User, Building2, AlertCircle, CheckCircle2, Clock, XCircle, Globe } from 'lucide-react'
```

**Step 2: Update subtitle text**

Replace the static "Persona Integration" text (line 83) with a dynamic subtitle:

```tsx
          <div className="text-[10px] text-violetDanis dark:text-darkTextSecondary">
            {[
              data.requirements?.kyc?.persona && 'Persona',
              data.requirements?.kyc?.worldId && 'World ID',
            ].filter(Boolean).join(' + ') || 'Persona Integration'}
          </div>
```

**Step 3: Add WorldID + Persona badges after the existing KYC/KYB badges (after line 106)**

```tsx
          {data.requirements?.kyc?.persona && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-cyan-500/30 text-cyan-600 dark:text-cyan-400">
              <ShieldCheck className="w-3 h-3 mr-1" />
              Persona
            </Badge>
          )}
          {data.requirements?.kyc?.worldId && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-indigo-500/30 text-indigo-600 dark:text-indigo-400">
              <Globe className="w-3 h-3 mr-1" />
              World ID
            </Badge>
          )}
```

**Step 4: Commit**

```bash
git add apps/app/src/components/contract/contract-builder/nodes/identity-verification-node.tsx
git commit -m "feat(contract-builder): show WorldID and Persona badges on verification node"
```

---

## Task 5: Install `@worldcoin/idkit` and add env vars

**Step 1: Install IDKit**

```bash
cd /Users/criptopoeta/coding-dojo/desk-v1
bun add @worldcoin/idkit --filter apps/app
```

**Step 2: Add env module for WorldID**

Create `packages/env/src/worldid.ts` (follow existing env module pattern):

```typescript
export function getWorldAppId(): string {
  const value = process.env.WORLD_APP_ID
  if (!value) throw new Error('WORLD_APP_ID is not set')
  return value
}

export function getWorldRpId(): string {
  const value = process.env.WORLD_RP_ID
  if (!value) throw new Error('WORLD_RP_ID is not set')
  return value
}

export function getRpSigningKey(): string {
  const value = process.env.RP_SIGNING_KEY
  if (!value) throw new Error('RP_SIGNING_KEY is not set')
  return value
}
```

Add to the env package exports in `packages/env/package.json`:

```json
"./worldid": "./src/worldid.ts"
```

**Step 3: Commit**

```bash
git add packages/env/src/worldid.ts packages/env/package.json bun.lock
git commit -m "feat(env): add WorldID environment variables module"
```

---

## Task 6: Create WorldID RP signature endpoint

**Files:**
- Create: `apps/app/src/app/api/contracts/worldid/sign-request/route.ts`

**Step 1: Create the route**

```typescript
// SECURITY: requires auth — generate RP signature for WorldID verification
import { NextResponse } from 'next/server'
import { requireAuth, requireRateLimit } from '@bu/api-helpers'
import { getLimiter } from '@bu/kv/ratelimit'
import { createLogger } from '@bu/logger'
import { getWorldAppId, getWorldRpId, getRpSigningKey } from '@bu/env/worldid'

const logger = createLogger({ prefix: 'api:contracts:worldid:sign-request' })

export async function POST(request: Request) {
  try {
    const { user, error: authError } = await requireAuth()
    if (authError) return authError

    const { error: rlError } = await requireRateLimit(
      `user:${user.id}`,
      getLimiter('standard'),
    )
    if (rlError) return rlError

    const { action } = await request.json()
    if (!action || typeof action !== 'string') {
      return NextResponse.json({ error: 'action is required' }, { status: 400 })
    }

    // Import signRequest dynamically to avoid bundling signing key in client
    const { signRequest } = await import('@worldcoin/idkit')
    const signingKey = getRpSigningKey()

    const rpSignature = signRequest(action, signingKey)

    return NextResponse.json({
      app_id: getWorldAppId(),
      rp_id: getWorldRpId(),
      rp_context: {
        rp_id: getWorldRpId(),
        nonce: rpSignature.nonce,
        created_at: rpSignature.createdAt,
        expires_at: rpSignature.expiresAt,
        signature: rpSignature.sig,
      },
    })
  } catch (error) {
    logger.error('Failed to generate RP signature', {
      error: (error as Error).message,
    })
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
```

**Step 2: Commit**

```bash
git add apps/app/src/app/api/contracts/worldid/sign-request/route.ts
git commit -m "feat(api): add WorldID RP signature endpoint"
```

---

## Task 7: Create WorldID verify endpoint

**Files:**
- Create: `apps/app/src/app/api/contracts/worldid/verify/route.ts`

**Step 1: Create the route**

```typescript
// SECURITY: requires auth — verify WorldID proof and trigger CRE attestation
import { NextResponse } from 'next/server'
import { requireAuth, requireRateLimit } from '@bu/api-helpers'
import { getLimiter } from '@bu/kv/ratelimit'
import { createLogger } from '@bu/logger'
import { getWorldRpId } from '@bu/env/worldid'

const logger = createLogger({ prefix: 'api:contracts:worldid:verify' })

export async function POST(request: Request) {
  try {
    const { user, error: authError } = await requireAuth()
    if (authError) return authError

    const { error: rlError } = await requireRateLimit(
      `user:${user.id}`,
      getLimiter('standard'),
    )
    if (rlError) return rlError

    const body = await request.json()
    const { proof, contractId, walletAddress } = body

    if (!proof || !contractId) {
      return NextResponse.json(
        { error: 'proof and contractId are required' },
        { status: 400 },
      )
    }

    // Forward proof as-is to World API v4
    const rpId = getWorldRpId()
    const verifyRes = await fetch(
      `https://developer.world.org/api/v4/verify/${rpId}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(proof),
      },
    )

    const verifyData = await verifyRes.json()

    if (!verifyRes.ok) {
      logger.error('WorldID verification failed', { verifyData })
      return NextResponse.json(
        { error: 'Verification failed', detail: verifyData },
        { status: 400 },
      )
    }

    logger.info('WorldID verification successful', {
      contractId,
      userId: user.id,
      nullifierHash: verifyData.nullifier_hash,
    })

    // Trigger CRE workflow for on-chain attestation (non-fatal)
    try {
      const { triggerCreWorkflow } = await import('@/lib/cre-trigger')
      await triggerCreWorkflow({
        action: 'worldid_verify',
        payload: {
          contractId,
          walletAddress: walletAddress ?? '',
          nullifierHash: verifyData.nullifier_hash,
          verificationLevel: verifyData.verification_level,
          userId: user.id,
        },
      })
    } catch (creError) {
      logger.warn('CRE attestation trigger failed (non-fatal)', {
        error: (creError as Error).message,
      })
    }

    return NextResponse.json({
      verified: true,
      nullifierHash: verifyData.nullifier_hash,
      verificationLevel: verifyData.verification_level,
    })
  } catch (error) {
    logger.error('WorldID verify error', {
      error: (error as Error).message,
    })
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
```

> **Note:** The CRE trigger import (`@/lib/cre-trigger`) should follow the existing pattern from `apps/shiva/src/services/cre-trigger.service.ts`. If no app-side CRE trigger exists yet, create a thin wrapper that POSTs to the CRE gateway URL. This is non-fatal — the contract signing succeeds even if CRE is down.

**Step 2: Commit**

```bash
git add apps/app/src/app/api/contracts/worldid/verify/route.ts
git commit -m "feat(api): add WorldID proof verification endpoint with CRE trigger"
```

---

## Task 8: Create WorldID verification widget component

**Files:**
- Create: `apps/app/src/components/contract/contracts/signing/worldid-verify.tsx`

**Step 1: Create the component**

```tsx
'use client'

import { useState, useCallback } from 'react'
import { IDKitWidget, VerificationLevel } from '@worldcoin/idkit'
import type { ISuccessResult } from '@worldcoin/idkit'
import { Globe, CheckCircle2, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@bu/ui/button'
import { cn } from '@bu/ui/cn'

interface WorldIdVerifyProps {
  contractId: string
  walletAddress?: string
  onVerified: (result: { nullifierHash: string; verificationLevel: string }) => void
  className?: string
}

type VerifyState = 'idle' | 'loading' | 'verified' | 'error'

export function WorldIdVerify({ contractId, walletAddress, onVerified, className }: WorldIdVerifyProps) {
  const [state, setState] = useState<VerifyState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [appConfig, setAppConfig] = useState<{
    app_id: string
    rp_context: Record<string, string>
  } | null>(null)

  // Fetch RP signature from our backend before opening IDKit
  const fetchRpSignature = useCallback(async () => {
    const res = await fetch('/api/contracts/worldid/sign-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'contract_sign' }),
    })
    if (!res.ok) throw new Error('Failed to get RP signature')
    return res.json()
  }, [])

  const handleVerify = useCallback(async (proof: ISuccessResult) => {
    setState('loading')
    setError(null)

    try {
      const res = await fetch('/api/contracts/worldid/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proof, contractId, walletAddress }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Verification failed')
      }

      setState('verified')
      onVerified({
        nullifierHash: data.nullifierHash,
        verificationLevel: data.verificationLevel,
      })
    } catch (err) {
      setState('error')
      setError((err as Error).message)
    }
  }, [contractId, walletAddress, onVerified])

  const handleOpen = useCallback(async () => {
    try {
      const config = await fetchRpSignature()
      setAppConfig(config)
    } catch {
      setError('Failed to initialize World ID')
    }
  }, [fetchRpSignature])

  if (state === 'verified') {
    return (
      <div className={cn('flex items-center gap-3 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10', className)}>
        <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
            World ID Verified
          </p>
          <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70">
            Proof of personhood confirmed — CRE attestation submitted
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/5', className)}>
      <div className="flex items-center gap-3 mb-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-500/20">
          <Globe className="w-4 h-4 text-indigo-500" />
        </div>
        <div>
          <p className="text-sm font-medium text-darkText dark:text-whiteDanis">
            World ID Verification
          </p>
          <p className="text-xs text-violetDanis dark:text-darkTextSecondary">
            Prove you are a unique human to sign this contract
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-2 mb-3 rounded-lg bg-red-500/10 text-red-500 text-xs">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {appConfig ? (
        <IDKitWidget
          app_id={appConfig.app_id as `app_${string}`}
          action="contract_sign"
          signal={walletAddress ?? contractId}
          verification_level={VerificationLevel.Orb}
          handleVerify={handleVerify}
          onSuccess={() => {}}
          onError={() => {
            setState('error')
            setError('Verification was cancelled or failed')
          }}
        >
          {({ open }) => (
            <Button
              onClick={open}
              disabled={state === 'loading'}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {state === 'loading' ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Globe className="w-4 h-4 mr-2" />
              )}
              {state === 'loading' ? 'Verifying...' : 'Verify with World ID'}
            </Button>
          )}
        </IDKitWidget>
      ) : (
        <Button
          onClick={handleOpen}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          <Globe className="w-4 h-4 mr-2" />
          Verify with World ID
        </Button>
      )}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add apps/app/src/components/contract/contracts/signing/worldid-verify.tsx
git commit -m "feat(signing): add WorldID verification widget with IDKit integration"
```

---

## Task 9: Create CRE workflow for WorldID attestation

**Files:**
- Create: `apps/cre/workflow-worldid-verify/workflow.yaml`
- Create: `apps/cre/workflow-worldid-verify/main.ts`
- Create: `apps/cre/workflow-worldid-verify/handlers.ts`
- Create: `apps/cre/workflow-worldid-verify/types.ts`
- Create: `apps/cre/workflow-worldid-verify/config.json`
- Create: `apps/cre/workflow-worldid-verify/secrets.yaml`

**Step 1: Create workflow.yaml**

```yaml
# ==========================================================================
# Workflow: WorldID Verify (CRE attestation for proof of personhood)
# ==========================================================================
# Verifies WorldID proof came from our backend, publishes on-chain attestation.
# Run: cre workflow simulate workflow-worldid-verify --target local-simulation

local-simulation:
  user-workflow:
    workflow-name: "workflow-worldid-verify"
  workflow-artifacts:
    workflow-path: "./main.ts"
    config-path: "./config.json"
    secrets-path: "./secrets.yaml"

staging:
  user-workflow:
    workflow-name: "workflow-worldid-verify"
  workflow-artifacts:
    workflow-path: "./main.ts"
    config-path: "./config.json"
    secrets-path: "./secrets.yaml"
```

**Step 2: Create types.ts**

```typescript
import { z } from "zod"

const addr = z.string().regex(/^0x[a-fA-F0-9]{40}$/u)

export const configSchema = z.object({
  chainSelectorName: z.string().min(1),
  attestationContract: addr,
  gasLimit: z.string().regex(/^\d+$/),
})

export type Config = z.infer<typeof configSchema>
```

**Step 3: Create handlers.ts**

```typescript
/**
 * WorldID Verify Workflow Handler
 *
 * Receives WorldID proof verification data from our backend (after World API v4
 * has already confirmed the proof). Publishes an on-chain attestation to
 * BUAttestation.sol on Arbitrum Sepolia — enabling World ID proof of personhood
 * on a chain where it is not natively supported.
 *
 * Trigger: HTTP (app backend calls CRE after successful World API v4 verification)
 */

import {
  decodeJson,
  type Runtime,
  type HTTPPayload,
} from "@chainlink/cre-sdk"
import { withHttp } from "../shared/triggers"
import { publishAttestation } from "../shared/services/attestation"
import type { Config } from "./types"

// ============================================================================
// Handler: WorldID Verify (HTTP Trigger)
// ============================================================================

const worldidVerify = withHttp<Config>(
  (runtime, payload) => {
    const input = decodeJson(payload.input) as {
      contractId: string
      walletAddress: string
      nullifierHash: string
      verificationLevel: string
      userId: string
    }

    runtime.log(
      `WorldID verify: contract=${input.contractId} wallet=${input.walletAddress} level=${input.verificationLevel}`
    )

    // Publish attestation on-chain
    const attestation = publishAttestation(runtime, {
      type: "worldid_verify",
      entityId: `worldid-${input.contractId}-${input.walletAddress}`,
      data: {
        contractId: input.contractId,
        walletAddress: input.walletAddress,
        nullifierHash: input.nullifierHash,
        verificationLevel: input.verificationLevel,
        userId: input.userId,
      },
      metadata: JSON.stringify({
        provider: "worldid",
        level: input.verificationLevel,
        contract: input.contractId,
      }),
    })

    runtime.log(
      `WorldID attestation published: tx=${attestation.txHash} id=${attestation.attestationId}`
    )

    return attestation
  }
)

// ============================================================================
// Init
// ============================================================================

export function initWorkflow() {
  return [worldidVerify]
}
```

**Step 4: Create main.ts**

```typescript
import { Runner } from "@chainlink/cre-sdk"
import { configSchema, type Config } from "./types"
import { initWorkflow } from "./handlers"

export async function main() {
  const runner = await Runner.newRunner<Config>({ configSchema })
  await runner.run(initWorkflow)
}
```

**Step 5: Create config.json**

```json
{
  "chainSelectorName": "ethereum-testnet-sepolia-arbitrum-1",
  "attestationContract": "0xC3C7A1bd7556ba93729f859F0f1D1Cb60aeEc72C",
  "gasLimit": "300000"
}
```

**Step 6: Create secrets.yaml**

```yaml
CRE_ETH_PRIVATE_KEY: "${CRE_ETH_PRIVATE_KEY}"
```

**Step 7: Commit**

```bash
git add apps/cre/workflow-worldid-verify/
git commit -m "feat(cre): add WorldID verification workflow with on-chain attestation"
```

---

## Task 10: Wire CRE trigger for WorldID from app backend

**Files:**
- Create: `apps/app/src/lib/cre-trigger.ts`

**Step 1: Create thin CRE trigger wrapper**

This is an app-side equivalent of Shiva's `cre-trigger.service.ts`. It POSTs to the CRE gateway to trigger workflows.

```typescript
import { createLogger } from '@bu/logger'

const logger = createLogger({ prefix: 'cre-trigger' })

const WORKFLOW_MAP: Record<string, string> = {
  worldid_verify: 'workflow-worldid-verify',
}

interface TriggerPayload {
  action: string
  payload: Record<string, unknown>
}

export async function triggerCreWorkflow({ action, payload }: TriggerPayload) {
  const gatewayUrl = process.env.CRE_GATEWAY_URL
  if (!gatewayUrl) {
    logger.warn('CRE_GATEWAY_URL not set, skipping CRE trigger')
    return null
  }

  const workflowId = WORKFLOW_MAP[action]
  if (!workflowId) {
    logger.warn(`No CRE workflow mapped for action: ${action}`)
    return null
  }

  const url = `${gatewayUrl}/workflows/${workflowId}/trigger`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`CRE trigger failed: ${res.status} ${text}`)
  }

  const result = await res.json()
  logger.info(`CRE workflow triggered: ${workflowId}`, { result })
  return result
}
```

**Step 2: Commit**

```bash
git add apps/app/src/lib/cre-trigger.ts
git commit -m "feat(app): add CRE trigger utility for WorldID attestation"
```

---

## Summary

| Task | What | Files |
|------|------|-------|
| 1 | Add `worldid_verify` attestation type | 2 modified |
| 2 | Add `worldId` + `persona` to types | 1 modified |
| 3 | Properties panel toggles | 1 modified |
| 4 | Node badges | 1 modified |
| 5 | Install IDKit + env vars | 2 created, 1 modified |
| 6 | RP signature endpoint | 1 created |
| 7 | Verify endpoint | 1 created |
| 8 | WorldID widget component | 1 created |
| 9 | CRE workflow | 6 created |
| 10 | CRE trigger utility | 1 created |

**Total:** 5 modified + 12 created files, 10 commits.
