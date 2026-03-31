# Ghost Mode Phase 2 — Protocol Extensions Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extend Ghost Mode private transfers with KYC/KYB compliance gate, CCTP cross-chain hub-and-spoke, and proof of reserves — all orchestrated through the CRE mint/redeem pipeline.

**Architecture:** Pipeline Extension (Approach 1). Each extension becomes new steps inserted into the existing deposit/withdraw step-pipeline. No new abstractions — reuses `executeSteps`, `StepReceipt`, and `receipt()` from `packages/private-transfer/src/pipeline/execute.ts`.

**Tech Stack:** Circle DCW SDK, Chainlink CRE/ACE Vault, CCTP (Circle Cross-Chain Transfer Protocol), Persona KYC/KYB, BUAttestation.sol, Hashnote USYC, viem, Bun test.

---

## Phase 2 Scope

### 1. KYC/KYB Gate

New `kycGate` step inserted as **step 0** in both deposit and withdraw pipelines.

**Flow:**
1. Determine `verificationType`: team wallet → `kyb`, else → `kyc`
2. Query status from Supabase (`users.kyc_status` / `teams.kyb_status` via `users_on_team`)
3. If `approved`: verify address is on on-chain AllowList (PolicyEngine read). If missing, call `syncAllowListFromPersona()` to fix. Return receipt.
4. If NOT approved: return `{ pendingKyc: true, verificationType, personaInquiryUrl }`. Pipeline short-circuits — no funds move.

**CRE Attestation:** When Persona webhook fires with approval:
- Existing: updates DB status, syncs AllowList
- NEW: writes CRE attestation with op type `kyc-verified` or `kyb-verified`
- Data: `{ address, verificationType, personaInquiryId, timestamp }`

**Response type:**
```typescript
interface PendingKycResponse {
  success: false;
  pendingKyc: true;
  verificationType: 'kyc' | 'kyb';
  personaInquiryUrl: string;
}
```

**Files:**
- Create: `packages/private-transfer/src/kyc/index.ts`
- Create: `packages/private-transfer/src/kyc/kyc.test.ts`
- Modify: `packages/private-transfer/src/deposit/index.ts` — insert kycGate as step 0
- Modify: `packages/private-transfer/src/withdraw/index.ts` — insert kycGate as step 0
- Modify: `apps/cre/shared/services/attestation.ts` — add kyc/kyb op types
- Modify: `apps/cre/shared/triggers.ts` — attestation trigger for KYC events

### 2. CCTP Hub-and-Spoke (Cross-Chain)

ACE Vault on Sepolia = hub. Users on Ethereum/Arbitrum/Base/Polygon = spokes. CCTP bridges native USDC.

Conditional `cctpBridgeIn` / `cctpBridgeOut` steps — only fire when source/destination chain differs from ACE chain.

**Deposit (cross-chain):**
1. Skip if same-chain
2. Burn USDC on source chain: `depositForBurn(amount, destinationDomain, treasuryBytes32, usdcAddress)` via `createContractExecutionTransaction`
3. Wait for CCTP attestation (poll Circle attestation API)
4. Receive on hub: `receiveMessage(message, attestation)` via `createContractExecutionTransaction`

**Withdraw (cross-chain):**
1. Skip if same-chain or no destinationChain
2. Burn USDC on hub (treasury wallet): `depositForBurn`
3. Wait for CCTP attestation
4. Receive on destination chain (user wallet): `receiveMessage`

**Integration with transfer-core:**
- READ configs from `packages/transfer-core/src/protocols/cctp/` (domain mappings, addresses)
- DO NOT use transfer-core executors (they use EOA signing, not Circle DCW)
- Execute all on-chain calls via `createContractExecutionTransaction`

**CCTP Attestation Polling:**
```typescript
// packages/private-transfer/src/cctp/attestation.ts
async function waitForCctpAttestation(messageHash: string): Promise<{ message: string; attestation: string }>
// Polls https://iris-api.circle.com/attestations/{messageHash}
// Retry with backoff, timeout after 15 minutes
```

**Files:**
- Create: `packages/private-transfer/src/cctp/index.ts`
- Create: `packages/private-transfer/src/cctp/attestation.ts`
- Create: `packages/private-transfer/src/cctp/cctp.test.ts`
- Modify: `packages/private-transfer/src/deposit/index.ts` — insert cctpBridgeIn after kycGate
- Modify: `packages/private-transfer/src/withdraw/index.ts` — insert cctpBridgeOut after transferUsdc
- Read: `packages/transfer-core/src/protocols/cctp/` — reuse domain mappings

### 3. Proof of Reserves (USDg Supply Parity)

New `attestReserves` step as **final step** in both pipelines. Plus scheduled daily heartbeat via Chainlink Automation.

**Pipeline step:**
1. Read treasury USDC balance (readContract balanceOf)
2. Read treasury USYC balance (readContract balanceOf)
3. Get USYC-to-USDC price from treasury-yield oracle
4. Calculate `totalReserves = usdcBalance + usycValue`
5. Read USDg totalSupply (readContract)
6. Calculate `ratio = totalReserves / usdgSupply`
7. Write CRE attestation with op type `proof-of-reserves`
8. Return receipt (non-throwing — failure here doesn't fail the transfer)

**Attestation data:**
```typescript
interface ReserveAttestation {
  usdcBalance: string;
  usycValue: string;
  totalReserves: string;
  usdgSupply: string;
  ratio: string;
  timestamp: number;
  triggerType: 'deposit' | 'withdraw' | 'scheduled';
}
```

**Scheduled heartbeat:** Chainlink Automation (same pattern as TreasuryRebalancer) runs daily. If `ratio < 1.0`, alerts via `@bu/slack-notifier`.

**New attestation op types:** `proof-of-reserves`, `usdg-supply-snapshot`, `kyc-verified`, `kyb-verified`

**Failure mode:** attestReserves catches its own errors — does NOT throw. The user's transfer already succeeded; log + alert, scheduled heartbeat catches up.

**Files:**
- Create: `packages/private-transfer/src/reserves/index.ts`
- Create: `packages/private-transfer/src/reserves/reserves.test.ts`
- Modify: `packages/private-transfer/src/deposit/index.ts` — append attestReserves
- Modify: `packages/private-transfer/src/withdraw/index.ts` — append attestReserves
- Modify: `apps/cre/shared/services/attestation.ts` — add new op types
- Modify: `packages/env/src/ace.ts` — add getUsycAddress(), getUsycOracleAddress()

---

## Complete Phase 2 Pipelines

**Deposit (same-chain):**
```
kycGate -> complianceCheck -> transferUsdc -> subscribeUsyc -> mintUsdg -> vaultDeposit -> queryBalance -> attestReserves
```

**Deposit (cross-chain):**
```
kycGate -> cctpBridgeIn -> complianceCheck -> transferUsdc -> subscribeUsyc -> mintUsdg -> vaultDeposit -> queryBalance -> attestReserves
```

**Withdraw (same-chain):**
```
kycGate -> requestTicket -> vaultRedeem -> burnUsdg -> liquidityCheck -> transferUsdc -> attestReserves
```

**Withdraw (cross-chain):**
```
kycGate -> requestTicket -> vaultRedeem -> burnUsdg -> liquidityCheck -> transferUsdc -> cctpBridgeOut -> attestReserves
```

### Conditional Step Pattern

Steps handle their own skip logic. Skipped steps still appear in the audit trace:
```typescript
const cctpBridgeIn: Step<DepositContext> = {
  name: 'cctp-bridge-in',
  async execute(ctx) {
    if (!ctx.sourceChain || ctx.sourceChain === getAceChainName()) {
      return receipt('cctp-bridge-in', undefined, 'same-chain -- skipped');
    }
    // ... bridge logic
  },
};
```

---

## Package Structure (Phase 2)

```
packages/private-transfer/src/
  pipeline/          # existing -- amount, execute, tx
  eip712/            # existing
  signer/            # existing
  client/            # existing
  compliance/        # existing
  deposit/           # modify -- add kycGate, cctpBridgeIn, attestReserves
  withdraw/          # modify -- add kycGate, cctpBridgeOut, attestReserves
  kyc/               # NEW -- kycGate step, Persona integration
    index.ts
    kyc.test.ts
  cctp/              # NEW -- bridge steps, attestation poller
    index.ts
    attestation.ts
    cctp.test.ts
  reserves/          # NEW -- proof of reserves step
    index.ts
    reserves.test.ts
```

### No New Dependencies
- KYC: Supabase (existing), syncAllowListFromPersona (existing), attestation service (existing)
- CCTP: transfer-core configs (existing), Circle DCW SDK (existing), Circle attestation API (new HTTP call via @bu/http-client)
- PoR: viem readContract (existing), treasury-yield oracle (existing), attestation service (existing)

---

## Phase 3 — Business Finance Settlement (Design Only)

Ghost Mode becomes an optional settlement layer for existing business finance flows.

**Pattern:** Add `settlementMethod: 'private' | 'standard'` flag to payroll, invoice, and card payment flows. When `private`, route settlement through the ACE Vault mint/redeem pipeline instead of direct USDC transfer.

**Integration points:**
- **Payroll (Rain):** Batch payroll run → per-employee deposit through vault → private salary payments
- **Invoices (Bridge):** Invoice payment → deposit on send → withdraw on receive → privacy-preserving B2B payments
- **Cards (Alfred):** Card transaction settlement → vault-backed spending with private balance
- **Fiat on/off (Bridge/Gateway):** Fiat ingress → USDC → private deposit; private withdraw → USDC → fiat egress

**Affected packages:**
- `packages/transfer-fiat/` — Bridge, Alfred, Rain service modifications
- `packages/transfer-core/` — New `private` protocol executor
- `apps/shiva/` — New settlement routes

**Not implemented in Phase 2.** Specs and interfaces documented here for Phase 3 planning.

---

## Future — Aspirational

### Chainlink Proof of Reserve Feeds (Option C)

Register Bu treasury reserves as a Chainlink PoR reference feed. Any protocol can consume our reserve data on-chain without trusting our attestation contract.

**Requirements:**
- Chainlink node operator coordination
- Custom External Adapter for reading treasury balances
- Registration as a Chainlink data feed
- Separate timeline — depends on Chainlink relationship

### CCIP Cross-Chain CRE Attestation

Use Chainlink CCIP to broadcast KYC/KYB status and reserve attestations across chains. Enables multi-chain protocols to verify Bu user compliance without cross-chain queries.

**Prerequisite:** CCTP hub-and-spoke (Phase 2) must be stable first.
