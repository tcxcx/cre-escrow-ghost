import { formatUnits } from 'viem';
import { getClient } from './rpc';
import { STOCK_TOKENS, STOCK_SYMBOLS, type StockSymbol } from '../constants/tokens';
import { ERC20_ABI } from '../constants/abis';
import type { StockHolding, StockToken } from '../types/stock';

/** Fetch balances for all stock tokens — individual readContract calls (no multicall3 on this chain) */
export async function getStockBalances(address: string): Promise<StockHolding[]> {
  const client = getClient();
  const addr = address as `0x${string}`;

  const results = await Promise.all(
    STOCK_SYMBOLS.map(async (symbol) => {
      try {
        const balance = await client.readContract({
          address: STOCK_TOKENS[symbol].address as `0x${string}`,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [addr],
        });
        return String(balance);
      } catch {
        return '0';
      }
    }),
  );

  return STOCK_SYMBOLS.map((symbol, i) => {
    const balance = results[i]!;
    const token = STOCK_TOKENS[symbol];
    const balanceFormatted = Number(formatUnits(BigInt(balance), token.decimals));

    return {
      token: {
        symbol,
        name: token.name,
        address: token.address,
        decimals: token.decimals,
        logoUrl: token.logoUrl,
        color: token.color,
      } as StockToken,
      balance,
      balanceFormatted,
    };
  });
}

/** Fetch balance for a single stock token */
export async function getStockBalance(address: string, symbol: StockSymbol): Promise<StockHolding> {
  const holdings = await getStockBalances(address);
  const holding = holdings.find(h => h.token.symbol === symbol);
  if (!holding) throw new Error(`Unknown stock symbol: ${symbol}`);
  return holding;
}
