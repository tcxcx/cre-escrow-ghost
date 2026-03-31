# Contract Builder ↔ CRE Escrow Wiring — Design Document

**Date**: 2026-03-08
**Branch**: `next-ui`
**Approach**: Layered Vertical (C) — 4 dependency-ordered layers, each independently testable

## Problem

The contract builder UI and CRE workflows are disconnected. 8 gaps (P0–P2) prevent a working end-to-end journey from contract creation to on-chain settlement.

## Gaps Addressed

| ID | Priority | Gap |
|----|----------|-----|
| G1 | P0 | No EscrowFactory deployed (zero-address placeholder) |
| G2 | P0 | Contract builder never links an escrow address to the agreement |
| G3 | P0 | Funding is DB-only (wallet SDK is a TODO) |
| G7 | P1 | No public `/contracts/[token]` verification page |
| G5 | P1 | `workflow-escrow-dispute` exists but is never called |
| G4 | P1 | No BUAttestation in fallback verification path |
| G6 | P2 | Yield strategy names mismatch (UI says AAVE, CRE uses Deframe) |
| G8 | P2 | Commissions/conditions not in agreement hash |

## Deployment Targets

- **Eth Sepolia** — Primary. All CRE workflows, monitoring, and UI wired here.
- **Arbitrum Sepolia** — Demo only. Same contracts deployed, addresses recorded, no workflow wiring. For hackathon judges to verify on-chain deployment.

---

## Layer 1: On-Chain Foundation

### 1a. Deploy EscrowFactory + EscrowWithAgentV3

**Both chains**: Eth Sepolia (wired) + Arbitrum Sepolia (demo).

**Contract**: `EscrowFactory`
- Constructor: `policyEngine`, `attestationContract`, `executorAgent` (deployer wallet)
- Emits `AgreementCreated(address escrow, bytes32 agreementHash)` — already expected by `workflow-escrow-monitor`
- Creates `EscrowWithAgentV3` instances per agreement

**Deploy**: Hardhat script in `apps/cre/scripts/`. Run once, record addresses.

**Update** `apps/cre/shared/addresses.ts`:
```typescript
export const ESCROW_FACTORY = '0x...' as const        // Eth Sepolia
export const ESCROW_FACTORY_ARB = '0x...' as const    // Arb Sepolia (demo)
```

### 1b. New CRE Workflow: `workflow-escrow-deploy`

**Trigger**: HTTP (Shiva calls after agreement creation)

**Payload**:
```typescript
{
  agreementId: string
  agreementHash: string
  milestones: { amount: number; description: string }[]
  payerAddress: string
  payeeAddress: string
  tokenAddress: string
  totalAmount: number
}
```

**Handler**:
1. Call `EscrowFactory.createEscrow(agreementHash, payer, payee, token, totalAmount, milestoneAmounts[], milestoneDescriptions[])`
2. Read returned escrow address from event log
3. Publish BUAttestation (OpType 19: `ESCROW_DEPLOY`)
4. POST callback to `cre_callbacks` with `{ agreementId, escrowAddress, txHash }`

**Reuses**: `shared/services/evm.ts`, `shared/services/attestation.ts`, `shared/clients/presets.ts`

### 1c. Shiva Integration

**New endpoint**: `POST /contracts/:id/deploy-escrow` in `contracts.controller.ts`
- Reads agreement from DB
- `triggerCreWorkflowWithFallback('workflow-escrow-deploy', payload)`
- On callback: updates `escrow_agreements_v3.escrow_address`

**App API route**: `POST /api/contracts/agreements/[id]/deploy-escrow/route.ts` — proxies to Shiva (same pattern as all other agreement routes)

---

## Layer 2: Core Flow (Funding + Public Page)

### 2a. Escrow Funding UI

**Reuses the invoice payment dual-wallet pattern:**

| Component | Source | Purpose |
|-----------|--------|---------|
| `PaymentMethodSelector` | `invoice-payment/payment-method-selector.tsx` | RadioGroup: BuFi Connect vs External Wallet |
| `usePaymentMethod` | `hooks/use-payment-method.ts` | Session-aware default selection |
| `ExternalWalletConnector` | `invoice-payment/external-wallet-connector.tsx` | AppKit modal, wagmi, USDC/EURC balances |
| BuFi wallet selector | `invoice-details-view/` | Workspace → wallet → balance → pay |

**New component**: `EscrowFundingView` — replaces TODO in `funding-view.tsx`:

1. `PaymentMethodSelector` — bufi vs external
2. **BuFi path**: workspace selector → wallet selector → balance → "Fund Escrow"
   - Server action: `fundEscrowBufi(agreementId, walletId, amount)` → Shiva `POST /contracts/:id/fund`
3. **External path**: `ExternalWalletConnector` → USDC balance → "Approve & Fund"
   - Step 1: ERC20 `approve(escrowAddress, amount)` via `useWriteContract`
   - Step 2: `EscrowWithAgentV3.fund()` via `useWriteContract`
   - Step 3: `useWaitForTransactionReceipt` → POST to `/api/contracts/agreements/[id]/fund` with `{ txHash }`

### 2b. Link Escrow Address to Agreement

- `GET /api/contracts/agreements/[id]` returns `escrow_address`
- If null → "Deploying escrow..." spinner
- If set → show `EscrowFundingView`
- Add `updateAgreementEscrowAddress()` to `contract-mutations.ts`

### 2c. Public Contract Verification Page

**Route**: `apps/app/src/app/[locale]/(public)/contracts/[token]/page.tsx`

**Copies from** `(public)/invoice/[token]/page.tsx`:
- JWT verification: `verify(token)` → get agreement ID
- Layout: `UserProvider(null)` + `NuqsAdapter`
- Admin Supabase fetch via `getAgreementByToken(supabase, id)`
- View tracking: `waitUntil()`

**Component**: `ContractPublicView` — read-only:
- Title, status badge, creation date
- Parties (payer/payee names)
- Milestone list with status indicators (reuse `milestone-detail.tsx` read-only)
- Escrow balance card (reuse `escrow-balance-card.tsx`)
- Etherscan link to escrow contract
- "Sign this contract" CTA if pending-signature

**Query**: `getAgreementByToken()` in `@bu/supabase/queries`

---

## Layer 3: Verification Integrity

### 3a. Wire `workflow-escrow-dispute` into Shiva

Replace inline AI calls in `fileDispute()` with:
```typescript
triggerCreWorkflowWithFallback('workflow-escrow-dispute', {
  agreementId, escrowAddress, milestoneIndex,
  disputeReason, evidence, filedBy
})
// Fallback: existing Shiva inline AI logic (unchanged)
```

**What this enables**: On-chain milestone locking, consensus-verified arbitration, encrypted verdicts, BUAttestation (type: `ESCROW_DISPUTE`).

**Files**: `apps/shiva/src/controllers/contracts.controller.ts` — ~30 lines replaced with one `triggerCreWorkflowWithFallback()` call. No CRE workflow changes.

### 3b. Add BUAttestation to Fallback Verification

When CRE is down and `workflow-escrow-verify` falls back to Shiva:
1. AI verification runs (existing logic)
2. **New**: call `publishAttestation()` directly from Shiva
3. Use `BUAttestation` contract with OpType `ESCROW_VERIFY` (11)
4. Attestation metadata includes `source: "fallback"` (distinguishable from CRE consensus attestations)

**Files**: `apps/shiva/src/services/verification-fallback.service.ts` or inline in controller — ~15 lines after AI verdict.

---

## Layer 4: Polish

### 4a. Yield Strategy via Deframe (Reuse Earn Feature)

**Reuses from Earn:**

| Component/Hook | Purpose |
|---|---|
| `usePodsWalletPositions(address)` | Fetch active yield positions |
| `useHighestApy()` | Show best APY in settings |
| `EarnContent` (Opportunities tab) | Strategy list with APY, TVL, risk |
| `useEarnParams` | Tab state management |

**Settings panel** (`settings-panel.tsx`):
- Replace `aave | compound | none` with toggle + embedded `EarnContent` strategy picker
- User selects strategy → stores `{ strategyId, strategyName, apy, podAddress }`

**Type change**:
```typescript
type YieldStrategy =
  | { enabled: false }
  | { enabled: true; strategyId: string; strategyName: string; apy: number; podAddress: string }
```

**Yield dashboard**: `usePodsWalletPositions(escrowAddress)` for live data. Fallback to `escrow_yield_positions` table if API doesn't return (delisted strategy).

**DB table** `escrow_yield_positions`:

| Column | Type | Purpose |
|--------|------|---------|
| id | uuid | PK |
| agreement_id | text | FK to escrow_agreements_v3 |
| strategy_id | text | Deframe pod/strategy ID |
| strategy_name | text | Display name snapshot |
| pod_address | text | On-chain address |
| apy_at_entry | numeric | APY when deposited |
| deposited_amount | numeric | Principal |
| deposited_at | timestamptz | Entry time |
| redeemed_at | timestamptz | null if active |
| tx_hash_deposit | text | On-chain proof |
| tx_hash_redeem | text | null if active |

Written by `workflow-escrow-yield` on deposit/redeem callbacks.

### 4b. Encode Commissions & Conditions into Agreement Hash

Extend `packages/contracts/src/agreement/compiler.ts` hash computation:
```
hash = keccak256(encode(title, milestones[], parties[], commissions[], conditions[]))
```

The hash is already stored on-chain as `bytes32` when `EscrowFactory.createEscrow()` is called. No contract changes needed.

Public contract view can verify: "On-chain hash matches stored JSON" — proves off-chain terms are untampered.

---

## Reuse Summary

| Pattern | Source | Used in |
|---------|--------|---------|
| Dual wallet (BuFi + External) | `invoice-payment/` | Escrow funding (Layer 2) |
| JWT public page | `(public)/invoice/[token]/` | Contract public view (Layer 2) |
| Dub short links | `lib/payroll-token.ts` | Contract share links (already done) |
| CRE trigger with fallback | `shiva/services/cre-trigger.service.ts` | Deploy, dispute, verify (Layers 1-3) |
| Earn strategy picker | `components/earn/` | Yield selection (Layer 4) |
| Yield positions hook | `hooks/use-pods-wallet-positions.ts` | Yield dashboard (Layer 4) |
| Escrow balance card | `contracts/escrow/escrow-balance-card.tsx` | Public view + dashboard (Layer 2) |
| BUAttestation publisher | `cre/shared/services/attestation.ts` | Fallback path (Layer 3) |
| Contract mutations | `supabase/mutations/contract-mutations.ts` | Share data + escrow address (Layers 1-2) |

## PR Strategy

4 PRs, one per layer, merged in order:
1. `feat(cre): deploy escrow factory + workflow-escrow-deploy`
2. `feat(contracts): escrow funding UI + public contract page`
3. `feat(contracts): wire CRE dispute + fallback attestation`
4. `feat(contracts): deframe yield integration + agreement hash`
