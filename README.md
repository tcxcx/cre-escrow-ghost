# cre-escrow-ghost

**Milestone-based escrow with AI arbitration + FHE-encrypted private transfers, orchestrated by Chainlink CRE.**

> Submitted for [Convergence | A Chainlink Hackathon](https://chainlink-hackathon.devpost.com/)

## Overview

Two CRE-orchestrated financial primitives sharing the same compliance, attestation, and fallback infrastructure:

| Primitive | What It Does | Key Contracts |
|-----------|-------------|---------------|
| **Escrow** | Milestone-based escrow where AI verifies deliverables, runs 4-layer adversarial arbitration on disputes (Advocates → Tribunal → Supreme Court), and releases funds only when work is provably delivered. On-chain appeal bonds + immutable verdict records. | `EscrowFactoryV3`, `EscrowWithAgentV3` |
| **Ghost Mode** | Compliant private transfers with FHE-encrypted balances (`eUSDCg` via CoFHE), 3-layer compliance (Circle + Chainlink ACE PolicyEngine + Persona KYC/KYB), and treasury yield on deposits via Hashnote USYC. | `GhostUSDC (FHERC20Wrapper)`, `PolicyEngine`, `TreasuryManager` |

Both produce **on-chain attestations** via `BUAttestation` for every operation — DON-signed, consensus-verified, immutable.

**16 CRE workflows** across escrow, privacy, compliance, treasury, payroll, invoicing, and reporting. Full architectural parity between Ghost and Escrow pipelines (fallback resilience, callback pattern, confidential DON state, dual-trigger event monitoring).

### Stack

| Layer | Technology |
|-------|-----------|
| **Orchestration** | Chainlink CRE — 16 workflows on DON with consensus-verified API calls |
| **Contracts** | Solidity 0.8.24 (Foundry) — Sepolia + Arbitrum Sepolia |
| **FHE** | Fhenix CoFHE — server-side `FHE.asEuint64()` encryption, no browser SDK |
| **Wallets** | Circle Programmable Wallets (DCW) — server-side custodial |
| **Compliance** | Circle Compliance Engine + Chainlink ACE PolicyEngine + Persona KYC/KYB |
| **Backend** | Hono on Cloudflare Workers (Shiva) + Supabase PostgreSQL |
| **Frontend** | Next.js 16 + React 19 — 98 contract UI components |
| **Yield** | Hashnote USYC (~3.4% APY) via TreasuryManager |

---

## Deployed Smart Contracts

### Ethereum Sepolia (Hardened v2 — deployed 2026-03-05)

| Contract | Address | Explorer |
|----------|---------|----------|
| BUAttestation | `0xC3C7A1bd7556ba93729f859F0f1D1Cb60aeEc72C` | [Etherscan](https://sepolia.etherscan.io/address/0xC3C7A1bd7556ba93729f859F0f1D1Cb60aeEc72C) |
| USDCg (Private USDC) | `0x2F28A8378798c5B42FC28f209E903508DD8F878b` | [Etherscan](https://sepolia.etherscan.io/address/0x2F28A8378798c5B42FC28f209E903508DD8F878b) |
| PolicyEngine (Chainlink ACE) | `0x76b727ed158fe58CaFe4FF5F98D0D98E7244F926` | [Etherscan](https://sepolia.etherscan.io/address/0x76b727ed158fe58CaFe4FF5F98D0D98E7244F926) |
| TreasuryManager | `0x33A4a73FD81bB6314AB7dc77301894728E6825A4` | [Etherscan](https://sepolia.etherscan.io/address/0x33A4a73FD81bB6314AB7dc77301894728E6825A4) |
| ACE Vault | `0xE588a6c73933BFD66Af9b4A07d48bcE59c0D2d13` | [Etherscan](https://sepolia.etherscan.io/address/0xE588a6c73933BFD66Af9b4A07d48bcE59c0D2d13) |
| GhostUSDC (eUSDCg — FHE) | `0x6e6Ad7EDECbb4C9B7aA9453af2ba285f6d6cCcB5` | [Etherscan](https://sepolia.etherscan.io/address/0x6e6Ad7EDECbb4C9B7aA9453af2ba285f6d6cCcB5) |
| EscrowFactoryV3 | `0x0f8b653aadd4f04008fdaca3429f6ea24951b129` | [Etherscan](https://sepolia.etherscan.io/address/0x0f8b653aadd4f04008fdaca3429f6ea24951b129) |
| CoFHE TaskManager (Fhenix) | `0xeA30c4B8b44078Bbf8a6ef5b9f1eC1626C7848D9` | [Etherscan](https://sepolia.etherscan.io/address/0xeA30c4B8b44078Bbf8a6ef5b9f1eC1626C7848D9) |

### Arbitrum Sepolia (deployed 2026-03-08)

| Contract | Address | Explorer |
|----------|---------|----------|
| PolicyEngineMock | `0x43b8c40dc785c6ab868d2dfa0a91a8cc8e7d4ef6` | [Arbiscan](https://sepolia.arbiscan.io/address/0x43b8c40dc785c6ab868d2dfa0a91a8cc8e7d4ef6) |
| BUAttestationMock | `0xaaf50d1ccf481657f9719a71b8384a9e1bbe1348` | [Arbiscan](https://sepolia.arbiscan.io/address/0xaaf50d1ccf481657f9719a71b8384a9e1bbe1348) |
| EscrowFactoryV3 | `0x806dd4d26a0930d4bed506b81eb8f57f334cd53e` | [Arbiscan](https://sepolia.arbiscan.io/address/0x806dd4d26a0930d4bed506b81eb8f57f334cd53e) |
| GhostUSDC (eUSDCg — FHE) | `0xA3BfA84a4b7a8de8340Df3B0CCFED33240C6F765` | [Arbiscan](https://sepolia.arbiscan.io/address/0xA3BfA84a4b7a8de8340Df3B0CCFED33240C6F765) |

### Deployer / Executor

| | Address |
|--|---------|
| Deployer | `0x09Ce8E2B3Fede2727dA4392Ea8Fe618305ba0474` |

---

## How CRE Fits In

CRE sits between our backend services and the blockchain. Every financial operation passes through a Decentralized Oracle Network (DON) — multiple independent Chainlink nodes execute the same task, reach consensus, and produce a cryptographically signed result.

- **API calls are consensus-verified** — multiple DON nodes call the same endpoint and must agree on the response
- **Blockchain reads are independently confirmed** — no single-node trust for balance checks or state reads
- **Attestations are DON-signed** — BFT consensus signature verified on-chain by `BUAttestation`

Existing services (Shiva, Circle, Motora) didn't change. CRE wraps around them — calls their APIs through consensus, then writes immutable proofs on-chain.

---

## 16 CRE Workflows Across 5 Domains

### Ghost Mode Privacy (4 workflows)

| Workflow | What It Does |
|----------|-------------|
| `workflow-ghost-deposit` | Verifies KYC/KYB compliance via BUAttestation, reads USDC backing in GhostUSDC FHERC20Wrapper, checks yield allocation via TreasuryManager, **updates confidential DON state**, **callbacks to Shiva for audit trail**, publishes on-chain attestation |
| `workflow-ghost-withdraw` | **Validates confidential DON balance** (fail-closed), verifies USDC + USYC backing covers withdrawal, **updates DON state with negative delta**, **callbacks to Shiva**, publishes attestation before releasing funds |
| `workflow-ghost-transfer` | **Dual-trigger**: HTTP handler + **EVM Log monitor** watching `ConfidentialTransfer` AND standard `Transfer` events on GhostUSDC. Verifies both parties are compliant via PolicyEngine, syncs DON state, **callbacks to Shiva** |
| `workflow-private-transfer` | Handles USDCg private transfers via ACE Vault — EIP-712 signed off-chain ledger with CRE enforcing concentration limits and real-time policy |

### Escrow Contracts (6 workflows)

| Workflow | What It Does |
|----------|-------------|
| `workflow-escrow-deploy` | Deploys EscrowWithAgentV3 contracts on-chain via EscrowFactory. Encodes milestone amounts/descriptions, signs via CRE consensus report, writes to chain, publishes `escrow_verify` attestation |
| `workflow-escrow-verify` | AI-powered milestone verification. Fetches deliverable submission + acceptance criteria, sends to Shiva `/intelligence/verify` (CONFIDENTIAL), stores encrypted verdict, publishes attestation. **No funds move until deliverables pass verification** |
| `workflow-escrow-dispute` | 4-layer AI arbitration pipeline. Locks milestone on-chain to freeze funds, then runs: Layer 2 (two advocate briefs — provider + client perspectives), Layer 3 (3-judge tribunal, majority vote), Layer 4 (5-judge supreme court, supermajority 4 — only on appeal). **Now with on-chain appeal bonds** — `disputeWithBond()` / `appealWithBond()`. All briefs and verdicts encrypted. **Verdicts recorded immutably on-chain** via `VerdictRecord`. Publishes `escrow_dispute` attestation with document hashes |
| `workflow-escrow-finalize` | Executes final decision and distributes funds. Calls `setDecision()` on-chain (immutable: payee basis points + receipt hash), then `executeDecision()` to release funds **and settle bonds** (winner refunded, loser forfeited), then `setMilestoneStatus(RELEASED)`. Publishes `escrow_finalize` attestation |
| `workflow-escrow-monitor` | Dual-trigger — watches EscrowFactoryV3 for `AgreementCreated`, `MilestoneFunded`, `DecisionExecuted` events (EVM log), plus a 6-hour cron for proof of reserves. Publishes `proof_of_reserves` attestation |
| `workflow-escrow-yield` | Deposits idle escrow USDC into Deframe yield strategies (Pods) via Motora. Queries available strategies sorted by APY, executes deposit. On milestone release, redeems position back to USDC. Publishes `escrow_yield_deposit` and `escrow_yield_redeem` attestations |

### Compliance (1 workflow — NEW)

| Workflow | What It Does |
|----------|-------------|
| `workflow-allowlist-sync` | **Bridges Persona KYC/KYB webhooks to PolicyEngine AllowList.** HTTP trigger from Shiva after verification completion. Reads `PolicyEngine.isAllowed()` on-chain, determines sync action (add/remove/none), publishes `allowlist_sync` attestation. Shiva handles AllowList mutations; CRE publishes immutable audit trail. |

### Financial Operations (3 workflows)

| Workflow | What It Does |
|----------|-------------|
| `workflow-invoice-settle` | CRE-orchestrated invoice payment with compliance verification |
| `workflow-payroll-attest` | Payroll execution with on-chain attestation for each batch |
| `workflow-treasury-rebalance` | Monitors USDC buffer across Ghost Mode and escrow, redeems USYC back to USDC when reserves drop below threshold |

### Reporting (1 workflow)

| Workflow | What It Does |
|----------|-------------|
| `workflow-report-verify` | Validates financial report data integrity |

---

## How the CRE Code Works

### Repo Structure

```
apps/cre/
├── shared/                        # Reusable primitives — the toolkit
│   ├── create-workflow.ts         # createWorkflow() — eliminates boilerplate
│   ├── triggers.ts                # withCron(), withHttp(), withLog()
│   ├── clients/                   # Consensus-verified HTTP clients
│   │   ├── create-client.ts       # createPlatformClient() — any API
│   │   └── presets.ts             # shivaClient(), motoraClient(), supabaseClient(), aceClient()
│   ├── services/                  # On-chain operations
│   │   ├── attestation.ts         # publishAttestation() — one call, on-chain proof
│   │   └── evm.ts                 # callView() — contract reads (encode→call→decode)
│   ├── utils/                     # Encoding, secrets
│   └── abi/                       # TypeScript ABI definitions
├── contracts/                     # Foundry — EscrowFactoryV3, EscrowWithAgentV3, mocks
├── workflow-ghost-deposit/        # Ghost Mode deposit verification
├── workflow-ghost-withdraw/       # Ghost Mode withdrawal verification
├── workflow-ghost-transfer/       # Ghost Mode transfer monitoring
├── workflow-private-transfer/     # USDCg vault monitoring + proof-of-reserves
├── workflow-escrow-deploy/        # Escrow contract deployment
├── workflow-escrow-verify/        # AI milestone verification
├── workflow-escrow-dispute/       # 4-layer AI arbitration
├── workflow-escrow-finalize/      # Decision execution + fund release
├── workflow-escrow-monitor/       # Event watching + proof of reserves
├── workflow-escrow-yield/         # Idle escrow yield strategies
├── workflow-allowlist-sync/       # PolicyEngine AllowList ↔ Persona KYC bridge
├── workflow-invoice-settle/       # Invoice payment attestation
├── workflow-payroll-attest/       # Payroll batch attestation
├── workflow-treasury-rebalance/   # USDC buffer/yield ratio management
├── workflow-report-verify/        # Report hash attestation
└── scripts/                       # simulate, deploy, scaffold
```

### The Pattern: Every Workflow in 3 Files

**`types.ts`** — Zod schema for config (contract addresses, chain, thresholds):

```typescript
export const configSchema = z.object({
  chainSelectorName: z.string().min(1),
  attestationContract: z.string().regex(/^0x[a-fA-F0-9]{40}$/u),
  gasLimit: z.string().regex(/^\d+$/u),
  usdcgAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/u),
  usdcAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/u),
  treasuryManagerAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/u),
})
```

**`handlers.ts`** — Business logic composed from shared primitives:

```typescript
import { withCron } from "../shared/triggers"
import { publishAttestation } from "../shared/services/attestation"
import { callView } from "../shared/services/evm"

const treasuryCheck = withCron<Config>((runtime) => {
  // 1. Read on-chain state (consensus-verified)
  const usdcBuffer = callView(runtime, config.usdcAddress, ERC20_ABI, "balanceOf", [config.usdcgAddress])
  const yieldValue = callView(runtime, config.treasuryManagerAddress, TREASURY_ABI, "getYieldValueUSDC")
  const totalSupply = callView(runtime, config.usdcgAddress, USDCG_ABI, "totalSupply")

  // 2. Compute backing ratio
  const totalBacking = usdcBuffer + yieldValue
  const action = bufferRatio > upperBPS ? "allocate_to_yield" : bufferRatio < lowerBPS ? "redeem_from_yield" : "hold"

  // 3. Publish attestation on-chain (one call)
  publishAttestation(runtime, {
    type: "balance_attest",
    entityId: `rebalance-${Date.now()}`,
    data: { usdcBuffer, yieldValue, totalBacking, totalSupply, action },
  })
})
```

**`main.ts`** — 3-line entry point:

```typescript
import { createWorkflow } from "../shared/create-workflow"
import { configSchema } from "./types"
import { initWorkflow } from "./handlers"

export const main = createWorkflow({ configSchema, init: initWorkflow })
```

### Shared Primitives

| Primitive | What It Does |
|-----------|-------------|
| `createWorkflow()` | Eliminates CRE Runner boilerplate — wraps config parsing, init, error handling |
| `withCron()` / `withHttp()` / `withLog()` | Trigger adapters — schedule, HTTP request, or EVM event |
| `createPlatformClient()` | Consensus-verified HTTP client for any API |
| `createConfidentialPlatformClient()` | Enclave-executed HTTP client — secrets injected via `{{.secretName}}` templates, optional AES-256-GCM response encryption |
| `shivaClient()` / `motoraClient()` / `supabaseClient()` / `aceClient()` | Pre-configured consensus-verified clients for platform services |
| `confidentialShivaClient()` / `confidentialMotoraClient()` | Pre-configured confidential clients (enclave-protected, Vault DON secrets) |
| `publishAttestation()` | One-call on-chain attestation — encodes, signs via DON consensus, writes to BUAttestation contract |
| `callView()` | Read any contract view function — handles encode → call → decode internally |
| `resolveEvmClient()` | Get EVMClient from chain selector name |

### How Existing Services Trigger CRE

Back in platform code, one import adds blockchain verification to any operation:

```typescript
// In a Shiva route — after invoice is paid:
import { triggerInvoiceSettlement } from "@bu/cre"
await triggerInvoiceSettlement({ invoiceId, paymentTxHash, amount, currency })

// In a payroll task — after batch executes:
import { triggerPayrollAttestation } from "@bu/cre"
await triggerPayrollAttestation({ batchId, totalAmount, recipientCount })

// In Ghost Mode — after deposit completes:
import { triggerGhostDepositVerification } from "@bu/cre"
await triggerGhostDepositVerification({ walletAddress, amount, txHash })
```

The CRE workflow runs on a Chainlink DON, calls back into the API through consensus, and writes an immutable attestation on-chain. Existing code doesn't change — it adds one function call.

---

## Compliance Stack (3 Layers)

| Layer | System | Mechanism |
|-------|--------|-----------|
| **1** | Circle Compliance Engine | Sanctions/PEP/adverse media screening on every DCW transaction (silent, automatic) |
| **2** | Chainlink ACE PolicyEngine | On-chain `_requireCompliant(sender, recipient)` check on every `transfer()`, `deposit()`, `wrap()` |
| **3** | Persona KYC/KYB | Personal wallets → KYC, team wallets → KYB. Attested on-chain via BUAttestation (365-day TTL). `workflow-allowlist-sync` bridges webhooks to PolicyEngine AllowList |

---

## Privacy: eUSDCg (FHE) + USDCg (Private Ledger)

**eUSDCg** — USDC wraps into FHERC20Wrapper. Balances encrypted as `euint64` via CoFHE. Server-side FHE — Shiva sends plaintext via Circle DCW, the contract encrypts internally:

```solidity
function transferAmount(address to, uint64 amount) external whenNotPaused {
    _requireCompliant(msg.sender, to);
    euint64 encAmount = FHE.asEuint64(amount);  // contract encrypts via CoFHE
    _transfer(msg.sender, to, encAmount);
}
```

No browser SDK, no iframe. Works with any wallet infrastructure. Deployed on ETH-Sepolia + ARB-Sepolia.

**USDCg** — USDC deposits into ACE Vault. Transfers happen off-chain via CRE's private ledger (zero on-chain trace). EIP-712 signatures authenticate each transfer.

---

## Escrow Pipeline

```
EscrowFactoryV3.createEscrow()  →  Payer funds with USDC
  → Payee submits deliverables
    → CRE workflow-escrow-verify: AI evaluates vs acceptance criteria
      → PASS → workflow-escrow-finalize releases funds
      → FAIL → resubmit or dispute
        → workflow-escrow-dispute: 4-layer AI arbitration
          L2: Two advocate briefs (pro-provider + pro-client)
          L3: 3-judge tribunal (majority vote)
          L4: 5-judge supreme court (supermajority 4/5, appeal only)
        → Verdict recorded on-chain (VerdictRecord) → funds released
```

Idle escrow USDC earns yield via `workflow-escrow-yield` (Deframe strategies through Motora). `workflow-escrow-monitor` watches factory events + publishes proof-of-reserves every 6 hours. Every step produces an on-chain attestation. Verdicts encrypted before storage; only document hashes go on-chain.

---

## Ghost ↔ Escrow Architectural Parity

Both primitives share the same production-grade patterns:

| Pattern | Implementation |
|---------|---------------|
| **Fallback Resilience** | `triggerCreWorkflowWithFallback` — CRE downtime doesn't block transactions; attestations deferred to next cron |
| **Callback Bridge** | CRE workflows POST to Shiva `cre-callback/*` endpoints → stored in audit tables |
| **Confidential Client** | `confidentialShivaClient` for sensitive data (DON state, AI verdicts, balance queries) |
| **Dual Triggers** | HTTP + EVM Log monitoring (Ghost watches `ConfidentialTransfer` + `Transfer`; Escrow watches factory events) |
| **Bond Economics** | `disputeWithBond()` / `appealWithBond()` — forfeitable deposits prevent frivolous disputes |
| **On-Chain Verdicts** | `VerdictRecord` per arbitration layer — `verdictHash`, `payeeBps`, `appealed` flag, immutable |
| **AllowList Sync** | [`workflow-allowlist-sync`](apps/cre/workflow-allowlist-sync/) bridges Persona webhooks → PolicyEngine via attestation |

### Appeal Bonds ([`EscrowWithAgentV3.sol`](apps/cre/contracts/src/arbitration/arbitration-factory/EscrowWithAgentV3.sol))

```solidity
struct BondConfig {
    uint256 disputeBondAmount;   // Required to file a dispute
    uint256 appealBondAmount;    // Higher bond required for appeal
    address bondRecipient;       // Treasury receives forfeited bonds
}

function disputeWithBond(uint256 milestoneIndex) external payable;
function appealWithBond(uint256 milestoneIndex) external payable;
// executeDecision(): winner refunded, loser forfeited
```

### Yield Model

TreasuryManager allocates USDC into Hashnote USYC (~3.4% APY) from Ghost deposits + idle escrow balances. `workflow-treasury-rebalance` monitors buffer ratios and redeems when reserves drop.

---

## Technical Challenges

| # | Challenge | Solution |
|---|-----------|----------|
| 1 | **Server-side FHE** — Circle DCW wallets are custodial, no MetaMask/client SDK | Contract encrypts internally via `FHE.asEuint64()`. Shiva sends plaintext, CoFHE handles encryption on-chain. Zero browser dependencies. |
| 2 | **Async FHE decryption** — CoFHE takes 30-300s | 3-phase pipeline: unwrap (burn + create claim) → decrypt (CoFHE off-chain) → auto-claim (frontend polls every 5s) |
| 3 | **CRE WASM compilation** — Javy requires `bun >= 1.2.21` | Lower versions produce WASM that compiles but crashes at runtime (`unreachable` trap). Block reads need `LATEST_BLOCK_NUMBER` — free Sepolia RPCs lag on `"finalized"` tag. |
| 4 | **Arbitration confidentiality** — briefs/verdicts contain IP-sensitive data | CRE workflows mark as CONFIDENTIAL, encrypt before storage, only document hashes go on-chain |
| 5 | **Escrow yield timing** — locked USDC must earn yield but be instantly available | TreasuryManager async USYC allocation with USDC buffer; `workflow-treasury-rebalance` monitors and redeems |
| 6 | **Multi-chain addresses** — same contracts on ETH-Sepolia + ARB-Sepolia | Centralized address registry in [`shared/addresses.ts`](apps/cre/shared/addresses.ts), per-workflow `config.json` |
| 7 | **Ghost-Escrow parity** — Ghost started as HTTP-only, no fallback/callbacks | Added `triggerCreWorkflowWithFallback`, `confidentialShivaClient`, callback POSTs, EVM Log dual-triggers to all Ghost workflows |

---

## Running Locally

```sh
bun install
turbo dev
```

For CRE workflows:

```sh
cd apps/cre
cre workflow simulate workflow-treasury-rebalance --target local-simulation
```

For contracts:

```sh
cd contracts/escrow
forge build
forge test
```

---

## Trust Model

| Source | What It Proves |
|--------|---------------|
| `BUAttestation` on-chain | Every deposit, withdrawal, transfer, invoice, payroll, rebalance has a DON-signed immutable attestation |
| `EscrowWithAgentV3` state | Every milestone change, decision, fund release, bond deposit/forfeit, and `VerdictRecord` is recorded with events |
| CRE consensus signatures | Every API call (Shiva, Motora, Circle) was independently executed by multiple DON nodes and agreed upon |
| Encrypted Supabase storage | Arbitration evidence encrypted at rest; only document hashes go on-chain |

---
---

# Chainlink Integration — File Reference

> All files that use Chainlink CRE, smart contracts, and oracle technology.

---

## Quick Links

| Resource | Link |
|----------|------|
| **CRE Workflows** | [`apps/cre/`](apps/cre/) |
| **Smart Contracts (CRE)** | [`apps/cre/contracts/src/`](apps/cre/contracts/src/) |
| **Smart Contracts (Escrow)** | [`contracts/escrow/src/`](contracts/escrow/src/) |
| **Shared CRE Utilities** | [`apps/cre/shared/`](apps/cre/shared/) |
| **CRE Client Package** | [`packages/cre/`](packages/cre/) |
| **Private Transfer Package** | [`packages/private-transfer/`](packages/private-transfer/) |
| **Environment Config (ACE)** | [`packages/env/src/ace.ts`](packages/env/src/ace.ts) |
| **Contract UI Components** | [`apps/app/src/components/contract/`](apps/app/src/components/contract/) |

---

## Deployed Contracts (Ethereum Sepolia)

| Contract | Address | Etherscan | Role |
|----------|---------|-----------|------|
| **BUAttestation** | `0xC3C7A1bd7556ba93729f859F0f1D1Cb60aeEc72C` | [View](https://sepolia.etherscan.io/address/0xC3C7A1bd7556ba93729f859F0f1D1Cb60aeEc72C) | On-chain attestation registry — all CRE workflows write here |
| **USDCg** | `0x2F28A8378798c5B42FC28f209E903508DD8F878b` | [View](https://sepolia.etherscan.io/address/0x2F28A8378798c5B42FC28f209E903508DD8F878b) | Compliant stablecoin with backing invariant |
| **PolicyEngine** | `0x76b727ed158fe58CaFe4FF5F98D0D98E7244F926` | [View](https://sepolia.etherscan.io/address/0x76b727ed158fe58CaFe4FF5F98D0D98E7244F926) | Chainlink ACE compliance — gates every transfer |
| **TreasuryManager** | `0x33A4a73FD81bB6314AB7dc77301894728E6825A4` | [View](https://sepolia.etherscan.io/address/0x33A4a73FD81bB6314AB7dc77301894728E6825A4) | USDC → USYC yield orchestration (CRE ALLOCATE/REDEEM) |
| **ACE Vault** | `0xE588a6c73933BFD66Af9b4A07d48bcE59c0D2d13` | [View](https://sepolia.etherscan.io/address/0xE588a6c73933BFD66Af9b4A07d48bcE59c0D2d13) | Chainlink-managed private ledger |
| **GhostUSDC (eUSDCg)** | `0xAc547f37E3B20F85E288f7843E979eFCf1a0f235` | [View](https://sepolia.etherscan.io/address/0xAc547f37E3B20F85E288f7843E979eFCf1a0f235) | FHE-encrypted transfers via CoFHE TaskManager |
| **EscrowFactoryV3** | `0x0f8b653aadd4f04008fdaca3429f6ea24951b129` | [View](https://sepolia.etherscan.io/address/0x0f8b653aadd4f04008fdaca3429f6ea24951b129) | Deploy milestone-based escrow instances |

**CoFHE TaskManager (Fhenix):** `0xeA30c4B8b44078Bbf8a6ef5b9f1eC1626C7848D9`

## Deployed Contracts (Arbitrum Sepolia)

| Contract | Address | Arbiscan | Role |
|----------|---------|----------|------|
| **PolicyEngineMock** | `0x43b8c40dc785c6ab868d2dfa0a91a8cc8e7d4ef6` | [View](https://sepolia.arbiscan.io/address/0x43b8c40dc785c6ab868d2dfa0a91a8cc8e7d4ef6) | Testnet compliance (defaultAllow=true) |
| **BUAttestationMock** | `0xaaf50d1ccf481657f9719a71b8384a9e1bbe1348` | [View](https://sepolia.arbiscan.io/address/0xaaf50d1ccf481657f9719a71b8384a9e1bbe1348) | Testnet attestation registry |
| **EscrowFactoryV3** | `0x806dd4d26a0930d4bed506b81eb8f57f334cd53e` | [View](https://sepolia.arbiscan.io/address/0x806dd4d26a0930d4bed506b81eb8f57f334cd53e) | Deploy milestone-based escrow instances |
| **GhostUSDC (eUSDCg)** | `0xA3BfA84a4b7a8de8340Df3B0CCFED33240C6F765` | [View](https://sepolia.arbiscan.io/address/0xA3BfA84a4b7a8de8340Df3B0CCFED33240C6F765) | FHE-encrypted transfers via CoFHE |

---

## CRE Workflows (19 total)

Each workflow integrates **at least one blockchain** with **external APIs, data sources, or AI agents** — executed with DON consensus via the Chainlink Runtime Environment.

### Ghost Mode — FHE-Encrypted Private Transfers

| Workflow | Trigger | Blockchain | External Integration | Files |
|----------|---------|------------|---------------------|-------|
| **ghost-deposit** | HTTP | GhostUSDC, PolicyEngine, TreasuryManager | Shiva API (Circle SDK), **confidentialShivaClient** (DON state), FHE balances, **Shiva callback** | [`main.ts`](apps/cre/workflow-ghost-deposit/main.ts), [`handlers.ts`](apps/cre/workflow-ghost-deposit/handlers.ts) |
| **ghost-transfer** | **HTTP + EVM Log** (ConfidentialTransfer + Transfer) | GhostUSDC events, PolicyEngine | ACE API (KYC/DON sync), FHE encrypted indicators, **Shiva callback** | [`main.ts`](apps/cre/workflow-ghost-transfer/main.ts), [`handlers.ts`](apps/cre/workflow-ghost-transfer/handlers.ts) |
| **ghost-withdraw** | HTTP | GhostUSDC, TreasuryManager | **confidentialShivaClient** (DON balance validation), backing verification, **Shiva callback** | [`main.ts`](apps/cre/workflow-ghost-withdraw/main.ts), [`handlers.ts`](apps/cre/workflow-ghost-withdraw/handlers.ts) |

### Escrow — AI-Powered Smart Contract Arbitration

| Workflow | Trigger | Blockchain | External Integration | Files |
|----------|---------|------------|---------------------|-------|
| **escrow-deploy** | HTTP | EscrowFactoryV3 | Supabase (callback), Shiva API | [`main.ts`](apps/cre/workflow-escrow-deploy/main.ts), [`handlers.ts`](apps/cre/workflow-escrow-deploy/handlers.ts) |
| **escrow-verify** | HTTP | EscrowWithAgentV3 | **Shiva CONFIDENTIAL** (AI milestone verification via LLM), Deliverable files | [`main.ts`](apps/cre/workflow-escrow-verify/main.ts), [`handlers.ts`](apps/cre/workflow-escrow-verify/handlers.ts) |
| **escrow-finalize** | HTTP | EscrowWithAgentV3 | **Shiva CONFIDENTIAL** (AI receipt generation via LLM) | [`main.ts`](apps/cre/workflow-escrow-finalize/main.ts), [`handlers.ts`](apps/cre/workflow-escrow-finalize/handlers.ts) |
| **escrow-dispute** | HTTP | EscrowWithAgentV3 | **Shiva CONFIDENTIAL** (4-layer AI arbitration: Advocates → Tribunal → Supreme Court) | [`main.ts`](apps/cre/workflow-escrow-dispute/main.ts), [`handlers.ts`](apps/cre/workflow-escrow-dispute/handlers.ts) |
| **escrow-monitor** | EVM Log + Cron (6h) | EscrowFactory events | Supabase, Proof of Reserves aggregation | [`main.ts`](apps/cre/workflow-escrow-monitor/main.ts), [`handlers.ts`](apps/cre/workflow-escrow-monitor/handlers.ts) |
| **escrow-yield** | HTTP | EscrowWithAgentV3 | Motora API (strategy selection), Deframe yield protocols | [`main.ts`](apps/cre/workflow-escrow-yield/main.ts), [`handlers.ts`](apps/cre/workflow-escrow-yield/handlers.ts) |

### Compliance — AllowList Bridge

| Workflow | Trigger | Blockchain | External Integration | Files |
|----------|---------|------------|---------------------|-------|
| **allowlist-sync** | HTTP (Persona webhook) | PolicyEngine (isAllowed read) | Persona KYC/KYB webhooks, BUAttestation (attestation publish) | [`main.ts`](apps/cre/workflow-allowlist-sync/main.ts), [`handlers.ts`](apps/cre/workflow-allowlist-sync/handlers.ts) |

### Treasury & Private Transfers

| Workflow | Trigger | Blockchain | External Integration | Files |
|----------|---------|------------|---------------------|-------|
| **private-transfer** | EVM Log (ACE Vault) | ACE Vault, USDCg | ACE API (DON sync, compliance), HTTP verification | [`main.ts`](apps/cre/workflow-private-transfer/main.ts), [`handlers.ts`](apps/cre/workflow-private-transfer/handlers.ts) |
| **treasury-rebalance** | Cron | TreasuryManager, USDCg | On-chain state monitoring, BUAttestation publishing | [`main.ts`](apps/cre/workflow-treasury-rebalance/main.ts), [`handlers.ts`](apps/cre/workflow-treasury-rebalance/handlers.ts) |

### Financial Operations

| Workflow | Trigger | Blockchain | External Integration | Files |
|----------|---------|------------|---------------------|-------|
| **invoice-settle** | HTTP | BUAttestation | Supabase (invoice verification) | [`main.ts`](apps/cre/workflow-invoice-settle/main.ts), [`handlers.ts`](apps/cre/workflow-invoice-settle/handlers.ts) |
| **payroll-attest** | HTTP | BUAttestation | Supabase (payroll execution data) | [`main.ts`](apps/cre/workflow-payroll-attest/main.ts), [`handlers.ts`](apps/cre/workflow-payroll-attest/handlers.ts) |
| **report-verify** | HTTP | BUAttestation | Supabase (financial report hashing) | [`main.ts`](apps/cre/workflow-report-verify/main.ts), [`handlers.ts`](apps/cre/workflow-report-verify/handlers.ts) |

---

## Shared CRE Utilities

All workflows share a common foundation in [`apps/cre/shared/`](apps/cre/shared/):

### Core
- [`create-workflow.ts`](apps/cre/shared/create-workflow.ts) — Factory function for 3-line workflow definitions
- [`triggers.ts`](apps/cre/shared/triggers.ts) — `withHttp()`, `withLog()`, `withCron()` trigger composers
- [`addresses.ts`](apps/cre/shared/addresses.ts) — All deployed contract addresses
- [`validate-config.ts`](apps/cre/shared/validate-config.ts) — Config validation

### Services
- [`services/attestation.ts`](apps/cre/shared/services/attestation.ts) — `publishAttestation()` — single function to write to BUAttestation contract
- [`services/evm.ts`](apps/cre/shared/services/evm.ts) — `callView()` for contract reads (encode → call → decode)
- [`services/escrow.ts`](apps/cre/shared/services/escrow.ts) — EscrowFactoryV3/EscrowWithAgentV3 integration
- [`services/fhe.ts`](apps/cre/shared/services/fhe.ts) — FHE state readers: `readGhostIndicator()`, `readGhostTotalSupply()`, `readUserClaims()`

### Clients (Consensus-Verified HTTP)
- [`clients/create-client.ts`](apps/cre/shared/clients/create-client.ts) — `createPlatformClient()` — consensus-verified HTTP client factory
- [`clients/presets.ts`](apps/cre/shared/clients/presets.ts) — `shivaClient()`, `motoraClient()`, `supabaseClient()`, `aceClient()`
- [`clients/confidential.ts`](apps/cre/shared/clients/confidential.ts) — `createConfidentialPlatformClient()` — enclave-executed HTTP with Vault DON secrets + optional AES-256-GCM response encryption
- [`clients/confidential-presets.ts`](apps/cre/shared/clients/confidential-presets.ts) — `confidentialShivaClient()` (encrypted responses for AI/IP), `confidentialMotoraClient()` (yield queries)

### ABIs (Contract Interfaces)
- [`abi/bu-attestation.ts`](apps/cre/shared/abi/bu-attestation.ts) — BUAttestation ABI
- [`abi/escrow-v3.ts`](apps/cre/shared/abi/escrow-v3.ts) — EscrowWithAgentV3 ABI
- [`abi/ghost-usdc.ts`](apps/cre/shared/abi/ghost-usdc.ts) — GhostUSDC (FHERC20Wrapper) ABI
- [`abi/usdcg.ts`](apps/cre/shared/abi/usdcg.ts) — USDCg token ABI
- [`abi/treasury-manager.ts`](apps/cre/shared/abi/treasury-manager.ts) — TreasuryManager ABI
- [`abi/vault.ts`](apps/cre/shared/abi/vault.ts) — ACE Vault ABI
- [`abi/usyc-oracle.ts`](apps/cre/shared/abi/usyc-oracle.ts) — USYC price oracle ABI
- [`abi/erc20.ts`](apps/cre/shared/abi/erc20.ts) — Standard ERC20 ABI

---

## Solidity Smart Contracts

### Core Protocol — [`apps/cre/contracts/src/`](apps/cre/contracts/src/)
- [`BUAttestation.sol`](apps/cre/contracts/src/BUAttestation.sol) — On-chain attestation registry (Pausable, rate limits, TTL, severity levels)
- [`USDg.sol`](apps/cre/contracts/src/USDg.sol) — Compliant stablecoin (Ownable2Step, Pausable, backing invariant)
- [`TreasuryManager.sol`](apps/cre/contracts/src/TreasuryManager.sol) — CRE-managed yield orchestration (ALLOCATE/REDEEM)
- [`GhostUSDC.sol`](apps/cre/contracts/src/GhostUSDC.sol) — FHE-encrypted stablecoin (server-side encryption via CoFHE)

### FHE (Fully Homomorphic Encryption) — [`apps/cre/contracts/src/fherc20/`](apps/cre/contracts/src/fherc20/)
- [`FHERC20.sol`](apps/cre/contracts/src/fherc20/FHERC20.sol) — FHE-enabled ERC20 base
- [`FHERC20Wrapper.sol`](apps/cre/contracts/src/fherc20/FHERC20Wrapper.sol) — Wrap standard ERC20 into FHE-encrypted token
- [`FHERC20UnwrapClaim.sol`](apps/cre/contracts/src/fherc20/FHERC20UnwrapClaim.sol) — Async decrypt → claim pipeline

### Escrow Arbitration — [`apps/cre/contracts/src/arbitration/`](apps/cre/contracts/src/arbitration/)
- [`EscrowFactoryV3.sol`](apps/cre/contracts/src/arbitration/arbitration-factory/EscrowFactoryV3.sol) — Deploy escrow instances
- [`EscrowWithAgentV3.sol`](apps/cre/contracts/src/arbitration/arbitration-factory/EscrowWithAgentV3.sol) — AI agent-arbitrated escrow with **appeal bonds** (`BondConfig`, `disputeWithBond`, `appealWithBond`) and **on-chain verdicts** (`VerdictRecord`, `recordVerdict`)
- [`IEscrowWithAgentV3.sol`](apps/cre/contracts/src/arbitration/arbitration-factory/IEscrowWithAgentV3.sol) — Interface definition for EscrowWithAgentV3 (bonds, verdicts, all events)
- [`PayoutLimitPolicy.sol`](apps/cre/contracts/src/arbitration/arbitration-factory/policies/PayoutLimitPolicy.sol) — Payout caps
- [`DisputeWindowPolicy.sol`](apps/cre/contracts/src/arbitration/arbitration-factory/policies/DisputeWindowPolicy.sol) — Dispute time windows
- [`AgentIdentityPolicy.sol`](apps/cre/contracts/src/arbitration/arbitration-factory/policies/AgentIdentityPolicy.sol) — Agent identity verification

### Escrow v3 (Foundry) — [`contracts/escrow/src/`](contracts/escrow/src/)
- [`EscrowFactoryV3.sol`](contracts/escrow/src/EscrowFactoryV3.sol) — Factory for milestone-based escrow (deployed to both chains)
- [`EscrowWithAgentV3.sol`](contracts/escrow/src/EscrowWithAgentV3.sol) — CRE executor-controlled escrow with 9 milestone statuses
- [`EscrowExtractor.sol`](contracts/escrow/src/EscrowExtractor.sol) — Decodes CRE consensus reports into escrow operations
- [`BUAttestationMock.sol`](contracts/escrow/src/BUAttestationMock.sol) — Testnet attestation mock (Arb Sepolia)
- [`PolicyEngineMock.sol`](contracts/escrow/src/PolicyEngineMock.sol) — Testnet compliance mock (Arb Sepolia)

### CRE Receiver Pattern — [`apps/cre/contracts/src/cre-receiver/`](apps/cre/contracts/src/cre-receiver/)
- [`ReceiverTemplate.sol`](apps/cre/contracts/src/cre-receiver/ReceiverTemplate.sol) — Chainlink CRE callback receiver
- [`IReceiver.sol`](apps/cre/contracts/src/cre-receiver/IReceiver.sol) — CRE receiver interface

### Deployment Scripts
- [`script/DeployAll.s.sol`](apps/cre/contracts/script/DeployAll.s.sol) — Full deployment pipeline
- [`script/DeployGhostUSDC.s.sol`](apps/cre/contracts/script/DeployGhostUSDC.s.sol) — GhostUSDC deployment

### Tests
- [`test/BUAttestation.t.sol`](apps/cre/contracts/test/BUAttestation.t.sol) — Attestation unit tests
- [`test/BUAttestationHardened.t.sol`](apps/cre/contracts/test/BUAttestationHardened.t.sol) — Hardened security tests
- [`test/USDCg.t.sol`](apps/cre/contracts/test/USDCg.t.sol) — USDCg token tests

---

## TypeScript Packages Using Chainlink

### `packages/cre/` — CRE Client Library
- [`bufi-lifecycle/workflow/main.ts`](packages/cre/bufi-lifecycle/workflow/main.ts) — Escrow lifecycle workflow entry point
- [`bufi-lifecycle/workflow/handlers/verify.ts`](packages/cre/bufi-lifecycle/workflow/handlers/verify.ts) — AI-powered deliverable verification
- [`bufi-lifecycle/workflow/handlers/dispute.ts`](packages/cre/bufi-lifecycle/workflow/handlers/dispute.ts) — 4-layer arbitration handler
- [`bufi-lifecycle/workflow/handlers/finalize.ts`](packages/cre/bufi-lifecycle/workflow/handlers/finalize.ts) — Decision execution + fund release

### `packages/contracts/` — Smart Contract ABIs
- [`src/escrow/abi.ts`](packages/contracts/src/escrow/abi.ts) — EscrowWithAgentV3 + EscrowFactoryV3 ABIs for app consumption

### `packages/env/` — Environment Configuration
- [`src/ace.ts`](packages/env/src/ace.ts) — All ACE/CRE env vars: gateway URLs, forwarder address, contract addresses

---

## Contract UI Components — [`apps/app/src/components/contract/`](apps/app/src/components/contract/)

The frontend for the entire escrow pipeline — 98 React components covering the full lifecycle:

### Contract Builder
- [`contract-builder/ai-contract-builder.tsx`](apps/app/src/components/contract/contract-builder/ai-contract-builder.tsx) — AI-assisted contract creation
- [`contract-builder/deploy-modal.tsx`](apps/app/src/components/contract/contract-builder/deploy-modal.tsx) — On-chain escrow deployment trigger
- [`contract-builder/flow-canvas.tsx`](apps/app/src/components/contract/contract-builder/flow-canvas.tsx) — Visual contract flow editor
- [`contract-builder/node-palette.tsx`](apps/app/src/components/contract/contract-builder/node-palette.tsx) — Drag-drop node types

### Escrow & Funding
- [`contracts/funding/funding-view.tsx`](apps/app/src/components/contract/contracts/funding/funding-view.tsx) — USDC funding with BuFi deposits + external wallet
- [`contracts/escrow/escrow-balance-card.tsx`](apps/app/src/components/contract/contracts/escrow/escrow-balance-card.tsx) — On-chain escrow balance display
- [`contracts/escrow/escrow-transaction-history.tsx`](apps/app/src/components/contract/contracts/escrow/escrow-transaction-history.tsx) — Escrow transaction log
- [`contracts/escrow/yield-projection-chart.tsx`](apps/app/src/components/contract/contracts/escrow/yield-projection-chart.tsx) — Yield projections on idle escrow

### Signing & Verification
- [`contracts/signing/signing-view.tsx`](apps/app/src/components/contract/contracts/signing/signing-view.tsx) — Contract signing with Etherscan links
- [`contracts/verification/ai-verification-report.tsx`](apps/app/src/components/contract/contracts/verification/ai-verification-report.tsx) — AI milestone verification results
- [`contracts/verification/ai-transparency-panel.tsx`](apps/app/src/components/contract/contracts/verification/ai-transparency-panel.tsx) — Verification transparency display

### Arbitration
- [`contracts/arbitration/arbitration-view.tsx`](apps/app/src/components/contract/contracts/arbitration/arbitration-view.tsx) — Full arbitration dashboard
- [`contracts/arbitration/tribunal-panel.tsx`](apps/app/src/components/contract/contracts/arbitration/tribunal-panel.tsx) — 3-judge tribunal UI
- [`contracts/arbitration/supreme-court-panel.tsx`](apps/app/src/components/contract/contracts/arbitration/supreme-court-panel.tsx) — 5-judge supreme court UI
- [`contracts/arbitration/advocate-brief-card.tsx`](apps/app/src/components/contract/contracts/arbitration/advocate-brief-card.tsx) — Advocate brief display
- [`contracts/arbitration/dispute-window-banner.tsx`](apps/app/src/components/contract/contracts/arbitration/dispute-window-banner.tsx) — Dispute window countdown

### Deliverables & Verdicts
- [`contracts/submission/file-upload-zone.tsx`](apps/app/src/components/contract/contracts/submission/file-upload-zone.tsx) — Deliverable submission
- [`contracts/submission/verification-progress.tsx`](apps/app/src/components/contract/contracts/submission/verification-progress.tsx) — AI verification progress
- [`contracts/verdict/final-verdict.tsx`](apps/app/src/components/contract/contracts/verdict/final-verdict.tsx) — Final ruling display
- [`contracts/verdict/payment-release.tsx`](apps/app/src/components/contract/contracts/verdict/payment-release.tsx) — Fund release confirmation
- [`contracts/completion/completion-view.tsx`](apps/app/src/components/contract/contracts/completion/completion-view.tsx) — Contract completion summary

### Yield & Analytics
- [`contracts/yield/yield-dashboard.tsx`](apps/app/src/components/contract/contracts/yield/yield-dashboard.tsx) — Escrow yield tracking

---

## Backend API (Shiva — Cloudflare Worker)

### Ghost Mode & FHE
- [`apps/shiva/src/services/ghost-fhe.service.ts`](apps/shiva/src/services/ghost-fhe.service.ts) — Ghost Mode FHE operations (on-chain reads + Circle DCW writes)
- [`apps/shiva/src/routes/ghost-fhe.ts`](apps/shiva/src/routes/ghost-fhe.ts) — Ghost Mode HTTP endpoints
- [`apps/shiva/src/routes/private-transfer.ts`](apps/shiva/src/routes/private-transfer.ts) — Private transfer orchestration

### CRE Integration
- [`apps/shiva/src/services/cre-trigger.service.ts`](apps/shiva/src/services/cre-trigger.service.ts) — Trigger CRE workflows from API
- [`apps/shiva/src/services/fallback-attestation.service.ts`](apps/shiva/src/services/fallback-attestation.service.ts) — BUAttestation fallback (direct write when CRE unavailable)

### Escrow
- [`apps/shiva/src/services/escrow-decrypt.service.ts`](apps/shiva/src/services/escrow-decrypt.service.ts) — Escrow data decryption
- [`apps/shiva/src/controllers/contracts.controller.ts`](apps/shiva/src/controllers/contracts.controller.ts) — Contract management endpoints

---

## Architecture: How CRE Connects Everything

```
┌─────────────────────────────────────────────────────────┐
│                    BUFI Frontend                         │
│         (Next.js 16 + React 19 — 98 contract UI files)  │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│               Shiva API (Cloudflare Worker)              │
│    JWT Auth → Wallet Resolution → CRE Trigger Service    │
└──────┬───────────────┬──────────────────┬───────────────┘
       │               │                  │
       ▼               ▼                  ▼
┌──────────┐   ┌──────────────┐   ┌──────────────┐
│ Supabase │   │  Circle SDK  │   │   ACE API    │
│ (DB/Auth)│   │ (DCW Wallets)│   │ (DON State)  │
└──────────┘   └──────────────┘   └──────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│              Chainlink CRE (19 Workflows)                │
│                                                          │
│  Ghost Mode:     deposit → transfer → withdraw           │
│  Escrow:         deploy → verify(AI) → finalize → dispute│
│  Treasury:       rebalance → yield → reserves            │
│  Financial:      invoice → payroll → report → audit      │
│                                                          │
│  Each workflow: Blockchain reads/writes + External APIs   │
│  Consensus: DON-signed attestations → BUAttestation.sol  │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│       Ethereum Sepolia + Arbitrum Sepolia Contracts      │
│                                                          │
│  BUAttestation ← all workflows write attestations here   │
│  PolicyEngine  ← compliance gates (Chainlink ACE)        │
│  ACE Vault     ← managed private ledger                  │
│  USDCg         ← compliant stablecoin                    │
│  TreasuryMgr   ← yield orchestration                    │
│  GhostUSDC     ← FHE-encrypted transfers (CoFHE)        │
│  EscrowFactory ← milestone-based escrow deployment       │
└─────────────────────────────────────────────────────────┘
```

---

## Simulation

```bash
# Install CRE CLI
curl -sSL https://smartcontract.codes/cre-cli/install.sh | bash

# Navigate to a workflow
cd apps/cre/workflow-ghost-deposit

# Simulate (non-interactive, HTTP trigger)
cre simulate --non-interactive --trigger-index 0

# Simulate with cron trigger
cre simulate --non-interactive --trigger-index 1
```

---

## File Count Summary

| Category | Files |
|----------|-------|
| CRE Workflow TypeScript | ~51 |
| Solidity Smart Contracts | ~37 |
| Shared CRE Utilities | ~20 |
| Contract UI Components (React) | ~98 |
| TypeScript Packages (CRE/private-transfer) | ~40 |
| Backend API (Shiva CRE integration) | ~8 |
| Deployment Scripts | ~7 |
| Tests | ~15 |
| **Total Chainlink-related files** | **~276** |
