# CRE Workflow Simulation Guide

This guide covers running and debugging the 17 CRE workflow handlers across 15 workflow directories.

## Quick Start

```bash
# Check prerequisites
./simulate-all.sh --check

# List all workflows and their trigger indices
./simulate-all.sh --list

# Run all simulations
./simulate-all.sh all

# Run a specific workflow
./simulate-all.sh ghost-deposit
./simulate-all.sh escrow-monitor    # runs both handlers (log:0 + cron:1)
./simulate-all.sh treasury-rebalance
```

## Prerequisites

| Requirement | Minimum Version | Check |
|---|---|---|
| Bun | >= 1.2.21 | `bun --version` |
| CRE CLI | v1.3.0+ | `cre version` |
| `.deployer-wallet.json` | -- | Root of monorepo |

**Bun version is critical.** Versions below 1.2.21 produce broken WASM that compiles OK but crashes at runtime with an `unreachable` trap.

## Environment Variables

Set these before running simulations. Workflows that don't need secrets (marked "none" in the table below) can run without any env vars.

```bash
# Required for on-chain write workflows
export CRE_ETH_PRIVATE_KEY_VAR="0x..."   # From .deployer-wallet.json

# Required for Supabase-reading workflows
export SUPABASE_SERVICE_KEY_VAR="..."
export SUPABASE_URL_VAR="https://your-project.supabase.co"

# Required for Ghost Mode workflows
export ACE_API_KEY_VAR="..."
export ACE_URL_VAR="https://ace-api.example.com"

# Required for Shiva-calling workflows
export SHIVA_API_URL_VAR="https://shiva.example.com"
export SHIVA_SERVICE_TOKEN_VAR="..."

# Required for yield workflows
export MOTORA_API_URL_VAR="https://motora.example.com"
export MOTORA_API_KEY_VAR="..."
```

### .env.example

Create `apps/cre/.env` (gitignored) with these values, then `source .env` before running.

## Workflow Reference

### Workflows That Can Run Without Real Secrets

These workflows have `secretsNames: {}` and only need on-chain reads + attestation writes:

| Workflow | Trigger | Index | Description |
|---|---|---|---|
| `workflow-example` | cron | 0 | No-op example |
| `workflow-allowlist-sync` | http | 0 | Reads PolicyEngine, publishes attestation |
| `workflow-treasury-rebalance` | cron | 0 | Reads TreasuryManager state, publishes attestation |
| `workflow-worldid-verify` | http | 0 | Publishes WorldID attestation |

### Workflows That Need Supabase Secrets

| Workflow | Trigger | Index | Description |
|---|---|---|---|
| `workflow-invoice-settle` | http | 0 | Reads invoices table, publishes attestation |
| `workflow-payroll-attest` | http | 0 | Reads payrolls table, publishes attestation |
| `workflow-report-verify` | http | 0 | Reads reports table, publishes attestation |
| `workflow-escrow-deploy` | http | 0 | Deploys escrow, writes to cre_callbacks |
| `workflow-escrow-monitor` | log | 0 | Watches factory events, writes to escrow_events |
| `workflow-escrow-monitor` | cron | 1 | Reads escrow_events, publishes PoR attestation |

### Workflows That Need Shiva + Supabase Secrets

| Workflow | Trigger | Index | Description |
|---|---|---|---|
| `workflow-escrow-dispute` | http | 0 | 4-layer AI arbitration pipeline |
| `workflow-escrow-finalize` | http | 0 | On-chain milestone release/refund |
| `workflow-escrow-verify` | http | 0 | AI milestone verification |

### Workflows That Need ACE API Secrets

| Workflow | Trigger | Index | Description |
|---|---|---|---|
| `workflow-ghost-deposit` | http | 0 | Ghost Mode deposit verification |
| `workflow-ghost-transfer` | log | 0 | ConfidentialTransfer monitor |
| `workflow-ghost-transfer` | log | 1 | Standard Transfer monitor |
| `workflow-ghost-withdraw` | http | 0 | Ghost Mode withdrawal verification |
| `workflow-private-transfer` | log | 0 | ACE Vault event monitor |
| `workflow-private-transfer` | http | 1 | Private transfer verifier |
| `workflow-private-transfer` | cron | 2 | USDCg proof-of-reserves |

### Workflows That Need Motora Secrets

| Workflow | Trigger | Index | Description |
|---|---|---|---|
| `workflow-escrow-yield` | http | 0 | Escrow yield deposit/redeem via Deframe |

## Multi-Handler Workflows

Some workflows have multiple handlers (triggers). Each handler has its own trigger index.

### workflow-escrow-monitor (2 handlers)
- **Index 0** -- EVM Log trigger: watches EscrowFactory events
- **Index 1** -- Cron trigger: proof-of-reserves every 6h

### workflow-ghost-transfer (2 handlers)
- **Index 0** -- EVM Log trigger: ConfidentialTransfer events on GhostUSDC
- **Index 1** -- EVM Log trigger: Standard Transfer events on GhostUSDC

### workflow-private-transfer (3 handlers)
- **Index 0** -- EVM Log trigger: Vault Deposit/Withdraw events
- **Index 1** -- HTTP trigger: on-demand transfer verification
- **Index 2** -- Cron trigger: proof-of-reserves every 6h

## Expected Output

### Successful Simulation

A passing simulation will show CRE SDK output with steps like:
```
[cre] Building workflow...
[cre] Compiling WASM...
[cre] Starting simulation...
[cre] Workflow triggered by <trigger_type>
[cre] Step 1: ...
[cre] ...
[cre] Attestation published: tx=0x...
[cre] Simulation complete
```

### Common Failures

#### 1. `unreachable` WASM trap
**Cause:** Bun version below 1.2.21.
**Fix:** `bun upgrade` to >= 1.2.21.

#### 2. `Export 'main' not found` or WASM export error
**Cause:** `export const main = createWorkflow(...)` pattern.
**Fix:** Use `export async function main()` as a function declaration. The CRE SDK's AST analysis only detects `FunctionDeclaration` nodes, not `VariableDeclaration` with arrow functions. See "Known Bugs" below.
**Affected workflows:** escrow-deploy, escrow-dispute, escrow-finalize, escrow-monitor, escrow-verify, example.

#### 3. Secret resolution failure
**Cause:** Required env var not set.
**Fix:** Set the env var listed in the workflow's `secrets.yaml`.

#### 4. `Network not found` error
**Cause:** Invalid chain selector name in config.json.
**Valid selectors:** `ethereum-testnet-sepolia`, `avalanche-testnet-fuji`, `ethereum-testnet-sepolia-base-1`, `ethereum-testnet-sepolia-arbitrum-1`, `polygon-testnet-amoy`.

#### 5. `callContract` returns empty data (`0x`)
**Cause:** Using `LAST_FINALIZED_BLOCK_NUMBER` instead of `LATEST_BLOCK_NUMBER`. Free Sepolia RPCs lag on the `"finalized"` block tag.
**Fix:** Use `LATEST_BLOCK_NUMBER` for contract reads on testnets.

#### 6. Zod `.url()` rejection in WASM
**Cause:** WASM environment may reject valid URLs with Zod `.url()`.
**Fix:** Use `.min(1)` for URL config fields.

## Known Bugs (Found During Audit)

### BUG-1: `export const main = createWorkflow(...)` (6 workflows)

**Severity:** Critical -- workflows will not compile to WASM.

The CLAUDE.md states: *"Javy WIT world expects `export async function main()` as a function declaration. `export const main = createWorkflow(...)` does NOT work -- the SDK's AST analysis only detects `FunctionDeclaration` nodes."*

**Affected files:**
- `workflow-escrow-deploy/main.ts`
- `workflow-escrow-dispute/main.ts`
- `workflow-escrow-finalize/main.ts`
- `workflow-escrow-monitor/main.ts`
- `workflow-escrow-verify/main.ts`
- `workflow-example/main.ts`

**Fix:** Replace:
```ts
export const main = createWorkflow({ configSchema, init: initWorkflow })
```
With:
```ts
export async function main() {
  const runner = await Runner.newRunner<Config>({ configSchema })
  await runner.run(initWorkflow)
}
```

### BUG-2: `workflow-example` references `../secrets.yaml` (shared)

The `workflow-example/workflow.yaml` has `secrets-path: "../secrets.yaml"` which references the shared secrets file. Per CLAUDE.md: *"Each workflow should have its OWN secrets.yaml -- the CRE CLI validates ALL secrets at startup."* If the shared `secrets.yaml` references secrets that are not set, the example workflow will fail.

### BUG-3: Missing `package.json` in 4 workflows

CRE may need `package.json` for dependency resolution during WASM compilation. These directories are missing it:
- `workflow-escrow-deploy`
- `workflow-ghost-deposit`
- `workflow-ghost-transfer`
- `workflow-ghost-withdraw`

**Fix:** Copy a `package.json` from a sibling workflow (e.g., `workflow-escrow-dispute/package.json`) and adjust the name field.

### BUG-4: `workflow-escrow-yield` -- `yieldValue` used as bigint without cast

In `handlers.ts`, the result of `callView(runtime, ..., "getYieldValueUSDC")` is used with `formatUnits(yieldValue, 6)`. The `callView` generic return type may not always resolve to `bigint` -- depends on the ABI definition. This is likely fine in practice but could cause a type error.

## Logs

All simulation output is saved to `apps/cre/simulation-logs/` with filenames:
```
YYYYMMDD-HHMMSS_workflow-name_trigger_index.log
```

The `simulation-logs/` directory is created automatically and should be gitignored.

## For the Hackathon Video Demo

The recommended demo sequence for maximum impact:

1. **Start with `--check`** to show prerequisites are met
2. **Run `workflow-example`** to show the basic CRE flow (fastest)
3. **Run `workflow-treasury-rebalance`** to show real on-chain reads (no secrets needed)
4. **Run `workflow-worldid-verify`** to show WorldID attestation
5. **Run `workflow-ghost-deposit`** to show the full Ghost Mode pipeline
6. **Run `all`** to show the full suite passing

For the video, run with secrets pre-configured and use `script` or `asciinema` to record terminal output.
