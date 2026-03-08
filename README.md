# The Ark of the New Covenant

**Programmable settlement for a world without lawyers, politicians, and bankers.**

> **"Cursed is the man who trusts in man…"**
> — *Jeremiah 17:5*

Not because humans are evil — but because humans are human: biased, emotional, inconsistent, incentivized, corruptible, tired, and sometimes just having a bad day.

So we built a system where:
- **AI is neutral when we can't be**
- **contracts verify reality before releasing funds**
- **money moves at the speed of the internet** — without asking politicians for permission

---

## What We Built

Bu is an **Agentic Financial Operating System** on stablecoin rails — not a dashboard, not a neobank. An AI COO and CFO that remembers everything, researches autonomously, communicates proactively, and guides workspace teams through any financial operation.

It runs on **two pillars**:

1. **Ghost Mode Privacy** — compliant private transfers with FHE-encrypted balances, 3-layer compliance (Circle + Chainlink ACE + Persona KYC/KYB), and treasury yield on deposits
2. **AI Escrow Contracts** — milestone-based escrow where AI verifies deliverables, runs adversarial arbitration on disputes, and releases funds only when work is provably delivered

Both orchestrated through **Chainlink CRE** — 15 workflows producing on-chain attestations for every financial operation.

**Architecture:** Next.js app → Cloudflare Worker (Shiva) → Circle Programmable Wallets → Solidity contracts on Sepolia + Arbitrum Sepolia → 15 CRE workflows for compliance, privacy, escrow, payroll, invoicing, and treasury management.

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

## Chainlink CRE — The Orchestration Layer

### The Problem: A Messy Middle

Our financial system — Shiva, Motora, Circle, Bridge, Alfred, Rain, Stripe — talks to blockchains through a tangle of individual integrations. Every service has its own connection to every chain. KYC/AML checks happen in one place, transfer execution in another, fee reconciliation in a third. Each path is a separate piece of infrastructure we built, maintain, and trust independently.

There is no unified verification layer. When Shiva executes a Circle transfer, we trust Circle's response. When Motora processes an Alfred ramp, we trust Alfred's webhook. If something goes wrong between any of these systems and the blockchain, we find out from a support ticket, not from a cryptographic proof.

### The Solution: CRE as the Single Source of Truth

CRE replaces the messy middle with a single orchestration layer. Our existing financial systems connect to CRE, and CRE connects to blockchains. Every operation passes through a Decentralized Oracle Network (DON) where multiple independent nodes execute the same task, reach consensus, and produce a cryptographically signed result.

This means:

- **Every API call is consensus-verified.** When a CRE workflow calls Shiva to check a transfer, multiple independent Chainlink nodes call Shiva and must agree on the response. No single point of trust.
- **Every blockchain read is independently confirmed.** When CRE reads a USDC balance, multiple nodes read the chain independently. You get one verified answer.
- **Every write is cryptographically signed.** When CRE publishes an attestation on-chain, it carries a BFT consensus signature. The smart contract verifies it came from the DON, not from a single server.

We did not rewrite Shiva, Motora, or any existing service. CRE wraps around them — calls their APIs, verifies the results through consensus, and produces provable, on-chain records of what happened.

---

## 15 CRE Workflows Across 4 Domains

### Ghost Mode Privacy (4 workflows)

| Workflow | What It Does |
|----------|-------------|
| `workflow-ghost-deposit` | Verifies KYC/KYB compliance via BUAttestation, reads USDC backing in GhostUSDC FHERC20Wrapper, checks yield allocation via TreasuryManager, publishes on-chain attestation |
| `workflow-ghost-withdraw` | Validates DON state, verifies USDC + USYC backing covers withdrawal, publishes attestation before releasing funds |
| `workflow-ghost-transfer` | Monitors `ConfidentialTransfer` events on GhostUSDC, verifies both parties are compliant, syncs DON state |
| `workflow-private-transfer` | Handles USDCg private transfers via ACE Vault — EIP-712 signed off-chain ledger with CRE enforcing concentration limits and real-time policy |

### Escrow Contracts (6 workflows)

| Workflow | What It Does |
|----------|-------------|
| `workflow-escrow-deploy` | Deploys EscrowWithAgentV3 contracts on-chain via EscrowFactory. Encodes milestone amounts/descriptions, signs via CRE consensus report, writes to chain, publishes `escrow_verify` attestation |
| `workflow-escrow-verify` | AI-powered milestone verification. Fetches deliverable submission + acceptance criteria, sends to Shiva `/intelligence/verify` (CONFIDENTIAL), stores encrypted verdict, publishes attestation. **No funds move until deliverables pass verification** |
| `workflow-escrow-dispute` | 4-layer AI arbitration pipeline. Locks milestone on-chain to freeze funds, then runs: Layer 2 (two advocate briefs — provider + client perspectives), Layer 3 (3-judge tribunal, majority vote), Layer 4 (5-judge supreme court, supermajority 4 — only on appeal). All briefs and verdicts encrypted. Publishes `escrow_dispute` attestation with document hashes |
| `workflow-escrow-finalize` | Executes final decision and distributes funds. Calls `setDecision()` on-chain (immutable: payee basis points + receipt hash), then `executeDecision()` to release funds, then `setMilestoneStatus(RELEASED)`. Publishes `escrow_finalize` attestation |
| `workflow-escrow-monitor` | Dual-trigger — watches EscrowFactoryV3 for `AgreementCreated`, `MilestoneFunded`, `DecisionExecuted` events (EVM log), plus a 6-hour cron for proof of reserves. Publishes `proof_of_reserves` attestation |
| `workflow-escrow-yield` | Deposits idle escrow USDC into Deframe yield strategies (Pods) via Motora. Queries available strategies sorted by APY, executes deposit. On milestone release, redeems position back to USDC. Publishes `escrow_yield_deposit` and `escrow_yield_redeem` attestations |

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
| `shivaClient()` / `motoraClient()` / `supabaseClient()` / `aceClient()` | Pre-configured clients for platform services |
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

## Wallet-Level Compliance Stack (3 Layers)

| Layer | System | What It Does |
|-------|--------|-------------|
| **1** | Circle Compliance Engine | Every Programmable Wallet transaction passes sanctions/PEP/adverse media screening before on-chain execution. Silent. Automatic. First gate. |
| **2** | ACE Policy Guards | PolicyEngine contract (ERC1967Proxy) enforces Chainlink ACE policy on every `transfer()`, `deposit()`, `wrap()`. On-chain `_requireCompliant(sender, recipient)` check. |
| **3** | Persona KYC/KYB | Context-aware: personal wallets → KYC, team wallets → KYB. Status attested on-chain via BUAttestation with 365-day TTL. Ghost Mode and escrow gate behind verification. |

The user sees one verification step. Three compliance systems run underneath.

---

## Two Privacy Methods (Both CRE-Compliant)

### eUSDCg (FHE — Fully Homomorphic Encryption)

USDC wraps into an FHERC20Wrapper contract. Balances encrypted as `euint64` via CoFHE TaskManager. **Server-side FHE** — no browser SDK needed, encryption happens on-chain via `FHE.asEuint64()`. Deployed on both ETH-Sepolia and ARB-Sepolia.

```solidity
// GhostUSDC.sol — server sends plaintext, contract encrypts
function transferAmount(address to, uint64 amount) external whenNotPaused {
    _requireCompliant(msg.sender, to);
    euint64 encAmount = FHE.asEuint64(amount);  // contract encrypts via CoFHE
    _transfer(msg.sender, to, encAmount);
}
```

The Cloudflare Worker sends `transferAmount(0xRecipient, 100000000)` via Circle DCW. The contract calls `FHE.asEuint64()` to encrypt. No SDK, no iframe, no browser. FHE works with ANY wallet infrastructure.

### USDCg (Private Transfers)

USDC deposits into ACE Vault. Transfers happen off-chain via CRE's private ledger with zero on-chain trace. EIP-712 signatures authenticate each transfer.

---

## The Escrow System: Actually Smart Contracts

Traditional smart contracts aren't smart — they're automated. They can move money when someone clicks a button. But they cannot answer:

> "Was the work actually delivered correctly?"

Our escrow contracts answer that question. Here's the pipeline:

```
Agreement Created (UI)
  → EscrowFactoryV3.createEscrow() deploys milestone-based escrow on-chain
    → Payer funds escrow with USDC
      → Payee submits deliverables
        → CRE workflow-escrow-verify: AI evaluates deliverables vs acceptance criteria
          → PASS → workflow-escrow-finalize releases funds to payee
          → FAIL → payee resubmits or files dispute
            → workflow-escrow-dispute: 4-layer AI arbitration
              Layer 2: Two advocate briefs (pro-provider + pro-client)
              Layer 3: 3-judge tribunal (majority vote)
              Layer 4: 5-judge supreme court (supermajority 4/5, appeal only)
            → workflow-escrow-finalize executes verdict on-chain
```

While funds sit in escrow, `workflow-escrow-yield` deposits idle USDC into yield strategies. `workflow-escrow-monitor` watches for events and publishes proof-of-reserves every 6 hours.

Every step produces an on-chain attestation. Every verdict is encrypted before storage. Document hashes go on-chain; evidence stays in encrypted Supabase storage.

**No subjective approvals. No disputes as a business model. No "please review the updated PDF v17-final-final".**

---

## Business Model

TreasuryManager allocates USDC into Hashnote USYC (~6.5% APY) from two sources: Ghost Mode deposits AND idle escrow balances. Yield accrues to the **platform**, not users. Users get privacy + compliance + programmable contracts.

Same model as traditional banking, but on-chain and auditable via CRE attestations.

---

## Architecture

| Layer | Stack |
|-------|-------|
| **Frontend** | Next.js 16 + React 19 + Expo 54 (mobile) + TypeScript 5.9 |
| **Backend** | Hono (Cloudflare Workers) + Supabase (PostgreSQL, 180+ tables) |
| **AI** | Vercel AI SDK v6 + CopilotKit + Langfuse Observability |
| **Chain** | viem + ethers + Foundry + Chainlink CRE (15 workflows) + Fhenix CoFHE |
| **Payments** | Circle SDK + Bridge API + Stripe + AlfredPay + Rain.xyz |
| **Banking** | Plaid + Teller + GoCardless + Pluggy (Motora edge API) |
| **Infra** | Turborepo (76 packages, 10 apps), 218 API routes, 19 locales, 54 email templates, Bun |

---

## Challenges We Hit

**1. Server-side FHE without browser wallets.** Most FHE projects assume MetaMask + client-side encryption SDK. Our wallets are Circle Programmable Wallets (server-side custodial). Solution: the smart contract encrypts internally — `FHE.asEuint64(amount)` is called inside the contract. Shiva sends plaintext via Circle DCW, the contract handles encryption via CoFHE TaskManager. Zero SDK dependencies for FHE.

**2. Three-layer compliance without friction.** Circle screens silently at the wallet level. PolicyEngine enforces on-chain per-transfer. Persona verification happens once during onboarding with a 365-day TTL attestation. The user sees one step; three systems run underneath.

**3. Async FHE decryption.** CoFHE decryption takes 30-300 seconds. We built a 3-phase pipeline: unwrap (burns encrypted tokens, creates claim), decrypt (CoFHE processes off-chain), auto-claim (frontend polls every 5s). The user sees a loading animation, not FHE complexity.

**4. CRE WASM compilation.** CRE workflows compile to WASM via Javy. Required `bun >= 1.2.21` (lower versions produce broken WASM that compiles but crashes at runtime). Block number queries needed `LATEST_BLOCK_NUMBER` — free Sepolia RPCs lag behind on the `"finalized"` block tag.

**5. Escrow arbitration confidentiality.** Advocate briefs, tribunal verdicts, and supreme court rulings contain IP-sensitive information. CRE workflows mark these as CONFIDENTIAL, encrypt verdicts before storage, and only expose document hashes in on-chain attestations.

**6. Escrow yield timing.** Escrowed USDC needs to earn yield while locked but must be instantly available on milestone release. TreasuryManager handles this via async USYC allocation with a USDC buffer — `workflow-treasury-rebalance` monitors and redeems when reserves drop.

**7. Dual privacy routing.** Wiring both eUSDCg (FHE) and USDCg (private transfers) through the same UI required a clean asset-selection abstraction in the state machine while sharing the same KYC gate and CRE compliance layer.

**8. Multi-chain deployment.** GhostUSDC on both ETH-Sepolia and ARB-Sepolia required careful address management across 15 CRE workflow configs, Shiva env vars, and frontend routing.

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

## The Trust Model

Every financial operation produces a cryptographic proof:

| Source of Truth | What It Proves |
|----------------|---------------|
| BUAttestation on-chain | Every deposit, withdrawal, transfer, invoice, payroll batch, rebalance has an immutable attestation signed by the Chainlink DON |
| EscrowWithAgentV3 on-chain | Every milestone status change, every decision, every fund release is recorded in contract state |
| CRE consensus signatures | Every API call (Shiva, Motora, Circle) was independently executed by multiple DON nodes and agreed upon |
| Encrypted Supabase storage | Arbitration evidence, tribunal verdicts, and advocate briefs are encrypted at rest — only document hashes go on-chain |

Remove any layer and the product is either illegal, unprofitable, or not private.

---

*Built with righteous fury and an unreasonable number of CRE workflows.*
