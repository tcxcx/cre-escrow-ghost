# BUFI CRE Hackathon Project

Monorepo for a CRE-first escrow + adversarial arbitration system:

- API gateway receives events and forwards to CRE workflows
- CRE workflows orchestrate AI verification, dispute tribunal, and finalization
- Escrow contracts execute deterministic payout decisions on Fuji
- Supabase stores agreement state, milestones, disputes, and artifact metadata
- Frontend shows contract state + artifacts + receipts

## Demo Flow (Hackathon Path)

1. Upload agreement or create from template
2. Create agreement + milestones in DB
3. Sign and fund agreement
4. Submit milestone deliverable
5. CRE verifier returns PASS/FAIL + confidence
6. Client opens dispute
7. CRE runs advocate briefs + tribunal (2/3 majority)
8. CRE finalizes and executes payout split
9. Receipt + artifacts are queryable from API/UI

## Architecture

- `apps/api` - Hono API thin gateway
- `packages/cre/bufi-lifecycle/workflow` - CRE workflow handlers
- `hardhat/contracts/bufi` - Escrow contracts + factory
- `packages/core` - shared schemas, ABI exports, agent helpers
- `apps/contract-builder` - UI connected to API
- `supabase/manual/001_apply_bufi_contracts_tables.sql` - manual SQL setup

## Required Environment Setup

### 1) API env (`apps/api/.dev.vars`)

Copy the template first:

```bash
cp apps/api/.dev.vars.example apps/api/.dev.vars
```

Fill at minimum:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `USDC_CONTRACT_ADDRESS`
- `CRE_WORKFLOW_URL`

Optional for ERC-8004 bootstrap endpoint:

- `ERC8004_PRIVATE_KEY`
- `AVALANCHE_FUJI_RPC_URL`

### 2) Hardhat env (`hardhat/.env`)

Copy:

```bash
cp hardhat/.env.example hardhat/.env
```

Fill:

- `PRIVATE_KEY`
- `AVALANCHE_FUJI_RPC_URL`

### 3) CRE workflow config + secrets

- Use `packages/cre/bufi-lifecycle/workflow/config.staging.example.json` as reference
- Ensure `config.staging.json` has:
  - `escrowFactory`
  - `protocolFeeRecipient`
  - `supabaseUrl`
- Ensure CRE secrets are created (`packages/cre/bufi-lifecycle/secrets.yaml` lists required keys)

If `supabaseUrl is required` appears during smoke tests, it means API or CRE config/secrets are missing Supabase values.

## Local Run (Correct Order)

### Install and verify

```bash
bun install
bun run api:check-types
bunx turbo run build --filter=api --filter=@repo/contract-builder
```

### Apply database schema manually

Run:

- `supabase/manual/001_apply_bufi_contracts_tables.sql`

in Supabase SQL editor.

### Start API

```bash
bun run api:dev
```

### Run smoke test

```bash
bun run bufi:smoke
```

Optional finalize coverage:

```bash
BUFI_SMOKE_ESCROW_ADDRESS=0xYourEscrowAddress bun run bufi:smoke
```

## Deploy Runbook

### Deploy contracts (Fuji)

```bash
cd hardhat
bun run deploy:bufi:fuji
cd ..
```

### Deploy CRE workflow

```bash
bun run bufi:deploy
bun run bufi:activate
```

### Deploy API

```bash
bun run api:deploy
```

### Bootstrap ERC-8004 agents (optional)

Call:

`POST /agents/erc8004/bootstrap`

after API and envs are configured.
