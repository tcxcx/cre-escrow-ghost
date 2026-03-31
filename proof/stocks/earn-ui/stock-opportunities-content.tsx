'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { STOCK_TOKENS, STOCK_SYMBOLS, type StockSymbol } from '@bu/stocks';
import { useStockPrices } from '@/hooks/use-stock-prices';
import { useEarnSheetParams } from '@/hooks/use-earn-params';
import { AnimatedBanner, type BannerState } from './info-banner';
import { cn } from '@bu/ui/utils';

function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

/** Resilient stock logo — falls back to colored initials on load error */
function StockLogo({ symbol, size = 44, className }: { symbol: StockSymbol; size?: number; className?: string }) {
  const token = STOCK_TOKENS[symbol];
  const [failed, setFailed] = useState(false);

  if (!token.logoUrl || failed) {
    return (
      <div
        className={cn('flex items-center justify-center rounded-full text-sm font-bold text-white', className)}
        style={{ width: size, height: size, backgroundColor: token.color }}
      >
        {symbol.slice(0, 2)}
      </div>
    );
  }
  return (
    <img
      src={token.logoUrl}
      alt={token.name}
      width={size}
      height={size}
      className={cn('rounded-full object-cover', className)}
      style={{ width: size, height: size }}
      onError={() => {
        console.warn(`[StockLogo] failed to load logo for ${symbol}:`, token.logoUrl);
        setFailed(true);
      }}
    />
  );
}

function formatChange(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

/** Overlapping stock brand logos — shows the real companies */
function StockLogoStack({ symbols, size = 28 }: { symbols: StockSymbol[]; size?: number }) {
  return (
    <div className="flex items-center -space-x-2">
      {symbols.slice(0, 4).map((sym) => (
        <div
          key={sym}
          className="rounded-full ring-2 ring-white/20 overflow-hidden shrink-0"
          style={{ width: size, height: size }}
        >
          <StockLogo symbol={sym} size={size} />
        </div>
      ))}
    </div>
  );
}

function StockInfoBanner({ topStock }: { topStock: { symbol: StockSymbol; name: string; change: number } | null }) {
  const topToken = topStock ? STOCK_TOKENS[topStock.symbol] : null;

  const states: BannerState[] = useMemo(() => {
    const result: BannerState[] = [
      {
        key: 'hero',
        content: (
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0 space-y-1.5">
              <p className="text-sm font-bold leading-snug text-white">
                Buy tokenized stocks with USDC.
              </p>
              <p className="text-sm font-bold leading-snug text-white">
                Trade top US stocks 24/7 on-chain.
              </p>
              <span className="inline-flex items-center gap-2 pt-1">
                <span className="text-[10px] font-medium text-white/80 whitespace-nowrap">Powered by</span>
                <Image
                  src="/assets/robinhood-logo-white.png"
                  alt="Robinhood Chain"
                  width={200}
                  height={40}
                  className="h-8 w-auto object-contain"
                />
              </span>
            </div>
            <div className="w-1/3 shrink-0 flex items-center justify-end">
              <Image
                src="/assets/bufi-earn.png"
                alt=""
                width={200}
                height={200}
                priority
                loading="eager"
                style={{ width: 'auto', height: 'auto' }}
                className="object-contain"
              />
            </div>
          </div>
        ),
      },
    ];

    if (topStock && topToken && topStock.change > 0) {
      result.push({
        key: 'top-mover',
        content: (
          <div className="flex items-center gap-4 py-1">
            <div className="flex items-center justify-center size-12 rounded-xl bg-white/20 shrink-0 overflow-hidden">
              <StockLogo symbol={topStock.symbol} size={48} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white/70">Top mover today</p>
              <p className="text-lg font-bold text-white tracking-tight">
                {topStock.symbol} +{topStock.change.toFixed(2)}%
              </p>
              <p className="text-xs text-white/60">
                {topStock.name} — buy with as little as $1 USDC
              </p>
            </div>
          </div>
        ),
      });
    }

    result.push({
      key: 'variety',
      content: (
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white/70">Diversify your portfolio</p>
            <p className="text-lg font-bold text-white tracking-tight">
              {STOCK_SYMBOLS.length} stocks available
            </p>
            <p className="text-xs text-white/60">
              TSLA, AMZN, NFLX & more — all settled on-chain
            </p>
          </div>
          <div className="shrink-0">
            <StockLogoStack symbols={STOCK_SYMBOLS} size={32} />
          </div>
        </div>
      ),
    });

    result.push({
      key: 'gas-free',
      content: (
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white/70">Zero gas fees</p>
            <p className="text-lg font-bold text-white tracking-tight">
              Gas sponsored. Just swap.
            </p>
            <p className="text-xs text-white/60">
              No ETH needed — all gas fees are covered
            </p>
          </div>
          <div className="shrink-0">
            <Image
              src="/assets/robinhood-icon.png"
              alt="Robinhood Chain"
              width={56}
              height={56}
              className="size-14 rounded-xl object-contain"
            />
          </div>
        </div>
      ),
    });

    return result;
  }, [topStock, topToken]);

  return <AnimatedBanner states={states} />;
}

export function StockOpportunitiesContent() {
  const { prices, loading, error } = useStockPrices();
  const { openAllocate } = useEarnSheetParams();

  const priceMap = useMemo(() => new Map(prices.map(p => [p.symbol, p])), [prices]);

  const topStock = useMemo(() => {
    if (!prices.length) return null;
    const sorted = [...prices].sort((a, b) => (b.change24h ?? 0) - (a.change24h ?? 0));
    const top = sorted[0];
    if (!top || (top.change24h ?? 0) <= 0) return null;
    return {
      symbol: top.symbol as StockSymbol,
      name: STOCK_TOKENS[top.symbol as StockSymbol]?.name ?? top.symbol,
      change: top.change24h ?? 0,
    };
  }, [prices]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-purpleDanis" />
        <p className="text-sm text-muted-foreground dark:text-darkTextSecondary">
          Loading stock prices...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
        <div className="rounded-xl bg-red-50 dark:bg-red-950/30 p-4">
          <p className="text-sm font-medium text-red-700 dark:text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <StockInfoBanner topStock={topStock} />

      {STOCK_SYMBOLS.map((symbol) => {
        const token = STOCK_TOKENS[symbol];
        const price = priceMap.get(symbol);
        const change = price?.change24h ?? 0;
        const isPositive = change >= 0;

        return (
          <motion.div
            key={symbol}
            whileHover={{ y: -2, boxShadow: '0 4px 12px rgba(128, 90, 213, 0.15)' }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.15 }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && openAllocate({
              id: symbol,
              name: token.name,
              description: `${symbol} on Robinhood Chain`,
              apy: price ? formatUsd(price.priceUsd) : '—',
              strategyDetails: `${symbol} via Robinhood Chain`,
              protocol: 'robinhood',
              badgeVariant: 'purple',
              badgeLabel: symbol,
              backedBy: 'Robinhood Chain',
              network: 'robinhood-testnet',
              asset: symbol,
            })}
            onClick={() =>
              openAllocate({
                id: symbol,
                name: token.name,
                description: `${symbol} on Robinhood Chain`,
                apy: price ? formatUsd(price.priceUsd) : '—',
                strategyDetails: `${symbol} via Robinhood Chain`,
                protocol: 'robinhood',
                badgeVariant: 'purple',
                badgeLabel: symbol,
                backedBy: 'Robinhood Chain',
                network: 'robinhood-testnet',
                asset: symbol,
              })
            }
            className={cn(
              'rounded-xl border border-purple-200 bg-white p-4 dark:border-purple-900/30 dark:bg-secondaryBlack cursor-pointer',
            )}
          >
            <div className="flex items-center gap-4">
              {/* Brand logo */}
              <div
                className="shrink-0 size-11 rounded-full overflow-hidden ring-2 ring-offset-1 ring-offset-white dark:ring-offset-secondaryBlack"
                style={{ '--tw-ring-color': `${token.color}30` } as React.CSSProperties}
              >
                <StockLogo symbol={symbol} size={44} />
              </div>

              {/* Name + ticker */}
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-purple-900 dark:text-white leading-tight">
                  {symbol}
                </h3>
                <p className="text-sm leading-snug text-purple-700/70 dark:text-darkTextSecondary">
                  {token.name}
                </p>
              </div>

              {/* Price + change */}
              <div className="shrink-0 flex flex-col items-end gap-0.5">
                {price ? (
                  <>
                    <span className="text-lg font-bold text-purple-900 dark:text-white tabular-nums leading-tight">
                      {formatUsd(price.priceUsd)}
                    </span>
                    <div className="flex items-center gap-1">
                      {isPositive ? (
                        <TrendingUp className="size-3 text-emerald-500" />
                      ) : (
                        <TrendingDown className="size-3 text-red-500" />
                      )}
                      <span className={cn(
                        'text-xs font-medium tabular-nums',
                        isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400',
                      )}>
                        {formatChange(change)}
                      </span>
                      <span className="text-[10px] text-purple-600/50 dark:text-darkTextSecondary">24h</span>
                    </div>
                  </>
                ) : (
                  <span className="text-sm text-purple-400">—</span>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}

      {/* Powered by footer */}
      <div className="flex items-center justify-center gap-2 pt-2 pb-1">
        <span className="text-[10px] font-medium text-purple-600/40 dark:text-darkTextSecondary/50">
          Powered by
        </span>
        <Image
          src="/assets/robinhood-logo-black.png"
          alt="Robinhood Chain"
          width={80}
          height={16}
          className="h-3.5 w-auto object-contain opacity-30 dark:hidden"
        />
        <Image
          src="/assets/robinhood-logo-white.png"
          alt="Robinhood Chain"
          width={80}
          height={16}
          className="h-3.5 w-auto object-contain opacity-30 hidden dark:block"
        />
      </div>
    </div>
  );
}
