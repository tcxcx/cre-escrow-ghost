import { getMassiveApiKey } from '@bu/env/stocks';

// ---------------------------------------------------------------------------
// Types — normalized camelCase representations of Massive/Benzinga responses
// ---------------------------------------------------------------------------

export interface MassiveAnalystRating {
  analyst: string;
  firm: string;
  rating: string;
  previousRating?: string;
  ratingAction: string;
  priceTarget: number | null;
  previousPriceTarget: number | null;
  date: string;
  ticker: string;
}

export interface MassiveAnalystInsight {
  firm: string;
  insight: string;
  rating: string;
  ratingAction: string;
  priceTarget: number | null;
  date: string;
  ticker: string;
}

export interface MassiveBullBear {
  ticker: string;
  bullCase: string;
  bearCase: string;
}

export interface MassiveEarning {
  ticker: string;
  date: string;
  dateStatus: string;
  actualEps: number | null;
  estimatedEps: number | null;
  epsSurprisePercent: number | null;
  actualRevenue: number | null;
  estimatedRevenue: number | null;
  revenueSurprisePercent: number | null;
  fiscalPeriod: string;
  fiscalYear: string;
  importance: number;
}

export interface MassiveNewsArticle {
  title: string;
  teaser: string;
  url: string;
  published: string;
  author: string;
  tickers: string[];
}

export interface MassiveRatios {
  ticker: string;
  marketCap: number | null;
  priceToEarnings: number | null;
  priceToBook: number | null;
  returnOnEquity: number | null;
  debtToEquity: number | null;
  dividendYield: number | null;
  earningsPerShare: number | null;
  freeCashFlow: number | null;
}

export interface MassiveSnapshot {
  ticker: string;
  price: number;
  change: number;
  changePercent: number;
  previousClose: number;
  volume: number;
  updated: number;
}

// ---------------------------------------------------------------------------
// 5-minute TTL cache
// ---------------------------------------------------------------------------

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, { data: unknown; at: number }>();

function getCached<T>(key: string): T | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.at > CACHE_TTL_MS) {
    cache.delete(key);
    return undefined;
  }
  return entry.data as T;
}

function setCache(key: string, data: unknown): void {
  cache.set(key, { data, at: Date.now() });
}

// ---------------------------------------------------------------------------
// Shared fetch utility
// ---------------------------------------------------------------------------

const BASE_URL = 'https://api.polygon.io';

async function massiveFetch<T>(
  path: string,
  params?: Record<string, string>,
): Promise<T> {
  const apiKey = getMassiveApiKey();
  if (!apiKey) throw new Error('MASSIVE_API_KEY is not configured');

  const url = new URL(path, BASE_URL);
  url.searchParams.set('apiKey', apiKey);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }

  const res = await fetch(url.toString(), {
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    throw new Error(`Massive API ${res.status}: ${res.statusText}`);
  }

  return (await res.json()) as T;
}

// ---------------------------------------------------------------------------
// Public API — 7 data functions
// ---------------------------------------------------------------------------

/** Fetch analyst ratings for a ticker from Benzinga. */
export async function getAnalystRatings(
  ticker: string,
  opts?: { limit?: number },
): Promise<MassiveAnalystRating[]> {
  const key = `ratings:${ticker}`;
  const cached = getCached<MassiveAnalystRating[]>(key);
  if (cached) return cached;

  try {
    const resp = await massiveFetch<{ results: Array<Record<string, unknown>> }>(
      '/benzinga/v1/ratings',
      { ticker, limit: String(opts?.limit ?? 10), sort: 'date.desc' },
    );
    const ratings: MassiveAnalystRating[] = (resp.results ?? []).map((r) => ({
      analyst: (r.analyst as string) ?? '',
      firm: (r.firm as string) ?? '',
      rating: (r.rating as string) ?? '',
      previousRating: r.previous_rating as string | undefined,
      ratingAction: (r.rating_action as string) ?? '',
      priceTarget: (r.price_target as number) ?? null,
      previousPriceTarget: (r.previous_price_target as number) ?? null,
      date: (r.date as string) ?? '',
      ticker: (r.ticker as string) ?? ticker,
    }));
    setCache(key, ratings);
    return ratings;
  } catch {
    return [];
  }
}

/** Fetch analyst insights for a ticker from Benzinga. */
export async function getAnalystInsights(
  ticker: string,
): Promise<MassiveAnalystInsight[]> {
  const key = `insights:${ticker}`;
  const cached = getCached<MassiveAnalystInsight[]>(key);
  if (cached) return cached;

  try {
    const resp = await massiveFetch<{ results: Array<Record<string, unknown>> }>(
      '/benzinga/v1/analyst-insights',
      { ticker },
    );
    const insights: MassiveAnalystInsight[] = (resp.results ?? []).map((r) => ({
      firm: (r.firm as string) ?? '',
      insight: (r.insight as string) ?? '',
      rating: (r.rating as string) ?? '',
      ratingAction: (r.rating_action as string) ?? '',
      priceTarget: (r.price_target as number) ?? null,
      date: (r.date as string) ?? '',
      ticker: (r.ticker as string) ?? ticker,
    }));
    setCache(key, insights);
    return insights;
  } catch {
    return [];
  }
}

/** Fetch bull/bear cases for a ticker from Benzinga. */
export async function getBullsBearsSay(
  ticker: string,
): Promise<MassiveBullBear | null> {
  const key = `bullbear:${ticker}`;
  const cached = getCached<MassiveBullBear>(key);
  if (cached) return cached;

  try {
    const resp = await massiveFetch<{ results: Array<Record<string, unknown>> }>(
      '/benzinga/v1/bulls-bears-say',
      { ticker },
    );
    const r = resp.results?.[0];
    if (!r) return null;

    const result: MassiveBullBear = {
      ticker: (r.ticker as string) ?? ticker,
      bullCase: (r.bull_case as string) ?? '',
      bearCase: (r.bear_case as string) ?? '',
    };
    setCache(key, result);
    return result;
  } catch {
    return null;
  }
}

/** Fetch earnings data for a ticker from Benzinga. */
export async function getEarnings(
  ticker: string,
  opts?: { limit?: number },
): Promise<MassiveEarning[]> {
  const key = `earnings:${ticker}`;
  const cached = getCached<MassiveEarning[]>(key);
  if (cached) return cached;

  try {
    const resp = await massiveFetch<{ results: Array<Record<string, unknown>> }>(
      '/benzinga/v1/earnings',
      { ticker, limit: String(opts?.limit ?? 10) },
    );
    const earnings: MassiveEarning[] = (resp.results ?? []).map((r) => ({
      ticker: (r.ticker as string) ?? ticker,
      date: (r.date as string) ?? '',
      dateStatus: (r.date_status as string) ?? '',
      actualEps: (r.actual_eps as number) ?? null,
      estimatedEps: (r.estimated_eps as number) ?? null,
      epsSurprisePercent: (r.eps_surprise_percent as number) ?? null,
      actualRevenue: (r.actual_revenue as number) ?? null,
      estimatedRevenue: (r.estimated_revenue as number) ?? null,
      revenueSurprisePercent: (r.revenue_surprise_percent as number) ?? null,
      fiscalPeriod: (r.fiscal_period as string) ?? '',
      fiscalYear: (r.fiscal_year as string) ?? '',
      importance: (r.importance as number) ?? 0,
    }));
    setCache(key, earnings);
    return earnings;
  } catch {
    return [];
  }
}

/** Fetch stock news for a ticker from Benzinga v2. */
export async function getStockNews(
  ticker: string,
  opts?: { limit?: number },
): Promise<MassiveNewsArticle[]> {
  const key = `news:${ticker}`;
  const cached = getCached<MassiveNewsArticle[]>(key);
  if (cached) return cached;

  try {
    const resp = await massiveFetch<{ results: Array<Record<string, unknown>> }>(
      '/benzinga/v2/news',
      { tickers: ticker, limit: String(opts?.limit ?? 5) },
    );
    const articles: MassiveNewsArticle[] = (resp.results ?? []).map((r) => ({
      title: (r.title as string) ?? '',
      teaser: (r.teaser as string) ?? '',
      url: (r.url as string) ?? '',
      published: (r.published as string) ?? '',
      author: (r.author as string) ?? '',
      tickers: (r.tickers as string[]) ?? [],
    }));
    setCache(key, articles);
    return articles;
  } catch {
    return [];
  }
}

/** Fetch financial ratios for a ticker from Polygon.io. */
export async function getFinancialRatios(
  ticker: string,
): Promise<MassiveRatios | null> {
  const key = `ratios:${ticker}`;
  const cached = getCached<MassiveRatios>(key);
  if (cached) return cached;

  try {
    const resp = await massiveFetch<{ results: Array<Record<string, unknown>> }>(
      '/stocks/financials/v1/ratios',
      { ticker },
    );
    const r = resp.results?.[0];
    if (!r) return null;

    const result: MassiveRatios = {
      ticker: (r.ticker as string) ?? ticker,
      marketCap: (r.market_cap as number) ?? null,
      priceToEarnings: (r.price_to_earnings as number) ?? null,
      priceToBook: (r.price_to_book as number) ?? null,
      returnOnEquity: (r.return_on_equity as number) ?? null,
      debtToEquity: (r.debt_to_equity as number) ?? null,
      dividendYield: (r.dividend_yield as number) ?? null,
      earningsPerShare: (r.earnings_per_share as number) ?? null,
      freeCashFlow: (r.free_cash_flow as number) ?? null,
    };
    setCache(key, result);
    return result;
  } catch {
    return null;
  }
}

/** Fetch a real-time ticker snapshot from Polygon.io. */
export async function getTickerSnapshot(
  ticker: string,
): Promise<MassiveSnapshot | null> {
  const key = `snapshot:${ticker}`;
  const cached = getCached<MassiveSnapshot>(key);
  if (cached) return cached;

  try {
    const resp = await massiveFetch<{
      ticker: Record<string, unknown>;
    }>(`/v2/snapshot/locale/us/markets/stocks/tickers/${ticker}`);

    const t = resp.ticker;
    if (!t) return null;

    const day = (t.day as Record<string, unknown>) ?? {};
    const prevDay = (t.prevDay as Record<string, unknown>) ?? {};
    const todaysChange = (t.todaysChange as number) ?? 0;
    const todaysChangePerc = (t.todaysChangePerc as number) ?? 0;

    const result: MassiveSnapshot = {
      ticker: (t.ticker as string) ?? ticker,
      price: (day.c as number) ?? 0,
      change: todaysChange,
      changePercent: todaysChangePerc,
      previousClose: (prevDay.c as number) ?? 0,
      volume: (day.v as number) ?? 0,
      updated: (t.updated as number) ?? Date.now(),
    };
    setCache(key, result);
    return result;
  } catch {
    return null;
  }
}
