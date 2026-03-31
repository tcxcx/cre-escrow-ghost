# Ghost Mode Multichain Bridge + eUSDCg Visibility

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix Ghost Mode deposits to work from any chain by bridging USDC to Sepolia (where contracts live), fix KYC re-prompting, and make eUSDCg visible in the wallet currency selector.

**Architecture:** Ghost contracts (GhostUSDC, USDCg, PolicyEngine) are deployed on ETH-Sepolia. When a user's Circle DCW wallet is on a different chain (e.g., AVAX-FUJI, ARB-SEPOLIA), we use the existing `executeTransferAPI` to bridge USDC to Sepolia before executing the 4-step Ghost deposit. Server-side, `resolveGhostContext` must resolve the user's ETH-SEPOLIA wallet specifically.

**Tech Stack:** Next.js server actions, Hono (Shiva), Circle DCW, viem, `@bu/transfer` (CCTP bridge), `@bu/wallets`, Supabase

---

## Bug Summary

| # | Issue | Root Cause | Fix Location |
|---|-------|-----------|-------------|
| 1 | Ghost balance = $0 after deposit | Circle wallet on AVAX-FUJI, contracts on Sepolia → wrong chain | Server: `resolveGhostContext`, Client: `executeDeposit` |
| 2 | KYC re-prompted every entry | Session store not updated after Persona completes | `ghost-kyc-gate.tsx` — **DONE** |
| 3 | Server rejects KYB-only users | `resolveGhostContext` only checks `kycStatus`, ignores `kybStatus` | `ghost-fhe.ts` — **DONE** |
| 4 | eUSDCg not in wallet currencies | Explicitly excluded as "internal plumbing" | `blockchain-support.ts`, `WalletContext.tsx` |

---

### Task 1: Add `GHOST_CONTRACTS_BLOCKCHAIN` constant

**Files:**
- Modify: `packages/wallets/src/constants/blockchain-support.ts`
- Modify: `packages/wallets/src/constants/index.ts`

**Step 1: Add the constant**

In `packages/wallets/src/constants/blockchain-support.ts`, add near the top (after the `BLOCKCHAIN_CURRENCY_SUPPORT` map):

```typescript
/** The blockchain where Ghost Mode contracts (GhostUSDC, USDCg, PolicyEngine) are deployed */
export const GHOST_CONTRACTS_BLOCKCHAIN = 'ETH-SEPOLIA' as const;
```

**Step 2: Re-export from constants/index.ts**

Add `GHOST_CONTRACTS_BLOCKCHAIN` to the blockchain-support export block in `packages/wallets/src/constants/index.ts`.

**Step 3: Commit**

```bash
git add packages/wallets/src/constants/blockchain-support.ts packages/wallets/src/constants/index.ts
git commit -m "feat(wallets): add GHOST_CONTRACTS_BLOCKCHAIN constant"
```

---

### Task 2: Server-side — resolve Sepolia wallet in `resolveGhostContext`

**Files:**
- Modify: `apps/shiva/src/routes/ghost-fhe.ts`
- Reference: `packages/supabase/src/queries/wallets.ts` (`getTeamWalletByUserTeamBlockchain`)

**Step 1: Import blockchain-specific wallet query**

Add import at top of `apps/shiva/src/routes/ghost-fhe.ts`:

```typescript
import { getTeamWalletByUserTeamBlockchain } from '@bu/supabase/queries/wallets';
```

**Step 2: Modify `resolveGhostContext` to find Sepolia wallet**

Replace the wallet resolution logic. Instead of `getPrimaryTeamWallet` (returns any chain), use `getTeamWalletByUserTeamBlockchain` to find the ETH-SEPOLIA wallet:

```typescript
async function resolveGhostContext(c) {
  const userId = c.get('userId') as string;
  const teamId = c.get('teamId') as string;

  // Ghost contracts are on ETH-SEPOLIA — find that specific wallet
  const GHOST_CHAIN = 'ETH-SEPOLIA';
  const sepoliaWallet = await getTeamWalletByUserTeamBlockchain(supabaseAdmin, userId, teamId, GHOST_CHAIN);

  if (!sepoliaWallet || !sepoliaWallet.wallet_address) {
    // Fallback: try primary wallet (might be on Sepolia)
    const primaryWallet = await getPrimaryTeamWallet(supabaseAdmin, userId, teamId);
    if (!primaryWallet?.wallet_address) {
      return { ok: false, response: c.json({ error: 'NOT_FOUND', message: 'No team wallet found' }, 404) };
    }
    if (!primaryWallet.circle_wallet_id) {
      return { ok: false, response: c.json({ error: 'WALLET_NOT_SYNCED', message: 'Wallet not synced with Circle' }, 400) };
    }

    console.log('[ghost] WARNING: using primary wallet, blockchain:', (primaryWallet as any).blockchain, '— Ghost contracts are on', GHOST_CHAIN);

    // Proceed but log the chain mismatch
    const { kycStatus, kybStatus } = await resolveVerificationStatus(supabaseAdmin, userId, teamId);
    if (kycStatus !== 'approved' && kybStatus !== 'approved') {
      return { ok: false, response: c.json({ error: 'KYC_REQUIRED', message: 'Ghost Mode requires verification' }, 403) };
    }

    return {
      ok: true,
      userId, teamId,
      walletDbId: primaryWallet.id,
      walletAddress: primaryWallet.wallet_address,
      walletId: primaryWallet.circle_wallet_id,
    };
  }

  if (!sepoliaWallet.circle_wallet_id) {
    return { ok: false, response: c.json({ error: 'WALLET_NOT_SYNCED', message: 'Sepolia wallet not synced with Circle' }, 400) };
  }

  console.log('[ghost] resolved Sepolia wallet:', {
    walletAddress: sepoliaWallet.wallet_address,
    circleWalletId: sepoliaWallet.circle_wallet_id,
    blockchain: GHOST_CHAIN,
  });

  const { kycStatus, kybStatus } = await resolveVerificationStatus(supabaseAdmin, userId, teamId);
  if (kycStatus !== 'approved' && kybStatus !== 'approved') {
    return { ok: false, response: c.json({ error: 'KYC_REQUIRED', message: 'Ghost Mode requires verification' }, 403) };
  }

  return {
    ok: true,
    userId, teamId,
    walletDbId: sepoliaWallet.id ?? '',
    walletAddress: sepoliaWallet.wallet_address,
    walletId: sepoliaWallet.circle_wallet_id,
  };
}
```

**Step 3: Verify `getTeamWalletByUserTeamBlockchain` signature**

Check `packages/supabase/src/queries/wallets.ts` lines 357-377. It takes `(supabase, userId, teamId, blockchain)` and returns `{ blockchain, circle_wallet_id, wallet_address } | null`. If the return type doesn't include `id`, add it to the select query.

**Step 4: Commit**

```bash
git add apps/shiva/src/routes/ghost-fhe.ts
git commit -m "fix(ghost): resolve ETH-SEPOLIA wallet for Ghost deposits"
```

---

### Task 3: Client-side — bridge USDC to Sepolia before Ghost deposit

**Files:**
- Modify: `apps/app/src/components/header/ghost-mode/use-ghost-mode.ts`

**Step 1: Add imports**

```typescript
import { executeTransferAPI, type TransferWallet } from '@/hooks/use-transfer-api';
```

**Step 2: Accept wallet info in the hook**

The hook needs to know the user's primary wallet blockchain. Add a `primaryWallet` parameter or access it inside the hook. Since `useGhostMode` doesn't currently have wallet access, add parameters:

```typescript
export function useGhostMode(
  walletType: 'team' | 'individual',
  userId: string,
  primaryWallet?: { circle_wallet_id: string; blockchain: string; wallet_address: string } | null,
) {
```

**Step 3: Modify `executeDeposit` to bridge if needed**

```typescript
const GHOST_CHAIN = 'ETH-SEPOLIA';

const executeDeposit = useCallback(
  async (depositAmount: number) => {
    pendingModeRef.current = 'deposit';
    pendingAmountRef.current = depositAmount;
    setError(null);
    setKycPending(null);
    setStep('processing');

    try {
      // If wallet is not on Sepolia, bridge USDC first
      if (primaryWallet && primaryWallet.blockchain !== GHOST_CHAIN) {
        console.log('[ghost] bridging USDC from', primaryWallet.blockchain, 'to', GHOST_CHAIN);

        // Use transfer API to bridge USDC to own wallet on Sepolia
        const bridgeResult = await executeTransferAPI({
          to: primaryWallet.wallet_address, // Same user, different chain
          amount: depositAmount.toFixed(2),
          teamId: '', // Will be resolved server-side from session
          currency: 'USDC',
          wallet: {
            circle_wallet_id: primaryWallet.circle_wallet_id,
            blockchain: primaryWallet.blockchain,
          },
          destinationChain: GHOST_CHAIN,
          description: 'Ghost Mode bridge to Sepolia',
        });

        if (!bridgeResult.success) {
          setError(`Bridge failed: ${bridgeResult.error ?? 'Unknown error'}`);
          setStep('error');
          return;
        }

        // Wait a few seconds for bridge to settle before depositing
        await new Promise(r => setTimeout(r, 5000));
      }

      // Now execute the Ghost deposit (server uses Sepolia wallet)
      const result = await ghostFheDeposit({
        amount: depositAmount.toFixed(2),
      });

      if (!result.success) {
        setError(result.error ?? 'Deposit failed');
        setStep('error');
        return;
      }

      if (result.indicator) {
        setFheIndicator(result.indicator);
      }
      setEUsdcgBalance((prev) => prev + depositAmount);
      await fetchBalance();
      setStep('success');
    } catch (err) {
      setError((err as Error).message ?? 'Deposit failed');
      setStep('error');
    }
  },
  [fetchBalance, primaryWallet],
);
```

**Step 4: Update `useGhostMode` call sites**

In the component that calls `useGhostMode`, pass `primaryTeamWallet` from `useWallet()`:

File: Find where `useGhostMode` is called (likely in a parent component or the wallet dropdown). Pass the wallet:

```typescript
const { primaryTeamWallet } = useWallet();
const ghostMode = useGhostMode(walletType, userId, primaryTeamWallet);
```

**Step 5: Commit**

```bash
git add apps/app/src/components/header/ghost-mode/use-ghost-mode.ts
# + any call site files
git commit -m "feat(ghost): bridge USDC to Sepolia before deposit if on different chain"
```

---

### Task 4: Make eUSDCg visible in wallet currency selector

**Files:**
- Modify: `packages/wallets/src/constants/blockchain-support.ts`
- Modify: `apps/app/src/context/WalletContext.tsx`

**Step 1: Add eUSDCg to `SUPPORTED_CURRENCY_META`**

In `packages/wallets/src/constants/blockchain-support.ts`, find the `SUPPORTED_CURRENCY_META` map and add eUSDCg:

```typescript
eUSDCg: {
  code: 'eUSDCg',
  name: 'Ghost USDC',
  decimals: 6,
  icon: 'ghost', // or whatever icon key is used
},
```

**Step 2: Update `getSupportedCurrencies` in WalletContext**

In `apps/app/src/context/WalletContext.tsx`, find the `getSupportedCurrencies` function (around lines 402-439) and add eUSDCg to the returned list when the wallet is on ETH-SEPOLIA and has a non-zero `eusdcg_balance`:

```typescript
// Add eUSDCg if the wallet has a Ghost Mode balance
if (wallet.eusdcg_balance && wallet.eusdcg_balance > 0) {
  currencies.push({ code: 'eUSDCg', name: 'Ghost USDC', decimals: 6 });
}
```

Or alternatively, always include eUSDCg for Sepolia wallets:

```typescript
if (wallet.blockchain === 'ETH-SEPOLIA') {
  currencies.push({ code: 'eUSDCg', name: 'Ghost USDC', decimals: 6 });
}
```

**Step 3: Commit**

```bash
git add packages/wallets/src/constants/blockchain-support.ts apps/app/src/context/WalletContext.tsx
git commit -m "feat(wallets): show eUSDCg in wallet currency selector"
```

---

### Task 5: Clean up debug console.logs

**Files:**
- Modify: `packages/stocks/src/services/price.ts` — remove debug logs
- Modify: `packages/stocks/src/services/history.ts` — remove debug logs
- Modify: `apps/app/src/app/api/earn/history/route.ts` — remove debug logs
- Modify: `apps/app/src/app/api/stocks/prices/route.ts` — remove debug logs
- Modify: `apps/app/src/hooks/use-price-history.ts` — remove debug logs
- Modify: `apps/app/src/hooks/use-stock-prices.ts` — remove debug logs
- Modify: `apps/shiva/src/routes/ghost-fhe.ts` — remove debug logs added during investigation

**Step 1: Remove all `console.log('[stocks/price]` and `[stocks/history]` debug statements**

**Step 2: Remove all `[use-stock-prices]`, `[use-price-history]`, `[api/stocks/prices]`, `[api/earn/history]` debug logs**

**Step 3: Remove `[ghost] resolveGhostContext wallet:` debug log once the chain issue is confirmed fixed**

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove stock and ghost debug console.logs"
```

---

## Execution Order

1. **Task 1** — Add constant (no deps)
2. **Task 2** — Server-side Sepolia wallet resolution (depends on Task 1 for constant, but can hardcode)
3. **Task 3** — Client-side bridge before deposit (depends on Task 2 being deployed)
4. **Task 4** — eUSDCg visibility (independent)
5. **Task 5** — Cleanup (last)

## Already Done (this session)

- [x] KYC session persistence fix (`ghost-kyc-gate.tsx` — `setKYCData({ hasCompletedAnyKYC: true })`)
- [x] KYB acceptance fix (`ghost-fhe.ts` — check both `kycStatus` and `kybStatus`)
- [x] Diagnostic logging added to `resolveGhostContext`
- [x] Massive/Polygon.io price fix — switched from paid snapshot endpoint to free daily bars
- [x] Widget View History buttons (Earn + Contracts)
- [x] `transfer-core` build fix (`supportsUSDg`/`supportsEUSDCg` re-export)
