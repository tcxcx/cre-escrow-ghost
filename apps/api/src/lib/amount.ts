/**
 * Parse a human-readable amount string like "$1,500.00" into a number.
 */
export function parseAmount(amount: string | number): number {
  if (typeof amount === "number") return amount;
  return Number(amount.replace(/[^0-9.]/g, ""));
}

/**
 * Convert a USDC amount (e.g. 1500) to the contract format (6 decimals).
 */
export function convertUSDCToContractAmount(amount: number): string {
  return (amount * 1_000_000).toString();
}
