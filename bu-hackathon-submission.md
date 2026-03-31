# BUFI — Hackathon Submission Tracker

> Synced with live submission. Use this to track what's done and what's still needed.

---

## STATUS: 50/100 — "Need More Details"

---

## COMPLETED FIELDS

### Name
```
AI Financial Workspace Legos + Ghost Privacy
```

### Intro (200 chars)
```
Agentic Financial OS on stablecoin rails. Drag-drop fintech widgets (Brex, Mercury, Ramp, Deel), AI agents for payroll & invoicing, private transfers, legal contracts and yield — all in one workspace.
```

### Sectors
- AI (only 1 selected — can add up to 4)

### Tech Tags (8/8)
React, Next, Web3, Ethers, Node, Python, Solidity, Rust

### Description
Full description submitted (AAF-OS positioning, Ghost Mode, Motora, CRE, architecture, etc.)

### Progress During Hackathon
11 bullet points submitted

### Fundraising Status
```
Bootstrapped. Need money to launch. Waiting for first check to go through BMA (Bermuda Monetary Authority) sandbox.
```

### Team Leader
Tomas Cordero

---

## STILL MISSING — WHAT TO ADD NEXT

### 1. Sectors (0/4 on form, only AI showing)
Add these to get full coverage:
- **DeFi** — multi-chain transfers, yield strategies, USDC/EURC
- **AI** — already selected
- **Infra** — Motora banking engine, MCP server, Chainlink CRE
- **RWA** — stock option 401k's, treasury access to stocks, Hashnote USYC yield

### 2. MVP Link
```
https://spooky-staging.bu.finance
```

### 3. Project Link
```
https://bu.finance
```

### 4. X (Twitter)
```
BuFi_Global
```

### 5. Wallet
Connect the deployer wallet or a team wallet to claim rewards:
```
0x09Ce8E2B3Fede2727dA4392Ea8Fe618305ba0474
```
(Make sure it matches the hackathon's required network)

### 6. Images (0/4) — HIGH PRIORITY
Need 4 images at 500x300 or 1280x720. Suggestions:

1. **Workspace Dashboard** — main app view showing drag-drop widgets + AI panel
2. **Ghost Mode Flow** — the private transfer UX with FHE encryption indicator
3. **Architecture Diagram** — 4-layer privacy stack (yield -> compliance -> private ledger -> FHE)
4. **Motora Banking** — banking aggregation view with multi-provider connections

### 7. Videos — HIGH PRIORITY
- **Demo Video** (required): Screen recording walking through workspace -> AI chat -> transfer -> Ghost Mode -> Chainlink attestation
- **Pitch Video** (optional): 2-min founder pitch — problem, product, moat

### 8. Deployment Details — REQUIRED
```
Ecosystem:        Ethereum
Testnet/Mainnet:  Testnet (Sepolia)
```

**Contract addresses & Etherscan links (Hardened v2 — deployed 2026-03-05/07):**

| Contract | Address | Etherscan |
|----------|---------|-----------|
| BUAttestation | `0xC3C7A1bd7556ba93729f859F0f1D1Cb60aeEc72C` | https://sepolia.etherscan.io/address/0xC3C7A1bd7556ba93729f859F0f1D1Cb60aeEc72C |
| USDCg (Private USDC) | `0x2F28A8378798c5B42FC28f209E903508DD8F878b` | https://sepolia.etherscan.io/address/0x2F28A8378798c5B42FC28f209E903508DD8F878b |
| PolicyEngine (Chainlink ACE) | `0x76b727ed158fe58CaFe4FF5F98D0D98E7244F926` | https://sepolia.etherscan.io/address/0x76b727ed158fe58CaFe4FF5F98D0D98E7244F926 |
| TreasuryManager | `0x33A4a73FD81bB6314AB7dc77301894728E6825A4` | https://sepolia.etherscan.io/address/0x33A4a73FD81bB6314AB7dc77301894728E6825A4 |
| ACE Vault | `0xE588a6c73933BFD66Af9b4A07d48bcE59c0D2d13` | https://sepolia.etherscan.io/address/0xE588a6c73933BFD66Af9b4A07d48bcE59c0D2d13 |
| GhostUSDC (eUSDCg — FHE) | `0xAc547f37E3B20F85E288f7843E979eFCf1a0f235` | https://sepolia.etherscan.io/address/0xAc547f37E3B20F85E288f7843E979eFCf1a0f235 |

**CoFHE TaskManager (Fhenix — Sepolia):** `0xeA30c4B8b44078Bbf8a6ef5b9f1eC1626C7848D9`

### 9. Blog / Team Pages
- Blog: not yet filled
- Team: only leader shown — add team members if applicable

---

## GHOST MODE — TECHNICAL NARRATIVE FOR JUDGES

### The One-Liner

A user clicks "Deposit $100" and their money becomes invisible on-chain — staying compliant, funding platform yield, and cryptographically private — through 4 layers of real deployed infrastructure on Sepolia.

### The Business Model

Users deposit USDC and get 1:1 compliant stablecoins (USDCg) with FHE-encrypted balances. The platform earns yield on reserves via Hashnote USYC (~6.5% APY) — same model as traditional banking, but on-chain and auditable via the TreasuryManager backing invariant. Users get privacy + compliance. The platform gets revenue on deposits.

This is NOT a yield pass-through competing with Aave. The yield accrues to the **platform treasury** (deployer address), not the user. The user's value proposition is privacy + instant compliant transfers.

### What Actually Happens When You Click Deposit

```
Button Click (React)
  -> Server Action (Next.js 'use server')
    -> JWT-authenticated POST to Shiva (Cloudflare Worker)
      -> KYC verification + wallet resolution (Supabase)
        -> 4 sequential Circle DCW transactions:
          1. USDC.approve -> USDCg contract
          2. USDCg.deposit() -> mints compliant stablecoin, platform auto-allocates to USYC
          3. USDCg.approve -> GhostUSDC contract
          4. GhostUSDC.wrap() -> FHE.asEuint64() encrypts on-chain via CoFHE TaskManager
        -> Supabase audit trail persisted
      -> On-chain privacy indicator returned (0-9999, reveals nothing about real balance)
    -> Frontend shows success + encrypted balance indicator
```

7 systems (React -> Next.js -> Cloudflare Worker -> Supabase -> Circle DCW -> Solidity -> CoFHE) executing in one user action.

### The 4 Layers: Each One Is Load-Bearing

| Layer | Contract | What It Does | What Breaks Without It |
|-------|----------|-------------|----------------------|
| **L1: Yield** | TreasuryManager | USDC -> USYC (platform revenue) | No business model. Zero revenue from deposits. |
| **L2: Compliance** | USDCg + PolicyEngine | Chainlink ACE gates every transfer | Sanctioned addresses receive funds. Regulatory prosecution. |
| **L3: Private Ledger** | ACE Vault + DON State | Continuous compliance monitoring | Can't enforce concentration limits or real-time policy. |
| **L4: FHE** | GhostUSDC + CoFHE | Balances encrypted as `euint64` | All amounts visible on-chain. Chain analysis defeats privacy. |

Remove any layer and the product is either illegal, unprofitable, or not private.

### The Server-Side FHE Innovation

Most FHE projects require a browser wallet + client-side SDK to encrypt values. We can't do that — our wallets are Circle Programmable Wallets (server-side custodial, no browser access).

Our solution: the contract encrypts internally.

```solidity
// GhostUSDC.sol — server sends plaintext, contract encrypts
function transferAmount(address to, uint64 amount) external whenNotPaused {
    _requireCompliant(msg.sender, to);
    euint64 encAmount = FHE.asEuint64(amount);  // contract encrypts via CoFHE
    _transfer(msg.sender, to, encAmount);
}
```

The Cloudflare Worker sends `transferAmount(0xRecipient, 100000000)` via Circle DCW. The contract calls `FHE.asEuint64()` to encrypt. No SDK, no iframe, no browser. This means FHE works with ANY wallet infrastructure.

### The Async Decrypt Pipeline (Withdrawals)

Withdrawals are a 3-phase async flow because FHE decryption is not synchronous:

**Phase 1 — Unwrap (instant):**
- `GhostUSDC.unwrap()` burns encrypted tokens
- `FHE.decrypt(burned)` submits async task to CoFHE TaskManager
- `_createClaim(user, ctHash)` stores claim indexed by bytes32 ciphertext hash

**Phase 2 — Decrypt (30-300 seconds):**
- CoFHE TaskManager processes decryption off-chain
- Stores plaintext result on-chain when ready
- `claim.decrypted` flips from false -> true

**Phase 3 — Auto-Claim (client polls every 5s):**
- Frontend polls `/ghost/claims` until `status === 'claimable'`
- Auto-claims: `claimUnwrapped(ctHash)` returns USDCg -> `withdraw()` returns USDC
- User sees loading animation, then success. Zero FHE knowledge required.

### The Numbers

- **6 deployed contracts** on Sepolia (all real, no mocks)
- **68 files** in the FHE integration commit
- **7 systems** in the deposit pipeline
- **4 sequential Circle DCW transactions** per deposit
- **0 SDK dependencies** for FHE — all encryption happens on-chain
- **1 button** for the user — complexity is invisible

### Why It's Not Overengineered

| Component | Remove it? | Result |
|-----------|-----------|--------|
| Circle DCW | Use MetaMask? | Breaks server-side orchestration. Fintech users need custodial wallets. |
| USDCg wrapper | Use raw USDC? | No compliance gate. No yield. Regulators shut you down. |
| PolicyEngine | Skip compliance? | OFAC violations. |
| GhostUSDC FHERC20 | Use cleartext? | Balances visible. Chain analysis defeats privacy. |
| CoFHE TaskManager | Mock FHE? | No real encryption. Just a stablecoin with extra steps. |
| Async claim polling | Sync decrypt? | FHE decryption IS async. Can't change physics. |
| Supabase audit trail | Skip logging? | Compliance audit fails. No transaction history. |

Every component is load-bearing. The architecture isn't layered for elegance — it's layered because yield, compliance, privacy, and encryption are genuinely different problems requiring different cryptographic primitives.

---

## SCORING TIPS TO HIT 100

Based on the "Need More Details" status at 50/100, the biggest point gains come from:

1. **Deployment details** — judges need to verify on-chain work. Fill in the 6 Sepolia contracts above.
2. **Images** — 4 project images are heavily weighted. Empty = major point loss.
3. **Demo video** — "Please Upload Demo Video" is showing. This is likely the single biggest missing piece.
4. **Sectors** — you're at 0/4 visible on the overview despite AI showing on the edit page. Add DeFi + Infra + RWA.
5. **Links** — MVP Link, Project Link, and X handle are easy points.
6. **Wallet** — connect to claim rewards.

---

## QUICK WINS (do these first, 5 minutes)

1. Add 3 more sectors: DeFi, Infra, RWA
2. Paste MVP link: `https://spooky-staging.bu.finance`
3. Paste project link: `https://bu.finance`
4. Paste X handle: `BuFi_Global`
5. Fill deployment details: Ethereum, Testnet, paste the 6 contract addresses + Etherscan links
6. Connect wallet

## MEDIUM EFFORT (30 min)

7. Take 4 screenshots from staging app or artifacts -> upload as images
8. Record a 3-5 min demo video (Loom or screen record)

## NICE TO HAVE

9. 2-min pitch video
10. Blog post
11. Add team members
