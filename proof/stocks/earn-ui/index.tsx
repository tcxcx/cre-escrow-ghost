'use client';

import { useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetOverlay, SheetTitle } from '@bu/ui/sheet';
import { Tabs, TabsList, TabsTrigger } from '@bu/ui/tabs';
import { HighPrioritySheetOverlay } from '@/components/sheets/sheet-overlay';
import { useEarnParams, useEarnSheetParams } from '@/hooks/use-earn-params';
import { EarnContent } from './earn-content';
import { Allocate } from '@/components/sheets/earn/allocate';
import { StockPurchaseFlow } from './stock-purchase-flow';
import { STOCK_TOKENS, type StockSymbol, STOCK_SYMBOLS } from '@bu/stocks';
import type { AccountContext, TabContext } from './earn-content';

/** Mode-specific config for the sheet shell */
const MODE_CONFIG = {
  earn: {
    title: 'Earn',
    subtitle: 'Grow your USDC automatically with the best DeFi protocols.',
    tab1: 'Opportunities',
    tab2: 'My Positions',
    showAccountToggle: true,
  },
  stocks: {
    title: 'Buy Stocks',
    subtitle: 'Purchase tokenized stocks on Robinhood Chain with USDC.',
    tab1: 'Available',
    tab2: 'My Holdings',
    showAccountToggle: false,
  },
} as const;

export function EarnSheet() {
  const { isSheetOpen, closeSheet, allocatingStrategy, allocateMode, closeAllocate, sheetMode, openSheet, openAllocate: sheetOpenAllocate } =
    useEarnSheetParams();
  const { accountContext, tabContext, setParams } = useEarnParams();

  // Listen for A2UI "Buy Stock" action from chat (dev-only — stock tools are backend-gated)
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    const handler = (e: Event) => {
      const ticker = (e as CustomEvent<{ ticker: string }>).detail?.ticker;
      if (!ticker) return;
      // Open stocks sheet first
      openSheet({ tabContext: 'opportunities' }, 'stocks');
      // If ticker is a known stock, pre-select it in the purchase flow
      const symbol = ticker.toUpperCase() as StockSymbol;
      if (STOCK_SYMBOLS.includes(symbol)) {
        const token = STOCK_TOKENS[symbol];
        sheetOpenAllocate({
          id: symbol,
          name: token.name,
          description: `${symbol} on Robinhood Chain`,
          apy: '—',
          strategyDetails: `${symbol} via Robinhood Chain`,
          protocol: 'robinhood',
          badgeVariant: 'purple',
          badgeLabel: symbol,
          backedBy: 'Robinhood Chain',
          network: 'robinhood-testnet',
          asset: symbol,
        });
      }
    };
    window.addEventListener('bu:open-stock-purchase', handler);
    return () => window.removeEventListener('bu:open-stock-purchase', handler);
  }, [openSheet, sheetOpenAllocate]);

  const effectiveAccountContext: AccountContext = accountContext ?? 'team';
  const effectiveTabContext: TabContext = tabContext ?? 'opportunities';
  const isAllocating = Boolean(allocatingStrategy);
  const config = MODE_CONFIG[sheetMode];

  return (
    <Sheet open={isSheetOpen} onOpenChange={(open) => !open && closeSheet()}>
      <HighPrioritySheetOverlay
        isOpen={isSheetOpen}
        onClose={closeSheet}
        zIndex={200000000}
      />
      <SheetOverlay className="z-[200000001]" />
      <SheetContent
        data-testid="earn-sheet"
        side="right"
        className="w-full max-w-md sm:max-w-lg overflow-hidden p-0 dark:darkOutline dark:border-none z-[200000002]"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>{config.title}</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col h-full overflow-y-auto" style={{ scrollbarGutter: 'stable' }}>
          {isAllocating ? (
            <div className="flex-1 p-6 overflow-y-auto" style={{ scrollbarGutter: 'stable' }}>
              {allocatingStrategy && (
                sheetMode === 'stocks' && process.env.NODE_ENV === 'development' ? (
                  <StockPurchaseFlow
                    strategy={allocatingStrategy}
                    onClose={closeAllocate}
                  />
                ) : sheetMode === 'stocks' ? (
                  null
                ) : (
                  <Allocate
                    strategy={allocatingStrategy}
                    accountContext={effectiveAccountContext}
                    onClose={closeAllocate}
                    mode={allocateMode}
                  />
                )
              )}
            </div>
          ) : (
            <>
              {/* Header — title + subtitle left, compact account toggle top-right */}
              <div className="flex-shrink-0 px-6 pt-12">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h1
                      data-testid="earn-title"
                      className="text-2xl font-bold leading-tight tracking-tight text-purpleDanis"
                    >
                      {config.title}
                    </h1>
                    <p
                      data-testid="earn-subtitle"
                      className="mt-1 text-sm font-normal leading-5 text-muted-foreground dark:text-darkTextSecondary tracking-tight"
                    >
                      {config.subtitle}
                    </p>
                  </div>

                  {/* Compact Team / Personal — only shown for earn mode */}
                  {config.showAccountToggle && (
                    <Tabs
                      value={effectiveAccountContext}
                      onValueChange={(v) =>
                        setParams({ accountContext: v as AccountContext })
                      }
                    >
                      <TabsList className="p-0.5 bg-[#9B67FF]/20 dark:bg-violet-900/30 rounded-lg flex w-auto shrink-0 [&>button]:flex-1 [&>button]:min-w-0">
                        <TabsTrigger
                          data-testid="earn-account-team"
                          value="team"
                          className="px-2.5 py-2 text-[11px] font-semibold leading-none data-[state=active]:bg-white/50 dark:data-[state=active]:bg-gray-800/50 data-[state=active]:text-purpleDanis dark:data-[state=active]:text-violet-400"
                        >
                          Team
                        </TabsTrigger>
                        <TabsTrigger
                          data-testid="earn-account-personal"
                          value="personal"
                          className="px-2.5 py-2 text-[11px] font-semibold leading-none data-[state=active]:bg-white/50 dark:data-[state=active]:bg-gray-800/50 data-[state=active]:text-purpleDanis dark:data-[state=active]:text-violet-400"
                        >
                          Personal
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  )}
                </div>
              </div>

              {/* Tab context — purple-tinted pill tabs */}
              <div className="flex-shrink-0 px-6 pt-4 flex">
                <Tabs
                  value={effectiveTabContext}
                  onValueChange={(v) =>
                    setParams({ tabContext: v as TabContext })
                  }
                >
                  <TabsList className="p-1 bg-[#9B67FF]/20 dark:bg-violet-900/30 rounded-xl flex w-[290px]">
                    <TabsTrigger
                      data-testid="earn-tab-opportunities"
                      value="opportunities"
                      className="flex-1 max-w-[145px] data-[state=active]:bg-white/50 dark:data-[state=active]:bg-gray-800/50 data-[state=active]:text-purpleDanis dark:data-[state=active]:text-violet-400"
                    >
                      {config.tab1}
                    </TabsTrigger>
                    <TabsTrigger
                      data-testid="earn-tab-positions"
                      value="my-positions"
                      className="flex-1 max-w-[145px] data-[state=active]:bg-white/50 dark:data-[state=active]:bg-gray-800/50 data-[state=active]:text-purpleDanis dark:data-[state=active]:text-violet-400"
                    >
                      {config.tab2}
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Content */}
              <div className="flex-1 p-6 overflow-y-auto" style={{ scrollbarGutter: 'stable' }}>
                <EarnContent
                  accountContext={effectiveAccountContext}
                  tabContext={effectiveTabContext}
                  sheetMode={sheetMode}
                />
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
