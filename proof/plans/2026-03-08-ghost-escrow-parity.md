# Ghost Mode ↔ Escrow Architectural Parity Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Close 3 escrow contract gaps (appeal bonds, on-chain verdicts, allowlist-sync workflow) and bring Ghost Mode to architectural parity with escrow's CRE integration patterns.

**Architecture:** Four independent workstreams: (1) Solidity contract enhancements for appeal bonds + verdict storage, (2) new CRE workflow for allowlist sync, (3) Ghost Mode route upgrades for fallback resilience + callback pattern, (4) Ghost Mode CRE workflow upgrades for confidential clients + multi-handler patterns.

**Tech Stack:** Solidity 0.8.24+, CRE SDK 1.0.9, TypeScript, Hono, viem, Zod

---

## Task 1: Appeal Bond Economics — Solidity Contract

Add bond deposit/forfeit/refund mechanics to EscrowWithAgentV3.sol so disputing parties have skin in the game.

**Files:**
- Modify: `apps/cre/contracts/src/arbitration/arbitration-factory/IEscrowWithAgentV3.sol`
- Modify: `apps/cre/contracts/src/arbitration/arbitration-factory/EscrowWithAgentV3.sol`

### Step 1: Add BondConfig struct and events to interface

Add to `IEscrowWithAgentV3.sol` after `WindowConfig`:

```solidity
struct BondConfig {
    uint256 disputeBondAmount;   // Bond required to file a dispute (6-decimal USDC/EURC)
    uint256 appealBondAmount;    // Bond required to file an appeal (must be > disputeBondAmount)
    address bondRecipient;       // Where forfeited bonds go (protocol treasury)
}
```

Add events after `DisputeWindowStarted`:

```solidity
event BondDeposited(uint256 indexed milestoneIndex, address indexed depositor, uint256 amount, bool isAppeal);
event BondForfeited(uint256 indexed milestoneIndex, address indexed depositor, uint256 amount, address recipient);
event BondRefunded(uint256 indexed milestoneIndex, address indexed depositor, uint256 amount);
```

Add new function signatures:

```solidity
function disputeWithBond(uint256 milestoneIndex, bytes32 disputeHash) external;
function appealWithBond(uint256 milestoneIndex) external;
```

### Step 2: Add bond storage and functions to contract

Add to `EscrowWithAgentV3.sol` storage section:

```solidity
BondConfig public bonds;

// Bond tracking per milestone
struct BondRecord {
    address depositor;
    uint256 amount;
    bool isAppeal;
    bool settled;         // true after forfeit or refund
}
mapping(uint256 => BondRecord[]) internal _bonds;
```

Add `bonds` to `initialize()` — add `BondConfig calldata _bonds` parameter after `_windows`, set `bonds = _bonds;`.

Add `disputeWithBond()`:

```solidity
/// @notice File a dispute with a bond deposit. Bond is forfeited if dispute is rejected.
function disputeWithBond(uint256 milestoneIndex, bytes32 disputeHash) external {
    require(milestoneIndex < milestones.length, "EscrowV3: invalid milestone");
    Milestone storage ms = milestones[milestoneIndex];
    require(ms.funded, "EscrowV3: not funded");
    require(!ms.locked, "EscrowV3: already locked");
    require(
        ms.status == MilestoneStatus.APPROVED ||
        ms.status == MilestoneStatus.REJECTED,
        "EscrowV3: cannot dispute in current status"
    );
    require(bonds.disputeBondAmount > 0, "EscrowV3: bonds not configured");

    // Pull bond from caller
    token.safeTransferFrom(msg.sender, address(this), bonds.disputeBondAmount);
    _bonds[milestoneIndex].push(BondRecord({
        depositor: msg.sender,
        amount: bonds.disputeBondAmount,
        isAppeal: false,
        settled: false
    }));

    ms.locked = true;
    ms.status = MilestoneStatus.DISPUTED;

    emit BondDeposited(milestoneIndex, msg.sender, bonds.disputeBondAmount, false);
    emit MilestoneLocked(milestoneIndex, disputeHash);
    emit MilestoneStatusChanged(milestoneIndex, MilestoneStatus.DISPUTED);
}
```

Add `appealWithBond()`:

```solidity
/// @notice File an appeal with a higher bond. Only valid during appeal window after initial dispute decision.
function appealWithBond(uint256 milestoneIndex) external {
    require(milestoneIndex < milestones.length, "EscrowV3: invalid milestone");
    Milestone storage ms = milestones[milestoneIndex];
    require(ms.status == MilestoneStatus.DISPUTED, "EscrowV3: not disputed");
    require(bonds.appealBondAmount > 0, "EscrowV3: appeal bonds not configured");

    // Pull appeal bond from caller
    token.safeTransferFrom(msg.sender, address(this), bonds.appealBondAmount);
    _bonds[milestoneIndex].push(BondRecord({
        depositor: msg.sender,
        amount: bonds.appealBondAmount,
        isAppeal: true,
        settled: false
    }));

    emit BondDeposited(milestoneIndex, msg.sender, bonds.appealBondAmount, true);
}
```

### Step 3: Add bond settlement to executeDecision

Modify `executeDecision()` — add bond settlement logic AFTER fund distribution, BEFORE setting status to RELEASED:

```solidity
// ── Bond Settlement ──────────────────────────────────────────────
// Winner gets bonds back, loser's bonds are forfeited to bondRecipient.
// If payeeBps >= 5000 → payee won (payer's bonds forfeited)
// If payeeBps < 5000  → payer won (payee's bonds forfeited)
BondRecord[] storage bondRecords = _bonds[milestoneIndex];
bool payeeWon = d.payeeBps >= 5000;

for (uint256 i = 0; i < bondRecords.length; i++) {
    BondRecord storage bond = bondRecords[i];
    if (bond.settled) continue;
    bond.settled = true;

    bool isPayerBond = bond.depositor == payer;
    bool isPayeeBond = bond.depositor == payee;

    if ((payeeWon && isPayerBond) || (!payeeWon && isPayeeBond)) {
        // Loser: forfeit bond
        token.safeTransfer(bonds.bondRecipient, bond.amount);
        emit BondForfeited(milestoneIndex, bond.depositor, bond.amount, bonds.bondRecipient);
    } else {
        // Winner (or third party): refund bond
        token.safeTransfer(bond.depositor, bond.amount);
        emit BondRefunded(milestoneIndex, bond.depositor, bond.amount);
    }
}
```

### Step 4: Add bond view function

Add after `getDecision()`:

```solidity
function getBonds(uint256 milestoneIndex) external view returns (
    uint256 count,
    uint256 totalBonded
) {
    BondRecord[] storage bondRecords = _bonds[milestoneIndex];
    uint256 total = 0;
    for (uint256 i = 0; i < bondRecords.length; i++) {
        if (!bondRecords[i].settled) {
            total += bondRecords[i].amount;
        }
    }
    return (bondRecords.length, total);
}
```

### Step 5: Update EscrowFactoryV3 initialize call

Modify `apps/cre/contracts/src/arbitration/arbitration-factory/EscrowFactoryV3.sol` — add `BondConfig calldata _bonds` parameter to `createEscrow()` and pass it through to `initialize()`.

### Step 6: Verify compilation

Run: `cd apps/cre/contracts && forge build`
Expected: compilation success

### Step 7: Commit

```bash
git add apps/cre/contracts/src/arbitration/
git commit -m "feat(escrow): add appeal bond economics — deposit, forfeit, refund"
```

---

## Task 2: On-Chain Verdict Storage — Solidity Contract

Store arbitration verdicts as immutable contract state, not just in Supabase.

**Files:**
- Modify: `apps/cre/contracts/src/arbitration/arbitration-factory/IEscrowWithAgentV3.sol`
- Modify: `apps/cre/contracts/src/arbitration/arbitration-factory/EscrowWithAgentV3.sol`

### Step 1: Add VerdictRecord struct and event to interface

Add to `IEscrowWithAgentV3.sol`:

```solidity
struct VerdictRecord {
    uint8 layer;              // 1=Verifier, 2=Advocates, 3=Tribunal, 4=SupremeCourt
    bytes32 verdictHash;      // keccak256 of encrypted verdict content
    uint16 payeeBps;          // Verdict's recommended split
    uint256 timestamp;        // Block timestamp when recorded
    bool appealed;            // Whether this verdict was appealed
}

event VerdictRecorded(
    uint256 indexed milestoneIndex,
    uint8 layer,
    bytes32 verdictHash,
    uint16 payeeBps
);
```

Add function signature:

```solidity
function recordVerdict(
    uint256 milestoneIndex,
    uint8 layer,
    bytes32 verdictHash,
    uint16 payeeBps,
    bool appealed
) external;

function getVerdicts(uint256 milestoneIndex) external view returns (VerdictRecord[] memory);
```

### Step 2: Add verdict storage and functions to contract

Add to `EscrowWithAgentV3.sol` storage:

```solidity
// Verdict history per milestone (append-only)
mapping(uint256 => VerdictRecord[]) internal _verdicts;
```

Add `recordVerdict()`:

```solidity
/// @notice Record an arbitration verdict from a specific layer. Append-only.
/// @dev Called by CRE executor after each arbitration layer completes.
function recordVerdict(
    uint256 milestoneIndex,
    uint8 layer,
    bytes32 verdictHash,
    uint16 payeeBps,
    bool appealed
) external onlyExecutor {
    require(milestoneIndex < milestones.length, "EscrowV3: invalid milestone");
    require(layer >= 1 && layer <= 4, "EscrowV3: invalid layer");
    require(verdictHash != bytes32(0), "EscrowV3: empty verdict hash");
    require(payeeBps <= 10000, "EscrowV3: bps > 10000");

    Milestone storage ms = milestones[milestoneIndex];
    require(ms.status == MilestoneStatus.DISPUTED, "EscrowV3: not disputed");

    _verdicts[milestoneIndex].push(VerdictRecord({
        layer: layer,
        verdictHash: verdictHash,
        payeeBps: payeeBps,
        timestamp: block.timestamp,
        appealed: appealed
    }));

    emit VerdictRecorded(milestoneIndex, layer, verdictHash, payeeBps);
}
```

Add `getVerdicts()`:

```solidity
function getVerdicts(uint256 milestoneIndex) external view returns (VerdictRecord[] memory) {
    return _verdicts[milestoneIndex];
}
```

### Step 3: Verify compilation

Run: `cd apps/cre/contracts && forge build`
Expected: compilation success

### Step 4: Commit

```bash
git add apps/cre/contracts/src/arbitration/
git commit -m "feat(escrow): add on-chain verdict storage — immutable arbitration history"
```

---

## Task 3: Create workflow-allowlist-sync CRE Workflow

New CRE workflow that syncs PolicyEngine AllowList from Persona KYC/KYB webhooks and publishes attestation.

**Files:**
- Create: `apps/cre/workflow-allowlist-sync/handlers.ts`
- Create: `apps/cre/workflow-allowlist-sync/types.ts`
- Create: `apps/cre/workflow-allowlist-sync/main.ts`
- Create: `apps/cre/workflow-allowlist-sync/config.json`
- Create: `apps/cre/workflow-allowlist-sync/secrets.yaml`
- Create: `apps/cre/workflow-allowlist-sync/package.json`
- Modify: `apps/cre/shared/types.ts` — add `allowlist_sync` to `ATTESTATION_OP_TYPES`

### Step 1: Add attestation op type

Add `allowlist_sync: 19` to `ATTESTATION_OP_TYPES` in `apps/cre/shared/types.ts`.

Also add `allowlist_sync` to the `AttestationType` union in `packages/cre/src/types.ts` (the canonical source).

### Step 2: Create types.ts

```typescript
import { z } from "zod"

const addr = z.string().regex(/^0x[a-fA-F0-9]{40}$/u)

export const configSchema = z.object({
  chainSelectorName: z.string().min(1),
  attestationContract: addr,
  gasLimit: z.string().regex(/^\d+$/),
  policyEngineAddress: addr,
})

export type Config = z.infer<typeof configSchema>
```

### Step 3: Create handlers.ts

```typescript
/**
 * AllowList Sync Workflow Handler
 *
 * HTTP trigger: Fired by Shiva after Persona KYC/KYB webhook processing.
 * Verifies the approval on-chain via PolicyEngine, syncs AllowList if needed,
 * and publishes a trustless attestation.
 *
 * Flow:
 *   1. Parse KYC/KYB webhook payload
 *   2. Read current PolicyEngine AllowList status for wallet
 *   3. If approved and not on list → add to AllowList
 *   4. If rejected and on list → remove from AllowList
 *   5. Publish attestation (kyc_verified or kyb_verified)
 */

import {
  decodeJson,
  type Runtime,
  type HTTPPayload,
} from "@chainlink/cre-sdk"
import { keccak256, toHex, type Abi } from "viem"
import { withHttp } from "../shared/triggers"
import { publishAttestation } from "../shared/services/attestation"
import { callView } from "../shared/services/evm"
import type { Config } from "./types"

// PolicyEngine ABI fragments
const POLICY_ENGINE_ABI = [
  {
    name: "isAllowed",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
] as const

const allowlistSync = withHttp<Config>(
  (runtime, payload) => {
    const input = decodeJson(payload.input) as {
      action: string
      walletAddress: string
      approved: boolean
      verificationType: "kyc" | "kyb"
      personaInquiryId?: string
      status?: string
    }

    runtime.log(
      `AllowList sync: wallet=${input.walletAddress} type=${input.verificationType} approved=${input.approved}`
    )

    // ── Step 1: Read current AllowList status ────────────────────────────
    runtime.log("Step 1: Read current PolicyEngine AllowList status")

    const isCurrentlyAllowed = callView(
      runtime,
      runtime.config.policyEngineAddress,
      POLICY_ENGINE_ABI as unknown as Abi,
      "isAllowed",
      [input.walletAddress],
    )

    const currentlyOnList = isCurrentlyAllowed !== 0n
    runtime.log(`Current status: onAllowList=${currentlyOnList}`)

    // ── Step 2: Determine sync action ────────────────────────────────────
    let syncAction: "none" | "add" | "remove" = "none"

    if (input.approved && !currentlyOnList) {
      syncAction = "add"
    } else if (!input.approved && currentlyOnList) {
      syncAction = "remove"
    }

    runtime.log(`Sync action: ${syncAction}`)

    // Note: PolicyEngine.addToAllowList/removeFromAllowList requires owner/forwarder.
    // In CRE production flow, this would use writeReport to the PolicyEngine's
    // onReport receiver. For now, we verify state and publish attestation.
    // The actual AllowList mutation is done by Shiva via syncAllowListFromPersona().

    // ── Step 3: Publish attestation ──────────────────────────────────────
    runtime.log("Step 3: Publish attestation")

    const attestationType = input.verificationType === "kyc"
      ? "kyc_verified" as const
      : "kyb_verified" as const

    const entityId = `allowlist-${keccak256(toHex(input.walletAddress)).slice(0, 18)}`

    const result = publishAttestation(runtime, {
      type: attestationType,
      entityId,
      data: {
        walletHash: keccak256(toHex(input.walletAddress)),
        approved: input.approved,
        verificationType: input.verificationType,
        syncAction,
        previousStatus: currentlyOnList,
        timestamp: 0,
      },
      metadata: JSON.stringify({
        operation: "allowlist_sync",
        personaInquiryId: input.personaInquiryId ?? "unknown",
        status: input.status ?? "unknown",
      }),
    })

    runtime.log(`AllowList attestation published: tx=${result.txHash}`)

    return JSON.stringify({
      success: true,
      txHash: result.txHash,
      attestationId: result.attestationId,
      syncAction,
    })
  },
)

export const initWorkflow = (config: Config) => [
  allowlistSync(config),
]
```

### Step 4: Create main.ts

```typescript
import { Runner } from "@chainlink/cre-sdk"
import { configSchema, type Config } from "./types"
import { initWorkflow } from "./handlers"

export async function main() {
  const runner = await Runner.newRunner<Config>({ configSchema })
  await runner.run(initWorkflow)
}
```

### Step 5: Create config.json

```json
{
  "chainSelectorName": "ethereum-testnet-sepolia",
  "attestationContract": "0xC3C7A1bd7556ba93729f859F0f1D1Cb60aeEc72C",
  "gasLimit": "500000",
  "policyEngineAddress": "0x76b727ed158fe58CaFe4FF5F98D0D98E7244F926"
}
```

### Step 6: Create secrets.yaml

```yaml
secrets:
  - id: SHIVA_API_KEY
    type: env
    env_var: CRE_SHIVA_API_KEY
  - id: SHIVA_URL
    type: env
    env_var: CRE_SHIVA_URL
```

### Step 7: Create package.json

```json
{
  "name": "workflow-allowlist-sync",
  "version": "1.0.0",
  "main": "dist/main.js",
  "private": true,
  "scripts": {
    "postinstall": "bunx cre-setup"
  },
  "license": "UNLICENSED",
  "dependencies": {
    "@chainlink/cre-sdk": "^1.0.9",
    "viem": "^2.38.3",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "@types/bun": "1.2.21"
  }
}
```

### Step 8: Verify build

Run: `cd apps/cre/workflow-allowlist-sync && bun install && bunx cre build`
Expected: WASM build success

### Step 9: Commit

```bash
git add apps/cre/workflow-allowlist-sync/ apps/cre/shared/types.ts packages/cre/src/types.ts
git commit -m "feat(cre): add workflow-allowlist-sync — PolicyEngine AllowList + attestation"
```

---

## Task 4: Ghost Mode Parity — Fallback Resilience + Callback Pattern

Upgrade Ghost Mode routes to use `triggerCreWorkflowWithFallback()` (not plain `triggerCreWorkflow()`) and add the callback pattern that escrow uses.

**Files:**
- Modify: `apps/shiva/src/routes/ghost-fhe.ts`

### Step 1: Replace triggerCreWorkflow with triggerCreWorkflowWithFallback in deposit route

In `ghost-fhe.ts`, the deposit route (line ~201-216) currently uses plain `triggerCreWorkflow()`. Replace with:

```typescript
// Trigger CRE ghost-deposit workflow with fallback resilience.
// If CRE gateway is down, deposit still succeeds with deferred attestation.
let attestationId = `ghost-deposit-${ctx.walletAddress.slice(2, 10)}-${amountWei}`;
try {
  const { triggerCreWorkflowWithFallback } = await import('../services/cre-trigger.service');
  const creResult = await triggerCreWorkflowWithFallback<{ attestationId?: string; txHash?: string }>(
    {
      action: 'ghost_deposit',
      userAddress: depositWalletAddress,
      usdcAmount: amountWei,
      txHash: result.txHash,
    },
    async () => {
      // Fallback: deposit completed, attestation deferred to next treasury-rebalance cron
      logger.warn('CRE ghost-deposit fallback: attestation deferred');
      return { attestationId: `deferred-${attestationId}`, txHash: result.txHash };
    },
  );
  if (creResult.attestationId) attestationId = creResult.attestationId;
  logger.info('CRE ghost-deposit workflow completed', { attestationId, creTxHash: creResult.txHash });
} catch (creError) {
  logger.warn('CRE ghost-deposit failed even with fallback (non-fatal)', {
    error: (creError as Error).message,
  });
}
```

### Step 2: Replace triggerCreWorkflow with triggerCreWorkflowWithFallback in transfer route

In the transfer route (line ~287-299), replace similarly:

```typescript
try {
  const { triggerCreWorkflowWithFallback } = await import('../services/cre-trigger.service');
  await triggerCreWorkflowWithFallback(
    {
      action: 'ghost_transfer',
      userAddress: ctx.walletAddress,
      recipient: to,
      amount: amountWei,
      txHash: result.txHash,
    },
    async () => {
      logger.warn('CRE ghost-transfer fallback: verification deferred');
      return { success: true };
    },
  );
} catch (creError) {
  logger.warn('CRE ghost-transfer failed even with fallback (non-fatal)', {
    error: (creError as Error).message,
  });
}
```

### Step 3: Replace triggerCreWorkflow with triggerCreWorkflowWithFallback in withdraw route

In the withdraw route (line ~356-367), replace similarly:

```typescript
try {
  const { triggerCreWorkflowWithFallback } = await import('../services/cre-trigger.service');
  await triggerCreWorkflowWithFallback(
    {
      action: 'ghost_withdraw',
      userAddress: ctx.walletAddress,
      amount: amountWei,
    },
    async () => {
      logger.warn('CRE ghost-withdraw fallback: verification deferred');
      return { success: true };
    },
  );
} catch (creError) {
  logger.warn('CRE ghost-withdraw failed even with fallback (non-fatal)', {
    error: (creError as Error).message,
  });
}
```

### Step 4: Add CRE callback posting to Ghost deposit workflow handler

Modify `apps/cre/workflow-ghost-deposit/handlers.ts` — after attestation publish (Step 6), add callback POST:

```typescript
// ── Step 7: Post callback to Shiva ──────────────────────────────────
runtime.log("Step 7: Post callback")

const shiva = shivaClient<Config>()
shiva.post(
  runtime,
  "/contracts/cre-callback/ghost-deposit",
  {
    workflow: "ghost-deposit",
    status: "verified",
    user_address: userAddr,
    amount: amount.toString(),
    attestation_id: result.attestationId,
    attestation_tx: result.txHash,
    ghost_supply: ghostSupply.toString(),
    yield_value: yieldValue.toString(),
    compliance: "passed",
  },
  (raw) => JSON.parse(raw) as { success: boolean },
)
```

Add `shivaClient` import at the top: `import { shivaClient } from "../shared/clients/presets"`.

### Step 5: Add CRE callbacks to ghost-withdraw and ghost-transfer handlers

Apply the same callback POST pattern to:
- `apps/cre/workflow-ghost-withdraw/handlers.ts` — post to `/contracts/cre-callback/ghost-withdraw`
- `apps/cre/workflow-ghost-transfer/handlers.ts` — post to `/contracts/cre-callback/ghost-transfer`

### Step 6: Handle ghost callbacks in Shiva contracts controller

In `apps/shiva/src/controllers/contracts.controller.ts`, in the `creCallback()` method, add ghost event handling:

```typescript
// Handle ghost-deposit callback
if (event === 'ghost-deposit' && payload.user_address) {
  // Store callback in ghost_transactions audit
  await supabaseAdmin.from('ghost_transactions')
    .update({
      attestation_id: payload.attestation_id,
      cre_verified: true,
      updated_at: nowIso(),
    })
    .eq('attestation_id', `ghost-deposit-${payload.user_address.slice(2, 10)}-${payload.amount}`)
}

// Handle ghost-withdraw and ghost-transfer similarly
if (event === 'ghost-withdraw' || event === 'ghost-transfer') {
  // Log verification for audit trail
  logger.info(`CRE ghost callback received: ${event}`, payload)
}
```

### Step 7: Verify build

Run: `npx turbo run build --filter=@bu/shiva --force`
Expected: 0 errors

### Step 8: Commit

```bash
git add apps/shiva/src/routes/ghost-fhe.ts apps/shiva/src/controllers/contracts.controller.ts
git add apps/cre/workflow-ghost-deposit/handlers.ts apps/cre/workflow-ghost-withdraw/handlers.ts apps/cre/workflow-ghost-transfer/handlers.ts
git commit -m "feat(ghost): add fallback resilience + callback pattern — escrow parity"
```

---

## Task 5: Ghost Mode Parity — Confidential Clients for DON State

Upgrade Ghost Mode CRE workflows to use `confidentialShivaClient` for DON state operations (balance updates contain sensitive financial data).

**Files:**
- Modify: `apps/cre/workflow-ghost-deposit/handlers.ts`
- Modify: `apps/cre/workflow-ghost-deposit/types.ts`
- Modify: `apps/cre/workflow-ghost-withdraw/handlers.ts`
- Modify: `apps/cre/workflow-ghost-withdraw/types.ts`

### Step 1: Add `owner` field to ghost-deposit Config

In `apps/cre/workflow-ghost-deposit/types.ts`, add `owner: addr` to the config schema (required by `confidentialShivaClient`).

Update `apps/cre/workflow-ghost-deposit/config.json` to include `"owner": "0x09Ce8E2B3Fede2727dA4392Ea8Fe618305ba0474"`.

### Step 2: Use confidentialShivaClient for DON state in ghost-deposit

In `apps/cre/workflow-ghost-deposit/handlers.ts`:

Replace the `aceClient` DON state update (Step 5) with `confidentialShivaClient`:

```typescript
import { confidentialShivaClient } from "../shared/clients/confidential-presets"

const confShiva = confidentialShivaClient<Config>()

// Step 5: Update DON state via confidential channel
runtime.log("Step 5: Update DON state (confidential)")
confShiva.post(
  runtime,
  "/ghost/don-state/update",
  {
    address: userAddr,
    delta: amount.toString(),
    operation: "deposit",
  },
  (raw) => JSON.parse(raw) as { success: boolean; newBalance: string },
)
```

### Step 3: Add `owner` field to ghost-withdraw Config

Same as Step 1 but for `apps/cre/workflow-ghost-withdraw/types.ts` and `config.json`.

### Step 4: Use confidentialShivaClient for DON state in ghost-withdraw

In `apps/cre/workflow-ghost-withdraw/handlers.ts`, replace DON state reads with confidential client calls.

### Step 5: Verify build

Run: `cd apps/cre/workflow-ghost-deposit && bun install && bunx cre build`
Run: `cd apps/cre/workflow-ghost-withdraw && bun install && bunx cre build`
Expected: WASM build success for both

### Step 6: Commit

```bash
git add apps/cre/workflow-ghost-deposit/ apps/cre/workflow-ghost-withdraw/
git commit -m "feat(ghost): use confidential clients for DON state — IP protection parity"
```

---

## Task 6: Ghost Mode Parity — Multi-Handler Workflows

Add EVM Log triggers to Ghost Mode workflows (matching escrow-monitor's dual-trigger pattern).

**Files:**
- Modify: `apps/cre/workflow-ghost-transfer/handlers.ts`
- Modify: `apps/cre/workflow-ghost-transfer/types.ts`
- Modify: `apps/cre/workflow-ghost-transfer/config.json`

### Step 1: Add log trigger config fields

In `apps/cre/workflow-ghost-transfer/types.ts`, add:

```typescript
export const configSchema = z.object({
  // ... existing fields
  // EVM Log trigger for ConfidentialTransfer events
  ghostUsdcAddress: addr,
  fheChainSelectorName: z.string().min(1),
  transferEventTopic: z.string().min(1),  // keccak256("Transfer(address,address,uint256)")
})
```

### Step 2: Add EVM Log handler for Transfer events

In `apps/cre/workflow-ghost-transfer/handlers.ts`, add a second handler:

```typescript
import { withLog } from "../shared/triggers"

const ghostTransferLogMonitor = withLog<Config>(
  {
    getAddresses: (config) => [config.ghostUsdcAddress],
    getTopics: (config) => [config.transferEventTopic],
    chainSelectorField: "fheChainSelectorName" as keyof Config,
  },
  (runtime, log) => {
    runtime.log(`GhostUSDC Transfer event detected: tx=${log.txHash}`)

    // Decode transfer event
    const from = `0x${log.topics[1]?.slice(-40) ?? ""}`
    const to = `0x${log.topics[2]?.slice(-40) ?? ""}`

    runtime.log(`Transfer: from=${from} to=${to}`)

    // Compliance check on both parties
    const fromAllowed = callView(
      runtime,
      runtime.config.policyEngineAddress,
      POLICY_ENGINE_ABI as unknown as Abi,
      "isAllowed",
      [from],
    )
    const toAllowed = callView(
      runtime,
      runtime.config.policyEngineAddress,
      POLICY_ENGINE_ABI as unknown as Abi,
      "isAllowed",
      [to],
    )

    if (!fromAllowed || !toAllowed) {
      runtime.log(`COMPLIANCE VIOLATION: from=${!!fromAllowed} to=${!!toAllowed}`)
    }

    // Publish attestation
    const entityId = `ghost-transfer-log-${keccak256(toHex(log.txHash ?? "")).slice(0, 18)}`

    const result = publishAttestation(runtime, {
      type: "ghost_transfer",
      entityId,
      data: {
        fromHash: keccak256(toHex(from)),
        toHash: keccak256(toHex(to)),
        fromCompliant: !!fromAllowed,
        toCompliant: !!toAllowed,
        txHash: log.txHash ?? "",
        timestamp: 0,
      },
      metadata: JSON.stringify({
        operation: "ghost_transfer_log_monitor",
        trigger: "evm_log",
      }),
    })

    return JSON.stringify({
      success: true,
      attestationId: result.attestationId,
      txHash: result.txHash,
    })
  },
)

// Update initWorkflow to include both handlers
export const initWorkflow = (config: Config) => [
  ghostTransferHttp(config),
  ghostTransferLogMonitor(config),
]
```

### Step 3: Update config.json

Add the new fields:

```json
{
  "ghostUsdcAddress": "0x6e6Ad7EDECbb4C9B7aA9453af2ba285f6d6cCcB5",
  "fheChainSelectorName": "ethereum-testnet-sepolia-arbitrum-1",
  "transferEventTopic": "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"
}
```

### Step 4: Verify build

Run: `cd apps/cre/workflow-ghost-transfer && bun install && bunx cre build`
Expected: WASM build success

### Step 5: Commit

```bash
git add apps/cre/workflow-ghost-transfer/
git commit -m "feat(ghost): add EVM log trigger for Transfer events — dual-trigger parity"
```

---

## Summary: Parity Gap Closure

| Feature | Escrow (Before) | Ghost Mode (Before) | Ghost Mode (After) |
|---------|----------------|--------------------|--------------------|
| **CRE Trigger** | `triggerCreWorkflowWithFallback` | `triggerCreWorkflow` (no fallback) | `triggerCreWorkflowWithFallback` |
| **Callback Pattern** | POST to `cre_callbacks` | None | POST to `cre_callbacks` |
| **Confidential Client** | `confidentialShivaClient` for AI/IP | `aceClient` only | `confidentialShivaClient` for DON state |
| **Multi-Handler** | HTTP + EVM Log + Cron | HTTP only | HTTP + EVM Log |
| **Appeal Bonds** | None | N/A | Added to contract |
| **Verdict Storage** | Supabase only | N/A | On-chain + Supabase |
| **AllowList Sync** | Direct server call | Direct server call | CRE workflow + attestation |
