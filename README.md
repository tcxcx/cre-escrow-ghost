# Privacy-First Finance: Compliant Private Transfers, AI Escrow Arbitration & Tokenized Stock Benefits

> CRE-orchestrated financial infrastructure combining confidential transfers, adversarial AI arbitration with DeFi yield, and payroll stock purchasing — all privacy-preserving, all compliance-gated.

---

## Three Tracks

| Track | Theme | Stack |
|-------|-------|-------|
| **Ghost Mode** | Privacy + Compliance + DeFi Yield | CoFHE/Fhenix FHE, Circle DCW, Chainlink CRE + ACE, USYC (Hashnote) |
| **Contracts** | CRE-First Escrow + AI Arbitration + DeFi | Chainlink CRE, 4-Layer AI Tribunal, PolicyEngine, TreasuryManager |
| **Stocks** | Payroll Benefits + Stock Purchasing | Robinhood Chain, Polygon.io, Dune, Alchemy, A2A/A2UI Agents |

---

## Track 1: Ghost Mode — Private Transfers with Compliance

### The Problem

Moving money privately on-chain without sacrificing regulatory compliance. Current options force a choice: full transparency (traditional stablecoins) or full privacy (mixers, which are non-compliant). We need both.

### Our Approach: Two Privacy Methods Under One Compliance Layer

We explored **two distinct privacy architectures** — both CRE-compliant, both yielding USYC, both gated by Chainlink ACE — to determine which approach best fits production-grade confidential finance.

#### Method 1: eUSDCg (FHE Encryption via CoFHE/Fhenix)

Balances are **encrypted on-chain** using Fully Homomorphic Encryption. The encrypted wrapper (FHERC20) holds USDC and issues encrypted balance tokens. No one — not even validators — can see individual balances.

- **How it works**: User deposits USDC → `GhostUSDC.wrap()` → encrypted balance via CoFHE
- **Privacy model**: On-chain encryption of balances and transfers
- **Compliance**: CRE workflow verifies KYC/KYB via ACE before allowing wrap
- **Trade-off**: Stronger privacy guarantees, newer technology stack, computation overhead

#### Method 2: USDCg (Confidential Transfers via Circle DCW + ACE Vault)

Uses Circle's Developer-Controlled Wallets with confidential routing through our ACE Vault. Transfers are private at the application layer — on-chain transactions exist but amounts and parties are obfuscated through the vault structure.

- **How it works**: User deposits via Shiva → ACE Vault custody → private ledger tracking
- **Privacy model**: Application-layer confidentiality with vault aggregation
- **Compliance**: Same CRE + ACE pipeline, PolicyEngine allowlist checks
- **Trade-off**: More mature infrastructure, production-ready, slightly weaker privacy guarantees

#### Both Methods Share

- **USYC Yield**: Deposited USDC is allocated to Hashnote's USYC (short-term US Treasury fund) via `TreasuryManager.allocateToYield()` — your private balance earns real yield
- **CRE Compliance Pipeline**: Every deposit/withdraw/transfer runs through a CRE workflow that checks PolicyEngine allowlist + ACE KYC status before execution
- **On-Chain Attestation**: Every operation publishes a privacy-preserving attestation to `BUAttestation` — hashed amounts, no plaintext values, with operation-specific rate limits and TTLs

#### CRE Workflows (Ghost Mode)

| Workflow | Trigger | Steps |
|----------|---------|-------|
| `ghost-deposit` | HTTP (post-wrap) | Compliance gate → Verify USDC → Read FHE state → Check yield → Update DON → Attest |
| `ghost-withdraw` | HTTP | Compliance → Verify burn → Yield redemption check → DON update → Attest |
| `ghost-transfer` | HTTP | Dual compliance (sender + recipient) → Verify encrypted transfer → DON update → Attest |
| `private-transfer` | HTTP | Circle DCW routing → ACE Vault → Confidential settlement → Attest |
| `treasury-rebalance` | Cron (6h) | Check USDC pool → Calculate optimal allocation → Move excess to USYC → Attest reserves |

### Research Direction

This is active **technical research and proof-of-concept** work. We're evaluating both FHE (CoFHE/Fhenix) and confidential transfer approaches to determine the best path to production-grade private, compliant transfers. We're eager to collaborate with teams building in both solution spaces and to leverage CCIP and ACE to establish compliant private transfer methodologies.

---

## Track 2: Contracts — CRE-First Escrow with Adversarial AI Arbitration

### The Problem

Contract disputes are expensive, slow, and biased toward whoever can afford better lawyers. Escrow services charge high fees and have single points of failure in dispute resolution. Meanwhile, escrowed funds sit idle earning nothing.

### Our Approach: 4-Layer AI Arbitration + DeFi Yield on Escrowed Funds

A singleton escrow contract holds funds while Chainlink CRE orchestrates every lifecycle event — from milestone verification to adversarial dispute resolution. Escrowed USDC earns yield in USYC while locked.

#### Escrow Lifecycle (All CRE-Orchestrated)

```
Create Agreement → Sign → Fund → Submit Deliverable → AI Verify → Complete/Dispute
     │                        │                            │              │
     │                        └── USDC → USYC yield ──────┘              │
     │                                                                    │
     └──────────────── All events trigger CRE workflows ──────────────────┘
```

#### 4-Layer Adversarial AI Arbitration System

When a milestone is disputed, CRE orchestrates a multi-layered AI tribunal with adversarial advocacy:

| Layer | Role | Agents | Decision |
|-------|------|--------|----------|
| **L1: Verification** | Automated check | 1 verifier | PASS/FAIL with confidence score |
| **L2: Advocacy** | Adversarial briefs | 2 advocates (payer + payee) | Each argues their client's case |
| **L3: Tribunal** | First hearing | 3 judges | 2/3 majority required |
| **L4: Supreme Court** | Appeal (if close) | 5 judges | 3/5 supermajority required |

- Each AI judge has a distinct persona, reasoning style, and bias profile
- Advocates use adversarial prompting — they genuinely argue for their side
- Judges receive both briefs + original evidence, decide independently
- Results are cryptographically committed via BUAttestation

#### CRE Workflows (Escrow)

| Workflow | Trigger | Steps |
|----------|---------|-------|
| `escrow-verify` | HTTP | Parse submission → Fetch criteria → **Confidential AI verify** → Encrypted verdict → Callback → Attest |
| `escrow-dispute` | HTTP | Load briefs → Run tribunal → Tally votes → Publish ruling → Attest |
| `escrow-finalize` | HTTP | Verify resolution → Calculate split → Execute payout → Return yield → Attest |
| `escrow-deploy` | HTTP | Validate params → Deploy agreement → Register with PolicyEngine → Attest |
| `escrow-monitor` | Cron | Check pending agreements → Timeout stale milestones → Alert |
| `escrow-yield` | Cron | Monitor escrowed USDC → Allocate to USYC → Track per-agreement yield |

#### Key Innovation: Confidential AI Verification

The `escrow-verify` workflow uses CRE's **confidential HTTP** capability — AI verification calls are encrypted end-to-end. The CRE node calls our Shiva API with AES-encrypted payloads, so neither the network nor observers can see the AI's reasoning or verdict before it's committed on-chain.

---

## Track 3: Stocks — Payroll Benefits & Stock Purchasing on Robinhood Chain

### The Problem

Employee stock benefits are locked behind legacy brokerage infrastructure. Purchasing individual stocks requires multiple apps, accounts, and manual processes. There's no unified interface connecting payroll → stock purchasing → portfolio management.

### Our Approach: AI-Powered Stock Benefits with A2UI

An agentic interface where AI agents help employees discover, research, and purchase stocks directly from their payroll allocation — deployed on Robinhood Chain.

#### Architecture

- **Multi-Provider Price Engine**: Polygon.io (real-time) + Dune Analytics (on-chain) + Alchemy (token data) + Massive (fallback) — automatic failover
- **Payroll Integration**: CRE `payroll-attest` workflow verifies employment, salary allocation, and compliance before stock purchases
- **A2A/A2UI Agents**: Agent-to-Agent protocol with AG-UI streaming adapter for CopilotKit — AI agents that research stocks, explain fundamentals, and execute purchases through conversational UI
- **Interactive Charts**: Dual-source price charts with candlestick/line views, time range selection, real-time updates

#### CRE Workflow (Stocks)

| Workflow | Trigger | Steps |
|----------|---------|-------|
| `payroll-attest` | HTTP | Verify employment → Check allocation limits → Validate compliance → Attest eligibility |

---

## Deployed Contracts

> All contracts verified on testnet explorers. Click addresses to view on Etherscan/Arbiscan.

### Ethereum Sepolia (Chain ID: 11155111)

| Contract | Address | Purpose |
|----------|---------|---------|
| **BUAttestation** | [`0xC3C7A1bd7556ba93729f859F0f1D1Cb60aeEc72C`](https://sepolia.etherscan.io/address/0xC3C7A1bd7556ba93729f859F0f1D1Cb60aeEc72C) | On-chain attestation — 19 operation types, rate limits, TTL, severity levels |
| **USDCg (USDg)** | [`0x2F28A8378798c5B42FC28f209E903508DD8F878b`](https://sepolia.etherscan.io/address/0x2F28A8378798c5B42FC28f209E903508DD8F878b) | Ghost stablecoin — 6 decimals, auto-allocate deposit→USYC, Ownable2Step+Pausable |
| **PolicyEngine** | [`0x76b727ed158fe58CaFe4FF5F98D0D98E7244F926`](https://sepolia.etherscan.io/address/0x76b727ed158fe58CaFe4FF5F98D0D98E7244F926) | ERC1967Proxy → Chainlink compliance impl, ACE-managed allowlists |
| **TreasuryManager** | [`0x33A4a73FD81bB6314AB7dc77301894728E6825A4`](https://sepolia.etherscan.io/address/0x33A4a73FD81bB6314AB7dc77301894728E6825A4) | ReceiverTemplate+Pausable, CRE ALLOCATE/REDEEM, USDC→USYC yield |
| **ACE Vault** | [`0xE588a6c73933BFD66Af9b4A07d48bcE59c0D2d13`](https://sepolia.etherscan.io/address/0xE588a6c73933BFD66Af9b4A07d48bcE59c0D2d13) | Chainlink-managed custody vault, USDCg registered |
| **GhostUSDC v2 (eUSDCg)** | [`0x6e6Ad7EDECbb4C9B7aA9453af2ba285f6d6cCcB5`](https://sepolia.etherscan.io/address/0x6e6Ad7EDECbb4C9B7aA9453af2ba285f6d6cCcB5) | FHERC20 wrapper — USDC-backed, FHE-encrypted balances via CoFHE |
| **EscrowFactory** | [`0x0f8b653aadd4f04008fdaca3429f6ea24951b129`](https://sepolia.etherscan.io/address/0x0f8b653aadd4f04008fdaca3429f6ea24951b129) | Escrow agreement factory — deploys EscrowWithAgentV3 instances |

### Arbitrum Sepolia (Chain ID: 421614)

| Contract | Address | Purpose |
|----------|---------|---------|
| **GhostUSDC (eUSDCg)** | [`0xA3BfA84a4b7a8de8340Df3B0CCFED33240C6F765`](https://sepolia.arbiscan.io/address/0xA3BfA84a4b7a8de8340Df3B0CCFED33240C6F765) | Cross-chain Ghost USDC — FHERC20 wrapper on Arbitrum |

### External Dependencies (Sepolia)

| Contract | Address | Provider |
|----------|---------|----------|
| **USDC** | [`0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`](https://sepolia.etherscan.io/address/0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238) | Circle |
| **USYC** | [`0x38D3A3f8717F4DB1CcB4Ad7D8C755919440848A3`](https://sepolia.etherscan.io/address/0x38D3A3f8717F4DB1CcB4Ad7D8C755919440848A3) | Hashnote |
| **USYC Teller** | [`0x96424C885951ceb4B79fecb934eD857999e6f82B`](https://sepolia.etherscan.io/address/0x96424C885951ceb4B79fecb934eD857999e6f82B) | Hashnote |
| **USYC Oracle** | [`0x35b96d80C72f873bACc44A1fACfb1f5fac064f1a`](https://sepolia.etherscan.io/address/0x35b96d80C72f873bACc44A1fACfb1f5fac064f1a) | Hashnote |
| **Deployer** | [`0x09Ce8E2B3Fede2727dA4392Ea8Fe618305ba0474`](https://sepolia.etherscan.io/address/0x09Ce8E2B3Fede2727dA4392Ea8Fe618305ba0474) | Bu (testnet burner) |

### Contract Hardening

All contracts implement production-grade security patterns:
- **Pausable**: Emergency circuit breaker on all critical contracts
- **Rate Limits**: `PROOF_OF_RESERVES=6h`, `USDG_SUPPLY_SNAPSHOT=6h` attestation cooldowns
- **TTLs**: `KYC_VERIFIED=365d`, `KYB_VERIFIED=365d`, `PROOF_OF_RESERVES=25h`
- **Severity Levels**: `CRITICAL` for reserves/supply, `WARNING` for KYC/KYB
- **Ownable2Step**: Two-step ownership transfer (prevents accidental transfers)
- **Backing Invariant**: USDg enforces USDC backing ratio on every mint

---

## CRE Workflow Simulation Proof

All 14 CRE workflows compile and simulate successfully via `cre simulate`. Below are key simulation outputs:

### Ghost Deposit Workflow

```
$ cre simulate --non-interactive --trigger-index 0

Step 1: Compliance check
  PolicyEngine.checkTransfer() → allowed ✓
  ACE KYC query → verified (level: STANDARD) ✓
Step 2: Verify USDC in GhostUSDC
  USDC.balanceOf(GhostUSDC) → balance confirmed ✓
Step 3: Read FHE ghost state
  Ghost indicator + total supply read ✓
Step 4: Check yield allocation status
  TreasuryManager.getYieldValueUSDC() → current yield ✓
Step 5: Update DON state
  Private ledger updated ✓
Step 6: Publish attestation
  BUAttestation.attest() → txHash ✓

Result: { success: true, attestationId: "..." }
```

### Escrow Verify Workflow

```
$ cre simulate --non-interactive --trigger-index 0

Step 1: Parse submission input ✓
Step 2: Fetch submission from Shiva (confidential HTTP) ✓
Step 3: Fetch milestone criteria ✓
Step 4: AI verification (confidential) → PASS (confidence: 0.87) ✓
Step 5: Store encrypted verdict ✓
Step 6: Callback to Shiva with result ✓
Step 7: Publish attestation ✓

Result: { success: true, verdict: "PASS", confidence: 0.87 }
```

### Treasury Rebalance Workflow

```
$ cre simulate --non-interactive --trigger-index 0

Step 1: Check USDC pool balance ✓
Step 2: Read current USYC allocation ✓
Step 3: Calculate optimal rebalance ✓
Step 4: Execute allocation (USDC → USYC via Teller) ✓
Step 5: Publish proof-of-reserves attestation ✓

Result: { rebalanced: true, newYieldAllocation: "..." }
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Chainlink CRE Runtime                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │  Ghost    │ │ Escrow   │ │ Treasury │ │ Payroll / Stocks │  │
│  │ Deposit   │ │ Verify   │ │ Rebalance│ │ Attest           │  │
│  │ Withdraw  │ │ Dispute  │ │ (cron)   │ │                  │  │
│  │ Transfer  │ │ Finalize │ │          │ │                  │  │
│  │ Private   │ │ Deploy   │ │          │ │                  │  │
│  │ Transfer  │ │ Monitor  │ │          │ │                  │  │
│  └─────┬─────┘ └─────┬────┘ └────┬─────┘ └────────┬─────────┘  │
│        │              │           │                │            │
│        └──────────────┴───────────┴────────────────┘            │
│                           │                                     │
│              ┌────────────┴────────────┐                        │
│              │  Confidential HTTP      │                        │
│              │  (AES-encrypted calls)  │                        │
│              └────────────┬────────────┘                        │
└───────────────────────────┼─────────────────────────────────────┘
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
    ┌─────┴─────┐    ┌─────┴─────┐    ┌──────┴──────┐
    │ PolicyEngine│   │   ACE     │    │ BUAttestation│
    │ (allowlist) │   │ (KYC/KYB) │    │ (19 op types)│
    └─────┬─────┘    └─────┬─────┘    └──────┬──────┘
          │                │                  │
          └────────────────┴──────────────────┘
                           │
              ┌────────────┴────────────┐
              │    Sepolia / ARB-Sep    │
              │  USDg  GhostUSDC  USYC  │
              │  TreasuryManager  Vault  │
              └─────────────────────────┘
```

---

## Proof of Work

All source code, contracts, workflows, and UI components are included in the `proof/` directory, copied from our production monorepo:

```
proof/
├── cre-workflows/          # 12 CRE workflow handlers + shared utilities
│   ├── workflow-ghost-*    # 3 Ghost Mode workflows (deposit, withdraw, transfer)
│   ├── workflow-escrow-*   # 5 Escrow workflows (verify, dispute, finalize, monitor, yield)
│   ├── workflow-private-*  # Confidential transfer workflow
│   ├── workflow-treasury-* # Treasury rebalance cron
│   ├── workflow-payroll-*  # Payroll attestation
│   └── shared/             # Reusable services (attestation, EVM, FHE, triggers, ABIs)
├── cre-contracts/          # Foundry contracts (deployed on Sepolia)
│   ├── src/                # BUAttestation, USDg, USDCg, GhostUSDC, TreasuryManager, FHERC20
│   ├── test/               # Foundry tests (hardened security, attestation, yield)
│   └── script/             # Deploy scripts (DeployAll, DeployGhostUSDC, DeployTimelock)
├── cre-scripts/            # CRE deploy & simulation scripts
│   ├── deploy-escrow-factory.ts    # EscrowFactory deployment (ETH Sepolia)
│   ├── deploy-escrow-factory-arb.ts # EscrowFactory deployment (ARB Sepolia)
│   ├── deploy-arb-sepolia-all.ts   # Full ARB Sepolia deployment
│   └── simulate.sh                 # CRE workflow simulation runner
├── contracts/              # Additional contract source + FHE reference
│   ├── src/                # Arbitration contracts (EscrowWithAgentV3, Factory, Policies)
│   ├── test/               # Foundry tests
│   ├── script/             # Deploy scripts
│   └── fhe-reference/      # CoFHE/Fhenix FHE integration reference (FHERC20, Wrapper)
├── intelligence/           # AI arbitration system
│   ├── arbitration/        # 4-layer tribunal (verifier, advocates, judges, supreme court)
│   └── a2ui/               # Agent-to-Agent + AG-UI streaming adapter
├── ghost-mode/             # Ghost Mode UI + services
│   ├── components/         # Deposit, withdraw, transfer UIs + onboarding
│   └── services/           # FHE state readers, privacy helpers
├── stocks/                 # Stock purchasing + payroll
│   ├── src/                # @bu/stocks package (Polygon.io, Dune, Alchemy, Massive providers)
│   ├── earn-ui/            # Purchase flow, interactive charts, stock cards
│   └── hooks/              # React hooks for stock data + price history
├── agentic-ui/             # A2A protocol + CopilotKit adapter
│   ├── src/                # Agent cards, registry, A2A client, stream bridge, renderer
│   └── a2a-routes/         # Shiva A2A HTTP routes + task store
├── email-templates/        # 8 contract lifecycle email templates
├── deployed-contracts/     # Contract address registry (addresses.ts)
└── plans/                  # 8 architecture documents and design specs
```

---

## Technology Stack

| Layer | Technology | Role |
|-------|-----------|------|
| **Orchestration** | Chainlink CRE | Workflow runtime for all financial operations |
| **Compliance** | Chainlink ACE | Automated KYC/KYB, PolicyEngine allowlists |
| **Privacy (FHE)** | CoFHE / Fhenix | Fully Homomorphic Encryption for on-chain balances |
| **Privacy (Transfers)** | Circle DCW | Developer-Controlled Wallets for confidential routing |
| **Yield** | Hashnote USYC | Short-term US Treasury fund for idle USDC |
| **Attestation** | BUAttestation | On-chain proof with rate limits, TTL, severity |
| **AI Arbitration** | Claude / AI SDK v6 | 4-layer adversarial tribunal with distinct personas |
| **Stock Data** | Polygon.io, Dune, Alchemy, Massive | Multi-provider price engine with failover |
| **Stock Chain** | Robinhood Chain | Stock token issuance and trading |
| **Agentic UI** | A2A Protocol + AG-UI | Agent-to-Agent delegation with streaming UI |
| **Background Jobs** | Trigger.dev v4 | Email, crons, async task orchestration |
| **Smart Contracts** | Solidity + Foundry | ERC20, FHERC20, proxy patterns, pausable |
| **Frontend** | Next.js + React + Tailwind | App shell with CopilotKit integration |
| **API** | Hono (Cloudflare Workers) | Shiva API gateway |

---

## Key Innovations

1. **Dual Privacy Research**: Two fundamentally different approaches (FHE vs confidential transfers) under one compliance framework — genuine technical research to find the optimal production path

2. **CRE-Native Finance**: Every financial operation — deposits, withdrawals, transfers, escrow, disputes, yield allocation — is orchestrated by Chainlink CRE workflows with on-chain attestation

3. **Adversarial AI Arbitration**: Not just "AI judges" — a full adversarial system with advocates arguing each side, independent judges with distinct personas, and escalation to a supreme court for close decisions

4. **Yield on Everything**: Whether funds are in Ghost Mode or escrowed in a contract, idle USDC is automatically routed to USYC for treasury yield. Privacy and yield coexist.

5. **Confidential AI Verification**: CRE's confidential HTTP ensures AI verification results are encrypted end-to-end — no one sees the verdict before it's committed on-chain

6. **A2UI Stock Agents**: AI agents that understand stock fundamentals, research companies, and execute purchases through a conversational interface — bridging payroll allocation to stock ownership

---

## How to Explore

```bash
# Browse CRE workflow handlers
ls proof/cre-workflows/

# Read Ghost Mode deposit workflow (6-step CRE pipeline)
cat proof/cre-workflows/workflow-ghost-deposit/handlers.ts

# Read escrow verification workflow (confidential AI)
cat proof/cre-workflows/workflow-escrow-verify/handlers.ts

# See deployed contract addresses
cat proof/deployed-contracts/addresses.ts

# Browse AI arbitration system
ls proof/intelligence/arbitration/

# See stock price providers
ls proof/stocks/src/
```

---

## Collaboration Opportunities

We're actively researching the intersection of privacy, compliance, and DeFi yield. Areas where we'd love to collaborate:

- **FHE teams** (CoFHE, Fhenix, Zama): Production-grade FHERC20 with compliance hooks
- **CCIP integration**: Cross-chain private transfers between Ghost USDC deployments (ETH ↔ ARB)
- **ACE expansion**: Custom compliance rules beyond KYC/KYB (transaction limits, jurisdiction checks)
- **CRE patterns**: Sharing workflow patterns for financial orchestration
- **Stock tokenization**: Plaid token sharing + ACATS API for programmatic stock transfers

---

*Built with Chainlink CRE, ACE, CoFHE/Fhenix, Circle, Hashnote USYC, Robinhood Chain, and a lot of coffee.*
