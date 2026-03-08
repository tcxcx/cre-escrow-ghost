import { getMassiveApiKey } from '@bu/env/stocks';

/** Uniform shape consumed by the chart component — matches @bu/dune/price-history */
export interface HistoricalPrice {
  date: string;      // YYYY-MM-DD
  close: number;
  open?: number;
  high?: number;
  low?: number;
  volume?: number;
}

export type TimeRange = '1W' | '1M' | '3M' | '6M' | '1Y';

const RANGE_TO_DAYS: Record<TimeRange, number> = {
  '1W': 7, '1M': 30, '3M': 90, '6M': 180, '1Y': 365,
};

// 5-min TTL cache keyed by ticker:range
const cache = new Map<string, { data: HistoricalPrice[]; at: number }>();
const CACHE_TTL = 5 * 60 * 1000;

interface PolygonAggResult {
  o: number;  // open
  h: number;  // high
  l: number;  // low
  c: number;  // close
  v: number;  // volume
  t: number;  // timestamp (ms)
}

interface PolygonAggResponse {
  results?: PolygonAggResult[];
  resultsCount?: number;
  status?: string;
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0] ?? '';
}

export async function getStockHistory(
  ticker: string,
  range: TimeRange = '3M',
): Promise<HistoricalPrice[]> {
  const key = `${ticker}:${range}`;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL) return cached.data;

  const apiKey = getMassiveApiKey();
  if (!apiKey) return [];

  const days = RANGE_TO_DAYS[range];
  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);

  try {
    const url = `https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(ticker)}/range/1/day/${formatDate(from)}/${formatDate(to)}?adjusted=true&sort=asc&apiKey=${apiKey}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return cached?.data ?? [];

    const data = (await res.json()) as PolygonAggResponse;
    if (!data.results?.length) return cached?.data ?? [];

    const prices: HistoricalPrice[] = data.results.map((r) => ({
      date: formatDate(new Date(r.t)),
      close: r.c,
      open: r.o,
      high: r.h,
      low: r.l,
      volume: r.v,
    }));

    cache.set(key, { data: prices, at: Date.now() });
    return prices;
  } catch {
    return cached?.data ?? [];
  }
}
