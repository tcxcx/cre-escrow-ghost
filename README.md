# The Ark of the New Covenant
**Programmable settlement for a world without lawyers, politicians, and bankers.**

> **"Cursed is the man who trusts in man…"**
> — *Jeremiah 17:5*

That verse is basically our thesis statement.

Not because humans are evil — but because humans are human:
biased, emotional, inconsistent, incentivized, corruptible, tired, and sometimes just having a bad day.

So we're building a system where:
- **AI can be neutral when we can't**
- **contracts can verify reality**
- and **money moves at the speed of the internet**
  *without asking politicians for permission.*

---

## What is Bu?

BUFI is not another DeFi dashboard, payments app or neobank. It is a full-stack Agile Agentic Financial Operating System (AAF-OS) — an AI COO and CFO that remembers everything, researches autonomously, communicates proactively, and guides users as part of agile workspace teams through any financial operation, autonomously or even when it requires human action.

It helps you run your business on stablecoin and local rails and provides compliant private transfers for managing payroll, invoicing and financial flows. We have abstracted the best fintechs in the US into drag-drop widgets (Brex corporate cards, Mercury, Ramp, Deel, etc.) into an agile workspace where you and your team can power global 24/7 financial workflows with AI and agents.

We are introducing payroll benefits such as stock option 401k's for global workforce, treasury access to stocks, easy access to DeFi aggregated yield strategies, automated accounting (US and Brazil), business knowledge graph, intelligent inbox AP/AR reconciliation and financial analytics, Slack and WhatsApp receipt and invoice upload, and AI escrow legal contracts for workspace-to-workspace collaboration.

We are building at the intersection of Notion + Light + Mercury for a financial AI and stablecoin-first OS for global businesses and teams. The true future of work.

---

## How is it built?

Bu is an agentic financial OS on stablecoin rails with Ghost Mode privacy, programmable escrow contracts, and wallet-level compliance — all orchestrated through Chainlink CRE.

**Architecture:** Next.js app → Cloudflare Worker (Shiva) → Circle Programmable Wallets → Solidity contracts on Sepolia + Arbitrum Sepolia → 15 CRE workflows for compliance, privacy, escrow, payroll, invoicing, and treasury management.

---

## Deployed Smart Contracts

### Ethereum Sepolia (Hardened v2)

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

### Arbitrum Sepolia

| Contract | Address | Explorer |
|----------|---------|----------|
| PolicyEngineMock | `0x43b8c40dc785c6ab868d2dfa0a91a8cc8e7d4ef6` | [Arbiscan](https://sepolia.arbiscan.io/address/0x43b8c40dc785c6ab868d2dfa0a91a8cc8e7d4ef6) |
| BUAttestationMock | `0xaaf50d1ccf481657f9719a71b8384a9e1bbe1348` | [Arbiscan](https://sepolia.arbiscan.io/address/0xaaf50d1ccf481657f9719a71b8384a9e1bbe1348) |
| EscrowFactoryV3 | `0x806dd4d26a0930d4bed506b81eb8f57f334cd53e` | [Arbiscan](https://sepolia.arbiscan.io/address/0x806dd4d26a0930d4bed506b81eb8f57f334cd53e) |
| GhostUSDC (eUSDCg — FHE) | `0xA3BfA84a4b7a8de8340Df3B0CCFED33240C6F765` | [Arbiscan](https://sepolia.arbiscan.io/address/0xA3BfA84a4b7a8de8340Df3B0CCFED33240C6F765) |

### Deployer

| | Address |
|--|---------|
| Deployer/Executor | `0x09Ce8E2B3Fede2727dA4392Ea8Fe618305ba0474` |

---

## What Powers It

### Two AI Surfaces, One Brain

The platform runs two complementary AI interfaces — a deep-think modal for strategic financial conversations (powered by Vercel AI SDK v6 with streaming artifacts: code, charts, reports, spreadsheets), and a contextual copilot panel that's aware of what page you're on and triggers human-in-the-loop approvals for transfers, invoices, and compliance actions via CopilotKit. Both have access to `@bu/intelligence` — a multiprovider AI package that includes semantic vector search, own memory system, OCR extraction, and a rich cascade enrichment pipeline including Exa Websets and Plaid financial enrichment.

### Multi-Chain Transfer Engine

Same-chain transfers (Circle SDK), cross-chain bridges (CCTP + Bridging kit), USDC-backed corporate credit cards (Rain.xyz) and fiat off-ramp (Bridge and AlfredPay API) — all through a single interface. Supports multichain USDC/EURC. Batch payroll, invoice auto-routing, and gas optimization with Circle Gas Station and Alchemy paymaster.

### Compliant Private Transfers (Ghost Mode)

USDg (ghostUSD) and eUSDg (encrypted ghostUSD) — a 1:1 USDC wrapper with ERC20Permit + Burnable — enables privacy-preserving transfers. Paired with a Chainlink PolicyEngine for programmable and FHENIX CoFHE smart-contracts, policy-based financial governance and an ACE Vault for managed treasury with double AML checks (ACE/Circle Compliance Engine) and KYC/KYB (Persona). Deposited USDC goes into a treasury vault redeemable against Hashnote USYC strategy for short-term treasury yield as private transfers are unlocked for business use-cases.

### Banking Data Engine (Motora)

A Cloudflare Worker that unifies Plaid, Teller, GoCardless, and Pluggy behind one edge-computed API. Real-time balances, transactions, and holdings from 400+ financial institutions with auto-generated Swagger/OpenAPI docs. Onramp from your connected bank to stablecoins while you keep track of 20 financial metrics for all of your connected accounts.

### Blockchain Verification (Chainlink CRE)

Decentralized Oracle Network consensus baked into financial workflows. On-chain attestations via BUAttestation.sol — cryptographically signed, immutable proof of every financial operation. Consensus-verified API calls to banking, transfer, and accounting services.

### 100+ AI Tools

Financial operations, research, and reporting tools including spending fingerprinting, customer payment profiles, relationship scoring, financial SQL generation, and autonomous research with web search. Memory system spans episodic (conversations), semantic (embeddings), and procedural (learned workflows). Voice-first interface with Deepgram → LLM → ElevenLabs pipeline. Multi-LLM support: Claude, GPT-4, Gemini, Groq with automatic fallback.

### Enterprise Grade

RBAC (viewer → member → admin → owner), KYC/KYB via Persona, full audit trails, Stripe billing with usage-based metering, team management, feature flags, and an MCP Server with x402 payment protocol for API monetization.

---

## CRE Integration — 15 Workflows Across 4 Domains

### Ghost Mode Privacy (4 workflows)

- **workflow-ghost-deposit**: Verifies KYC/KYB compliance via BUAttestation, reads USDC backing in GhostUSDC FHERC20Wrapper, checks yield allocation via TreasuryManager, publishes on-chain attestation.
- **workflow-ghost-withdraw**: Validates DON state, verifies USDC + USYC backing covers withdrawal, publishes attestation before releasing funds.
- **workflow-ghost-transfer**: Monitors ConfidentialTransfer events on GhostUSDC, verifies both parties are compliant, syncs DON state.
- **workflow-private-transfer**: Handles USDCg private transfers via ACE Vault — EIP-712 signed off-chain ledger with CRE enforcing concentration limits and real-time policy.

### Escrow Contracts (6 workflows)

- **workflow-escrow-deploy**: Deploys EscrowWithAgentV3 contracts on-chain via EscrowFactory. Encodes milestone amounts/descriptions, signs via CRE consensus report, writes to chain, publishes `escrow_verify` attestation.
- **workflow-escrow-verify**: AI-powered milestone verification. Fetches deliverable submission + acceptance criteria, sends to Shiva `/intelligence/verify` (CONFIDENTIAL), stores encrypted verdict, publishes attestation. No funds move until deliverables pass verification.
- **workflow-escrow-dispute**: 4-layer AI arbitration pipeline. Locks milestone on-chain to freeze funds, then runs: Layer 2 (two advocate briefs — provider + client perspectives), Layer 3 (3-judge tribunal, majority vote), Layer 4 (5-judge supreme court, supermajority 4 — only on appeal). All briefs and verdicts encrypted. Publishes `escrow_dispute` attestation with document hashes.
- **workflow-escrow-finalize**: Executes final decision and distributes funds. Calls `setDecision()` on-chain (immutable: payee basis points + receipt hash), then `executeDecision()` to release funds, then `setMilestoneStatus(RELEASED)`. Publishes `escrow_finalize` attestation.
- **workflow-escrow-monitor**: Dual-trigger — watches EscrowFactoryV3 for `AgreementCreated`, `MilestoneFunded`, `DecisionExecuted` events (EVM log), plus a 6-hour cron for proof of reserves. Aggregates total locked escrow across all active contracts, publishes `proof_of_reserves` attestation.
- **workflow-escrow-yield**: Deposits idle escrow USDC into Deframe yield strategies (Pods) via Motora. Queries available strategies sorted by APY, executes deposit. On milestone release, redeems position back to USDC. Publishes `escrow_yield_deposit` and `escrow_yield_redeem` attestations.

### Financial Operations (3 workflows)

- **workflow-invoice-settle**: CRE-orchestrated invoice payment with compliance verification.
- **workflow-payroll-attest**: Payroll execution with on-chain attestation for each batch.
- **workflow-treasury-rebalance**: Monitors USDC buffer across Ghost Mode and escrow, redeems USYC back to USDC when reserves drop below threshold.

### Reporting (1 workflow)

- **workflow-report-verify**: Validates financial report data integrity.

---

## Wallet-Level Compliance Stack (3 Layers)

1. **Circle Compliance Engine** — Every Circle Programmable Wallet transaction passes through Circle's built-in compliance screening (sanctions, PEP lists, adverse media) before any on-chain execution. First gate before CRE sees the transaction.

2. **ACE Policy Guards** — PolicyEngine contract (ERC1967Proxy) enforces Chainlink ACE policy on every token transfer. `defaultAllow=true` with explicit deny-list. Every `transfer()`, `deposit()`, and `wrap()` calls `_requireCompliant(sender, recipient)` on-chain.

3. **Persona Integration for KYB/KYC** — Context-aware verification: personal wallets trigger KYC (individual identity via Persona), team wallets trigger KYB (business entity verification). Status attested on-chain via BUAttestation with 365-day TTL. Ghost Mode and escrow flows gate behind verification — no unverified wallet touches privacy or contract features.

---

## Two Privacy Methods (Both CRE-Compliant)

### 1. eUSDCg (FHE)
USDC wraps into an FHERC20Wrapper contract. Balances encrypted as `euint64` via CoFHE TaskManager. Server-side FHE — no browser SDK needed, encryption happens on-chain via `FHE.asEuint64()`. Deployed on both ETH-Sepolia and ARB-Sepolia.

### 2. USDCg (Private Transfers)
USDC deposits into ACE Vault. Transfers happen off-chain via CRE's private ledger with zero on-chain trace. EIP-712 signatures authenticate each transfer.

---

## Smart Contracts

**7+ deployed across two networks:**

- **BUAttestation** — Pausable, rate-limited, TTL-enforced on-chain attestations
- **PolicyEngine** — ERC1967Proxy with Chainlink ACE compliance
- **USDCg** — 6 decimals, Ownable2Step + Pausable, 1:1 USDC wrapper
- **TreasuryManager** — USDC → USYC yield allocation, CRE ALLOCATE/REDEEM
- **ACE Vault** — Chainlink-managed treasury
- **GhostUSDC (eUSDCg)** — FHERC20Wrapper via CoFHE (ETH-Sepolia: `0x6e6Ad7EDECbb4C9B7aA9453af2ba285f6d6cCcB5`, ARB-Sepolia: `0xA3BfA84a4b7a8de8340Df3B0CCFED33240C6F765`)
- **EscrowFactoryV3 + EscrowWithAgentV3** — Milestone-based escrow with on-chain decisions (ETH-Sepolia: `0x0f8b653aadd4f04008fdaca3429f6ea24951b129`, ARB-Sepolia: `0x806dd4d26a0930d4bed506b81eb8f57f334cd53e`)

---

## Business Model

TreasuryManager allocates USDC into Hashnote USYC (~6.5% APY) from two sources: Ghost Mode deposits AND idle escrow balances. Yield accrues to the platform, not users. Users get privacy + compliance + programmable contracts. Same model as traditional banking, but on-chain and auditable via CRE attestations.

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
| **Infra** | Turborepo monorepo (76 packages, 10 apps), 218 API routes, 19 locales, 54 email templates, Bun runtime |

---

## Challenges

1. **Server-side FHE without browser wallets.** Most FHE projects assume MetaMask + client-side encryption SDK. Our wallets are Circle Programmable Wallets (server-side custodial) — no browser access. We solved this by having the smart contract encrypt internally: `FHE.asEuint64(amount)` is called inside the contract, so Shiva sends plaintext via Circle DCW and the contract handles encryption via CoFHE TaskManager. Zero SDK dependencies for FHE.

2. **Three-layer compliance without friction.** Stacking Circle Compliance Engine + ACE PolicyEngine + Persona KYC/KYB could create a UX nightmare. We made it seamless: Circle screens silently at the wallet level, PolicyEngine enforces on-chain per-transfer, and Persona verification happens once during onboarding (context-aware — KYC for personal, KYB for team wallets) with a 365-day TTL attestation on BUAttestation. The user sees one verification step; three compliance systems run underneath.

3. **Async FHE decryption for withdrawals.** FHE decrypt is not synchronous — CoFHE processes it off-chain (30-300 seconds). We built a 3-phase pipeline: unwrap (burns encrypted tokens, creates claim), decrypt (CoFHE processes off-chain), auto-claim (frontend polls every 5s, auto-claims when ready). The user sees a loading animation, not FHE complexity.

4. **CRE WASM compilation constraints.** CRE workflows compile to WASM via Javy. The SDK's AST analysis only detects `export async function main()` as a function declaration — `export const main = createWorkflow(...)` silently fails. Required `bun >= 1.2.21` (lower versions produce broken WASM that compiles but crashes at runtime with `unreachable` trap). Block number queries needed `LATEST_BLOCK_NUMBER` instead of `LAST_FINALIZED_BLOCK_NUMBER` because free Sepolia RPCs lag behind on finalized blocks.

5. **Escrow arbitration confidentiality.** The 4-layer AI arbitration pipeline handles sensitive contract disputes — advocate briefs, tribunal verdicts, and supreme court rulings all contain IP-sensitive information. CRE workflows mark these as CONFIDENTIAL, encrypt verdicts before storage, and only expose document hashes in on-chain attestations. Balancing transparency (on-chain audit trail) with confidentiality (encrypted evidence) required careful separation of what goes on-chain vs. what stays in encrypted Supabase storage.

6. **Escrow yield timing.** Escrowed USDC needs to earn yield while locked, but must be instantly available when a milestone releases. TreasuryManager handles this via async USYC allocation with a USDC buffer — CRE's `workflow-treasury-rebalance` monitors the buffer and redeems USYC back to USDC when reserves drop below threshold. `workflow-escrow-yield` picks the highest-APY Deframe strategy via Motora and auto-redeems on milestone finalization.

7. **Dual privacy method routing.** Wiring both eUSDCg (FHE) and USDCg (private transfers) through the same UI required a clean asset-selection abstraction in the state machine — deposit, withdraw, balance fetch, and processing labels all branch based on which privacy method the user chose, while sharing the same onboarding/KYC gate and CRE compliance layer.

8. **Multi-chain deployment.** Deploying GhostUSDC on both ETH-Sepolia (for CRE compatibility) and ARB-Sepolia (for the Arbitrum ecosystem) required separate deployer wallets and careful address management across 15 CRE workflow configs, Shiva env vars, and frontend routing.

---

## The Thesis

### Part 1 — FX should behave like software

FX is the largest market on Earth. And yet it still runs on cut-off times, settlement windows, correspondent chains, bilateral risk, gated venues, and institutional privilege.

Stablecoins changed the settlement layer. This project pushes it further: **a programmable settlement VM that makes FX composable, auditable, and eventually permissionless.**

### Part 2 — Actually putting the "smart" in smart contracts

Traditional smart contracts aren't smart — they're just automated. They can move money when someone clicks a button. But they cannot answer the most important question:

> "Was the work actually delivered correctly?"

We use **AI-powered verification** to evaluate deliverables against acceptance criteria, reaching decentralized consensus on quality before releasing payment. No human is ever in the decision loop.

Locked escrow funds don't just sit idle — they generate yield through DeFi protocols, distributed between both parties based on performance.

Think:
- PandaDocs meets escrow
- minus the 3% intermediary fees
- minus the 1% "insurance"
- minus the lawyer layer
- minus the political permission layer

Freelancers finally get payment guarantees. Clients finally get delivery guarantees. No middlemen. Just two parties, one contract, and AI that verifies the work.

Smart contracts that can finally think — and earn while they wait.

---

## Trust Model

Sources of truth:
1. **Onchain bytecode execution logs**
2. **Hashed AI-generated documents recorded onchain**
3. **Decentralized CRE workflows for orchestration**
4. **Deterministic receipts and replay**
5. **BUAttestation — cryptographic proof of every financial operation**

---

## Running Locally

```sh
bun install
turbo dev
```

---

*Built with righteous fury and an unreasonable number of CRE workflows.*
