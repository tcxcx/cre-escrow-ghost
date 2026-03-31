# Stock Mint: Circle Mint, but for Stocks

## A Mint/Redeem Protocol for Tokenized Stock Issuance on Robinhood Chain

---

## The One-Liner

**Circle Mint, but for stocks.** Fork Circle's xReserve contracts for stock issuance, integrate into ACE Vault with CRE orchestration, automate transfers via Plaid Investments Move. All infrastructure already exists.

---

## The Problem

$100T+ sits in traditional brokerage accounts. These assets are trapped in legacy infrastructure: siloed custody, T+1 settlement, market-hours-only trading, and zero composability with the on-chain economy.

Robinhood Chain exists as a high-performance L2 with 5 tokenized stocks already live (TSLA, AMZN, PLTR, NFLX, AMD). But there's no bridge from the $100T traditional world to the on-chain world.

**The missing piece:** A mint/redeem protocol -- the same model that made USDC a $50B+ asset -- applied to stocks.

---

## Why This Is Buildable Today

Three things that already exist make this possible:

### 1. Circle's xReserve Contracts (Open Source)

Circle published `circlefin/evm-xreserve-contracts` -- a reference implementation for third-party issuers to mint USDC-backed tokens. `USDCx.sol` demonstrates:
- Attester mapping (who can authorize mints)
- Balance tracking (1:1 backing verification)
- Nonce management (prevents duplicate mints)
- Deposit intent pattern (verify custody --> attest --> mint)

**This is literally the pattern we need.** The xReserve attester becomes our CRE workflow. The deposit intent becomes ACATS settlement confirmation. USDC backing becomes custodied shares at Robinhood.

### 2. Plaid Investments Move (ACATS Automation)

Plaid built Investments Move (`investments_auth`) -- a product that automates ACATS data collection. User connects source brokerage via Plaid Link, Plaid returns: account holder name, account number, DTC number, holdings data.

**Robinhood is already an early adopter of Investments Move.** They use it today to pull assets in from other brokerages. The transfer infrastructure exists.

### 3. Our ACE Vault + CRE Infrastructure (Deployed)

We already have a working mint/redeem architecture on Sepolia:
- **ACE Vault** (`0xE588a6c73933BFD66Af9b4A07d48bcE59c0D2d13`) -- Chainlink-managed vault
- **BUAttestation** (`0xC3C7A1bd7556ba93729f859F0f1D1Cb60aeEc72C`) -- CRE-signed attestations with TTL, severity, revocation
- **PolicyEngine** (`0x76b727ed158fe58CaFe4FF5F98D0D98E7244F926`) -- Compliance checks, pausability, rate limiting
- **TreasuryManager** (`0x33A4a73FD81bB6314AB7dc77301894728E6825A4`) -- CRE-triggered rebalancing via ReceiverTemplate
- **USDg** -- 1:1 USDC wrapper with mint/burn (same pattern as tokenized stock)
- **5 CRE workflows deployed** -- attestation, verification, monitoring patterns proven

---

## Architecture: xReserve Fork + ACE + CRE

### The Contract Layer

**Fork xReserve, adapt for stocks, integrate into ACE:**

```
circlefin/evm-xreserve-contracts          Stock Mint (our fork)
================================          ========================

USDCx.sol                         -->     StockToken.sol (per ticker)
  attesterMapping                           creAttesterMapping (CRE workflow addresses)
  depositIntent(nonce, amount)              mintIntent(nonce, ticker, shares, attestationId)
  mint(attester signature)                  mint(CRE attestation -- BUAttestation verified)
  burn(amount)                              redeem(shares) --> RedeemRequest event
  balanceTracking                           backingRatio() view (custodied vs minted)

circlefin/stablecoin-evm                  Stock Mint additions
================================          ========================

FiatToken patterns:                -->     StockVault.sol (master contract)
  masterMinter + minterAllowances           masterMinter = ACE Vault owner
  blacklist(address)                        integrates PolicyEngine (KYC, sanctions)
  pause/unpause                             integrates BUAttestation (TTL-bounded CRE proofs)
  proxy upgrade pattern                     integrates PriceOracle (NAV, collateral health)
```

### Why xReserve, Not From Scratch

| xReserve pattern | Stock Mint mapping | Why it fits |
|------------------|--------------------|-------------|
| Attester = Circle partner | Attester = CRE workflow | CRE signs attestation after Plaid verification |
| Deposit intent = wire confirmation | Deposit intent = ACATS settlement | Same "money arrived, mint the token" pattern |
| USDC backing | Share custody at Robinhood | 1:1 backing, same verification model |
| Nonce management | Nonce management | Prevents duplicate mints from same ACATS transfer |
| Balance tracking | Backing ratio | `totalCustodied >= totalMinted` invariant |
| Transfer logic excluded | Transfer logic excluded | Robinhood Chain handles ERC-20 transfers natively |

### The Full Stack

```
CONTRACT LAYER (xReserve fork + ACE):
  StockVault.sol (master)
    |-- StockToken.sol (per ticker: sTSLA, sAMZN, sPLTR, sNFLX, sAMD)
    |-- BUAttestation (CRE-signed custody proofs)
    |-- PolicyEngine (KYC, rate limits, sanctions, pause)
    |-- PriceOracle (NAV, proof of reserves, collateral ratios)
    |-- ACE Vault integration (Chainlink-managed custody layer)

CRE ORCHESTRATION LAYER:
    |-- stock-mint workflow (verify Plaid --> check PolicyEngine --> write BUAttestation --> mint)
    |-- stock-price-oracle workflow (cron 5m --> Massive API --> PriceOracle contract)
    |-- stock-compliance workflow (cron 6h --> Plaid re-verify --> revoke if mismatch)

PLAID LAYER:
    |-- Investments (read holdings -- compliance oracle)
    |-- Investments Move (ACATS automation -- transfer trigger)

ENRICHMENT LAYER:
    |-- Bu enrichment pipeline (categorization, AI intelligence, monitoring)
    |-- Unified portfolio (brokerage + on-chain holdings merged)
```

---

## How It Works: The Flow

**Step 1: Connect & Verify (Plaid Investments)**
User connects source brokerage (Fidelity, Schwab, TD) via Plaid Link with `investments` product. Read-only holdings verification. "You own 100 TSLA at Fidelity."

**Step 2: Transfer (Plaid Investments Move + ACATS)**
User initiates transfer via Plaid Link with `investments_auth`. Plaid returns ACATS-ready data (account number, DTC code, holder name). Robinhood receives the ACATS transfer via the Investments Move flow they already use. Settlement: 3-6 business days. DTCC handles it. SIPC-insured.

**Step 3: Detect & Attest (CRE `stock-mint` workflow)**
CRE detects ACATS settlement (Plaid Investments shows new holdings at Robinhood). Workflow executes:
1. Verify custody via Plaid Investments API
2. Check PolicyEngine compliance (KYC, sanctions, rate limits)
3. Write BUAttestation on-chain (TTL-bounded proof of custody)
4. Create deposit intent on StockVault (xReserve pattern: nonce + ticker + shares)
5. Call `StockToken.mint()` with attestation ID

**Step 4: Redeem (Burn)**
User calls `StockToken.redeem(shares)`. Token burns. `RedeemRequest` event emitted. CRE verifies the burn. Shares released at Robinhood (or ACATS out to another brokerage).

```
  Source         Plaid            Plaid             Robinhood        CRE            Robinhood
  Brokerage  --> Investments  --> Investments   --> receives     --> stock-mint --> Chain
  (Fidelity)     (verify          Move (ACATS      shares via       workflow       (StockToken
                  holdings)       data: acct#,     ACATS            (attest +       ERC-20
                                  DTC, holder)                      mint)           1:1 backed)

  REDEEM: StockToken.redeem() --> burn --> CRE verifies --> shares released at RH
```

---

## The Circle Mint Parallel

| | Circle Mint (USDC) | Stock Mint (Proposed) |
|---|---|---|
| **Underlying asset** | US Dollars | US Equities |
| **Contract base** | FiatToken (stablecoin-evm) | **Fork of xReserve (evm-xreserve-contracts)** |
| **Custodian** | Circle + banking partners | Robinhood (broker-dealer) |
| **Backing** | 1:1 reserves (T-bills + cash) | 1:1 shares held at Robinhood |
| **Mint flow** | Wire USD to Circle --> receive USDC | ACATS shares to Robinhood --> receive StockToken |
| **Redeem flow** | Burn USDC --> receive USD wire | Burn StockToken --> receive shares at Robinhood |
| **Transfer mechanism** | Bank wire (Fedwire/ACH) | **Plaid Investments Move (automated ACATS)** |
| **Attester** | Circle internal | **Chainlink CRE workflow** |
| **Compliance** | Banking compliance | **PolicyEngine + BUAttestation + Plaid oracle** |
| **Vault integration** | Circle reserves | **ACE Vault (Chainlink-managed)** |
| **Orchestration** | Internal | **Chainlink CRE workflows** |
| **On-chain token** | ERC-20 (multi-chain) | ERC-20 on Robinhood Chain |

---

## Why Only Robinhood Can Do This

1. **Licensed broker-dealer** -- Can legally hold shares in custody. Schwab and Fidelity don't have chains. Coinbase doesn't have a brokerage.

2. **Own the chain** -- Robinhood Chain is their L2. A Robinhood-issued tokenized TSLA is the "real" one, not a synthetic.

3. **Already on Plaid Investments Move** -- ACATS transfer pipeline exists. No new infrastructure.

4. **Trust and brand** -- 23M+ users already trust Robinhood with their stocks.

---

## What We Need From Robinhood: One Thing

The transfer layer already exists via Plaid Investments Move. The verification layer exists via Plaid Investments. The contract layer is forked from Circle's own open-source repos. The orchestration is Chainlink CRE.

**The one thing we need: Robinhood's authorization to use their Plaid Investments Move integration as the transfer trigger for the Stock Mint protocol.**

No new API. No new infrastructure. Robinhood says "yes" and we wire CRE + xReserve on top of what already exists.

```
Already exists:                           We build:
  Plaid Investments (read holdings)         xReserve fork --> StockToken contracts
  Plaid Investments Move (ACATS data)       ACE Vault integration
  Robinhood ACATS intake (live today)       3 CRE workflows (mint, price, compliance)
  Circle xReserve contracts (open source)   Enrichment pipeline + unified portfolio
  ACE Vault (deployed on Sepolia)           Bu portal UI
  BUAttestation + PolicyEngine (deployed)
```

---

## Compliance Architecture

Two oracles, one protocol. Continuous verification.

### Oracle 1: Plaid (Compliance Oracle)

- **Pre-transfer verification** (Plaid Investments) -- Confirm user owns shares before ACATS.
- **Transfer automation** (Plaid Investments Move) -- ACATS-ready data reduces rejection rates.
- **Post-transfer monitoring** (Plaid Investments on RH) -- CRE cron re-verifies custody every 6h. Mismatch revokes attestation.
- **Proof of custody** -- Plaid snapshots create auditable trail.

### Oracle 2: Chainlink CRE (Mint + Price + Compliance)

Three CRE workflows:

- **`stock-mint`** -- Triggered on ACATS settlement. Verifies Plaid custody, checks PolicyEngine, writes BUAttestation, calls `StockToken.mint()`. Uses xReserve deposit intent pattern with nonce to prevent duplicates.
- **`stock-price-oracle`** -- Cron (every 5 min). Fetches real-time stock prices from Massive API, writes to PriceOracle contract. Powers NAV, proof of reserves, collateral health.
- **`stock-compliance`** -- Cron (every 6 hours). Re-verifies via Plaid that backing shares remain at Robinhood. Mismatch triggers BUAttestation revocation + StockVault pause.

### On-Chain Contracts (xReserve Fork + ACE)

```
StockVault.sol (master -- inherits ReceiverTemplate for CRE)
  |-- setMinter(address creWorkflow, uint256 allowance)  -- xReserve masterMinter pattern
  |-- pause/unpause                                       -- emergency circuit breaker
  |
  |-- Integrates: BUAttestation (TTL, severity, revocation)
  |-- Integrates: PolicyEngine (KYC, rate limits, sanctions)
  |-- Integrates: PriceOracle (NAV, collateral ratios)
  |-- Integrates: ACE Vault (Chainlink-managed custody layer)

StockToken.sol (per ticker -- forked from USDCx.sol)
  |-- mintIntent(nonce, ticker, shares, attestationId)    -- xReserve deposit intent
  |-- mint(attestationId)                                  -- requires valid BUAttestation
  |-- redeem(shares)                                       -- burns token, emits RedeemRequest
  |-- backingRatio() view                                  -- custodied vs minted
  |-- creAttesterMapping                                   -- authorized CRE workflow addresses
```

---

## What This Unlocks

### For Institutions
- **Stocks as DeFi collateral** -- Borrow USDC against tokenized TSLA at 3-4% (vs 6-8% brokerage margin). No taxable event.
- **Cross-asset portfolios** -- One wallet: stocks + crypto + stablecoins. Unified collateral.
- **Programmable finance** -- Auto-rebalancing, stop-losses, yield strategies -- all on-chain.

### For Fintechs
- **Wealth management** -- Traditional + tokenized portfolio in one view
- **Lending protocols** -- Accept tokenized stocks as collateral (new DeFi asset class)
- **24/7 trading** -- On-chain settlement, no market hours

### For Robinhood
- **Massive TVL** -- Every minted stock is locked value on Robinhood Chain
- **Revenue** -- Mint/redeem fees (Circle's model), lending protocol revenue share
- **Competitive moat** -- No other broker-dealer has their own chain + their own mint protocol
- **ACATS inflow magnet** -- Users transfer TO Robinhood to tokenize

---

## Market Sizing

| Metric | Value |
|--------|-------|
| US equity market cap | $50T+ |
| Robinhood AUM | $130B+ |
| USDC market cap (Circle Mint model proof) | $52B |
| US margin lending market | $800B+ |
| DeFi TVL (potential new collateral) | $200B+ |

If 1% of Robinhood's AUM tokenizes via Stock Mint: **$1.3B in on-chain stock TVL** on day one.

---

## What We've Already Built

- **ACE Vault** -- Chainlink-managed vault, deployed on Sepolia (`0xE588...`)
- **BUAttestation** -- CRE-signed attestations with TTL, severity, revocation, deployed (`0xC3C7...`)
- **PolicyEngine** -- On-chain compliance, pausability, rate limiting, deployed (`0x76b7...`)
- **TreasuryManager** -- CRE-triggered operations via ReceiverTemplate, deployed (`0x33A4...`)
- **USDg** -- 1:1 USDC wrapper with mint/burn -- same pattern as StockToken (`0x2F28...`)
- **Ghost Mode** -- Proven mint/redeem + FHE privacy (verify --> attest --> mint --> monitor --> redeem)
- **5 CRE workflows** -- Attestation, verification, monitoring patterns proven on Sepolia
- **Plaid integration** -- Live via Motora, syncing financial data today
- **Data enrichment pipeline** -- Categorization, AI intelligence, observation monitors
- **Stock token infrastructure** -- Already reading on-chain balances for 5 RH Chain tokens

---

## Dev Prototype: What We're Building

### Phase 1: Plaid Investments + Enrichment (No external dependency)

1. **Enable Plaid Investments** -- Add `investments` to `products[]` (Sandbox requires primary list). Read-only holdings, positions, cost basis.
2. **Enable Plaid Investments Move** -- Add `investments_auth` to `products[]`. ACATS-ready data: account number, DTC code, holder name.
3. **Robinhood-scoped connection** -- Link Robinhood brokerage via Plaid. Verify custody. Detect settlement.
4. **Enrichment pipeline** -- Holdings through existing pipeline: AI categorization, observation monitors, BUFI tools.
5. **Unified portfolio** -- Merge brokerage (`source: 'brokerage'`) + on-chain (`source: 'onchain'`). "50 TSLA at Robinhood + 10 sTSLA on Robinhood Chain."

### Phase 2: xReserve Fork + ACE Integration (Contract work)

1. **Fork `circlefin/evm-xreserve-contracts`** -- Adapt `USDCx.sol` into `StockToken.sol`. Replace USDC backing with share custody. Replace Circle attester with CRE workflow address.
2. **Build `StockVault.sol`** -- Master contract inheriting ReceiverTemplate (like TreasuryManager). Manages per-ticker StockToken contracts. Integrates BUAttestation + PolicyEngine + PriceOracle.
3. **Add BUAttestation OpTypes** -- `STOCK_CUSTODY_VERIFY` (19), `STOCK_MINT` (20), `STOCK_PRICE_UPDATE` (21) to the existing enum.
4. **Deploy to Sepolia** -- StockVault + StockToken(TSLA) alongside existing ACE Vault infrastructure.

### Phase 3: CRE Workflows (Orchestration)

1. **`stock-mint`** -- HTTP trigger. Plaid verification --> PolicyEngine check --> BUAttestation write --> StockToken.mint(). Uses xReserve deposit intent + nonce pattern.
2. **`stock-price-oracle`** -- Cron (5 min). Massive API --> PriceOracle contract write.
3. **`stock-compliance`** -- Cron (6 hours). Plaid re-verify --> revoke BUAttestation if mismatch --> pause StockVault.

### Phase 4: Hackathon Submission (Arbitrum House, London)

Plaid Sandbox for Investments + Investments Move. ACATS settlement simulated. Everything else live:

- Plaid verification + ACATS data retrieval -- live (Sandbox)
- xReserve-forked StockToken contracts -- live on Sepolia
- ACE Vault integration -- live on Sepolia
- CRE mint workflow -- live (triggered by simulated settlement)
- CRE price oracle -- live (Massive API)
- CRE compliance monitor -- live (Plaid re-verification)
- Redeem flow -- live on Sepolia
- Unified portfolio UI -- live

**With Robinhood's authorization, Sandbox becomes production Plaid Investments Move, Sepolia becomes Robinhood Chain, and the protocol is live.**

---

## Architecture Summary

```
USER FLOW:
  Connect source brokerage    Plaid returns ACATS     Robinhood receives
  via Plaid Link          -->  data (acct#, DTC,  --> shares via ACATS
  (investments +               holder, holdings)      (already uses
   investments_auth)                                   Investments Move)

CONTRACT LAYER (xReserve fork + ACE):
  StockVault.sol (ReceiverTemplate -- CRE-triggered)
    |-- StockToken(TSLA).mint(attestationId)    <-- CRE stock-mint workflow
    |-- StockToken(TSLA).redeem(shares)         --> RedeemRequest event
    |-- BUAttestation.verifyAttestation()        <-- TTL-bounded custody proof
    |-- PolicyEngine.check()                     <-- KYC, sanctions, rate limits
    |-- PriceOracle.getPrice(TSLA)               <-- NAV, collateral ratios

CRE ORCHESTRATION:
  stock-mint (HTTP)       --> Plaid verify --> PolicyEngine --> BUAttestation --> mint
  stock-price-oracle (5m) --> Massive API  --> PriceOracle contract
  stock-compliance (6h)   --> Plaid verify --> revoke attestation if mismatch

REDEEM:
  User burns StockToken --> RedeemRequest --> CRE verifies --> shares at RH
```

---

## Open Source Repos to Fork

| Repo | What we take | What we change |
|------|-------------|----------------|
| `circlefin/evm-xreserve-contracts` | `USDCx.sol` -- attester mapping, deposit intent, mint/burn, nonce management | Attester = CRE workflow. Deposit intent = ACATS settlement. USDC backing = share custody. |
| `circlefin/stablecoin-evm` | `FiatToken` patterns -- masterMinter, minterAllowances, blacklist, pause, proxy upgrades | masterMinter = StockVault owner. Blacklist = PolicyEngine integration. Pause = BUAttestation revocation. |

---

## Next Steps

1. **Get Robinhood's authorization** -- "Let us use Investments Move for Stock Mint"
2. **Fork xReserve contracts** -- Adapt USDCx --> StockToken, build StockVault with ACE integration
3. **Add BUAttestation OpTypes** -- STOCK_CUSTODY_VERIFY, STOCK_MINT, STOCK_PRICE_UPDATE
4. **Build 3 CRE workflows** -- stock-mint, stock-price-oracle, stock-compliance
5. **Hackathon submission (Arbitrum House, London)** -- Full prototype on Sepolia + Plaid Sandbox
6. **Pilot** -- Production Investments Move, deploy to Robinhood Chain, select stocks

---

*Stock Mint by Bu -- Circle Mint for stocks, powered by xReserve + ACE + CRE.*
