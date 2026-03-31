'use client';

import { useState, useEffect, useCallback } from 'react';
import type { StockPrice } from '@bu/stocks';

const REFRESH_INTERVAL_MS = 30_000; // 30s — matches server cache TTL

export function useStockPrices() {
  const [prices, setPrices] = useState<StockPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPrices = useCallback(async (isInitial: boolean) => {
    if (isInitial) setLoading(true);
    try {
      const res = await fetch('/api/stocks/prices');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as StockPrice[];
      setPrices(data);
      setError(null);
    } catch (err) {
      console.error('[use-stock-prices] error:', (err as Error).message);
      if (isInitial) setError((err as Error).message);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetchPrices(true);

    const interval = setInterval(() => {
      if (!cancelled) fetchPrices(false);
    }, REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [fetchPrices]);

  return { prices, loading, error };
}
