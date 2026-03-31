# FHE Ghost Mode — Implementation Plan

> Privacy-as-a-Service with FHE encrypted balances, Chainlink ACE compliance, and USYC yield.
> Date: 2026-03-07 | Branch: `feat/fhe-ghost-mode`

## Context

### Chains
- **Ethereum Sepolia** — Primary demo chain (Chainlink CRE, ACE Vault, BUAttestation, PolicyEngine, USDCg, TreasuryManager, USYC)
- **Arbitrum Sepolia** — Fhenix FHE (FHERC20Wrapper deployment, encrypted balances/transfers)
- Hackathon is Arbitrum-focused but CRE only runs on Sepolia, so full flow demo uses both

### Existing Deployed Contracts (Sepolia)
- BUAttestation: `0xC3C7A1bd7556ba93729f859F0f1D1Cb60aeEc72C`
- USDCg: `0x2F28A8378798c5B42FC28f209E903508DD8F878b`
- PolicyEngine: `0x76b727ed158fe58CaFe4FF5F98D0D98E7244F926`
- TreasuryManager: `0x33A4a73FD81bB6314AB7dc77301894728E6825A4`
- ACE Vault: `0xE588a6c73933BFD66Af9b4A07d48bcE59c0D2d13`
- Deployer: `0x09Ce8E2B3Fede2727dA4392Ea8Fe618305ba0474`

### Existing CRE Workflows
- `workflow-private-transfer` — vault monitor + transfer verifier + reserves proof
- `workflow-treasury-rebalance` — buffer ratio monitor + rebalance attestation

### Business Model
User deposits USDC → gets eUSDCg (FHE-encrypted private balance).
Bu takes USDC → allocates to USYC (US Treasury yield) → Bu keeps yield.
User gets privacy. Bu earns ~5% APY on deposits. User never touches USYC.

---

## Architecture: 4 Layers

```
LAYER 4 — FHE (Fhenix, Arbitrum Sepolia)
  eUSDCg = FHERC20Wrapper(USDCg)
  Encrypted balances, encrypted transfers
  balanceOf() → indicator only (0.0000–0.9999)
  confidentialBalanceOf() → euint64 (owner-decryptable)

LAYER 3 — ACE Vault + DON State (Chainlink, Eth Sepolia)
  Private compliance ledger (only CRE reads/writes)
  Tracks: real balances, KYC status, transfer limits, flags
  Enforces: only compliant addresses can interact

LAYER 2 — USDCg + PolicyEngine (Eth Sepolia)
  Compliance gate (allowlist-based transfer gating)
  USDCg: intermediate token (deposit USDC → mint → wrap to FHE)
  BUAttestation: CRE-signed proofs (no amounts revealed)

LAYER 1 — TreasuryManager + USYC (Eth Sepolia)
  USDC → USYC subscription (Hashnote US Treasuries)
  Auto-allocate on deposit via allocateFromDeposit()
  Yield accrues to Bu (platform revenue)
  Backing invariant: USYC value ≥ eUSDCg total supply
```

---

## Implementation Phases

### Phase 1: FHE Contract Deployment (Arbitrum Sepolia)

**Goal:** Deploy FHERC20Wrapper wrapping USDCg on Fhenix Arbitrum testnet.

#### Task 1.1: Set up Fhenix Foundry environment
- Location: `apps/cre/contracts/`
- Add Fhenix dependencies: `@fhenixprotocol/cofhe-contracts`
- Add Fhenix Arbitrum Sepolia RPC to foundry.toml
- Fhenix Arbitrum Sepolia: chain ID and RPC from Fhenix docs

#### Task 1.2: Create GhostUSDC contract
- Location: `apps/cre/contracts/src/GhostUSDC.sol`
- Extends FHERC20Wrapper
- Wraps USDCg (or test USDC if cross-chain bridging not ready)
- Constructor: `FHERC20Wrapper(IERC20(usdcgAddress), "eUSDCg")`
- Symbol: `eUSDCg` (encrypted USDCg)
- Decimals: 6 (matches USDC/USDCg)

```solidity
// GhostUSDC.sol — minimal wrapper
contract GhostUSDC is FHERC20Wrapper {
    constructor(IERC20 underlying)
        FHERC20Wrapper(underlying, "eUSDCg")
    {}
}
```

#### Task 1.3: Deploy to Fhenix Arbitrum Sepolia
- Deploy GhostUSDC with USDCg address (or mock USDC for Arbitrum)
- Record deployed address in `.deployer-wallet.json`
- Verify contract on explorer

#### Task 1.4: Integration test script
- `scripts/test-fhe-wrap.ts`
- Mint test USDC → approve → wrap → check encrypted balance indicator
- confidentialTransfer to second address → check indicators change
- unwrap → wait for decrypt → claimUnwrapped → check USDC returned

### Phase 2: CRE Workflow — Ghost Deposit

**Goal:** Orchestrate: compliance → yield allocation → FHE wrap → DON state update → attestation.

#### Task 2.1: Create `workflow-ghost-deposit`
- Location: `apps/cre/workflow-ghost-deposit/`
- Trigger: HTTP (Shiva calls CRE when user deposits)
- Config: Sepolia chain selector + Arbitrum Sepolia for FHE

#### Task 2.2: Deposit handler implementation
```
HTTP Request → { userAddress, usdcAmount, kycProof }

Step 1: Compliance gate
  - Read PolicyEngine.checkTransfer(USDCg, user, vault, amount)
  - Read ACE Vault DON state for user KYC status
  - REJECT if not compliant → return { error: "NOT_COMPLIANT" }

Step 2: Yield allocation (Sepolia)
  - Transfer USDC from deposit escrow to TreasuryManager
  - TreasuryManager.allocateFromDeposit(amount) auto-subscribes USYC
  - Verify: USYC balance increased proportionally

Step 3: Mint USDCg (Sepolia)
  - USDCg.deposit(amount) — mints 1:1 USDCg
  - (auto-allocate already handled by Step 2)

Step 4: Bridge USDCg to Arbitrum Sepolia (if cross-chain)
  - CCTP burn on Sepolia → mint on Arbitrum
  - OR: for demo, use same-chain mock

Step 5: Wrap to FHE (Arbitrum Sepolia)
  - USDCg.approve(GhostUSDC, amount)
  - GhostUSDC.wrap(userAddress, amount)
  - User now has encrypted eUSDCg balance

Step 6: Update DON state
  - ACE Vault DON: { address, realBalance += amount, compliant: true }
  - This is private to CRE, not on-chain

Step 7: Attest
  - publishAttestation({ type: DEPOSIT, entityId: hash(user), data: { amountHash } })
  - On-chain proof without revealing amount

Return: { success: true, txHash, encryptedBalance: indicator }
```

#### Task 2.3: Shared FHE helpers
- Location: `apps/cre/shared/services/fhe.ts`
- `wrapToFHE(runtime, ghostUsdcAddr, userAddr, amount)` — approve + wrap
- `unwrapFromFHE(runtime, ghostUsdcAddr, userAddr, amount)` — unwrap + return ctHash
- `claimUnwrapped(runtime, ghostUsdcAddr, ctHash)` — claim decrypted amount
- `getEncryptedBalance(runtime, ghostUsdcAddr, userAddr)` — read indicator

### Phase 3: CRE Workflow — Ghost Transfer

**Goal:** FHE-encrypted peer-to-peer transfer with compliance sync.

#### Task 3.1: Create `workflow-ghost-transfer`
- Location: `apps/cre/workflow-ghost-transfer/`
- Trigger: Log (ConfidentialTransfer event from GhostUSDC)

#### Task 3.2: Transfer sync handler
```
Event: ConfidentialTransfer(from, to, value_hash)

Step 1: Detect transfer on-chain
  - Parse ConfidentialTransfer event from GhostUSDC
  - Extract: from, to, value_hash (encrypted amount reference)

Step 2: Compliance verification
  - Read ACE Vault DON state for both parties
  - Both must be compliant + within transfer limits
  - If NOT compliant: flag for review (can't reverse FHE transfer)

Step 3: Decrypt amount in TEE (CRE private compute)
  - CRE as registered operator can decrypt via FHE.sealoutput()
  - Decrypted amount stays in CRE TEE, never published

Step 4: Update DON state
  - sender.realBalance -= decryptedAmount
  - recipient.realBalance += decryptedAmount
  - Update transfer counters, timestamps, AML flags

Step 5: Attest
  - publishAttestation({ type: TRANSFER_VERIFY, entityId: hash(from+to) })
  - Proves compliant transfer without revealing parties or amounts
```

### Phase 4: CRE Workflow — Ghost Withdraw

**Goal:** Async FHE unwrap → USYC redeem → USDC to user.

#### Task 4.1: Create `workflow-ghost-withdraw`
- Location: `apps/cre/workflow-ghost-withdraw/`
- Trigger: HTTP (Shiva calls CRE when user requests withdrawal)

#### Task 4.2: Withdraw handler
```
HTTP Request → { userAddress, amount }

Step 1: Validate
  - Read DON state: user.realBalance >= amount?
  - Compliance check: no withdrawal blocks?

Step 2: FHE unwrap (Arbitrum Sepolia)
  - GhostUSDC.unwrap(userAddress, amount)
  - Returns ctHash for async decrypt claim
  - Store ctHash in workflow state

Step 3: Poll for decrypt completion
  - FHE.getDecryptResultSafe(ctHash) → (amount, decrypted)
  - Retry with backoff until decrypted = true
  - Timeout: 5 minutes max

Step 4: Claim unwrapped USDCg
  - GhostUSDC.claimUnwrapped(ctHash)
  - USDCg returned to user's address

Step 5: Burn USDCg + release USDC (Sepolia)
  - USDCg.withdraw(amount) → burns USDCg, releases USDC
  - OR: bridge USDCg back to Sepolia first if cross-chain

Step 6: Yield redemption (Bu's side)
  - TreasuryManager.redeemFromYield(proportionalUSYC)
  - USYC → USDC
  - Bu keeps accrued yield, user gets principal

Step 7: Update DON state + attest
  - DON: user.realBalance -= amount
  - publishAttestation({ type: WITHDRAWAL, entityId: hash(user) })

Return: { success: true, usdcReturned: amount, txHash }
```

### Phase 5: Shiva API Routes

**Goal:** Wire FHE Ghost Mode into the existing Shiva API.

#### Task 5.1: Ghost FHE routes
- Location: `apps/shiva/src/routes/ghost-fhe.ts`

```
POST /ghost/deposit    → CRE workflow-ghost-deposit
POST /ghost/transfer   → Direct FHE confidentialTransfer (user-signed)
POST /ghost/withdraw   → CRE workflow-ghost-withdraw
GET  /ghost/balance    → Read GhostUSDC indicator + DON real balance
GET  /ghost/claims     → List pending unwrap claims for user
POST /ghost/claim      → Claim specific unwrapped amount
```

#### Task 5.2: Schemas
- Location: `apps/shiva/src/schemas/ghost-fhe.schemas.ts`
- GhostDepositRequest: { amount: string }
- GhostTransferRequest: { to: string, encryptedAmount: InEuint64 }
- GhostWithdrawRequest: { amount: string }
- GhostBalanceResponse: { indicator: string, realBalance?: string, claims: Claim[] }

### Phase 6: Frontend Integration

**Goal:** Update Ghost Mode UI to use FHE-encrypted flow.

#### Task 6.1: Update ghost-mode-actions.ts
- `ghostDeposit()` → calls `/ghost/deposit` (triggers CRE workflow)
- `ghostTransfer()` → calls `/ghost/transfer`
- `ghostWithdraw()` → calls `/ghost/withdraw` + polls `/ghost/claims`

#### Task 6.2: Update use-ghost-mode.ts
- Add `encryptedIndicator` state (the 0.0000–0.9999 value)
- Add `pendingClaims` state for withdraw flow
- Add `claimWithdrawal(ctHash)` action

#### Task 6.3: Update Ghost Mode dashboard
- Show encrypted balance indicator with explanation text
- "Your balance is FHE-encrypted on-chain"
- Show pending claims list during withdrawal
- Processing → "Decrypting..." → "Claimable" → "Claimed" states

#### Task 6.4: Update Wallet Analytics Ghost Mode tab
- Show: Encrypted indicator, compliance status, pending claims
- Show: "Backed by US Treasury yield" (without revealing USYC details)

### Phase 7: Demo Flow — End to End

**Goal:** Complete hackathon demo script.

#### Demo Script
```
1. KYC verified user opens Ghost Mode
2. Deposits 1,000 USDC
   → CRE: compliance check ✓ → USYC allocation ✓ → FHE wrap ✓
   → User sees: "eUSDCg balance: 0.5001" (indicator)
   → Etherscan: no visible balance (just indicator)
   → Bu: earning ~5% APY on the $1,000

3. User transfers 500 eUSDCg to Bob
   → FHE: encrypted amount, nobody sees 500
   → CRE: detects event → decrypts in TEE → compliance check ✓
   → DON state updated: Alice 500, Bob 500
   → On-chain attestation: transfer verified (no amounts)

4. Bob withdraws 500 eUSDCg
   → FHE: unwrap → async decrypt (~30s) → claim
   → CRE: redeem proportional USYC → USDC to Bob
   → Bu: keeps yield earned on Bob's 500 during hold period

5. Show Etherscan: all transfers visible as 0.0001 indicator ticks
   → "This is what the world sees"
   → Show DON state (compliance dashboard): real balances
   → "This is what compliance sees"
   → Show USYC position: yield accrued
   → "This is how Bu earns revenue"
```

---

## Chain Architecture for Demo

```
ETHEREUM SEPOLIA (Chainlink CRE home)
├── BUAttestation     — on-chain proofs
├── PolicyEngine      — compliance allowlist
├── USDCg             — intermediate token
├── TreasuryManager   — USYC yield engine
├── ACE Vault         — DON state (private)
└── CRE Workflows     — orchestration

ARBITRUM SEPOLIA (Fhenix FHE home)
├── GhostUSDC (eUSDCg) — FHERC20Wrapper
├── FHE Coprocessor     — encrypted computation
└── User interactions   — wrap/transfer/unwrap

BRIDGE (for full cross-chain flow)
├── CCTP: USDC Sepolia ↔ Arbitrum
└── OR: Deploy USDCg mock on Arbitrum for simplified demo
```

### Simplified Demo Option (recommended for hackathon)
Deploy test USDC + GhostUSDC both on Arbitrum Sepolia.
CRE workflows run on Sepolia and call Arbitrum via cross-chain RPC.
Skip CCTP bridge — mock the cross-chain part.
USYC integration stays on Sepolia (already working).

---

## File Structure

```
apps/cre/
├── contracts/src/
│   ├── GhostUSDC.sol              ← NEW: FHERC20Wrapper for USDCg
│   ├── fherc20/                   ← NEW: Fhenix contract imports
│   │   ├── FHERC20.sol
│   │   ├── FHERC20Wrapper.sol
│   │   ├── FHERC20Permit.sol
│   │   ├── FHERC20UnwrapClaim.sol
│   │   └── interfaces/
│   └── ... (existing contracts)
├── shared/services/
│   ├── fhe.ts                     ← NEW: FHE wrap/unwrap/claim helpers
│   ├── evm.ts                     (existing)
│   └── attestation.ts             (existing)
├── workflow-ghost-deposit/         ← NEW
│   ├── src/index.ts
│   ├── config.json
│   └── secrets.yaml
├── workflow-ghost-transfer/        ← NEW
│   ├── src/index.ts
│   ├── config.json
│   └── secrets.yaml
└── workflow-ghost-withdraw/        ← NEW
    ├── src/index.ts
    ├── config.json
    └── secrets.yaml

apps/shiva/src/
├── routes/ghost-fhe.ts            ← NEW: FHE ghost mode API routes
└── schemas/ghost-fhe.schemas.ts   ← NEW: request/response schemas

apps/app/src/
├── actions/ghost-mode-actions.ts  ← UPDATE: use FHE routes
├── components/header/ghost-mode/
│   ├── use-ghost-mode.ts          ← UPDATE: FHE state
│   ├── ghost-dashboard.tsx        ← UPDATE: encrypted indicator UI
│   └── ghost-processing.tsx       ← UPDATE: claim flow UI
└── components/header/wallet-analytics/
    └── wallet-analytics-sheet.tsx  ← UPDATE: Ghost Mode tab
```

---

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Fhenix testnet instability | HIGH | Fallback to current USDCg flow if FHE down |
| FHE decrypt latency > 5min | MEDIUM | Show progress UI, set 10min timeout |
| Cross-chain CRE → Arbitrum calls fail | MEDIUM | Simplified same-chain demo as backup |
| USYC redemption timing mismatch | LOW | Buffer ratio already handles this |
| cofhe-contracts SDK breaking changes | LOW | Pin exact version in package.json |

## Dependencies

- `@fhenixprotocol/cofhe-contracts` — Fhenix FHE Solidity library
- `fhenix-hardhat-plugin` or Foundry with Fhenix fork — for deployment
- Fhenix Arbitrum Sepolia RPC access
- Existing: `@chainlink/cre-sdk`, `@bu/private-transfer`, all Sepolia contracts

## Success Criteria

1. User deposits USDC → sees encrypted indicator (not real balance) on Arbitrum
2. User transfers eUSDCg → Etherscan shows 0.0001 indicator change only
3. CRE workflow syncs real balances in DON state (compliance dashboard)
4. USYC yield accrues on Sepolia TreasuryManager during user hold period
5. User withdraws → async claim completes → USDC returned
6. BUAttestation proves all operations without revealing amounts
