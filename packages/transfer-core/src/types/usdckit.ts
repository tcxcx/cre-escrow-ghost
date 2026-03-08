import type { Account } from '@circle-fin/usdckit';
import { AVAX_FUJI } from '@circle-fin/usdckit/chains';
import type { createCircleClient } from '@circle-fin/usdckit';
import { createKitClient } from '@bu/circle';

// Chain type - inferred from USDCKit chain objects
export type USDKitChain = typeof AVAX_FUJI;

// Client type - inferred from createKitClient
export type USDKitClient = ReturnType<typeof createKitClient>;

// Account type from USDCKit
export type USDKitAccount = Account;

// Address type
export type Address = `0x${string}`;

// Token amount type - USDCKit accepts string numbers or bigint
export type TokenAmount = `${number}` | bigint | string;

// Extract parameter types from client methods - use Partial for optional chain
export type TransferParams = Parameters<USDKitClient['transfer']>[0];
export type SweepParams = Parameters<USDKitClient['sweep']>[0];
export type SwapParams = Parameters<USDKitClient['swap']>[0];
export type SwapQuoteParams = Parameters<USDKitClient['getSwapExactInQuote']>[0];
export type PermitParams = Parameters<USDKitClient['permit']>[0];
export type SignPermitParams = Parameters<USDKitClient['signEIP2612Permit']>[0];
export type DripParams = Parameters<USDKitClient['drip']>[0];
export type GetTokenBalanceParams = Parameters<USDKitClient['getTokenBalance']>[0];
export type GetTokenBalancesParams = Parameters<USDKitClient['getTokenBalances']>[0];

// Helper type for parameters that accept chain objects
export type ChainParam = USDKitChain;

// Extract return types
export type TransferResult = Awaited<ReturnType<USDKitClient['transfer']>>;
export type SweepResult = Awaited<ReturnType<USDKitClient['sweep']>>;
export type SwapResult = Awaited<ReturnType<USDKitClient['swap']>>;
export type SwapQuoteResult = Awaited<ReturnType<USDKitClient['getSwapExactInQuote']>>;
export type PermitResult = Awaited<ReturnType<USDKitClient['permit']>>;
export type SignPermitResult = Awaited<ReturnType<USDKitClient['signEIP2612Permit']>>;
export type DripResult = Awaited<ReturnType<USDKitClient['drip']>>;

// Helper to extract transaction hash from TransferResult
export function extractTransactionHash(result: TransferResult | SweepResult | SwapResult | PermitResult): `0x${string}` {
  if (Array.isArray(result) && result.length > 0) {
    const first = result[0];
    if (first && typeof first === 'object' && 'hash' in first) {
      return first.hash as `0x${string}`;
    }
  }
  if (typeof result === 'string' && result.startsWith('0x')) {
    return result as `0x${string}`;
  }
  throw new Error('Unable to extract transaction hash from result');
}

// GetTokenBalanceReturnType from USDCKit API
// https://docs-w3s-node-sdk.circle.com/functions/actions.getTokenBalance.html
export type TokenBalanceResult = {
  decimals: number | undefined;
  formatted: string; // NativeUnits
  symbol: string | undefined;
  token: Address | undefined;
  value: bigint | string; // BaseUnits
};

export type TokenBalancesResult = Awaited<ReturnType<USDKitClient['getTokenBalances']>>;

// Fee types
export type FeeValuesEIP1559 = TransferParams extends { fees?: infer F } ? F : never;

// Token contract type
export type TokenContract = USDKitChain['contracts'][keyof USDKitChain['contracts']];

// Helper to extract balance value from TokenBalanceResult
// According to USDCKit docs: value is BaseUnits (bigint or string)
// Note: USDCKit may return { amount: ... } or { value: ... } depending on version
export function extractBalanceValue(balance: TokenBalanceResult | bigint | string | unknown): bigint {
  // Handle direct bigint/string (legacy/fallback)
  if (typeof balance === 'bigint') {
    return balance;
  }
  if (typeof balance === 'string') {
    try {
      // Handle empty string or invalid strings
      const trimmed = balance.trim();
      if (!trimmed || trimmed === '0' || trimmed === '') return BigInt(0);
      return BigInt(trimmed);
    } catch {
      return BigInt(0);
    }
  }

  // Handle TokenBalanceResult object
  if (typeof balance === 'object' && balance !== null) {
    // Check for 'amount' property first (USDCKit may use this)
    if ('amount' in balance) {
      const amount = (balance as { amount: unknown }).amount;
      if (typeof amount === 'bigint') return amount;
      if (typeof amount === 'string') {
        try {
          const trimmed = amount.trim();
          if (!trimmed || trimmed === '0' || trimmed === '') return BigInt(0);
          return BigInt(trimmed);
        } catch {
          return BigInt(0);
        }
      }
      if (typeof amount === 'number') return BigInt(Math.floor(amount));
    }

    // Check for 'value' property (new format per docs)
    if ('value' in balance) {
      const value = (balance as { value: unknown }).value;
      if (typeof value === 'bigint') return value;
      if (typeof value === 'string') {
        try {
          const trimmed = value.trim();
          if (!trimmed || trimmed === '0' || trimmed === '') return BigInt(0);
          return BigInt(trimmed);
        } catch {
          return BigInt(0);
        }
      }
      if (typeof value === 'number') return BigInt(Math.floor(value));
    }
  }

  // Default to 0 if we can't parse
  return BigInt(0);
}

// Helper to extract token symbol from balance result
export function extractTokenSymbol(balance: TokenBalanceResult | unknown): string | undefined {
  if (typeof balance === 'object' && balance !== null) {
    if ('symbol' in balance) {
      return (balance as { symbol?: string }).symbol;
    }
    if ('token' in balance) {
      const token = (balance as { token?: { symbol?: string } }).token;
      return token?.symbol;
    }
  }
  return undefined;
}

// Helper to extract amount string from balance result
// Note: USDCKit may return { amount: ... } or { value: ... } depending on version
export function extractAmount(balance: TokenBalanceResult | bigint | string | unknown): string {
  // Handle direct bigint/string (legacy/fallback)
  if (typeof balance === 'bigint') {
    return balance.toString();
  }
  if (typeof balance === 'string') {
    return balance.trim() || '0';
  }

  // Handle TokenBalanceResult object
  if (typeof balance === 'object' && balance !== null) {
    // Check for 'amount' property first (USDCKit may use this)
    if ('amount' in balance) {
      const amount = (balance as { amount: unknown }).amount;
      if (typeof amount === 'bigint') return amount.toString();
      if (typeof amount === 'string') return amount.trim() || '0';
      if (typeof amount === 'number') return Math.floor(amount).toString();
    }

    // Check for 'value' property (new format per docs)
    if ('value' in balance) {
      const value = (balance as { value: unknown }).value;
      if (typeof value === 'bigint') return value.toString();
      if (typeof value === 'string') return value.trim() || '0';
      if (typeof value === 'number') return Math.floor(value).toString();
    }
  }

  return '0';
}
