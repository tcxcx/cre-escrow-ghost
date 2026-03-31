# Escrow Pipeline E2E Fix — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix every broken link in the contract/escrow pipeline so it works end-to-end: Solidity contracts → Foundry compile → deploy to Sepolia → CRE workflow → Shiva API → frontend.

**Architecture:** Write EscrowWithAgentV3, EscrowFactoryV3, and EscrowExtractor Solidity contracts matching the existing CRE ABI. Compile with Foundry, deploy to Sepolia, then fix all broken TypeScript connections (wrong paths, missing exports, incorrect PK columns, missing writeback logic, phantom milestones).

**Tech Stack:** Solidity 0.8.24, Foundry (forge), Viem, CRE SDK, Hono, Next.js App Router, Supabase

---

## Audit Summary — Bugs to Fix

### Critical (Pipeline-Breaking)
| ID | File | Bug |
|----|------|-----|
| C1 | `contracts/escrow/` | Solidity contracts don't exist — no factory, no escrow, no extractor |
| C2 | `packages/contracts/src/escrow/abi.ts` | Imports from nonexistent `hardhat/artifacts-bufi/` and `@bu/contracts/erc-8004` |
| C3 | `packages/contracts/package.json` | Missing `./escrow` export path |
| C4 | `packages/hono-client/.../contracts.service.ts:137` | Posts to `/contracts/create-from-template` but Shiva mounts `/contracts/from-template` |
| C5 | `apps/shiva/.../contracts.controller.ts:365-368` | `deployEscrow()` reads milestones from `agreement_json` (empty) instead of `milestones` table |
| C6 | `apps/shiva/.../contracts.controller.ts:389` | Never calls `updateAgreementEscrowAddress` after deploy — `escrow_address` stays null |
| C7 | `packages/supabase/.../contract-mutations.ts:26` | `.eq('id', agreementId)` — PK is `agreement_id`, not `id` |
| C8 | `packages/supabase/.../contract-mutations.ts:53` | Same wrong PK in `updateContractShareData` |
| C9 | `apps/cre/shared/addresses.ts:94` | `ESCROW_FACTORY` is zero address — needs real deployed address |
| C10 | `apps/cre/workflow-escrow-deploy/config.json:6` | `escrowFactoryAddress` is zero address |

### Moderate (Functional Breakage)
| ID | File | Bug |
|----|------|-----|
| M1 | `apps/app/.../deploy-modal.tsx:80-158` | Never calls `/deploy-escrow` — "creating escrow" step is cosmetic only |
| M2 | `apps/shiva/.../contracts.controller.ts:1033` | `release()` passes `escrowAddress: ''` |
| M3 | `apps/shiva/.../contracts.controller.ts:643-644` | `fileDispute()` passes `escrowAddress: ''` and hardcodes `milestoneIndex: 0` |
| M4 | `apps/app/.../funding-view.tsx:110` | BuFi deposit passes empty txHash `''` — Shiva returns 400 |
| M5 | `apps/cre/scripts/deploy-escrow-factory.ts:31` | Artifact path `contracts/artifacts/EscrowFactory.json` doesn't exist |

### Minor
| ID | File | Bug |
|----|------|-----|
| m1 | `apps/app/.../signing-view.tsx:560` | Snowtrace (Avalanche) URL instead of Etherscan Sepolia |
| m2 | `apps/cre/workflow-escrow-deploy/types.ts:8` | `gasLimit` is string, passed to gas config as-is |

---

## Task 1: Write Solidity Contracts (Foundry)

**Files:**
- Create: `contracts/escrow/src/EscrowWithAgentV3.sol`
- Create: `contracts/escrow/src/EscrowFactoryV3.sol`
- Create: `contracts/escrow/src/EscrowExtractor.sol`
- Create: `contracts/escrow/foundry.toml`

**Fixes:** C1

**Context:** The CRE ABI at `apps/cre/shared/abi/escrow-v3.ts` defines the read interface. The CRE service at `apps/cre/shared/services/escrow.ts` defines write actions via `EscrowExtractor` encoding: `(uint8 actionType, uint256 milestoneIndex, address executorAgent, uint256 payeeBps, bytes32 receiptHash)`. Action types: 0=SET_STATUS, 1=APPROVE_MILESTONE, 2=LOCK_MILESTONE, 3=SET_DECISION, 4=EXECUTE_DECISION, 5=SET_MILESTONE_STATUS. Milestone statuses: 0=PENDING through 8=RELEASED.

The deploy script at `apps/cre/scripts/deploy-escrow-factory.ts:37-41` calls `deployContract` with args `[POLICY_ENGINE, BU_ATTESTATION, account.address]`.

The CRE deploy handler at `apps/cre/workflow-escrow-deploy/handlers.ts:48-61` encodes `createEscrow` params as: `(bytes32 agreementHash, address payer, address payee, address token, uint256 totalAmount, uint256[] milestoneAmounts, string[] milestoneDescriptions)`.

**Step 1: Create Foundry project**

```bash
mkdir -p contracts/escrow/src contracts/escrow/lib
```

Create `contracts/escrow/foundry.toml`:
```toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
solc_version = "0.8.24"
optimizer = true
optimizer_runs = 200

[profile.default.fmt]
line_length = 120
```

**Step 2: Write EscrowWithAgentV3.sol**

Must expose: `milestones(uint256)`, `milestoneCount()`, `decision()`, `payee()`, `payer()`, `token()`, `totalAmount()` (matching ABI).
Must emit: `MilestoneStatusChanged`, `DecisionSet`, `DecisionExecuted`.
Must have: `fund()`, `setMilestoneStatus()`, `lockMilestone()`, `setDecision()`, `executeDecision()`.
Must use IERC20 for token transfers. Constructor: `(address _payer, address _payee, address _token, uint256 _totalAmount, address _executorAgent, uint256[] _amounts, string[] _descriptions, bytes32 _agreementHash)`.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

contract EscrowWithAgentV3 {
    enum Status { PENDING, FUNDED, IN_PROGRESS, SUBMITTED, APPROVED, REJECTED, DISPUTED, LOCKED, RELEASED }

    struct Milestone {
        uint256 amount;
        Status status;
        string description;
    }

    struct Decision {
        uint256 payeeBps;
        bytes32 receiptHash;
        bool isSet;
        bool isExecuted;
    }

    address public payer;
    address public payee;
    address public token;
    uint256 public totalAmount;
    address public executorAgent;
    bytes32 public agreementHash;
    Decision public decision;
    bool public funded;

    Milestone[] internal _milestones;

    event MilestoneStatusChanged(uint256 indexed milestoneIndex, uint8 newStatus);
    event DecisionSet(uint256 payeeBps, bytes32 receiptHash);
    event DecisionExecuted(uint256 payeeAmount, uint256 payerRefund);
    event Funded(address funder, uint256 amount);

    modifier onlyExecutor() {
        require(msg.sender == executorAgent, "Only executor");
        _;
    }

    constructor(
        address _payer,
        address _payee,
        address _token,
        uint256 _totalAmount,
        address _executorAgent,
        uint256[] memory _amounts,
        string[] memory _descriptions,
        bytes32 _agreementHash
    ) {
        require(_amounts.length == _descriptions.length, "Length mismatch");
        payer = _payer;
        payee = _payee;
        token = _token;
        totalAmount = _totalAmount;
        executorAgent = _executorAgent;
        agreementHash = _agreementHash;

        for (uint256 i = 0; i < _amounts.length; i++) {
            _milestones.push(Milestone(_amounts[i], Status.PENDING, _descriptions[i]));
        }
    }

    function milestoneCount() external view returns (uint256) {
        return _milestones.length;
    }

    function milestones(uint256 index) external view returns (uint256 amount, uint8 status, string memory description) {
        Milestone storage m = _milestones[index];
        return (m.amount, uint8(m.status), m.description);
    }

    function fund() external {
        require(!funded, "Already funded");
        IERC20(token).transferFrom(msg.sender, address(this), totalAmount);
        funded = true;
        emit Funded(msg.sender, totalAmount);
    }

    function setMilestoneStatus(uint256 milestoneIndex, uint8 newStatus) external onlyExecutor {
        require(milestoneIndex < _milestones.length, "Invalid index");
        _milestones[milestoneIndex].status = Status(newStatus);
        emit MilestoneStatusChanged(milestoneIndex, newStatus);
    }

    function lockMilestone(uint256 milestoneIndex) external onlyExecutor {
        require(milestoneIndex < _milestones.length, "Invalid index");
        _milestones[milestoneIndex].status = Status.LOCKED;
        emit MilestoneStatusChanged(milestoneIndex, uint8(Status.LOCKED));
    }

    function setDecision(uint256 milestoneIndex, uint256 payeeBps, bytes32 receiptHash) external onlyExecutor {
        require(!decision.isSet, "Decision already set");
        require(payeeBps <= 10000, "Invalid bps");
        decision = Decision(payeeBps, receiptHash, true, false);
        emit DecisionSet(payeeBps, receiptHash);
    }

    function executeDecision(uint256 milestoneIndex) external onlyExecutor {
        require(decision.isSet && !decision.isExecuted, "Cannot execute");
        decision.isExecuted = true;

        uint256 payeeAmount = (totalAmount * decision.payeeBps) / 10000;
        uint256 payerRefund = totalAmount - payeeAmount;

        if (payeeAmount > 0) IERC20(token).transfer(payee, payeeAmount);
        if (payerRefund > 0) IERC20(token).transfer(payer, payerRefund);

        emit DecisionExecuted(payeeAmount, payerRefund);
    }
}
```

**Step 3: Write EscrowExtractor.sol**

This decodes CRE reports and dispatches to EscrowWithAgentV3. Called by ACE PolicyEngine.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {EscrowWithAgentV3} from "./EscrowWithAgentV3.sol";

contract EscrowExtractor {
    uint8 constant SET_STATUS = 0;
    uint8 constant APPROVE_MILESTONE = 1;
    uint8 constant LOCK_MILESTONE = 2;
    uint8 constant SET_DECISION = 3;
    uint8 constant EXECUTE_DECISION = 4;
    uint8 constant SET_MILESTONE_STATUS = 5;

    function extract(address escrow, bytes calldata report) external {
        (uint8 actionType, uint256 milestoneIndex, , uint256 payeeBps, bytes32 receiptHash) =
            abi.decode(report, (uint8, uint256, address, uint256, bytes32));

        EscrowWithAgentV3 e = EscrowWithAgentV3(escrow);

        if (actionType == SET_MILESTONE_STATUS) {
            e.setMilestoneStatus(milestoneIndex, uint8(payeeBps)); // payeeBps repurposed as newStatus
        } else if (actionType == LOCK_MILESTONE) {
            e.lockMilestone(milestoneIndex);
        } else if (actionType == SET_DECISION) {
            e.setDecision(milestoneIndex, payeeBps, receiptHash);
        } else if (actionType == EXECUTE_DECISION) {
            e.executeDecision(milestoneIndex);
        } else {
            revert("Unknown action");
        }
    }
}
```

**Step 4: Write EscrowFactoryV3.sol**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {EscrowWithAgentV3} from "./EscrowWithAgentV3.sol";

contract EscrowFactoryV3 {
    address public policyEngine;
    address public attestation;
    address public executorAgent;
    uint256 public escrowCount;

    mapping(uint256 => address) public escrows;

    event EscrowCreated(uint256 indexed escrowIndex, address escrowAddress, bytes32 agreementHash);

    constructor(address _policyEngine, address _attestation, address _executorAgent) {
        policyEngine = _policyEngine;
        attestation = _attestation;
        executorAgent = _executorAgent;
    }

    function createEscrow(
        bytes32 agreementHash,
        address _payer,
        address _payee,
        address _token,
        uint256 _totalAmount,
        uint256[] calldata _milestoneAmounts,
        string[] calldata _milestoneDescriptions
    ) external returns (address) {
        EscrowWithAgentV3 escrow = new EscrowWithAgentV3(
            _payer,
            _payee,
            _token,
            _totalAmount,
            executorAgent,
            _milestoneAmounts,
            _milestoneDescriptions,
            agreementHash
        );

        uint256 index = escrowCount++;
        escrows[index] = address(escrow);

        emit EscrowCreated(index, address(escrow), agreementHash);
        return address(escrow);
    }
}
```

**Step 5: Install OpenZeppelin and compile**

```bash
cd contracts/escrow
forge install OpenZeppelin/openzeppelin-contracts --no-commit
forge build
```

Expected: Compilation succeeds, ABIs in `contracts/escrow/out/`.

**Step 6: Commit**

```bash
git add contracts/escrow/
git commit -m "feat(contracts): add EscrowWithAgentV3, Factory, and Extractor Solidity contracts"
```

---

## Task 2: Fix @bu/contracts ABI Module

**Files:**
- Modify: `packages/contracts/src/escrow/abi.ts`
- Modify: `packages/contracts/package.json`

**Fixes:** C2, C3

**Context:** The current `abi.ts` imports from nonexistent `../../../hardhat/artifacts-bufi/...` and `@bu/contracts/erc-8004`. Replace with inline Viem-compatible ABI arrays derived from the compiled Foundry output. Also add `./escrow` to package.json exports.

**Step 1: Rewrite `packages/contracts/src/escrow/abi.ts`**

Replace the entire file with inline ABIs. Use the canonical ABI from `contracts/escrow/out/` (after Task 1 compilation). The ABI should match what `apps/cre/shared/abi/escrow-v3.ts` already declares for reads + events.

```typescript
/**
 * EscrowWithAgentV3 ABI — Viem-compatible.
 * Source: contracts/escrow/src/EscrowWithAgentV3.sol (Foundry compiled)
 */
export const ESCROW_WITH_AGENT_V3_ABI = [
  // Reads
  { type: 'function', name: 'payer', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address' }] },
  { type: 'function', name: 'payee', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address' }] },
  { type: 'function', name: 'token', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address' }] },
  { type: 'function', name: 'totalAmount', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', name: 'executorAgent', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address' }] },
  { type: 'function', name: 'agreementHash', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'bytes32' }] },
  { type: 'function', name: 'funded', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'bool' }] },
  { type: 'function', name: 'milestoneCount', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  {
    type: 'function', name: 'milestones', stateMutability: 'view',
    inputs: [{ name: 'index', type: 'uint256' }],
    outputs: [
      { name: 'amount', type: 'uint256' },
      { name: 'status', type: 'uint8' },
      { name: 'description', type: 'string' },
    ],
  },
  {
    type: 'function', name: 'decision', stateMutability: 'view', inputs: [],
    outputs: [
      { name: 'payeeBps', type: 'uint256' },
      { name: 'receiptHash', type: 'bytes32' },
      { name: 'isSet', type: 'bool' },
      { name: 'isExecuted', type: 'bool' },
    ],
  },
  // Writes
  { type: 'function', name: 'fund', stateMutability: 'nonpayable', inputs: [], outputs: [] },
  {
    type: 'function', name: 'setMilestoneStatus', stateMutability: 'nonpayable',
    inputs: [{ name: 'milestoneIndex', type: 'uint256' }, { name: 'newStatus', type: 'uint8' }],
    outputs: [],
  },
  {
    type: 'function', name: 'lockMilestone', stateMutability: 'nonpayable',
    inputs: [{ name: 'milestoneIndex', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function', name: 'setDecision', stateMutability: 'nonpayable',
    inputs: [
      { name: 'milestoneIndex', type: 'uint256' },
      { name: 'payeeBps', type: 'uint256' },
      { name: 'receiptHash', type: 'bytes32' },
    ],
    outputs: [],
  },
  {
    type: 'function', name: 'executeDecision', stateMutability: 'nonpayable',
    inputs: [{ name: 'milestoneIndex', type: 'uint256' }],
    outputs: [],
  },
  // Events
  {
    type: 'event', name: 'MilestoneStatusChanged',
    inputs: [
      { name: 'milestoneIndex', type: 'uint256', indexed: true },
      { name: 'newStatus', type: 'uint8', indexed: false },
    ],
  },
  {
    type: 'event', name: 'DecisionSet',
    inputs: [
      { name: 'payeeBps', type: 'uint256', indexed: false },
      { name: 'receiptHash', type: 'bytes32', indexed: false },
    ],
  },
  {
    type: 'event', name: 'DecisionExecuted',
    inputs: [
      { name: 'payeeAmount', type: 'uint256', indexed: false },
      { name: 'payerRefund', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event', name: 'Funded',
    inputs: [
      { name: 'funder', type: 'address', indexed: false },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
] as const

/**
 * EscrowFactoryV3 ABI
 */
export const ESCROW_FACTORY_V3_ABI = [
  {
    type: 'function', name: 'createEscrow', stateMutability: 'nonpayable',
    inputs: [
      { name: 'agreementHash', type: 'bytes32' },
      { name: '_payer', type: 'address' },
      { name: '_payee', type: 'address' },
      { name: '_token', type: 'address' },
      { name: '_totalAmount', type: 'uint256' },
      { name: '_milestoneAmounts', type: 'uint256[]' },
      { name: '_milestoneDescriptions', type: 'string[]' },
    ],
    outputs: [{ name: '', type: 'address' }],
  },
  { type: 'function', name: 'escrowCount', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  {
    type: 'function', name: 'escrows', stateMutability: 'view',
    inputs: [{ name: '', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    type: 'event', name: 'EscrowCreated',
    inputs: [
      { name: 'escrowIndex', type: 'uint256', indexed: true },
      { name: 'escrowAddress', type: 'address', indexed: false },
      { name: 'agreementHash', type: 'bytes32', indexed: false },
    ],
  },
] as const
```

**Step 2: Add `./escrow` to `packages/contracts/package.json` exports**

Add to the exports map:
```json
"./escrow": "./src/escrow/abi.ts"
```

**Step 3: Verify build**

```bash
npx turbo run build --filter=@bu/contracts --force
```

**Step 4: Commit**

```bash
git add packages/contracts/src/escrow/abi.ts packages/contracts/package.json
git commit -m "fix(contracts): replace broken hardhat ABI imports with inline Viem-compatible ABIs"
```

---

## Task 3: Fix Hono Client Path Mismatch

**Files:**
- Modify: `packages/hono-client/src/services/contracts.service.ts:137`

**Fixes:** C4

**Context:** Shiva mounts route at `app.post('/from-template', ...)` in `apps/shiva/src/routes/contracts.ts:15`. The Hono client posts to `/contracts/create-from-template` which 404s. Fix to `/contracts/from-template`.

**Step 1: Fix the path**

Change line 137:
```typescript
// Before:
return this.request('/contracts/create-from-template', {
// After:
return this.request('/contracts/from-template', {
```

**Step 2: Verify build**

```bash
npx turbo run build --filter=@bu/hono-client --force
```

**Step 3: Commit**

```bash
git add packages/hono-client/src/services/contracts.service.ts
git commit -m "fix(hono-client): correct createFromTemplate path to match Shiva route"
```

---

## Task 4: Fix Supabase Mutations (Wrong PK Column)

**Files:**
- Modify: `packages/supabase/src/mutations/contract-mutations.ts:26,53`

**Fixes:** C7, C8

**Context:** The `escrow_agreements_v3` table uses `agreement_id` as its PK. All queries in the Shiva controller use `.eq('agreement_id', ...)`. But both `updateAgreementEscrowAddress` (line 26) and `updateContractShareData` (line 53) use `.eq('id', ...)` — silently matching nothing.

**Step 1: Fix both `.eq('id')` calls to `.eq('agreement_id')`**

Line 26: `.eq('id', agreementId)` → `.eq('agreement_id', agreementId)`
Line 53: `.eq('id', params.agreementId)` → `.eq('agreement_id', params.agreementId)`

**Step 2: Verify build**

```bash
npx turbo run build --filter=@bu/supabase --force
```

**Step 3: Commit**

```bash
git add packages/supabase/src/mutations/contract-mutations.ts
git commit -m "fix(supabase): use correct PK column agreement_id in contract mutations"
```

---

## Task 5: Fix Shiva — Milestones Source + Escrow Address Writeback

**Files:**
- Modify: `apps/shiva/src/controllers/contracts.controller.ts:365-389`

**Fixes:** C5, C6

**Context:**

**Bug C5:** `deployEscrow()` reads milestones from `agreement_json.milestones` which is always empty — milestones are in the `milestones` table (created at line 115-126 in `createFromTemplate`). Fix: query `milestones` table.

**Bug C6:** After CRE deploy completes, the escrow address is never written back to `escrow_agreements_v3.escrow_address`. The CRE workflow posts to `cre_callbacks` but no handler reads that. Fix: After the CRE trigger returns, parse the deployed address from the result and call `updateAgreementEscrowAddress`.

Note: The CRE workflow returns a string like `"Escrow deploy: agreement=... factory_tx=... attestation_tx=..."`. The actual deployed escrow address comes from the factory's `EscrowCreated` event log, which CRE would extract. For now, the CRE callback writes to `cre_callbacks` with `factory_address` — a separate cron/webhook would read `cre_callbacks` and extract the escrow address from the tx receipt. For the MVP, we set status to `DEPLOYING` and handle address writeback in the `creCallback` handler.

**Step 1: Fix milestones source in `deployEscrow()`**

Replace lines 365-368:
```typescript
// BEFORE:
const agreementJson = typeof agreement.agreement_json === 'object' && agreement.agreement_json !== null
  ? (agreement.agreement_json as Record<string, unknown>)
  : {}
const milestones = (agreementJson.milestones as Array<{ title: string; amount: number }>) ?? []

// AFTER:
const { data: milestoneRows } = await supabaseAdmin
  .from('milestones')
  .select('title, amount, index')
  .eq('agreement_id', agreementId)
  .order('index', { ascending: true })
const milestones = (milestoneRows ?? []) as Array<{ title: string; amount: number; index: number }>
```

**Step 2: Update agreement status to DEPLOYING after trigger**

After line 389 (the return statement), add status update:
```typescript
// After successful CRE trigger, mark as deploying
await supabaseAdmin.from('escrow_agreements_v3')
  .update({ status: 'DEPLOYING', updated_at: nowIso() })
  .eq('agreement_id', agreementId)
```

**Step 3: Fix `creCallback` handler to write escrow address**

Find the `creCallback` handler (around line 1215) and add a case for `escrow-deploy`:
```typescript
if (event === 'escrow-deploy' && body.escrow_address) {
  await supabaseAdmin.from('escrow_agreements_v3')
    .update({
      escrow_address: body.escrow_address,
      status: 'AWAITING_SIGNATURE',
      updated_at: nowIso(),
    })
    .eq('agreement_id', body.agreement_id)
}
```

**Step 4: Fix escrowAddress in `release()` and `fileDispute()`**

In `release()` (around line 1033): Replace `escrowAddress: ''` with `escrowAddress: agreement.escrow_address ?? ''`. Need to fetch agreement first — read it from the milestone's `agreement_id`.

In `fileDispute()` (around line 643-644): Replace `escrowAddress: ''` with `escrowAddress: agreement.escrow_address ?? ''` and `milestoneIndex: 0` with `milestoneIndex: safeNumber(milestone.index)`. The agreement is already fetched — look for the query pattern.

**Step 5: Verify build**

```bash
npx turbo run build --filter=@bu/shiva --force
```

**Step 6: Commit**

```bash
git add apps/shiva/src/controllers/contracts.controller.ts
git commit -m "fix(shiva): read milestones from table, add escrow address writeback, fix empty escrowAddress"
```

---

## Task 6: Fix Deploy Modal to Trigger On-Chain Deploy

**Files:**
- Modify: `apps/app/src/components/contract/contract-builder/deploy-modal.tsx:80-158`

**Fixes:** M1

**Context:** The deploy modal currently only calls `createAgreementFromTemplate()` which creates the DB record. It never calls the `/deploy-escrow` endpoint. After creating the agreement, call deploy-escrow to trigger on-chain deployment.

**Step 1: Import the API client**

Add to imports:
```typescript
import { deployEscrow } from '@/lib/api/client'
```

Check if `deployEscrow` exists in `apps/app/src/lib/api/client.ts`. If not, add:
```typescript
export async function deployEscrow(agreementId: string) {
  const res = await fetch(`/api/contracts/agreements/${agreementId}/deploy-escrow`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}
```

**Step 2: Call deploy-escrow after agreement creation**

After line 148 (`const newContractId = result.agreementId`), add:
```typescript
// Trigger on-chain escrow deployment
try {
  await deployEscrow(newContractId)
} catch {
  // Non-blocking: on-chain deploy can happen later via dashboard
  console.warn('On-chain deploy queued, will be processed via CRE')
}
```

**Step 3: Commit**

```bash
git add apps/app/src/components/contract/contract-builder/deploy-modal.tsx apps/app/src/lib/api/client.ts
git commit -m "feat(deploy-modal): trigger on-chain escrow deploy after agreement creation"
```

---

## Task 7: Fix Deploy Script Artifact Path

**Files:**
- Modify: `apps/cre/scripts/deploy-escrow-factory.ts:31`

**Fixes:** M5

**Context:** The script reads `contracts/artifacts/EscrowFactory.json` which doesn't exist. After Task 1, the artifact is at `contracts/escrow/out/EscrowFactoryV3.sol/EscrowFactoryV3.json`.

**Step 1: Fix the artifact path**

```typescript
// BEFORE:
const artifact = JSON.parse(
  readFileSync('contracts/artifacts/EscrowFactory.json', 'utf-8')
)

// AFTER:
const artifact = JSON.parse(
  readFileSync('contracts/escrow/out/EscrowFactoryV3.sol/EscrowFactoryV3.json', 'utf-8')
)
```

Also fix the wallet path to be absolute from repo root:
```typescript
// Use path relative to repo root (script is run via `bun run` from repo root)
const wallet = JSON.parse(readFileSync('.deployer-wallet.json', 'utf-8'))
```

**Step 2: Commit**

```bash
git add apps/cre/scripts/deploy-escrow-factory.ts
git commit -m "fix(scripts): update deploy script artifact path to Foundry output"
```

---

## Task 8: Fix Funding View — BuFi txHash + Escrow Address

**Files:**
- Modify: `apps/app/src/components/contract/contracts/funding/funding-view.tsx`

**Fixes:** M4

**Context:** The BuFi deposit path calls `fundEscrow(amountDue, '')` with empty txHash — Shiva returns 400. For BuFi deposits, generate a placeholder txHash (or skip the on-chain flow since BuFi handles it internally). Also, the "Approve & Fund" button is disabled when `escrowAddress` is null.

**Step 1: Fix BuFi deposit to use a placeholder txHash**

In `handleBufiDeposit`, change the `fundEscrow` call to pass a recognizable placeholder:
```typescript
// BuFi deposits are handled internally — pass a recognizable marker
await fundEscrow(amountDue, `bufi-deposit-${Date.now()}`)
```

**Step 2: Handle missing escrow address gracefully**

If `contract.escrowAddress` is null (not yet deployed), show a "Deploy Escrow" button instead of disabling funding. Or show a message: "Escrow contract is being deployed. Funding will be available shortly."

**Step 3: Commit**

```bash
git add apps/app/src/components/contract/contracts/funding/funding-view.tsx
git commit -m "fix(funding): handle BuFi deposit txHash and missing escrow address"
```

---

## Task 9: Fix Signing View — Explorer URL

**Files:**
- Modify: `apps/app/src/components/contract/contracts/signing/signing-view.tsx:560`

**Fixes:** m1

**Context:** Hardcoded `snowtrace.io` (Avalanche) link. Should use Sepolia Etherscan since all contracts deploy to Sepolia.

**Step 1: Fix the explorer URL**

```typescript
// BEFORE:
href={`https://snowtrace.io/address/${contract.smartContractAddress}`}

// AFTER:
href={`https://sepolia.etherscan.io/address/${contract.smartContractAddress}`}
```

**Step 2: Commit**

```bash
git add apps/app/src/components/contract/contracts/signing/signing-view.tsx
git commit -m "fix(signing): use Sepolia Etherscan instead of Snowtrace for explorer link"
```

---

## Task 10: Deploy EscrowFactory to Sepolia

**Files:**
- Modify: `apps/cre/shared/addresses.ts:94` (update ESCROW_FACTORY)
- Modify: `apps/cre/workflow-escrow-deploy/config.json:6` (update escrowFactoryAddress)

**Fixes:** C9, C10

**Prerequisites:** Task 1 (contracts compiled), deployer wallet funded with Sepolia ETH.

**Step 1: Deploy**

```bash
bun run apps/cre/scripts/deploy-escrow-factory.ts
```

Expected output: `EscrowFactory deployed at: 0x...`

**Step 2: Update addresses**

In `apps/cre/shared/addresses.ts`, replace:
```typescript
export const ESCROW_FACTORY = '0x0000000000000000000000000000000000000000'
```
with the deployed address.

In `apps/cre/workflow-escrow-deploy/config.json`:
```json
"escrowFactoryAddress": "<deployed-address>"
```

**Step 3: Commit**

```bash
git add apps/cre/shared/addresses.ts apps/cre/workflow-escrow-deploy/config.json
git commit -m "deploy(escrow): EscrowFactoryV3 on Sepolia, update addresses"
```

---

## Task 11: Integration Verification

**No files modified — verification only.**

**Step 1: Build all affected packages**

```bash
npx turbo run build --filter=@bu/contracts --filter=@bu/shiva --filter=@bu/hono-client --filter=@bu/supabase --force
```

All must pass with 0 errors.

**Step 2: Trace the pipeline mentally**

1. User clicks "Deploy" in contract builder → `deploy-modal.tsx`
2. Modal calls `createAgreementFromTemplate()` → hono-client → `/contracts/from-template` (fixed path) → creates DB record + milestones
3. Modal calls `deployEscrow(id)` → app API → hono-client → `/contracts/:id/deploy-escrow` → Shiva
4. Shiva reads milestones from `milestones` table (fixed) → triggers CRE workflow
5. CRE encodes `createEscrow` params → signs via consensus → writes to EscrowFactory (real address)
6. CRE posts callback to `cre_callbacks`
7. Shiva `creCallback` handler reads callback → writes `escrow_address` to agreement (fixed)
8. User visits funding view → `escrowAddress` is populated → wagmi approve + fund works
9. User signs → Etherscan link points to Sepolia (fixed)

**Step 3: Run the app locally**

```bash
bun run dev --filter=app
```

Verify: Contract builder → Deploy → Signing → Funding flow renders without import errors.
