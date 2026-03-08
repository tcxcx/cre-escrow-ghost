/**
 * Precise USDC amount handling — BigInt only, never floating point.
 *
 * USDC and USDg are both 6-decimal tokens. All internal values are bigint wei.
 * Parsing uses string manipulation to avoid IEEE 754 rounding errors.
 */

const DECIMALS = 6;
const SCALE = 10n ** BigInt(DECIMALS);

/**
 * Parse a human-readable USDC string to 6-decimal bigint wei.
 *
 * "5000"    → 5000000000n
 * "100.50"  → 100500000n
 * "0.01"    → 10000n
 * "100.10"  → 100100000n  (floating point would give 100099999)
 *
 * Throws on negative, NaN, or more than 6 decimal places.
 */
export function parseUsdcAmount(human: string): bigint {
  const trimmed = human.trim();
  if (!trimmed || trimmed === '') throw new Error('Amount cannot be empty');
  if (trimmed.startsWith('-')) throw new Error('Amount cannot be negative');

  const dotIndex = trimmed.indexOf('.');
  if (dotIndex === -1) {
    // Whole number: "5000" → 5000 * 10^6
    const whole = BigInt(trimmed);
    return whole * SCALE;
  }

  const wholePart = trimmed.slice(0, dotIndex) || '0';
  const fracPart = trimmed.slice(dotIndex + 1);

  if (fracPart.length > DECIMALS) {
    throw new Error(`Amount has more than ${DECIMALS} decimal places: ${trimmed}`);
  }

  // Pad fraction to exactly 6 digits: "5" → "500000", "50" → "500000"
  const paddedFrac = fracPart.padEnd(DECIMALS, '0');

  return BigInt(wholePart) * SCALE + BigInt(paddedFrac);
}

/**
 * Format a 6-decimal bigint wei to human-readable string.
 *
 * 5000000000n → "5000.00"
 * 100500000n  → "100.50"
 * 10000n      → "0.01"
 */
export function formatUsdcAmount(wei: bigint): string {
  const whole = wei / SCALE;
  const frac = wei % SCALE;
  const fracStr = frac.toString().padStart(DECIMALS, '0');
  // Trim trailing zeros but keep at least 2 decimal places
  const trimmed = fracStr.replace(/0+$/, '').padEnd(2, '0');
  return `${whole}.${trimmed}`;
}
