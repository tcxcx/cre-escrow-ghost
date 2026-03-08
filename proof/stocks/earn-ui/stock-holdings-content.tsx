'use client';

import Image from 'next/image';
import { Wallet, Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '@bu/ui/button';
import { useWallet } from '@/context/WalletContext';
import { useStockHoldings } from '@/hooks/use-stock-holdings';
import { useEarnParams, useEarnSheetParams } from '@/hooks/use-earn-params';
import { cn } from '@bu/ui/utils';

function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

function formatChange(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

export function StockHoldingsContent() {
  const { setParams } = useEarnParams();
  const { openAllocate } = useEarnSheetParams();
  const { primaryTeamWallet } = useWallet();
  const walletAddress = primaryTeamWallet?.wallet_address ?? '';

  const { data: holdings, loading, error, totalUsdValue } = useStockHoldings(walletAddress);

  const handleBrowseStocks = () => {
    setParams({ tabContext: 'opportunities' });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-purpleDanis" />
        <p className="text-sm text-muted-foreground dark:text-darkTextSecondary">
          Loading holdings...
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

  if (!walletAddress) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
        <div className="rounded-xl bg-purple-50 dark:bg-purple-950/30 p-4">
          <p className="text-sm text-purple-700 dark:text-darkTextSecondary">
            No team wallet found. Connect a wallet to view your stock holdings.
          </p>
        </div>
      </div>
    );
  }

  const activeHoldings = holdings?.filter(h => h.balanceFormatted > 0) ?? [];

  if (!activeHoldings.length) {
    return (
      <div className="flex flex-col items-center justify-center py-6 gap-6 text-center">
        <div className="flex items-center justify-center size-40">
          <Image
            src="/assets/stocks-positions.png"
            alt=""
            width={200}
            height={200}
          />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-purpleDanis dark:text-darkTextTertiary">
            No stocks yet
          </h3>
          <p className="text-sm leading-relaxed text-violetDanis dark:text-darkTextSecondary max-w-xs">
            Buy your first stock token from the Available tab to start building your portfolio.
          </p>
        </div>
        <Button
          variant="glass"
          size="sm"
          onClick={handleBrowseStocks}
        >
          Browse Stocks
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {totalUsdValue > 0 && (
        <div className="rounded-xl border border-purple-200 bg-purple-50/50 dark:bg-purple-950/20 dark:border-purple-900/30 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-purpleDanis" />
              <span className="text-sm font-medium text-purple-700 dark:text-darkTextSecondary">
                Portfolio value
              </span>
            </div>
            <span className="text-lg font-bold text-purple-900 dark:text-darkTextTertiary">
              {formatUsd(totalUsdValue)}
            </span>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {activeHoldings.map((holding) => {
          const change = holding.change24h ?? 0;
          const isPositive = change >= 0;

          return (
            <button
              key={holding.token.address}
              type="button"
              onClick={() =>
                openAllocate({
                  id: holding.token.symbol,
                  name: holding.token.name,
                  description: `${holding.token.symbol} on Robinhood Chain`,
                  apy: formatUsd(holding.usdValue ?? 0),
                  strategyDetails: `${holding.balanceFormatted.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${holding.token.symbol}`,
                  protocol: 'robinhood',
                  badgeVariant: 'purple',
                  badgeLabel: holding.token.symbol,
                  backedBy: 'Robinhood Chain',
                  network: 'robinhood-testnet',
                  asset: holding.token.symbol,
                })
              }
              className={cn(
                'w-full flex items-start justify-between gap-4 rounded-xl border p-4 transition-all text-left',
                'border-purple-200 bg-white hover:border-purple-300 dark:border-purple-900/30 dark:bg-secondaryBlack dark:hover:border-purple-800/50',
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2.5">
                  {holding.token.logoUrl ? (
                    <img src={holding.token.logoUrl} alt={holding.token.symbol} className="h-9 w-9 rounded-full" />
                  ) : (
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white"
                      style={{ backgroundColor: holding.token.color ?? '#6954cf' }}
                    >
                      {holding.token.symbol.slice(0, 2)}
                    </div>
                  )}
                  <div>
                    <h3 className="text-base font-bold text-purple-900 dark:text-white">{holding.token.symbol}</h3>
                    <p className="text-sm leading-snug text-purple-700/80 dark:text-darkTextSecondary">{holding.token.name}</p>
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="text-sm font-bold tabular-nums text-purple-900 dark:text-white">
                  {holding.balanceFormatted.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                </span>
                <span className="text-xs text-purple-600/60 dark:text-darkTextSecondary tabular-nums">
                  {formatUsd(holding.usdValue ?? 0)}
                </span>
                {change !== 0 && (
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
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
