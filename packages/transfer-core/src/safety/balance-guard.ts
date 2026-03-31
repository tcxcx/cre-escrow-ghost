/**
 * Balance Guard — blocking balance validation for transfer executors.
 *
 * Pure functions: no DB access, no side-effects.
 *
 * Precision contract:
 * - Uses integer arithmetic with 6 decimal places (USDC/EURC standard)
 * - Safe for amounts up to MAX_SAFE_AMOUNT (9M tokens)
 * - Throws BalancePrecisionError above that threshold
 * - Fee calculations upstream use Decimal.js (see @bu/fee/functions/calculate)
 *   which rounds to 2 decimal places — values arrive here already rounded
 */

export interface BalanceCheckParams {
  balance: number;
  amount: number;
  platformFee?: string;
  tokenSymbol: string;
  walletId: string;
}

export interface BalanceCheckResult {
  sufficient: boolean;
  totalRequired: number;
  available: number;
  shortfall: number;
}

/**
 * Maximum amount (in token units) where integer arithmetic with 6-decimal
 * precision stays within Number.MAX_SAFE_INTEGER.
 *
 * 9_000_000 * 1_000_000 = 9e12, well within MAX_SAFE_INTEGER (~9.007e15).
 * Above this threshold, Math.round(parseFloat(s) * DECIMALS) silently loses
 * precision and balance checks become unreliable.
 */
const MAX_SAFE_AMOUNT = 9_000_000;

/**
 * Check whether the wallet balance covers the transfer amount + optional fee.
 * Returns a result object — does NOT throw.
 *
 * Throws if any value exceeds MAX_SAFE_AMOUNT to prevent silent precision loss
 * with the integer-arithmetic approach.
 */
export function checkBalance(params: BalanceCheckParams): BalanceCheckResult {
  // Use integer arithmetic (6 decimal places) to avoid floating-point errors
  // USDC/EURC have 6 decimals; this approach is safe for all stablecoins
  const DECIMALS = 1_000_000;

  const feeValue = params.platformFee ? parseFloat(params.platformFee) : 0;

  // Guard against precision loss: reject amounts that would exceed MAX_SAFE_INTEGER
  // when multiplied by DECIMALS
  for (const [label, value] of [
    ['balance', params.balance],
    ['amount', params.amount],
    ['platformFee', feeValue],
  ] as const) {
    if (Math.abs(value) > MAX_SAFE_AMOUNT) {
      throw new BalancePrecisionError(
        `${label} value ${value} exceeds safe precision threshold (${MAX_SAFE_AMOUNT} ${params.tokenSymbol}). ` +
          `Use string-based arithmetic for amounts above ${MAX_SAFE_AMOUNT}.`,
      );
    }
  }

  const toInt = (s: string) => Math.round(parseFloat(s) * DECIMALS);

  const feeInt = params.platformFee ? toInt(params.platformFee) : 0;
  const amountInt = Math.round(params.amount * DECIMALS);
  const balanceInt = Math.round(params.balance * DECIMALS);
  const totalRequiredInt = amountInt + feeInt;
  const shortfallInt = totalRequiredInt - balanceInt;

  // Convert back to floats for the result interface
  const totalRequired = totalRequiredInt / DECIMALS;
  const shortfall = shortfallInt > 0 ? shortfallInt / DECIMALS : 0;

  return {
    sufficient: balanceInt >= totalRequiredInt,
    totalRequired,
    available: params.balance,
    shortfall,
  };
}

/**
 * Assert sufficient balance — throws InsufficientBalanceError if wallet
 * cannot cover the transfer amount + platform fee.
 */
export function assertSufficientBalance(params: BalanceCheckParams): void {
  const result = checkBalance(params);
  if (!result.sufficient) {
    throw new InsufficientBalanceError(
      `Insufficient ${params.tokenSymbol} balance in wallet ${params.walletId}: ` +
        `need ${result.totalRequired.toFixed(6)}, have ${result.available.toFixed(6)} ` +
        `(shortfall: ${result.shortfall.toFixed(6)})`,
      result,
    );
  }
}

export class InsufficientBalanceError extends Error {
  public readonly details: BalanceCheckResult;

  constructor(message: string, details: BalanceCheckResult) {
    super(message);
    this.name = 'InsufficientBalanceError';
    this.details = details;
  }
}

export class BalancePrecisionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BalancePrecisionError';
  }
}
