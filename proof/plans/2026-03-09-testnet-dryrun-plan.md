# Testnet Dry-Run Test Plan

**Date**: 2026-03-09
**Network**: Ethereum Sepolia (chain ID 11155111)
**Status**: Blocked on funded Circle DCW wallet

---

## Deployed Contracts (Sepolia)

| Contract | Address | Notes |
|---|---|---|
| BUAttestation | `0xC3C7A1bd7556ba93729f859F0f1D1Cb60aeEc72C` | Pausable, rate limits, TTL, severity |
| GhostUSDC (FHERC20Wrapper) | `0x6e6Ad7EDECbb4C9B7aA9453af2ba285f6d6cCcB5` | Wraps USDC directly, FHE via CoFHE |
| USDg | `0x2F28A8378798c5B42FC28f209E903508DD8F878b` | 6 decimals, Ownable2Step+Pausable |
| PolicyEngine (Proxy) | `0x76b727ed158fe58CaFe4FF5F98D0D98E7244F926` | ERC1967Proxy, defaultAllow=true |
| TreasuryManager | `0x33A4a73FD81bB6314AB7dc77301894728E6825A4` | ReceiverTemplate+Pausable, CRE-managed |
| ACE Vault | `0xE588a6c73933BFD66Af9b4A07d48bcE59c0D2d13` | Chainlink-managed, USDg registered |
| USDC (Sepolia) | `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238` | Circle testnet USDC |
| Deployer | `0x09Ce8E2B3Fede2727dA4392Ea8Fe618305ba0474` | `.deployer-wallet.json` (gitignored) |

---

## Pre-requisites

### 1. Sepolia ETH
- Deployer wallet (`0x09Ce...0474`) needs ~0.1 ETH for gas
- Source: Sepolia faucet (Alchemy, Infura, or PoW)
- Verify: `cast balance 0x09Ce8E2B3Fede2727dA4392Ea8Fe618305ba0474 --rpc-url https://ethereum-sepolia-rpc.publicnode.com`

### 2. Sepolia USDC
- Mint from Circle faucet: https://faucet.circle.com/ (select Ethereum Sepolia)
- Minimum: 100 USDC for full test coverage (deposit + escrow funding)
- Verify balance:
```bash
cast call 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238 \
  "balanceOf(address)(uint256)" \
  0x09Ce8E2B3Fede2727dA4392Ea8Fe618305ba0474 \
  --rpc-url https://ethereum-sepolia-rpc.publicnode.com
```

### 3. Circle DCW Wallet
- Circle Developer Console: create a wallet set for Sepolia
- Required env vars in `apps/shiva/.dev.vars`:
  - `CIRCLE_API_KEY` -- from Circle console
  - `CIRCLE_ENTITY_SECRET` -- from Circle console
- The wallet must have its `circle_wallet_id` and `wallet_address` stored in Supabase `wallets` table
- Wallet must be linked to a user+team via `users_on_team`

### 4. CRE Gateway
- Local simulation: `CRE_GATEWAY_URL=http://localhost:8088`
- Required: `bun >= 1.2.21` (lower versions produce broken WASM)
- Each workflow has its own `secrets.yaml` in `apps/cre/workflow-*/`
- Required env: `CRE_ETH_PRIVATE_KEY` (deployer wallet private key)

### 5. KYC/KYB Verification
- User must have `kycStatus = 'approved'` or `kybStatus = 'approved'` in Supabase
- Ghost Mode routes check this via `resolveVerificationStatus()` and reject with 403 if not met
- For testing: manually insert into `verifications` table or use Persona sandbox

### 6. Supabase Tables
- `escrow_agreements_v3` -- agreements storage
- `milestones` -- per-milestone state tracking
- `submissions` -- deliverable submissions with AI verification results
- `wallets` -- Circle DCW wallet mappings
- `ghost_transactions` -- audit trail for Ghost Mode operations

---

## Test Scenario 1: Ghost Mode E2E

### Flow Overview
```
User (Shiva API)
  |
  +--> POST /ghost/deposit { amount: "10" }
  |     |
  |     +--> resolveGhostContext() -- JWT auth, wallet resolution, KYC gate
  |     +--> readUsdcBalance(walletAddress) -- pre-check USDC balance >= 10e6
  |     +--> USDC.approve(GhostUSDC, 10000000) -- Circle DCW tx
  |     +--> GhostUSDC.wrap(walletAddress, 10000000) -- Circle DCW tx
  |     +--> triggerCreWorkflow({ action: 'ghost_deposit', ... })
  |     |     |
  |     |     +--> CRE: PolicyEngine.checkTransfer() -- compliance gate
  |     |     +--> CRE: ACE /kyc?address=... -- KYC verification
  |     |     +--> CRE: USDC.balanceOf(GhostUSDC) -- verify USDC landed
  |     |     +--> CRE: readGhostIndicator + readGhostTotalSupply
  |     |     +--> CRE: TreasuryManager.getYieldValueUSDC()
  |     |     +--> CRE: POST /ghost/don-state/update (confidential)
  |     |     +--> CRE: publishAttestation({ type: "ghost_deposit", ... })
  |     |     +--> CRE: POST /contracts/cre-callback/ghost-deposit
  |     |
  |     +--> insertGhostTransaction() -- audit trail
  |     +--> readGhostBalance() -- refresh indicator
  |     +--> syncEusdcgIndicator() -- update wallets table
  |
  +--> POST /ghost/transfer { to: "0x...", amount: "5" }
  |     |
  |     +--> GhostUSDC.transferAmount(to, 5000000) -- Circle DCW tx
  |     +--> triggerCreWorkflow({ action: 'ghost_transfer', ... })
  |     |     |
  |     |     +--> CRE (EVM Log): ConfidentialTransfer event fires
  |     |     +--> CRE: ACE /kyc for sender + recipient
  |     |     +--> CRE: readGhostIndicator for both parties
  |     |     +--> CRE: ACE /transfers/sync -- DON state update
  |     |     +--> CRE: publishAttestation({ type: "ghost_transfer", ... })
  |     |
  |     +--> insertGhostTransaction()
  |
  +--> POST /ghost/withdraw { amount: "5" }
  |     |
  |     +--> GhostUSDC.unwrap(walletAddress, 5000000) -- Circle DCW tx
  |     +--> triggerCreWorkflow({ action: 'ghost_withdraw', ... })
  |     |     |
  |     |     +--> CRE: POST /ghost/don-state/query -- balance check + block check
  |     |     +--> CRE: readGhostIndicator + readGhostTotalSupply
  |     |     +--> CRE: getUserClaims() -- find active claim
  |     |     +--> CRE: USDC.balanceOf(GhostUSDC) + TreasuryManager.getYieldValueUSDC()
  |     |     +--> CRE: POST /ghost/don-state/update (delta=-5000000)
  |     |     +--> CRE: publishAttestation({ type: "ghost_withdraw", ... })
  |     |
  |     +--> readGhostClaims() -- get latest ctHash
  |     +--> insertGhostTransaction()
  |
  +--> [WAIT 30-300s for CoFHE decrypt]
  |
  +--> GET /ghost/claims -- poll until status = 'claimable'
  |
  +--> POST /ghost/claim { ctHash: "0x..." }
        |
        +--> GhostUSDC.claimUnwrapped(ctHash) -- Circle DCW tx
        +--> USDC returned to wallet via safeTransfer
        +--> insertGhostTransaction()
```

### Step 1.1: Deposit USDC into Ghost Mode

**API Call:**
```bash
curl -X POST https://shiva.bu.finance/ghost/deposit \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount": "10"}'
```

**Expected Response:**
```json
{
  "success": true,
  "txHash": "0x<64-char-hex>",
  "attestationId": "ghost-deposit-<8-char-hex>-10000000",
  "indicator": "<0-9999>"
}
```

**On-chain verification:**
```bash
# Verify GhostUSDC holds the USDC
cast call 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238 \
  "balanceOf(address)(uint256)" \
  0x6e6Ad7EDECbb4C9B7aA9453af2ba285f6d6cCcB5 \
  --rpc-url https://ethereum-sepolia-rpc.publicnode.com

# Verify user's ghost indicator changed
cast call 0x6e6Ad7EDECbb4C9B7aA9453af2ba285f6d6cCcB5 \
  "balanceOf(address)(uint256)" \
  $USER_ADDRESS \
  --rpc-url https://ethereum-sepolia-rpc.publicnode.com

# Verify GhostUSDC total supply increased
cast call 0x6e6Ad7EDECbb4C9B7aA9453af2ba285f6d6cCcB5 \
  "totalSupply()(uint256)" \
  --rpc-url https://ethereum-sepolia-rpc.publicnode.com
```

**CRE Workflow Check:**
- CRE gateway should show `workflow-ghost-deposit` execution log
- BUAttestation contract should have a new attestation with type `ghost_deposit`
- Shiva callback endpoint `/contracts/cre-callback/ghost-deposit` should receive `status: "verified"`

### Step 1.2: Transfer Encrypted Balance

**API Call:**
```bash
curl -X POST https://shiva.bu.finance/ghost/transfer \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"to": "0x<recipient-address>", "amount": "5"}'
```

**Expected Response:**
```json
{
  "success": true,
  "txHash": "0x<64-char-hex>"
}
```

**On-chain verification:**
- `ConfidentialTransfer(from, to)` event emitted on GhostUSDC
- Both parties' `balanceOf()` indicators should change
- PolicyEngine `checkTransfer()` was called (if it reverts, the whole tx reverts)

### Step 1.3: Withdraw (Unwrap)

**API Call:**
```bash
curl -X POST https://shiva.bu.finance/ghost/withdraw \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount": "5"}'
```

**Expected Response:**
```json
{
  "success": true,
  "txHash": "0x<64-char-hex>",
  "attestationId": "ghost-withdraw-<8-char-hex>-5000000",
  "claimId": "0x<64-char-hex>",
  "ctHash": "0x<64-char-hex>",
  "estimatedDecryptTime": "30-300 seconds"
}
```

### Step 1.4: Poll Claims Until Decrypted

**API Call (repeat every 10s):**
```bash
curl -X GET https://shiva.bu.finance/ghost/claims \
  -H "Authorization: Bearer $JWT_TOKEN"
```

**Expected Response (during decrypt):**
```json
{
  "success": true,
  "claims": [{
    "ctHash": "0x...",
    "requestedAmount": "5000000",
    "decryptedAmount": "0",
    "decrypted": false,
    "to": "0x<user-address>",
    "claimed": false,
    "status": "decrypting"
  }]
}
```

**Expected Response (after decrypt):**
```json
{
  "success": true,
  "claims": [{
    "ctHash": "0x...",
    "requestedAmount": "5000000",
    "decryptedAmount": "5000000",
    "decrypted": true,
    "to": "0x<user-address>",
    "claimed": false,
    "status": "claimable"
  }]
}
```

### Step 1.5: Claim USDC

**API Call:**
```bash
curl -X POST https://shiva.bu.finance/ghost/claim \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ctHash": "0x<the-ctHash-from-step-1.4>"}'
```

**Expected Response:**
```json
{
  "success": true,
  "txHash": "0x<64-char-hex>",
  "amount": "5000000"
}
```

**Final balance verification:**
```bash
# User's USDC balance should increase by 5 USDC
cast call 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238 \
  "balanceOf(address)(uint256)" \
  $USER_ADDRESS \
  --rpc-url https://ethereum-sepolia-rpc.publicnode.com
```

### Step 1.6: Verify Attestations

```bash
# Read attestation count on BUAttestation contract
# Two attestations expected: ghost_deposit + ghost_withdraw
# (ghost_transfer attestation comes from EVM Log trigger, may be async)

# Etherscan verification:
# https://sepolia.etherscan.io/address/0xC3C7A1bd7556ba93729f859F0f1D1Cb60aeEc72C#events
```

---

## Test Scenario 2: Contract Lifecycle E2E

### Flow Overview
```
1. Create agreement (POST /api/contracts/agreements/from-template)
   --> Supabase: escrow_agreements_v3 + milestones rows
   --> Email: contract-invitation to counterparty

2. Sign (payer) (POST /api/contracts/agreements/:id/sign)
   --> agreement_json.signatures[] += payer sig
   --> status: PENDING_SIGN

3. Sign (payee) (POST /api/contracts/agreements/:id/sign)
   --> agreement_json.signatures[] += payee sig
   --> status: ACTIVE (both roles present)
   --> Email: contract-signed to both parties

4. Deploy escrow (POST /api/contracts/agreements/:id/deploy-escrow)
   --> CRE workflow-escrow-deploy OR Circle DCW fallback
   --> EscrowFactoryV3.createEscrow(hash, payer, payee, token, total, amounts[], descs[])
   --> status: DEPLOYED, escrow_address stored

5. Fund escrow (POST /api/contracts/agreements/:id/fund)
   --> body: { amount, txHash }
   --> CRE workflow-escrow-yield (idle USDC -> yield)
   --> milestones: PENDING -> FUNDED
   --> Email: contract-funded to payee

6. Submit deliverable (POST /api/contracts/agreements/:id/milestones/:msId/submit)
   --> Supabase: submissions row, milestone state -> VERIFYING
   --> CRE workflow-escrow-verify OR @bu/intelligence/arbitration.runVerification()
   --> AI verdict: PASS/REJECTED with confidence + criteria scores
   --> Email: deliverable-submitted to payer, verification-result to both

7a. Release (if PASS) (POST /api/contracts/agreements/:id/milestones/:msId/release)
    --> client.contracts.release(id, msId)

7b. Dispute (if rejected or payer disagrees) (POST /api/contracts/agreements/:id/milestones/:msId/dispute)
    --> CRE workflow-escrow-dispute OR runAdvocates() + runTribunal()
    --> Notification: dispute_opened

8. Appeal (optional) (POST /api/contracts/agreements/:id/milestones/:msId/appeal)
   --> runSupremeCourt() -- Layer 4 escalation
   --> Supreme Court panel renders final verdict

9. Finalize (POST /api/contracts/agreements/:id/milestones/:msId/finalize)
   --> CRE on-chain settlement
   --> Notification: payment_released
   --> If all milestones done: Email contract-completed to both parties
```

### Step 2.1: Create Agreement

**API Call (via Next.js app route):**
```bash
curl -X POST $APP_URL/api/contracts/agreements/from-template \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Testnet Dry Run Contract",
    "templateId": "freelance-basic",
    "agreementJson": {
      "payerName": "Alice",
      "payeeName": "Bob",
      "creatorEmail": "alice@test.com",
      "counterpartyEmail": "bob@test.com"
    },
    "payerAddress": "0x<alice-address>",
    "payeeAddress": "0x<bob-address>",
    "tokenAddress": "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    "totalAmount": 50,
    "milestones": [
      { "title": "Design mockups", "amount": 20, "acceptanceCriteria": ["Figma file delivered", "Mobile responsive"] },
      { "title": "Implementation", "amount": 30, "acceptanceCriteria": ["Working deployment", "Unit tests passing"] }
    ],
    "counterpartyEmail": "bob@test.com",
    "senderName": "Alice",
    "currency": "USDC"
  }'
```

**Expected Response:**
```json
{ "success": true, "agreementId": "agr_<timestamp>_<random>" }
```

**Verify:**
- `escrow_agreements_v3` row with `status = 'DRAFT'`
- 2 `milestones` rows with `state = 'PENDING'`
- Invitation email queued via `triggerTask('send-contract-email', ...)`

### Step 2.2: Sign with EIP-191

**Payer signs:**
```bash
curl -X POST $APP_URL/api/contracts/agreements/$AGREEMENT_ID/sign \
  -H "Authorization: Bearer $ALICE_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "payer",
    "signerAddress": "0x<alice-address>",
    "signature": "0x<65-byte-eip191-signature>",
    "messageHash": "0x<32-byte-hash>"
  }'
```

**Expected:** `{ "success": true, "status": "PENDING_SIGN" }`

**Payee signs:**
```bash
curl -X POST $APP_URL/api/contracts/agreements/$AGREEMENT_ID/sign \
  -H "Authorization: Bearer $BOB_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "payee",
    "signerAddress": "0x<bob-address>",
    "signature": "0x<65-byte-eip191-signature>",
    "messageHash": "0x<32-byte-hash>"
  }'
```

**Expected:** `{ "success": true, "status": "ACTIVE" }`

**Verify signatures:**
```bash
curl -X GET $APP_URL/api/contracts/agreements/$AGREEMENT_ID/verify-signatures \
  -H "Authorization: Bearer $JWT_TOKEN"
```

**Expected:**
```json
{
  "agreementId": "agr_...",
  "signatures": [
    { "signerRole": "payer", "hasCryptoSignature": true, "signatureValid": true },
    { "signerRole": "payee", "hasCryptoSignature": true, "signatureValid": true }
  ],
  "allSigned": true,
  "allValid": true,
  "totalSignatures": 2
}
```

### Step 2.3: Deploy Escrow Contract

**API Call:**
```bash
curl -X POST $APP_URL/api/contracts/agreements/$AGREEMENT_ID/deploy-escrow \
  -H "Authorization: Bearer $ALICE_JWT"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "status": "deployed",
    "txHash": "0x...",
    "message": "Escrow deployed via Circle DCW fallback"
  }
}
```

**What happens:**
- CRE `workflow-escrow-deploy` is tried first
- If CRE unavailable: Circle DCW fallback calls `EscrowFactoryV3.createEscrow()`
  - ABI: `createEscrow(bytes32,address,address,address,uint256,uint256[],string[])`
  - Params: agreementHash, payerAddr, payeeAddr, USDC address, total (6 decimals), milestone amounts[], milestone descriptions[]
- `waitForCircleTransaction()` polls every 3s up to 120s
- Agreement status set to `DEPLOYED`, `deploy_tx_hash` stored

**On-chain verification:**
```bash
# Check the EscrowCreated event on the factory contract
# The escrow_address needs to be indexed from tx receipt logs
```

### Step 2.4: Fund Escrow

**API Call:**
```bash
curl -X POST $APP_URL/api/contracts/agreements/$AGREEMENT_ID/fund \
  -H "Authorization: Bearer $ALICE_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 50,
    "txHash": "0x<funding-tx-hash>"
  }'
```

**Expected:** `{ "success": true, "fundedAmount": 50 }`

**Side effects:**
- All milestones transition: `PENDING` -> `FUNDED`
- CRE `workflow-escrow-yield` triggered (idle USDC -> yield strategies)
- Email: `contract-funded` sent to payee
- Notification: `payment_released` (escrow funded) inserted

### Step 2.5: Submit Milestone Deliverable

**Upload files first:**
```bash
curl -X POST $APP_URL/api/contracts/agreements/$AGREEMENT_ID/milestones/$MS_ID/upload \
  -H "Authorization: Bearer $BOB_JWT" \
  -F "files=@mockups.pdf" \
  -F "files=@screenshot.png"
```

**Then submit:**
```bash
curl -X POST $APP_URL/api/contracts/agreements/$AGREEMENT_ID/milestones/$MS_ID/submit \
  -H "Authorization: Bearer $BOB_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "notes": "Design mockups completed. Figma file and mobile screenshots attached.",
    "files": [
      { "name": "mockups.pdf", "url": "https://...", "path": "agr_.../0/..." }
    ]
  }'
```

**Expected Response (includes AI verification report):**
```json
{
  "success": true,
  "title": "Testnet Dry Run Contract",
  "report": {
    "verdict": "PASS",
    "confidence": 0.85,
    "summary": "Deliverable meets acceptance criteria...",
    "criteria": [
      { "id": "criterion-0", "met": true, "reasoning": "..." },
      { "id": "criterion-1", "met": true, "reasoning": "..." }
    ]
  }
}
```

**What happens:**
- `submissions` row created with `status: 'UPLOADED'`
- Milestone state -> `VERIFYING`
- CRE `workflow-escrow-verify` tried first
- Fallback: `@bu/intelligence/arbitration.runVerification()` runs AI analysis
- Fallback also calls `publishFallbackAttestation()` for on-chain proof
- Emails: deliverable-submitted (payer), verification-result (both)

### Step 2.6: Dispute Flow (if needed)

**File dispute:**
```bash
curl -X POST $APP_URL/api/contracts/agreements/$AGREEMENT_ID/milestones/$MS_ID/dispute \
  -H "Authorization: Bearer $ALICE_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Mockups missing mobile views",
    "reason": "The Figma file only contains desktop layouts. Mobile responsive requirement not met."
  }'
```

**Appeal (Supreme Court):**
```bash
curl -X POST $APP_URL/api/contracts/agreements/$AGREEMENT_ID/milestones/$MS_ID/appeal \
  -H "Authorization: Bearer $BOB_JWT"
```

### Step 2.7: Finalize Milestone

**API Call:**
```bash
curl -X POST $APP_URL/api/contracts/agreements/$AGREEMENT_ID/milestones/$MS_ID/finalize \
  -H "Authorization: Bearer $ALICE_JWT"
```

**Expected:** Funds released to payee, notification + email sent.

### Step 2.8: Verify Yield Allocation

After funding, CRE `workflow-escrow-yield` should:
1. Move idle USDC from escrow to yield strategy
2. On milestone release, redeem yield position
3. Publish attestation with yield data

Check yield value:
```bash
cast call 0x33A4a73FD81bB6314AB7dc77301894728E6825A4 \
  "getYieldValueUSDC()(uint256)" \
  --rpc-url https://ethereum-sepolia-rpc.publicnode.com
```

---

## Test Scenario 3: Ghost -> Escrow Bridge

### Flow
1. User has eUSDCg balance from Ghost Mode deposit (Scenario 1)
2. User funds an escrow contract using Ghost Mode USDCg
3. Compliance pipeline fires: PolicyEngine + ACE KYC verification

### Step 3.1: Create + Sign Agreement (same as Scenario 2)

### Step 3.2: Fund Escrow with USDCg

This requires the escrow contract to accept USDCg (or unwrap first):
- **Option A**: Unwrap Ghost -> claim USDC -> fund escrow with USDC (straightforward, uses existing flows)
- **Option B**: Direct USDCg funding (requires escrow contract to support USDCg token)

For testnet dry-run, use **Option A** since the escrow factory currently takes USDC address as the token parameter.

**Sequence:**
```bash
# 1. Withdraw from Ghost Mode
curl -X POST https://shiva.bu.finance/ghost/withdraw \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{"amount": "50"}'

# 2. Wait for CoFHE decrypt (poll /ghost/claims)

# 3. Claim USDC
curl -X POST https://shiva.bu.finance/ghost/claim \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{"ctHash": "0x..."}'

# 4. Fund escrow with regular USDC (same as Scenario 2 Step 2.4)
```

### Step 3.3: Verify Compliance Pipeline

Both the Ghost withdraw and the escrow funding trigger compliance checks:

1. **Ghost withdraw**: CRE `workflow-ghost-withdraw` checks:
   - DON state balance sufficient
   - User not blocked
   - USDC + USYC backing covers withdrawal
   - Attestation published

2. **Escrow fund**: CRE `workflow-escrow-yield` checks:
   - Escrow address valid
   - Token is approved USDC
   - Yield allocation initiated

**Attestation verification:**
```bash
# Should see attestations for:
# 1. ghost_withdraw (from step 3.2)
# 2. escrow yield deposit (from step 3.3)
# Check BUAttestation events on Etherscan:
# https://sepolia.etherscan.io/address/0xC3C7A1bd7556ba93729f859F0f1D1Cb60aeEc72C#events
```

---

## Verification Checklist

### On-chain Attestation IDs
- [ ] `ghost_deposit` attestation published to `0xC3C7A1bd7556ba93729f859F0f1D1Cb60aeEc72C`
- [ ] `ghost_transfer` attestation published (from EVM Log trigger)
- [ ] `ghost_withdraw` attestation published
- [ ] Escrow verification attestation published (from `publishFallbackAttestation()`)
- [ ] Attestation entity IDs follow format: `ghost-deposit-<hash-prefix>`, `ghost-transfer-<hash-prefix>`, etc.

### CRE Workflow Execution Logs
- [ ] `workflow-ghost-deposit` completes 7 steps (compliance, verify USDC, FHE state, yield check, DON update, attestation, callback)
- [ ] `workflow-ghost-transfer` fires on ConfidentialTransfer event (5 steps: compliance, indicators, DON sync, attestation, callback)
- [ ] `workflow-ghost-withdraw` completes 8 steps (DON validate, ghost state, claims, backing verify, DON update, attestation, callback)
- [ ] `workflow-escrow-deploy` or Circle DCW fallback succeeds
- [ ] `workflow-escrow-verify` or `runVerification()` fallback succeeds
- [ ] Fallback paths log `CRE unavailable` warnings (not errors)

### Email Delivery Confirmation
- [ ] `contract-invitation` email sent on agreement creation
- [ ] `contract-signed` email sent when both parties sign
- [ ] `contract-funded` email sent when escrow is funded
- [ ] `contract-deliverable-submitted` email sent to payer on submission
- [ ] `contract-verification-result` email sent to both on AI verdict
- [ ] `contract-completed` email sent when all milestones finalized
- All emails triggered via `triggerTask('send-contract-email', ...)` in Shiva controller

### Notification Panel Updates
- [ ] `counterparty_signed` notification inserted on sign
- [ ] `payment_released` notification on escrow fund
- [ ] `milestone_verified` notification on deliverable submit
- [ ] `dispute_opened` notification on dispute filing
- [ ] `payment_released` notification on finalize

### Database State Transitions
- [ ] Agreement: `DRAFT` -> `PENDING_SIGN` -> `ACTIVE` -> `DEPLOYED` -> `ACTIVE` (funded)
- [ ] Milestones: `PENDING` -> `FUNDED` -> `VERIFYING` -> (PASS: release) or (FAIL: dispute)
- [ ] Submissions: `UPLOADED` -> `VERIFIED` or `REJECTED`
- [ ] `ghost_transactions` table has audit entries for deposit, transfer, withdraw, claim

### Timing Expectations
- Circle DCW transaction confirmation: 30-120s (3s poll interval)
- CoFHE decrypt for unwrap claims: 30-300s
- AI verification (fallback): 5-15s
- CRE workflow round-trip: 10-30s
- Email delivery: 1-5 minutes (async via Trigger.dev)
