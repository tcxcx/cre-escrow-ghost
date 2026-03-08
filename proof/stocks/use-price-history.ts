'use client';

import { useState, useEffect } from 'react';

export interface HistoricalPrice {
  date: string;
  close: number;
  open?: number;
  high?: number;
  low?: number;
  volume?: number;
}

export type TimeRange = '1W' | '1M' | '3M' | '6M' | '1Y';

interface PriceHistoryResult {
  data: HistoricalPrice[];
  loading: boolean;
  error: string | null;
}

function usePriceHistory(params: Record<string, string> | null): PriceHistoryResult {
  const [data, setData] = useState<HistoricalPrice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const paramKey = params ? JSON.stringify(params) : null;

  useEffect(() => {
    if (!paramKey) {
      setData([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const qs = new URLSearchParams(JSON.parse(paramKey) as Record<string, string>).toString();

    fetch(`/api/earn/history?${qs}`)
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `Request failed (${res.status})`);
        }
        const json = await res.json();
        if (!cancelled) setData(json);
      })
      .catch((err: Error) => {
        console.error('[use-price-history] error', qs, err.message);
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [paramKey]);

  return { data, loading, error };
}

export function useStockPriceHistory(
  ticker: string | null,
  range: TimeRange = '3M',
): PriceHistoryResult {
  const params = ticker ? { source: 'stock', ticker, range } : null;
  return usePriceHistory(params);
}

export function useDefiPriceHistory(
  network: string | null,
  tokenAddress: string | null,
  range: TimeRange = '3M',
): PriceHistoryResult {
  const params = network && tokenAddress
    ? { source: 'defi', network, address: tokenAddress, range }
    : null;
  return usePriceHistory(params);
}
