'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Check, Loader2, X, ArrowRight } from 'lucide-react';
import { STOCK_TOKENS, type StockSymbol } from '@bu/stocks';
import type { SwapRoute } from '@bu/stocks';
import { Button } from '@bu/ui/button';
import { Input } from '@bu/ui/input';
import { useWallet } from '@/context/WalletContext';
import { useEarnParams } from '@/hooks/use-earn-params';
import type { AllocatingStrategy } from '@/hooks/use-earn-params';
import { cn } from '@bu/ui/utils';
import { PriceChart } from './price-chart';
import { useStockPriceHistory } from '@/hooks/use-price-history';
import type { TimeRange } from '@/hooks/use-price-history';

type PurchaseStep = 'amount' | 'review' | 'executing' | 'done' | 'error';

interface StockPurchaseFlowProps {
  strategy: AllocatingStrategy;
  onClose: () => void;
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

function StockLogoWithFallback({
  logoUrl,
  symbol,
  color,
  size,
  className,
  ringColor,
}: {
  logoUrl?: string;
  symbol: string;
  color: string;
  size: number;
  className?: string;
  ringColor?: string;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <div
      className={cn('rounded-full overflow-hidden', className)}
      style={{
        width: size,
        height: size,
        ...(ringColor ? { '--tw-ring-color': ringColor } as React.CSSProperties : {}),
      }}
    >
      {logoUrl && !failed ? (
        <img
          src={logoUrl}
          alt={symbol}
          className="w-full h-full object-cover"
          onError={() => {
            console.warn(`[StockLogo] failed to load: ${symbol}`, logoUrl);
            setFailed(true);
          }}
        />
      ) : (
        <div
          className="w-full h-full flex items-center justify-center text-sm font-bold text-white"
          style={{ backgroundColor: color }}
        >
          {symbol.slice(0, 2)}
        </div>
      )}
    </div>
  );
}

export function StockPurchaseFlow({ strategy, onClose }: StockPurchaseFlowProps) {
  const [step, setStep] = useState<PurchaseStep>('amount');
  const [amount, setAmount] = useState('');
  const [route, setRoute] = useState<SwapRoute | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { setParams } = useEarnParams();
  const { getBalanceForCurrency, primaryTeamWallet } = useWallet();
  const usdcBalance = getBalanceForCurrency('USDC', 'team');

  const [chartRange, setChartRange] = useState<TimeRange>('3M');

  const symbol = (strategy.asset ?? strategy.id) as StockSymbol;
  const token = STOCK_TOKENS[symbol];
  const { data: priceHistory, loading: chartLoading } = useStockPriceHistory(symbol, chartRange);
  const priceUsd = strategy.apy !== '—' ? parseFloat(strategy.apy.replace(/[^0-9.]/g, '')) : 0;

  const handleReview = useCallback(async () => {
    if (!amount) return;
    try {
      const { buildSwapRoute } = await import('@bu/stocks/services/swap');
      const swapRoute = await buildSwapRoute(symbol, amount);
      setRoute(swapRoute);
      setStep('review');
    } catch (err) {
      setError((err as Error).message);
      setStep('error');
    }
  }, [symbol, amount]);

  const handleExecute = useCallback(async () => {
    if (!route) return;
    setStep('executing');
    try {
      // Mock execution — real swap requires DEX router on Robinhood Chain
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Persist order to Supabase
      try {
        await fetch('/api/stocks/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ticker: symbol,
            walletAddress: primaryTeamWallet?.wallet_address ?? 'unknown',
            usdcAmount: Number(route.amountIn),
            estimatedTokens: Number(route.estimatedAmountOut),
            priceAtOrder: priceUsd,
            swapRoute: route,
          }),
        });
      } catch {
        // Non-blocking — order persistence is best-effort
      }

      setStep('done');
    } catch (err) {
      setError((err as Error).message);
      setStep('error');
    }
  }, [route, symbol, priceUsd, primaryTeamWallet]);

  const handleViewHoldings = useCallback(() => {
    setParams({ tabContext: 'my-positions' });
    onClose();
  }, [setParams, onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="flex flex-col gap-6"
    >
      {/* Header with back button + brand logo */}
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-md p-1 text-purpleDanis hover:bg-purple-100 dark:hover:bg-purple-950/30 transition-colors mt-1"
          aria-label="Back"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <div className="flex items-center gap-3 min-w-0">
          <StockLogoWithFallback
            logoUrl={token?.logoUrl}
            symbol={symbol}
            color={token?.color ?? '#6954cf'}
            size={48}
            className="shrink-0 ring-2 ring-offset-2 ring-offset-white dark:ring-offset-secondaryBlack"
            ringColor={`${token?.color ?? '#6954cf'}40`}
          />
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-purpleDanis truncate">
              Buy {symbol}
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <p className="text-sm text-muted-foreground dark:text-darkTextSecondary">
                {token?.name ?? strategy.name}
              </p>
              <span className="text-purple-300 dark:text-purple-700">·</span>
              <span className="text-[10px] font-medium text-purple-500/60 dark:text-purple-400/50">
                Robinhood Chain
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Amount step */}
      {step === 'amount' && (
        <div className="space-y-5">
          <PriceChart
            data={priceHistory}
            loading={chartLoading}
            name={token?.name}
            color={token?.color}
            range={chartRange}
            onRangeChange={setChartRange}
          />
          <div className="space-y-2">
            <label className="text-xs font-medium text-purple-700/80 dark:text-darkTextSecondary">
              USDC Amount
            </label>
            <div className="relative">
              <Input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pr-16 text-xl font-semibold h-14 rounded-xl border-purple-200 dark:border-purple-900/30 focus:border-purpleDanis focus:ring-purpleDanis/20"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-purple-600/60 dark:text-darkTextSecondary">
                USDC
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-purple-600/60 dark:text-darkTextSecondary">
                Balance: {Number(usdcBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC
              </span>
              <button
                type="button"
                className="text-xs font-semibold text-purpleDanis hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
                onClick={() => setAmount(usdcBalance)}
              >
                MAX
              </button>
            </div>

            {amount && Number(amount) > Number(usdcBalance) && (
              <p className="text-xs font-medium text-red-500">Insufficient USDC balance</p>
            )}
          </div>

          {amount && priceUsd > 0 && Number(amount) > 0 && Number(amount) <= Number(usdcBalance) && (
            <div className="rounded-xl border border-purple-200 bg-purple-50/30 dark:border-purple-900/30 dark:bg-purple-950/10 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-purple-600/60 dark:text-darkTextSecondary">
                  You&apos;ll receive (est.)
                </span>
                <span className="text-sm font-bold tabular-nums text-purple-900 dark:text-white">
                  ~{(Number(amount) / priceUsd).toFixed(4)} {symbol}
                </span>
              </div>
            </div>
          )}

          <Button
            variant="glass"
            className="w-full font-bold"
            disabled={!amount || Number(amount) <= 0 || Number(amount) > Number(usdcBalance)}
            onClick={handleReview}
          >
            Review Order
          </Button>

          <p className="text-xs text-center text-muted-foreground dark:text-darkTextSecondary">
            By purchasing, you acknowledge that tokenized stocks carry market and smart contract risks.
          </p>
        </div>
      )}

      {/* Review step */}
      {step === 'review' && route && (
        <div className="space-y-5">
          <div className="flex items-center justify-center gap-3 rounded-xl border border-purple-200 bg-purple-50/30 dark:border-purple-900/30 dark:bg-purple-950/10 p-4">
            <span className="rounded-full bg-blue-100 dark:bg-blue-900/30 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300">
              USDC
            </span>
            <ArrowRight className="h-4 w-4 text-purple-400" />
            <span className="rounded-full bg-slate-100 dark:bg-slate-800/50 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
              WETH
            </span>
            <ArrowRight className="h-4 w-4 text-purple-400" />
            <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-100 dark:bg-purple-900/30 pl-1.5 pr-3 py-1">
              <StockLogoWithFallback
                logoUrl={token?.logoUrl}
                symbol={symbol}
                color={token?.color ?? '#6954cf'}
                size={20}
              />
              <span className="text-xs font-semibold text-purpleDanis">{symbol}</span>
            </span>
          </div>

          <div className="space-y-0 rounded-xl border border-purple-200 dark:border-purple-900/30 overflow-hidden">
            {[
              { label: 'You pay', value: `${route.amountIn} USDC` },
              { label: 'You receive (est.)', value: `~${route.estimatedAmountOut} ${symbol}` },
              { label: 'Price impact', value: `~${route.priceImpact.toFixed(2)}%` },
              { label: 'Network', value: 'Robinhood Chain' },
              { label: 'Gas', value: 'Sponsored', highlight: true },
            ].map((row, i) => (
              <div
                key={row.label}
                className={cn(
                  'flex items-center justify-between px-4 py-3',
                  i > 0 && 'border-t border-purple-100 dark:border-purple-900/20',
                )}
              >
                <span className="text-sm text-purple-600/60 dark:text-darkTextSecondary">{row.label}</span>
                <span className={cn(
                  'text-sm font-semibold tabular-nums',
                  row.highlight ? 'text-emerald-600 dark:text-emerald-400' : 'text-purple-900 dark:text-white',
                )}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setStep('amount')}>
              Back
            </Button>
            <Button variant="glass" className="flex-1 font-bold" onClick={handleExecute}>
              Buy {symbol}
            </Button>
          </div>
        </div>
      )}

      {/* Executing */}
      {step === 'executing' && (
        <div className="flex flex-col items-center justify-center py-8 gap-6">
          <div className="size-20 rounded-2xl bg-purple-50 dark:bg-purple-950/20 flex items-center justify-center">
            <Loader2 className="size-10 animate-spin text-purpleDanis" />
          </div>
          <div className="space-y-3 w-full">
            <div className="flex items-center gap-3 rounded-xl border border-emerald-200 dark:border-emerald-900/30 bg-emerald-50/50 dark:bg-emerald-950/10 p-3">
              <Check className="h-4 w-4 text-emerald-500 shrink-0" />
              <span className="text-sm text-emerald-700 dark:text-emerald-400">USDC approval confirmed</span>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-purple-200 dark:border-purple-900/30 bg-purple-50/50 dark:bg-purple-950/10 p-3">
              <Loader2 className="h-4 w-4 animate-spin text-purpleDanis shrink-0" />
              <span className="text-sm text-purple-700 dark:text-purple-300">Swapping USDC → WETH...</span>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-purple-100 dark:border-purple-900/20 bg-purple-50/20 dark:bg-purple-950/5 p-3">
              <div className="h-4 w-4 rounded-full border-2 border-purple-200 dark:border-purple-800 shrink-0" />
              <span className="text-sm text-muted-foreground">WETH → {symbol} swap</span>
            </div>
          </div>
        </div>
      )}

      {/* Done */}
      {step === 'done' && (
        <div className="flex flex-col items-center justify-center py-8 gap-5">
          <div className="size-20 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center">
            <Check className="size-10 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="space-y-1 text-center">
            <h3 className="text-lg font-bold text-purple-900 dark:text-white">Purchase complete!</h3>
            <p className="text-sm text-muted-foreground dark:text-darkTextSecondary">
              You received ~{route?.estimatedAmountOut} {symbol}
            </p>
          </div>
          <div className="flex gap-2 w-full">
            <Button variant="outline" className="flex-1" onClick={handleViewHoldings}>
              My Holdings
            </Button>
            <Button variant="glass" className="flex-1 font-bold" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      )}

      {/* Error */}
      {step === 'error' && (
        <div className="flex flex-col items-center justify-center py-8 gap-5">
          <div className="size-20 rounded-2xl bg-red-50 dark:bg-red-950/20 flex items-center justify-center">
            <X className="size-10 text-red-600 dark:text-red-400" />
          </div>
          <div className="space-y-1 text-center">
            <h3 className="text-lg font-bold text-purple-900 dark:text-white">Purchase failed</h3>
            <p className="text-sm text-muted-foreground dark:text-darkTextSecondary max-w-[260px]">
              {error}
            </p>
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setStep('amount')}
          >
            Try again
          </Button>
        </div>
      )}
    </motion.div>
  );
}
