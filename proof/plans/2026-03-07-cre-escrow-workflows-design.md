# CRE Escrow Workflows — Design

**Date**: 2026-03-07
**Status**: Approved
**Scope**: 5 CRE workflows for AI escrow lifecycle + Confidential HTTP layer + Deframe Pods yield
**Architecture**: Dual client (Confidential + Regular) with Ghost Mode proven patterns

## 1. Architecture Overview

### Workflow Map

| Workflow | Trigger | Purpose | Client |
|---|---|---|---|
| `workflow-escrow-verify` | HTTP | AI verification of milestone deliverables | **Confidential** (deliverable content is IP) |
| `workflow-escrow-dispute` | HTTP | 4-layer AI arbitration pipeline | **Confidential** (evidence, briefs, verdicts) |
| `workflow-escrow-yield` | HTTP | Deposit/redeem escrow funds to Deframe yield | Regular (financial ops, no IP) |
| `workflow-escrow-finalize` | HTTP | Set decision + execute on-chain + receipt | **Confidential** (final receipt with audit trail) |
| `workflow-escrow-monitor` | Cron + Log | Monitor escrow events + proof of escrow reserves | Regular (on-chain reads only) |

### Dual Client Strategy

**Confidential (`ConfidentialHTTPClient`)** — enclave-executed, secret injection via `{{.secretName}}` template syntax, AES-256-GCM encrypted responses:
- Deliverable file content → AI verification
- Verification criteria + AI prompts
- Dispute evidence files
- Advocate briefs (Layer 2)
- Tribunal/Supreme Court verdicts (Layer 3-4)
- Final receipt with full audit trail

**Regular (`createPlatformClient`)** — consensus-verified HTTP, proven Ghost Mode pattern:
- Milestone status reads/writes (Supabase)
- Escrow balance checks (on-chain via `callView`)
- Deframe Pods strategy queries
- Deframe deposit/redeem bytecode generation
- Attestation publishing (on-chain write)

### Yield Strategy (Approach B — Explicit Opt-In)

Per-contract `YieldStrategy` config in AgreementJSON controls whether yield is enabled. If enabled, `workflow-escrow-yield` handles deposit after funding confirmation and redeem on milestone release. Both parties agree at contract creation time. Uses Deframe Pods (`@bu/pods`) via Motora proxy routes.

### Data Flow

```
User submits deliverable
  → API route triggers workflow-escrow-verify (HTTP)
  → Confidential: Fetch deliverable from Supabase (encrypted response)
  → Confidential: Send to AI verification service (IP protected)
  → Regular: Write verdict to Supabase
  → Regular: setMilestoneStatus(APPROVED or REJECTED) on-chain
  → Regular: publishAttestation(escrow_verify)
  → If yield enabled: trigger workflow-escrow-yield (deposit/accrue)

Dispute filed
  → API route triggers workflow-escrow-dispute (HTTP)
  → Regular: lockMilestone on-chain
  → Confidential: Run 4-layer AI pipeline (all evidence stays in enclave)
  → Regular: Store hashed outputs in Supabase
  → Regular: publishAttestation(escrow_dispute)
  → Triggers workflow-escrow-finalize

Yield flow
  → After funding confirmed, if YieldStrategy.enabled:
  → Regular: Query Deframe Pods for best strategy
  → Regular: Generate deposit bytecode via Pods swap API
  → Regular: Execute deposit on-chain
  → On milestone release: redeem from yield, distribute with split
```

## 2. Confidential Client Layer & Shared Services

### `createConfidentialPlatformClient()` — New Factory

Mirrors existing `createPlatformClient()` but wraps `ConfidentialHTTPClient`:

```typescript
// shared/clients/confidential.ts
export function createConfidentialPlatformClient<C>(options: {
  getBaseUrl: (config: C) => string
  getAuthHeader: (config: C) => { key: string; template: string }
  getOwner: (config: C) => string
  encryptOutput?: boolean
}) → { get<R>(...), post<R>(...) }
```

Key differences from regular client:
- Secret injection via `{{.secretName}}` template syntax (resolved in enclave only)
- `vaultDonSecrets` array maps secret keys to Vault DON
- `encryptOutput: true` encrypts response with AES-256-GCM before leaving enclave
- `consensusIdenticalAggregation` verifies all enclaves produce identical results

### Confidential Presets

```typescript
// shared/clients/confidential-presets.ts
confidentialShivaClient<C>()   // encryptOutput: true — AI/IP responses
confidentialMotoraClient<C>()  // encryptOutput: false — yield data (not IP)
```

### Shared Escrow Service — `shared/services/escrow.ts`

Wraps EscrowWithAgentV3 on-chain operations using proven `callView` + `runtime.report()` patterns:

**Reads**: `readMilestone()`, `readMilestoneCount()`, `readDecision()`
**Writes via CRE report → ACE PolicyEngine**:
- `setMilestoneStatus()` — actionType=5
- `lockMilestone()` — actionType=2
- `setDecision()` — actionType=3 (payeeBps + receiptHash)
- `executeDecision()` — actionType=4

All writes encode parameters as: `(uint8 actionType, uint256 milestoneIndex, address executorAgent, uint256 payeeBps, bytes32 receiptHash)` matching the EscrowExtractor pattern.

### New Attestation Op Types

```typescript
escrow_verify: 11
escrow_dispute: 12
escrow_yield_deposit: 13
escrow_yield_redeem: 14
escrow_finalize: 15
```

### Base Config Schema

```typescript
const escrowBaseConfig = z.object({
  chainSelectorName: z.string().min(1),
  attestationContract: z.string().regex(/^0x/),
  gasLimit: z.string().regex(/^\d+$/),
  escrowFactoryAddress: z.string().regex(/^0x/),
  executorAgent: z.string().regex(/^0x/),
  shivaApiUrl: z.string().min(1),
  motoraApiUrl: z.string().min(1),
  supabaseUrl: z.string().min(1),
  owner: z.string(), // Vault DON owner (empty in sim)
})
```

## 3. Workflow Implementations

### WF-1: `workflow-escrow-verify` (HTTP)

AI verifies milestone deliverable against acceptance criteria.

1. Regular: supabaseClient → fetch submission record (notes, file refs)
2. Regular: supabaseClient → fetch milestone (verificationCriteria, aiPrompt)
3. Confidential: confidentialShivaClient → POST /intelligence/verify (deliverable content + criteria)
4. Backend decrypts response with AES key
5. Regular: supabaseClient → PATCH submission with verdict
6. Regular: setMilestoneStatus(APPROVED or REJECTED) on-chain
7. Regular: publishAttestation(escrow_verify)

Secrets: `shivaApiKey`, `supabaseServiceKey`, `san_marino_aes_gcm_encryption_key`

### WF-2: `workflow-escrow-dispute` (HTTP)

Full 4-layer AI arbitration pipeline.

1. Regular: lockMilestone on-chain
2. Regular: supabaseClient → fetch all context
3. **Layer 2 — Advocates**: Confidential → POST /intelligence/advocate (parallel provider + client briefs)
4. Regular: store hashed briefs in arbitration_documents
5. **Layer 3 — Tribunal**: Confidential → POST /intelligence/tribunal (3 judges, 2/3 majority)
6. Regular: store tribunal verdicts
7. **Layer 4 — Supreme Court** (only if tribunal split 2-1 AND appeal filed): Confidential → 5 judges, 4/5 supermajority
8. Regular: store supreme court verdicts
9. Regular: publishAttestation(escrow_dispute)

Secrets: `shivaApiKey`, `supabaseServiceKey`, `san_marino_aes_gcm_encryption_key`

### WF-3: `workflow-escrow-yield` (HTTP)

Deposit/redeem escrow funds to Deframe yield strategy.

**DEPOSIT** (after funding, if YieldStrategy.enabled):
1. Regular: supabaseClient → fetch agreement (YieldStrategy config)
2. Regular: motoraClient → GET /pods/strategies (best match for protocol + asset)
3. Regular: motoraClient → POST /pods/swap/bytecode (deposit tx)
4. Regular: Execute deposit on-chain via CRE report
5. Regular: supabaseClient → PATCH agreement with yield position
6. Regular: publishAttestation(escrow_yield_deposit)

**REDEEM** (on milestone release or contract completion):
1. Regular: motoraClient → POST /pods/swap/bytecode (withdraw tx)
2. Regular: Execute redeem on-chain
3. Regular: Calculate yield earned, split per YieldStrategy.recipient
4. Regular: publishAttestation(escrow_yield_redeem)

Secrets: `motoraApiKey`, `supabaseServiceKey` (no confidential)

### WF-4: `workflow-escrow-finalize` (HTTP)

Record final decision on-chain and distribute funds.

1. Regular: supabaseClient → fetch agreement + arbitration documents
2. Confidential: confidentialShivaClient → POST /intelligence/receipt (generate FinalReceiptJSON)
3. Regular: setDecision(milestoneIndex, payeeBps, extraPayouts[], receiptHash) on-chain
4. Wait for dispute window expiry (enforced by DisputeWindowPolicy)
5. Regular: executeDecision(milestoneIndex) — distributes funds
6. If yield enabled: trigger WF-3 with action='redeem'
7. Regular: supabaseClient → PATCH milestone status = RELEASED
8. Regular: publishAttestation(escrow_finalize)

Secrets: `shivaApiKey`, `supabaseServiceKey`, `san_marino_aes_gcm_encryption_key`

### WF-5: `workflow-escrow-monitor` (Cron + Log)

Monitor escrow events and publish proof of escrow reserves.

**Handler 1 — EVM Log**: AgreementCreated, MilestoneFunded, DecisionExecuted events → update Supabase + attestation
**Handler 2 — Cron** (every 6h): Aggregate all active escrows → total escrowed, total in yield, total released → publishAttestation(proof_of_reserves)

Secrets: `supabaseServiceKey` (no confidential)

## 4. Integration & Build Sequence

### API Route → CRE Trigger Mapping

- `POST /agreements/:id/milestones/:msId/submit` → WF-1 (verify)
- `POST /agreements/:id/milestones/:msId/dispute` → WF-2 (dispute)
- `POST /agreements/:id/fund` (if yield enabled) → WF-3 (yield deposit)
- `POST /agreements/:id/milestones/:msId/finalize` → WF-4 (finalize)
- WF-5 runs autonomously (cron + event monitoring)

### CRE Callback

Workflows report results via `POST /api/contracts/cre-callback` → updates Supabase + notifies frontend via realtime.

### Decryption

Confidential responses arrive as AES-256-GCM encrypted Base64. Decryption in Shiva only (`escrow-decrypt.service.ts`), never client-side.

### Build Sequence (Producer Before Consumer)

**Step 1: Shared layer**
- `shared/abi/escrow-v3.ts` + `escrow-factory-v3.ts`
- `shared/clients/confidential.ts` + `confidential-presets.ts`
- `shared/services/escrow.ts`
- `shared/types.ts` (add escrow op types)

**Step 2: Workflows** (consumers of shared layer)
- `workflow-escrow-monitor` (simplest — no confidential)
- `workflow-escrow-yield` (regular clients, Deframe Pods)
- `workflow-escrow-verify` (confidential for AI)
- `workflow-escrow-finalize` (confidential for receipt)
- `workflow-escrow-dispute` (most complex — 4 layers)

**Step 3: Integration** (consumers of workflows)
- Shiva decryption service
- Wire API routes to trigger real CRE endpoints
- Wire cre-callback to process workflow results

### Constraints

- CRE WASM: Can't import from `packages/` — ABIs copied into `apps/cre/shared/`
- One `secrets.yaml` per workflow
- `export async function main()` as function declaration
- `LATEST_BLOCK_NUMBER` for testnet contract reads
- Bun ≥ 1.2.21 for WASM compilation
- Non-interactive simulation: `--non-interactive --trigger-index N`

### Shared Layer Additions

```
apps/cre/shared/
├── clients/
│   ├── presets.ts              (existing)
│   ├── confidential.ts         (NEW)
│   └── confidential-presets.ts (NEW)
├── services/
│   ├── attestation.ts          (existing)
│   ├── evm.ts                  (existing)
│   └── escrow.ts               (NEW)
├── abi/
│   ├── bu-attestation.ts       (existing)
│   ├── escrow-v3.ts            (NEW)
│   └── escrow-factory-v3.ts    (NEW)
└── types.ts                    (extend with escrow op types)
```
