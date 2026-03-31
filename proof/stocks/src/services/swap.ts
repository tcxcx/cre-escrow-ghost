import type { StockSymbol } from '../constants/tokens';
import { STOCK_TOKENS, WETH_ADDRESS } from '../constants/tokens';
import type { SwapRoute, SwapStep, SwapStatus } from '../types/stock';
import { getStockPrice } from './price';
import { getMassiveApiKey } from '@bu/env/stocks';

// ---------------------------------------------------------------------------
// ETH price — fetch live, cached 60s
// ---------------------------------------------------------------------------
let ethPriceCache: { price: number; fetchedAt: number } | null = null;
const ETH_CACHE_TTL = 60_000;

async function getEthPrice(): Promise<number> {
  if (ethPriceCache && Date.now() - ethPriceCache.fetchedAt < ETH_CACHE_TTL) {
    return ethPriceCache.price;
  }

  // Try Massive/Polygon.io crypto endpoint
  const apiKey = getMassiveApiKey();
  if (apiKey) {
    try {
      const res = await fetch(
        `https://api.polygon.io/v2/snapshot/locale/global/markets/crypto/tickers/X:ETHUSD?apiKey=${apiKey}`,
        { signal: AbortSignal.timeout(5000) },
      );
      if (res.ok) {
        const data = await res.json() as { ticker?: { lastTrade?: { p: number } } };
        const price = data.ticker?.lastTrade?.p;
        if (price && price > 0) {
          ethPriceCache = { price, fetchedAt: Date.now() };
          return price;
        }
      }
    } catch { /* fall through */ }
  }

  // Fallback: CoinGecko (no key needed)
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd',
      { signal: AbortSignal.timeout(5000) },
    );
    if (res.ok) {
      const data = await res.json() as { ethereum?: { usd: number } };
      const price = data.ethereum?.usd;
      if (price && price > 0) {
        ethPriceCache = { price, fetchedAt: Date.now() };
        return price;
      }
    }
  } catch { /* fall through */ }

  // Last resort: use cached or hardcoded
  return ethPriceCache?.price ?? 3500;
}

/**
 * Build a 2-hop swap route: USDC -> WETH -> STOCK
 * On Robinhood Chain, stock tokens are paired with WETH.
 */
export async function buildSwapRoute(
  stockSymbol: StockSymbol,
  usdcAmount: string,
): Promise<SwapRoute> {
  const stockToken = STOCK_TOKENS[stockSymbol];
  const [price, ethPrice] = await Promise.all([
    getStockPrice(stockSymbol),
    getEthPrice(),
  ]);
  const usdcValue = Number(usdcAmount);

  const estimatedTokens = usdcValue / price.priceUsd;
  const priceImpact = usdcValue > 10000 ? 0.5 : usdcValue > 1000 ? 0.15 : 0.05;

  const steps: SwapStep[] = [
    {
      from: 'USDC',
      to: 'WETH',
      amountIn: usdcAmount,
      estimatedAmountOut: (usdcValue / ethPrice).toFixed(6),
    },
    {
      from: 'WETH',
      to: stockSymbol,
      amountIn: (usdcValue / ethPrice).toFixed(6),
      estimatedAmountOut: estimatedTokens.toFixed(6),
    },
  ];

  return {
    fromToken: 'USDC',
    toToken: stockSymbol,
    intermediateToken: 'WETH',
    amountIn: usdcAmount,
    estimatedAmountOut: estimatedTokens.toFixed(6),
    priceImpact,
    steps,
  };
}

/**
 * Execute a stock purchase swap via Alchemy smart wallet.
 * Placeholder — actual implementation requires DEX router on Robinhood Chain.
 */
export async function executeSwap(
  _route: SwapRoute,
  _walletAddress: string,
): Promise<{ txHash: string; status: SwapStatus }> {
  throw new Error('Swap execution not yet implemented — DEX router required on Robinhood Chain');
}
