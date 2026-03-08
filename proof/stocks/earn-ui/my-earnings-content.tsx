'use client';

import Image from 'next/image';
import { Wallet, Loader2 } from 'lucide-react';
import { Button } from '@bu/ui/button';
import type { DeframePosition } from '@bu/pods/types';
import { useWallet } from '@/context/WalletContext';
import { usePodsWalletPositions } from '@/hooks/use-pods-wallet-positions';
import { useEarnParams, useEarnSheetParams } from '@/hooks/use-earn-params';
import type { AllocatingStrategy } from '@/hooks/use-earn-params';
import { usePositionEarnings } from '@/hooks/use-position-earnings';
import { PositionCard } from '@/components/sheets/earn/position-card';
import type { AccountContext } from './earn-content';

interface MyEarningsContentProps {
  accountContext: AccountContext;
}

/**
 * Map a DeframePosition to an AllocatingStrategy so we can open the
 * allocate sheet in either deposit or withdraw mode.
 */
function positionToAllocatingStrategy(
  position: DeframePosition,
): AllocatingStrategy {
  return {
    id: position.strategyId,
    name: position.strategyName,
    description: `${position.protocol} on ${position.network}`,
    apy: position.apy ? `${position.apy.toFixed(1)}%` : '—',
    strategyDetails: `${position.asset} via ${position.protocol}`,
    protocol: position.protocol,
    badgeVariant: 'purple',
    badgeLabel: position.protocol,
    backedBy: position.protocol,
    network: position.network,
    positionBalance: position.underlyingBalance,
    asset: position.asset,
  };
}

/**
 * My Positions tab content. Shows user's vault positions from Pods/Deframe API.
 * Receives accountContext to show team or personal wallet positions.
 */
export function MyEarningsContent({ accountContext }: MyEarningsContentProps) {
  const { setParams } = useEarnParams();
  const { openAllocate } = useEarnSheetParams();
  const { primaryTeamWallet, primaryIndividualWallet } = useWallet();
  const wallet =
    accountContext === 'team' ? primaryTeamWallet : primaryIndividualWallet;
  const walletAddress = wallet?.wallet_address;

  const { positions, summary, isLoading, error, refetch } =
    usePodsWalletPositions(walletAddress);

  const earningsMap = usePositionEarnings(walletAddress, positions ?? []);

  const handleBrowseOpportunities = () => {
    setParams({ tabContext: 'opportunities' });
  };

  // Loading state
  if (isLoading) {
    return (
      <div data-testid="earn-positions-loading" className="flex flex-col items-center justify-center py-12 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-purpleDanis" />
        <p className="text-sm text-muted-foreground dark:text-darkTextSecondary">
          Loading positions...
        </p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div data-testid="earn-positions-error" className="flex flex-col items-center justify-center py-12 gap-4 text-center">
        <div className="rounded-xl bg-red-50 dark:bg-red-950/30 p-4">
          <p className="text-sm font-medium text-red-700 dark:text-red-400">
            {error}
          </p>
        </div>
        <Button className="px-4 py-2" variant="outline" size="sm" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  // No wallet
  if (!walletAddress) {
    return (
      <div data-testid="earn-positions-no-wallet" className="flex flex-col items-center justify-center py-12 gap-4 text-center">
        <div className="rounded-xl bg-purple-50 dark:bg-purple-950/30 p-4">
          <p className="text-sm text-purple-700 dark:text-darkTextSecondary">
            No wallet found for {accountContext === 'team' ? 'team' : 'personal'}{' '}
            account.
          </p>
        </div>
      </div>
    );
  }

  // Empty state
  if (!positions?.length) {
    return (
      <div data-testid="earn-positions-empty" className="flex flex-col items-center justify-center py-6 gap-6 text-center">
        <div className="flex items-center justify-center size-40">
          <Image
            src="/assets/cofre.png"
            alt=""
            width={200}
            height={200}
          />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-purpleDanis dark:text-darkTextTertiary">
            No positions yet
          </h3>
          <p className="text-sm leading-relaxed text-violetDanis dark:text-darkTextSecondary max-w-xs">
            Deposit into a strategy from the Opportunities tab to start earning
            yield on your USDC.
          </p>
        </div>
        <Button
          data-testid="earn-positions-browse"
          variant="glass"
          size="sm"
          onClick={handleBrowseOpportunities}
        >
          Browse Opportunities
        </Button>
      </div>
    );
  }

  // Positions list with summary and cards
  return (
    <div className="space-y-4">
      {summary && summary.totalUnderlyingBalanceUSD > 0 && (
        <div data-testid="earn-positions-summary" className="rounded-xl border border-purple-200 bg-purple-50/50 dark:bg-purple-950/20 dark:border-purple-900/30 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-purpleDanis" />
              <span className="text-sm font-medium text-purple-700 dark:text-darkTextSecondary">
                Total balance
              </span>
            </div>
            <span data-testid="earn-positions-total-balance" className="text-lg font-bold text-purple-900 dark:text-darkTextTertiary">
              ${summary.totalUnderlyingBalanceUSD.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
        </div>
      )}

      <div data-testid="earn-position-list" className="space-y-3">
        {positions.map((position) => {
          const earningsData = earningsMap.get(position.strategyId);
          return (
            <PositionCard
              key={position.strategyId}
              position={position}
              earnings={earningsData?.earnings ?? null}
              isEarningsLoading={earningsData?.isLoading ?? true}
              onWithdraw={() =>
                openAllocate(
                  positionToAllocatingStrategy(position),
                  'withdraw',
                )
              }
              onAddMore={() =>
                openAllocate(
                  positionToAllocatingStrategy(position),
                  'deposit',
                )
              }
            />
          );
        })}
      </div>
    </div>
  );
}
