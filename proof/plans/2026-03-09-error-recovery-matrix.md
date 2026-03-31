# Error Recovery Matrix

**Date**: 2026-03-09
**Scope**: Ghost Mode, Contract Escrow, CRE Workflows

Documents failure modes, detection methods, and recovery procedures for each subsystem.

---

## 1. CoFHE Decrypt Timeout (>300s)

### Context
When a user calls `GhostUSDC.unwrap()`, the FHE coprocessor (CoFHE) must decrypt the ciphertext. This is an async operation tracked by claim status in the `getUserClaims()` on-chain view.

### Detection
- Claim `status` stays `'decrypting'` beyond 300s
- `readGhostClaims()` returns `{ decrypted: false, claimed: false }` indefinitely
- Shiva response included `estimatedDecryptTime: "30-300 seconds"` but claim never transitions

### What Happens
- **User-facing**: The Ghost withdraw API (`POST /ghost/withdraw`) returns successfully with `ctHash` and `claimId`. The user sees "Decrypting..." in the UI via `GET /ghost/claims` polling. If CoFHE stalls, the claim stays in `decrypting` state.
- **On-chain**: The unwrap transaction completed. The `ctHash` exists in the contract's `_claims` mapping with `decrypted = false`. USDC is locked in GhostUSDC until decrypt completes.
- **CRE**: `workflow-ghost-withdraw` may fail at Step 4 ("Check claim status") if it can't find an active claim matching the amount. The `NO_ACTIVE_CLAIM` error is thrown. However, since CRE is non-fatal, the deposit itself succeeded.
- **Audit trail**: `ghost_transactions` row exists with `type: 'ghost_withdraw'` and the `claimId`.

### Recovery Procedure
1. **Poll extended**: Increase polling interval to 30s, extend timeout to 600s. CoFHE may be under load.
2. **Manual claim check**:
   ```bash
   cast call 0x6e6Ad7EDECbb4C9B7aA9453af2ba285f6d6cCcB5 \
     "getClaim(bytes32)(bytes32,uint64,uint64,bool,address,bool)" \
     $CT_HASH \
     --rpc-url https://ethereum-sepolia-rpc.publicnode.com
   ```
   The 4th return value (`bool decrypted`) indicates if decrypt completed.
3. **Re-trigger unwrap**: If the claim is stuck, user can call `unwrap()` again for the same amount. This creates a new claim with a new `ctHash`. The old stuck claim becomes orphaned (USDC still locked for it).
4. **Contact Fhenix/CoFHE**: If multiple claims are stuck, the CoFHE TaskManager may be down. Check Fhenix status page or testnet Discord.
5. **Funds are NOT lost**: Even if decrypt takes days, the claim will eventually complete. The USDC is held by GhostUSDC contract and can only be released via `claimUnwrapped()`.

### Impact Assessment
| Aspect | Impact |
|---|---|
| User funds | SAFE -- locked in contract, not lost |
| DON state | STALE -- CRE may have already decremented balance |
| Attestation | MAY BE MISSING -- CRE workflow may have failed |
| Platform operations | LOW -- only affects this specific user's withdraw |

---

## 2. CRE Gateway Unreachable

### Context
All CRE workflows are triggered via HTTP POST to `$CRE_GATEWAY_URL/workflows/{id}/trigger`. The gateway may be down due to: DON node issues, network problems, local simulation crash, or misconfigured URL.

### Detection
- `triggerCreWorkflow()` throws on `fetch()` (connection refused) or gets non-200 status
- Shiva logs: `CRE workflow failed (non-fatal)` warning from `triggerCreWorkflowWithFallback()`
- Attestation IDs are prefixed with `deferred-` (e.g., `deferred-ghost-deposit-...`)

### What Happens: Ghost Mode
- **Deposit**: `executeDeposit()` completes (USDC -> GhostUSDC wrap via Circle DCW). CRE verification is skipped. Attestation is `deferred-...`. No compliance check via CRE, but PolicyEngine enforced at contract level. DON state NOT updated.
  - Code path: `apps/shiva/src/routes/ghost-fhe.ts` lines 196-222
- **Transfer**: `executeTransfer()` completes. CRE attestation skipped. ConfidentialTransfer event NOT monitored (EVM Log trigger requires CRE).
  - Code path: `apps/shiva/src/routes/ghost-fhe.ts` lines 287-311
- **Withdraw**: `executeWithdraw()` completes. CRE backing verification skipped. DON state NOT decremented. Attestation deferred.
  - Code path: `apps/shiva/src/routes/ghost-fhe.ts` lines 366-385

### What Happens: Contract Escrow
- **Deploy escrow**: Falls back to Circle DCW direct deployment via `EscrowFactoryV3.createEscrow()`. Works fully without CRE.
  - Code path: `apps/shiva/src/controllers/contracts.controller.ts` lines 430-536
- **Verify deliverable**: Falls back to `@bu/intelligence/arbitration.runVerification()` running directly on Shiva. Also calls `publishFallbackAttestation()` for on-chain proof.
  - Code path: `apps/shiva/src/controllers/contracts.controller.ts` lines 612-643
- **Dispute**: Falls back to `runAdvocates()` + `runTribunal()` from `@bu/intelligence/arbitration`.
- **Yield allocation**: Skipped entirely. USDC sits idle in escrow (no yield earned). Logged as warning.
  - Code path: `apps/shiva/src/controllers/contracts.controller.ts` lines 376-391

### Recovery Procedure
1. **Check CRE gateway status**:
   ```bash
   curl -s $CRE_GATEWAY_URL/health || echo "Gateway unreachable"
   ```
2. **For local simulation**: Restart CRE:
   ```bash
   cd apps/cre/workflow-ghost-deposit
   cre workflow simulate workflow-ghost-deposit --target local-simulation \
     --non-interactive --trigger-index 0
   ```
3. **Reconcile DON state**: Once CRE is back, trigger manual reconciliation:
   - Ghost deposits without CRE verification need retroactive attestations
   - DON state needs to be synced by replaying deposit/withdraw events
4. **Deferred attestation recovery**: Query `ghost_transactions` for rows with `attestation_id LIKE 'deferred-%'` and re-trigger CRE for each.

### Design Philosophy
All CRE triggers follow the EVA (Execute-Verify-Attest) pattern:
- **Execution** (Circle DCW) is the primary path and NEVER depends on CRE
- **Verification** (CRE) is non-fatal; wrapped in try/catch
- **Attestation** is deferred if CRE is unavailable
- Financial operations complete even if CRE gateway is unreachable

---

## 3. Circle DCW API Errors

### Context
Circle Developer-Controlled Wallets (DCW) SDK is used for all on-chain writes: approve, wrap, unwrap, claim, transfer, escrow deploy. Errors come from `sdk.createContractExecutionTransaction()` or `sdk.getTransaction()`.

### Error Categories

#### 3a. Authentication Failure
- **Cause**: Invalid `CIRCLE_API_KEY` or `CIRCLE_ENTITY_SECRET`
- **Detection**: `getCircleSdk()` throws `"CIRCLE_API_KEY and CIRCLE_ENTITY_SECRET are required"`
- **Code**: `apps/shiva/src/services/ghost-fhe.service.ts` lines 99-109
- **Recovery**: Check `apps/shiva/.dev.vars` env vars. Regenerate in Circle Developer Console.
- **Impact**: ALL Ghost Mode and escrow operations fail. No writes possible.

#### 3b. Transaction Submission Failure
- **Cause**: `createContractExecutionTransaction()` returns no `id` in response
- **Detection**: Ghost service throws `"USDC approve for GhostUSDC failed -- no tx id"` or similar
- **Possible causes**:
  - Wallet not found in Circle (wrong `walletId`)
  - Contract address invalid
  - ABI signature mismatch
  - Insufficient gas (Circle manages gas but may run low on testnet)
- **Recovery**:
  1. Verify wallet exists: check `wallets` table for `circle_wallet_id`
  2. Verify contract addresses match deployed contracts
  3. Check Circle Developer Console for wallet status

#### 3c. Transaction Failed/Cancelled
- **Cause**: On-chain revert during execution
- **Detection**: `waitForCircleTx()` sees `state === 'FAILED'` or `state === 'CANCELLED'`
- **Error**: `"Transaction {id} FAILED"` thrown
- **Code**: `apps/shiva/src/services/ghost-fhe.service.ts` lines 427-455
- **Common revert reasons**:
  - `USDC.approve`: insufficient balance
  - `GhostUSDC.wrap`: allowance not set, or USDC balance insufficient
  - `GhostUSDC.transferAmount`: PolicyEngine rejects (`NOT_ALLOWED`)
  - `GhostUSDC.unwrap`: encrypted balance insufficient
  - `GhostUSDC.claimUnwrapped`: claim not yet decrypted, or already claimed
  - `EscrowFactoryV3.createEscrow`: invalid parameters
- **Recovery**:
  1. Check Etherscan for revert reason: `https://sepolia.etherscan.io/tx/{txHash}`
  2. For PolicyEngine rejections: verify user is on allowlist
  3. For balance issues: re-check with `readUsdcBalance()` or `readGhostBalance()`
  4. For claim issues: poll `getClaim(ctHash)` to verify decrypt status

#### 3d. Transaction Timeout
- **Cause**: Circle tx polling exceeds 120s without confirmation
- **Detection**: `"Transaction {id} timed out after 120000ms"` thrown
- **Code**: `waitForCircleTx()` polls every 3s for 120s
- **Shiva HTTP response**: `502 Bad Gateway` with `error: 'TX_FAILED'`
- **Recovery**:
  1. The transaction may still be pending. Check Circle Dashboard or Etherscan.
  2. DO NOT re-submit the same operation -- Circle uses `idempotencyKey` (uuid) per call, so a retry would create a new tx.
  3. Wait and manually check the tx status via Circle API.
  4. If truly stuck: the transaction will eventually fail on Circle's side.

### Shiva HTTP Error Mapping

| Ghost Route Error | HTTP Status | Error Code | Cause |
|---|---|---|---|
| USDC balance insufficient | 400 | `USDC_BALANCE_INSUFFICIENT` | Pre-check fails in `executeDeposit()` |
| Circle tx timeout/fail/cancel | 502 | `TX_FAILED` | `waitForCircleTx()` failure |
| KYC not approved | 403 | `KYC_REQUIRED` | `resolveGhostContext()` rejects |
| No wallet found | 404 | `NOT_FOUND` | No wallet in Supabase |
| Wallet missing Circle ID | 400 | `WALLET_NOT_SYNCED` | `circle_wallet_id` is null |
| Any other error | 500 | `INTERNAL_ERROR` | Catch-all |

---

## 4. Escrow Contract Reverts

### Context
The escrow system uses `EscrowFactoryV3.createEscrow()` for deployment and on-chain escrow contracts for fund management. Reverts can happen at deployment or during milestone operations.

### Error Categories

#### 4a. EscrowFactoryV3.createEscrow() Revert
- **ABI**: `createEscrow(bytes32,address,address,address,uint256,uint256[],string[])`
- **Possible revert reasons**:
  - Zero address for payer/payee/token
  - Milestone amounts sum != totalAmount
  - Empty milestones array
  - Agreement hash collision (same hash already deployed)
- **Detection**: Circle DCW returns `FAILED` state
- **Code path**: `apps/shiva/src/controllers/contracts.controller.ts` lines 492-507
- **Recovery**: Fix input parameters and re-deploy. Check agreement data in `escrow_agreements_v3`.

#### 4b. Escrow Funding Revert
- **Cause**: USDC transfer to escrow contract fails
- **Possible reasons**:
  - USDC allowance not set for escrow contract
  - Insufficient USDC balance
  - Escrow contract paused or in wrong state
- **Detection**: Funding `txHash` provided by client fails on-chain
- **Note**: The `/fund` endpoint only records the `txHash` -- it doesn't execute the on-chain transfer itself. The client is responsible for the actual USDC transfer.
- **Recovery**: Client must re-execute the USDC transfer with proper allowance.

#### 4c. Milestone Release Revert
- **Cause**: On-chain escrow release function reverts
- **Possible reasons**:
  - Caller is not authorized (not payer or arbiter)
  - Milestone already released
  - Escrow not funded
  - Funds already returned to payer (dispute refund)
- **Detection**: `client.contracts.release()` returns `success: false`
- **Recovery**: Check milestone state in Supabase. Verify escrow contract state on-chain.

#### 4d. Yield Allocation Revert
- **CRE `workflow-escrow-yield`** moves idle USDC to yield strategies
- **Revert reasons**:
  - TreasuryManager paused
  - Insufficient USDC in escrow for allocation
  - Yield strategy full or unavailable
- **Impact**: Non-fatal. USDC stays in escrow, just doesn't earn yield.
- **Detection**: CRE workflow returns error. Shiva logs `Yield deposit trigger failed`.
- **Recovery**: Yield allocation is opportunistic. No user action needed.

### Agreement Status State Machine

```
DRAFT
  |-- sign (payer only) --> PENDING_SIGN
  |-- sign (both) --> ACTIVE
  |
PENDING_SIGN
  |-- sign (other party) --> ACTIVE
  |
ACTIVE
  |-- deploy-escrow --> DEPLOYING --> DEPLOYED
  |-- fund --> ACTIVE (with funding data)
  |
DEPLOYED
  |-- fund --> ACTIVE (funded, milestones FUNDED)
```

If a revert occurs during `DEPLOYING`, the agreement stays in `DEPLOYING` state. Manual intervention required to reset to `ACTIVE` and retry.

---

## 5. AI Verification Failures

### Context
Milestone deliverable verification uses `@bu/intelligence/arbitration.runVerification()` (fallback) or CRE `workflow-escrow-verify`.

### Failure Modes

#### 5a. AI Model Timeout
- **Cause**: AI SDK call to language model exceeds timeout
- **Impact**: Submission stays in `VERIFYING` state
- **Recovery**: Re-submit the deliverable. The `current_attempt` counter increments.

#### 5b. AI Model Returns Low Confidence
- **Detection**: `report.confidence < 0.5`
- **Impact**: Verdict may be unreliable. System still records it.
- **Recovery**: Payer can dispute, triggering advocate + tribunal (multi-agent escalation).

#### 5c. Fallback Attestation Failure
- **Cause**: `publishFallbackAttestation()` fails (ACE API down, contract paused)
- **Detection**: Shiva log: `Fallback attestation failed (non-blocking)`
- **Code**: `apps/shiva/src/controllers/contracts.controller.ts` lines 626-639
- **Impact**: Verification result is still valid and stored in DB. On-chain proof is missing.
- **Recovery**: Deferred. Attestation can be published later when services recover.

---

## 6. Email Delivery Failures

### Context
All contract emails are sent via `triggerTask('send-contract-email', ...)` which queues to Trigger.dev, which calls `@bu/email` (Resend).

### Failure Modes
- All email sends are fire-and-forget with `.catch(() => {})` -- they never block the main flow
- Failed emails are logged as warnings
- No retry mechanism at the application level (Trigger.dev may retry)

### Detection
- Trigger.dev dashboard shows failed tasks
- Shiva logs: `Failed to trigger invitation/signed/funded email`

### Impact
- Zero impact on core functionality
- User misses notification, must check dashboard manually

---

## 7. Cross-Cutting: Database Failures

### Supabase Operations That Can Fail

| Operation | Location | Impact if Fails |
|---|---|---|
| `insertGhostTransaction()` | Ghost FHE routes | Audit trail gap; logged as console.error |
| `syncEusdcgIndicator()` | Ghost FHE routes | UI shows stale indicator; logged as console.error |
| Agreement CRUD | Contracts controller | Returns 500; no partial state |
| Milestone state update | Contracts controller | State machine inconsistency |
| Submission insert | Contracts controller | Verification can't proceed; returns 500 |

### Recovery
- All ghost audit/sync failures are caught and logged but don't block the operation
- Agreement/milestone operations use single Supabase calls (no multi-table transactions)
- If milestone state is inconsistent: manually update via Supabase dashboard
- Ghost balance indicator can be re-synced by calling `GET /ghost/balance`

---

## Summary: Failure Severity Matrix

| Failure | Severity | Funds at Risk? | Auto-Recovery? | Manual Steps |
|---|---|---|---|---|
| CoFHE decrypt timeout | Medium | No (locked safe) | Yes (eventual) | Poll, re-trigger |
| CRE gateway down | Low | No | Yes (fallback) | Reconcile DON state |
| Circle auth failure | Critical | No | No | Fix env vars |
| Circle tx timeout | Medium | No | No | Check tx status |
| Circle tx revert | Medium | No | No | Fix input, retry |
| Escrow deploy revert | Medium | No | No | Fix params, re-deploy |
| AI verification timeout | Low | No | Yes (re-submit) | Re-submit deliverable |
| Email delivery failure | Low | No | Partial (Trigger retry) | None needed |
| Supabase write failure | Low | No | No | Manual DB fix |
