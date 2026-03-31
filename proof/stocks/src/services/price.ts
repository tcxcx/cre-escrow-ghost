import type { StockSymbol } from '../constants/tokens';
import { STOCK_SYMBOLS } from '../constants/tokens';
import type { StockPrice } from '../types/stock';
import { getMassiveApiKey } from '@bu/env/stocks';

// ---------------------------------------------------------------------------
// Batch TTL cache — all symbols refresh together, stale-while-revalidate
// ---------------------------------------------------------------------------
const CACHE_TTL_MS = 30_000; // fresh for 30s
const STALE_TTL_MS = 120_000; // serve stale for up to 2min while revalidating

let batchCache: { prices: StockPrice[]; fetchedAt: number } | null = null;
let revalidatePromise: Promise<StockPrice[]> | null = null;

// ---------------------------------------------------------------------------
// Provider 0: Massive (Polygon.io) — primary
// Uses previous-close endpoint (free tier) + latest daily bar for current price
// ---------------------------------------------------------------------------
interface PolygonPrevCloseResult {
  T: string;  // ticker
  o: number;  // open
  h: number;  // high
  l: number;  // low
  c: number;  // close
  v: number;  // volume
  t: number;  // timestamp (ms)
}

interface PolygonPrevCloseResponse {
  results?: PolygonPrevCloseResult[];
  resultsCount?: number;
  status?: string;
}

async function fetchFromMassive(apiKey: string): Promise<StockPrice[]> {
  // Use daily bars (last 2 trading days) — available on free Polygon.io tier
  const now = new Date();
  const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days back to handle weekends/holidays
  const toStr = now.toISOString().split('T')[0];
  const fromStr = from.toISOString().split('T')[0];

  const results = await Promise.all(
    STOCK_SYMBOLS.map(async (symbol): Promise<StockPrice> => {
      const res = await fetch(
        `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/1/day/${fromStr}/${toStr}?adjusted=true&sort=desc&limit=2&apiKey=${apiKey}`,
        { signal: AbortSignal.timeout(5000) },
      );
      if (!res.ok) throw new Error(`Massive ${res.status}`);
      const data = (await res.json()) as PolygonPrevCloseResponse;
      if (!data.results?.length) throw new Error(`No Massive data for ${symbol}`);

      const latest = data.results[0]!;
      const prev = data.results[1];
      const change24h = prev?.c && prev.c > 0
        ? Math.round(((latest.c - prev.c) / prev.c) * 10000) / 100
        : 0;

      return {
        symbol,
        priceUsd: latest.c,
        change24h,
        timestamp: latest.t ?? Date.now(),
        source: 'massive' as const,
      };
    }),
  );
  return results;
}

// ---------------------------------------------------------------------------
// Provider 1: Finnhub — secondary (free tier, 60 calls/min)
// Requires FINNHUB_API_KEY env var. Free key at https://finnhub.io
// ---------------------------------------------------------------------------
interface FinnhubQuote {
  c: number;  // current price
  d: number;  // change ($)
  dp: number; // change (%)
  pc: number; // previous close
  t: number;  // timestamp
}

async function fetchFromFinnhub(apiKey: string): Promise<StockPrice[]> {
  const results = await Promise.all(
    STOCK_SYMBOLS.map(async (symbol): Promise<StockPrice> => {
      const res = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`,
        { signal: AbortSignal.timeout(5000) },
      );
      if (!res.ok) throw new Error(`Finnhub ${res.status}`);
      const data = (await res.json()) as FinnhubQuote;
      if (data.c === 0 && data.pc === 0) throw new Error(`No data for ${symbol}`);
      return {
        symbol,
        priceUsd: data.c,
        change24h: data.dp,
        timestamp: data.t ? data.t * 1000 : Date.now(),
        source: 'finnhub' as const,
      };
    }),
  );
  return results;
}

// ---------------------------------------------------------------------------
// Provider 2: Yahoo Finance v8 chart API — fallback (no API key needed)
// ---------------------------------------------------------------------------
interface YahooChartResult {
  chart?: {
    result?: Array<{
      meta?: {
        regularMarketPrice?: number;
        chartPreviousClose?: number;
        regularMarketTime?: number;
      };
    }>;
    error?: { description?: string };
  };
}

async function fetchFromYahoo(): Promise<StockPrice[]> {
  const results = await Promise.all(
    STOCK_SYMBOLS.map(async (symbol): Promise<StockPrice> => {
      const res = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`,
        {
          signal: AbortSignal.timeout(5000),
          headers: { 'User-Agent': 'Mozilla/5.0' },
        },
      );
      if (!res.ok) throw new Error(`Yahoo ${res.status}`);
      const data = (await res.json()) as YahooChartResult;
      const meta = data.chart?.result?.[0]?.meta;
      if (!meta?.regularMarketPrice) throw new Error(`No Yahoo data for ${symbol}`);

      const price = meta.regularMarketPrice;
      const prevClose = meta.chartPreviousClose ?? price;
      const change24h = prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0;

      return {
        symbol,
        priceUsd: price,
        change24h: Math.round(change24h * 100) / 100,
        timestamp: meta.regularMarketTime ? meta.regularMarketTime * 1000 : Date.now(),
        source: 'yahoo' as const,
      };
    }),
  );
  return results;
}

// ---------------------------------------------------------------------------
// Provider chain — try Massive first, then Finnhub, then Yahoo Finance
// ---------------------------------------------------------------------------
async function fetchFromProviders(): Promise<StockPrice[]> {
  const massiveKey = getMassiveApiKey();

  // Try Massive (primary — Polygon.io snapshot)
  if (massiveKey) {
    try {
      const result = await fetchFromMassive(massiveKey);
      return result;
    } catch (err) {
      console.warn('[stocks/price] Massive failed:', (err as Error).message);
    }
  }

  // Try Finnhub (secondary)
  const finnhubKey = process.env.FINNHUB_API_KEY;
  if (finnhubKey) {
    try {
      const result = await fetchFromFinnhub(finnhubKey);
      return result;
    } catch (err) {
      console.warn('[stocks/price] Finnhub failed:', (err as Error).message);
    }
  }

  // Try Yahoo Finance (tertiary)
  try {
    const result = await fetchFromYahoo();
    return result;
  } catch (err) {
    console.error('[stocks/price] Yahoo failed:', (err as Error).message);
    throw new Error('All price providers failed (Massive + Finnhub + Yahoo)');
  }
}

// ---------------------------------------------------------------------------
// Core fetch with stale-while-revalidate
// ---------------------------------------------------------------------------
async function fetchPricesBatch(): Promise<StockPrice[]> {
  const now = Date.now();

  // Fresh cache — return immediately
  if (batchCache && now - batchCache.fetchedAt < CACHE_TTL_MS) {
    return batchCache.prices;
  }

  // Stale cache — return stale, revalidate in background (deduped)
  if (batchCache && now - batchCache.fetchedAt < STALE_TTL_MS) {
    if (!revalidatePromise) {
      revalidatePromise = doFetch().finally(() => { revalidatePromise = null; });
    }
    return batchCache.prices;
  }

  // No cache or expired — block on fetch
  if (!revalidatePromise) {
    revalidatePromise = doFetch().finally(() => { revalidatePromise = null; });
  }
  return revalidatePromise;
}

async function doFetch(): Promise<StockPrice[]> {
  try {
    const prices = await fetchFromProviders();
    batchCache = { prices, fetchedAt: Date.now() };
    return prices;
  } catch (err) {
    // If we have stale data, serve it rather than throwing
    if (batchCache) {
      return batchCache.prices;
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Get prices for all supported stock symbols (cached, stale-while-revalidate). */
export async function getAllStockPrices(): Promise<StockPrice[]> {
  return fetchPricesBatch();
}

/** Get price for a single stock symbol. */
export async function getStockPrice(symbol: StockSymbol): Promise<StockPrice> {
  const all = await getAllStockPrices();
  const found = all.find((p) => p.symbol === symbol);
  if (!found) throw new Error(`Unknown stock symbol: ${symbol}`);
  return found;
}
