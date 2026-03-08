# Ghost Mode Fund Flow Design — Mint/Redeem Model

> Date: 2026-03-05 | Branch: `next-ui`
> Status: Approved

## Overview

USDg is a **receipt token** for USDC deposited. Users deposit USDC, receive privacy-wrapped USDg in the ACE Vault. The USDC is converted to USYC (Hashnote yield vault) where Bu keeps the yield spread. On withdraw, USYC is auto-redeemed back to USDC and sent to the user.

All on-chain interactions use **Circle DCW `createContractExecutionTransaction`** with embedded compliance screening. The CRE orchestrates every step for safety and compliance.

## Architecture

### 3-Layer Compliance
1. **Circle Compliance Engine** — embedded on every `createContractExecutionTransaction` call
2. **PolicyEngine** — on-chain `eth_call` check before vault operations
3. **CRE API** — EIP-712 authenticated requests for vault deposit/withdraw/transfer

### Key Contracts (Sepolia)
- **ACE Vault**: `0xE588a6c73933BFD66Af9b4A07d48bcE59c0D2d13`
- **USDg**: `0x43b8c40dC785C6aB868d2dfA0a91a8cc8e7d4ef6` (6 decimals, ERC20+Permit+Burnable)
- **PolicyEngine**: `0x806DD4d26A0930d4bEd506B81eb8f57F334Cd53e` (ERC1967Proxy → Chainlink impl)
- **USYC Teller**: `0x96424C885951ceb4B79fecb934eD857999e6f82B`
- **USYC Token**: `0x38D3A3f8717F4DB1CcB4Ad7D8C755919440848A3`
- **USYC Oracle**: `0x35b96d80C72f873bACc44A1fACfb1f5fac064f1a`

## Deposit Flow (6 Steps)

```
User USDC → Treasury Wallet → USYC Teller → Mint USDg → ACE Vault
```

1. **Transfer USDC** — User sends USDC to treasury wallet via `createContractExecutionTransaction` (ERC20 transfer)
2. **Compliance Check** — PolicyEngine `eth_call` check on (sender, treasury, token, amount)
3. **Subscribe USYC** — Treasury approves USDC to Teller, then calls `teller.deposit(amount, treasury)` converting USDC→USYC
4. **Mint USDg** — Treasury calls `usdg.mint(treasury, amount)` creating receipt tokens
5. **Vault Deposit** — Treasury approves USDg to vault, then calls `vault.deposit(usdg, amount)` via CRE API with EIP-712 auth
6. **Query Balance** — Return updated shielded balance from CRE API

## Withdraw Flow (6 Steps)

```
ACE Vault → Burn USDg → Redeem USYC → USDC → User
```

1. **Request Ticket** — CRE API `withdrawWithTicket` with EIP-712 signed request
2. **Redeem from Vault** — Execute ticket on-chain: `vault.withdrawWithTicket(usdg, amount, ticket)`
3. **Burn USDg** — Treasury calls `usdg.burn(amount)` destroying the receipt tokens
4. **Check USDC Balance** — Read treasury USDC balance on-chain
5. **Auto-Redeem USYC** — If USDC insufficient, call `teller.redeem(deficit, treasury, treasury)` converting USYC→USDC
6. **Transfer USDC** — Send USDC from treasury to user wallet via `createContractExecutionTransaction`

## TreasuryRebalancer — Buffer Manager Only

The rebalancer is NOT part of deposit/withdraw. It runs as a **Chainlink Automation cron** to maintain a 15% liquid USDC buffer in the treasury.

- **Trigger**: Chainlink Automation (time-based, e.g. every 4 hours)
- **Logic**: Read USDC/USYC balances → compute ratio → subscribe or redeem to maintain 15% USDC buffer
- **Minimum threshold**: $100 to avoid dust transactions
- **On deposit**: 100% USDC converts to USYC immediately. The cron later rebalances to keep 15% liquid.

## Files to Modify

### `packages/private-transfer/src/deposit/index.ts`
- Add USDC transfer step (user → treasury) via Circle DCW
- Add compliance check via PolicyEngine
- Add USDC approve + subscribe to USYC via Teller
- Keep existing: mint USDg + approve + vault deposit

### `packages/private-transfer/src/withdraw/index.ts`
- Keep existing: ticket + redeem from vault + burn
- Add USDC balance check on treasury
- Add auto-redeem USYC if USDC insufficient
- Add USDC transfer to user via Circle DCW

### `packages/treasury-yield/src/teller/index.ts`
- Add USDC approve step before `teller.deposit()` (currently missing)

### `apps/shiva/src/routes/private-transfer.ts`
- Update deposit/withdraw route handlers to pass new params (user wallet address)

## Circle DCW Integration

All on-chain calls use `createContractExecutionTransaction`:
```typescript
{
  walletId: treasuryWalletId,
  contractAddress: targetContract,
  abiFunctionSignature: "function transfer(address,uint256)",
  abiParameters: [recipient, amount],
  fee: { type: "level", config: { feeLevel: "MEDIUM" } }
}
```

For simple ERC20 transfers, can also use `createTransaction`:
```typescript
{
  walletId: treasuryWalletId,
  tokenAddress: usdcAddress,
  destinationAddress: recipient,
  amounts: [amount],
  blockchain: "ETH-SEPOLIA"
}
```

## EIP-712 Auth (CRE API)

5 message types for vault operations, domain: `CompliantPrivateTokenDemo v0.0.1` on chain `11155111` at vault `0xE588...`. Implemented in `packages/private-transfer/src/eip712/index.ts`.

## Error Handling

- **Compliance rejection**: Return structured error with reason from PolicyEngine
- **Insufficient USYC for redeem**: Fail withdraw with "insufficient treasury balance" — should never happen if rebalancer runs
- **Circle tx failure**: Retry with exponential backoff, max 3 attempts
- **CRE API timeout**: 30s timeout, single retry
