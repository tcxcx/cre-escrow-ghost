# Ghost Mode Private Transfers — Integration Design (v2)

**Date**: 2026-03-06
**Status**: Approved
**Branch**: next-ui

## Summary

Add a "Send with Ghost Mode" toggle to existing transfer flows. When toggled, the transfer calls the existing `ghostTransfer()` server action instead of the normal transfer path. No changes to `transfer-core`, `TransferService`, or the `Protocol` type.

## Why Not a Protocol Executor

The previous plan forced private transfers into `BaseProtocolExecutor` — fake 0-gas estimates, a `Protocol` type union change, `TransferService` registration. This is wrong because:
- Private transfers have their own complete pipeline (`@bu/private-transfer`)
- They should never be auto-selected by route optimization
- The user explicitly toggles them ON
- `ghostTransfer()` already works end-to-end

The toggle simply switches which code path the form takes. That's a UI concern, not a protocol concern.

## Design Decisions

1. **Sender must explicitly activate Ghost Mode** (pre-load USDCg balance via existing activation flow)
2. **Receiver auto-gets vault position** on first private receipt — only requires Bu account + KYC/KYB
3. **User explicitly toggles "Send with Ghost Mode"** — not auto-selected
4. **Team wallets require KYB, personal wallets require KYC** for recipient eligibility
5. **Yield is invisible** — TreasuryManager auto-allocates, Bu keeps the spread
6. **Shielded addresses are invisible** — managed server-side, never shown
7. **Dev-only** — `NODE_ENV === 'development'` gate on all Ghost Mode code

## Architecture

```
Transfer Form (existing)
  │
  ├─ Ghost Mode toggle OFF → normal transfer flow (unchanged)
  │
  └─ Ghost Mode toggle ON  → ghostTransfer() server action
                               → POST /private-transfer/transfer (Shiva, existing)
                                 → executePrivateTransfer() (@bu/private-transfer, existing)
                                   → compliance check
                                   → EIP-712 sign (Circle DCW)
                                   → CRE API vault-to-vault transfer
                                   → auto-vault for first-time receiver
```

## Eligibility Logic

Recipient wallet type determines the verification requirement:
- **Team wallet** → checks KYB status (business verification)
- **Personal wallet** → checks KYC status (identity verification)

```
Toggle enabled when:
  - sender has Ghost Mode active (USDCg > 0)
  - sender.usdcgBalance >= amount
  - recipient is on Bu
  - recipient team wallet? → KYB approved
  - recipient personal wallet? → KYC approved

Toggle disabled with hover card:
  - "Recipient is not on Bu yet"
  - "Recipient's business needs to complete verification (KYB)"
  - "Recipient needs to complete identity verification (KYC)"

Toggle enabled but insufficient balance → toast:
  - "Top up your Ghost balance"
```

## Components (~210 LOC, 4 files modified + 1 new)

| # | Piece | LOC | Location |
|---|-------|-----|----------|
| 1 | `checkPrivateEligibility()` | ~60 | `packages/private-transfer/src/eligibility/index.ts` (NEW) |
| 2 | `GET /private-transfer/eligibility` | ~40 | `apps/shiva/src/routes/private-transfer.ts` (APPEND) |
| 3 | `ghostEligibility()` action | ~15 | `apps/app/src/actions/ghost-mode-actions.ts` (APPEND) |
| 4 | `GhostModeToggle` component | ~80 | `apps/app/src/components/transfers/ghost-mode-toggle.tsx` (NEW) |
| 5 | Wire into TransferDialog | ~15 | `apps/app/src/components/transfer-dialog/TransferDialog.tsx` (MODIFY) |

### Existing Code (No Changes Needed)

- `ghostTransfer()` server action — already calls `POST /private-transfer/transfer`
- Shiva `/private-transfer/*` routes — 5 endpoints, fully functional
- `@bu/private-transfer` — complete pipeline (deposit/withdraw/transfer/compliance/KYC)
- Ghost Mode UI — 11 components, full activation flow
- Smart contracts — USDCg, TreasuryManager, ACE Vault, PolicyEngine, BUAttestation
- Wallet display — already renders USDCg token
- Contact resolver — already resolves recipient Bu user info

## Deployed Contracts (Sepolia)

| Contract | Address |
|----------|---------|
| USDCg | `0x2F28A8378798c5B42FC28f209E903508DD8F878b` |
| TreasuryManager | `0x33A4a73FD81bB6314AB7dc77301894728E6825A4` |
| PolicyEngine | `0x76b727ed158fe58CaFe4FF5F98D0D98E7244F926` |
| ACE Vault | `0xE588a6c73933BFD66Af9b4A07d48bcE59c0D2d13` |
| BUAttestation | `0xC3C7A1bd7556ba93729f859F0f1D1Cb60aeEc72C` |

## Revenue Model

Bu earns yield on all USDC backing USDCg via TreasuryManager auto-allocation to USYC (Hashnote). Yield accrues as long as anyone holds USDCg. CRE treasury-rebalance workflow monitors buffer ratio every 4 hours.

## Constraints

- Dev-only (`NODE_ENV === 'development'`)
- Sepolia testnet only
- Requires Circle SDK env vars configured
- No liquidity seeded yet
- Private transfers only between Bu users
