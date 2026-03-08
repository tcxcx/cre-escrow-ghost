# Ghost Mode — Smart Contracts & Deployment

> Private transfer pipeline contracts for the Bu Finance Ghost Mode system.

## Architecture

```
User USDC
  |
  v
PolicyEngine.check()     <-- Compliance gate (AllowList, VolumeRate, Pause)
  |
  v
ACE Vault.deposit()      <-- Chainlink private balance custody
  |
  v
USDg.mint()              <-- 1:1 receipt token (6 decimals)
  |
  v
USYC Teller.deposit()    <-- Hashnote yield subscription (treasury)
  |
  v
BUAttestation.onReport() <-- CRE on-chain attestation
```

## Contracts

| Contract | Description | Sepolia |
|----------|-------------|---------|
| **BUAttestation** | CRE attestation receiver. Stores immutable records indexed by `(opType, entityId, timestamp)`. 11 operation types. | `0x4874e8a2851ad15d6fd653a479ffc4e8efe3df74` |
| **USDg** | ghostUSD. ERC20 + Permit + Burnable. 6 decimals. Owner-only mint, anyone burn. | `0x22acbfc05dda353982af67986dc076224aee2a34` |

### External (pre-deployed)

| Contract | Address (Sepolia) | Notes |
|----------|-------------------|-------|
| ACE Vault | `0xE588a6c73933BFD66Af9b4A07d48bcE59c0D2d13` | Chainlink private balance |
| PolicyEngine | `0x6813e8e8420b893a7551a4b354fcb85dbe69da6e` | ERC1967Proxy, defaultAllow=true |
| USDC | `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238` | Circle testnet USDC |
| USYC | `0x38D3A3f8717F4DB1CcB4Ad7D8C755919440848A3` | Hashnote yield token |
| USYC Teller | `0x96424C885951ceb4B79fecb934eD857999e6f82B` | Subscribe/redeem USDC<>USYC |
| USYC Oracle | `0x35b96d80C72f873bACc44A1fACfb1f5fac064f1a` | USYC/USDC price oracle |

## Quick Start

### Prerequisites

- [Foundry](https://book.getfoundry.sh) (`forge`, `cast`)
- `jq` (`brew install jq`)
- Sepolia ETH in deployer wallet (0.01+ ETH)

### 1. Configure

```bash
cp .env.example .env
# Edit .env with your PRIVATE_KEY and other values
```

### 2. Deploy Everything

```bash
# Full pipeline (contracts + vault registration + USYC approval + treasury wallet)
./scripts/deploy-pipeline.sh

# Dry run first (simulate, no transactions)
./scripts/deploy-pipeline.sh --dry-run

# Just contracts (skip Circle/Shiva)
./scripts/deploy-pipeline.sh --contracts-only

# Just Circle/Shiva (skip contracts)
./scripts/deploy-pipeline.sh --skip-contracts
```

### 3. Output

The script writes `.env.deployed` with all addresses. Copy the relevant vars to:
- `apps/shiva/.dev.vars`
- `apps/app/.env.local`
- `packages/trigger/.env.local`

## Foundry Scripts

### DeployAll (recommended)

Deploys BUAttestation + USDg + PolicyEngine proxy + registers on Vault.
Optionally seeds liquidity (USDC escrowed 1:1 before any USDg mint).

```bash
# Deploy contracts only (no liquidity)
forge script script/DeployAll.s.sol:DeployAll \
  --rpc-url $RPC_URL --broadcast --private-key $PRIVATE_KEY

# Deploy + seed 20 USDC of backed liquidity
INITIAL_DEPOSIT=20 forge script script/DeployAll.s.sol:DeployAll \
  --rpc-url $RPC_URL --broadcast --private-key $PRIVATE_KEY
```

Env vars: `PRIVATE_KEY`, `INITIAL_DEPOSIT` (optional, default 0, min 1 if set)

**INVARIANT:** USDg is NEVER minted without 1:1 USDC backing.
USDC is escrowed into the USDg contract address before minting.
Verifiable on-chain: `USDC.balanceOf(USDg) >= USDg.totalSupply()`

### Individual Scripts

```bash
# BUAttestation only
forge script script/DeployAll.s.sol:DeployBUAttestation \
  --rpc-url $RPC_URL --broadcast --private-key $PRIVATE_KEY

# USDg only
forge script script/DeployAll.s.sol:DeployUSDg \
  --rpc-url $RPC_URL --broadcast --private-key $PRIVATE_KEY

# PolicyEngine proxy only
forge script script/DeployAll.s.sol:DeployPolicyEngine \
  --rpc-url $RPC_URL --broadcast --private-key $PRIVATE_KEY

# Register existing token + PolicyEngine on Vault
TOKEN_ADDRESS=0x... POLICY_ENGINE_ADDRESS=0x... \
forge script script/DeployAll.s.sol:RegisterVault \
  --rpc-url $RPC_URL --broadcast --private-key $PRIVATE_KEY

# Seed liquidity on existing deployment (escrow USDC + mint backed USDg)
USDG_ADDRESS=0x... DEPOSIT_AMOUNT=100 \
forge script script/DeployAll.s.sol:SeedLiquidity \
  --rpc-url $RPC_URL --broadcast --private-key $PRIVATE_KEY
```

## Redeploying (Iteration)

The pipeline is designed for iteration. When you rewrite a contract:

1. Edit the `.sol` source in `src/`
2. Run `forge build` to verify compilation
3. Run `./scripts/deploy-pipeline.sh` to redeploy everything fresh
4. New addresses are written to `.env.deployed`, overwriting the previous deployment
5. Update your app env files with the new addresses

Each deployment is independent — no upgrade proxies, no state migration.
Just deploy fresh and update the config.

### Common iteration scenarios

| Scenario | Command |
|----------|---------|
| Rewrote BUAttestation.sol | `./scripts/deploy-pipeline.sh` |
| Rewrote USDg.sol | `./scripts/deploy-pipeline.sh` |
| Changed PolicyEngine config | Deploy new PE, update `POLICY_ENGINE_ADDRESS`, then `./scripts/deploy-pipeline.sh` |
| New treasury wallet needed | `./scripts/deploy-pipeline.sh --skip-contracts` |
| Verify existing contracts | `cast call <addr> "attestationCount()(uint256)" --rpc-url $RPC_URL` |

## Pipeline Overview

```
deploy-pipeline.sh
  |
  +-- Phase 1: forge script DeployAll.s.sol
  |     +-- BUAttestation.sol  (new)
  |     +-- USDg.sol           (new)
  |     +-- Vault.register(USDg, PolicyEngine)
  |     +-- USDg.approve(Vault, MAX)
  |     +-- (if INITIAL_DEPOSIT > 0):
  |         +-- USDC.transfer(USDg, INITIAL_DEPOSIT)  [escrow first]
  |         +-- USDg.mint(deployer, INITIAL_DEPOSIT)   [then mint 1:1]
  |
  +-- Phase 2: forge verify-contract (Sourcify)
  |
  +-- Phase 3: On-chain config
  |     +-- USDC.approve(USYC_Teller, MAX)
  |
  +-- Phase 4: Circle DCW treasury wallet
  |     +-- POST /wallets via Shiva API
  |
  +-- Phase 5: Write .env.deployed
```

## WIP / Roadmap

- [x] BUAttestation.sol — CRE attestation receiver (deployed)
- [x] USDg.sol — receipt token (deployed)
- [x] DeployAll.s.sol — all-in-one Foundry script
- [x] deploy-pipeline.sh — bash orchestrator
- [x] Vault registration
- [x] USYC Teller approval
- [ ] PolicyEngine AllowList management script
- [ ] USDg ownership transfer (deployer -> treasury)
- [ ] Mainnet deployment configuration
- [ ] Etherscan verification (need API key)
- [ ] CRE treasury rebalance workflow deployment
- [ ] Cross-chain CCTP bridge configuration
- [ ] Automated smoke tests post-deploy

## Development

```bash
# Build
forge build

# Test
forge test

# Format
forge fmt

# Gas report
forge test --gas-report
```
