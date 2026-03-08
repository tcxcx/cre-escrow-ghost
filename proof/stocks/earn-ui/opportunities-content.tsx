'use client';

import { Loader2 } from 'lucide-react';
import { Button } from '@bu/ui/button';
import type { DeframeStrategy } from '@bu/pods/types';
import type { AccountContext } from './earn-content';
import { StrategyCard } from '@/components/sheets/earn/stategy-card';
import { useEarnSheetParams } from '@/hooks/use-earn-params';
import type { AllocatingStrategy } from '@/hooks/use-earn-params';
import { usePodsStrategies } from '@/hooks/use-pods-strategies';
import { InfoBanner } from './info-banner';
import {
  getProtocolLogoSrc,
  getProtocolUrl,
  getProtocolDisplayName,
  getStrategyTitle,
  getStrategyDescription,
  getCategoryLabel,
} from '@bu/pods/metadata';

interface OpportunitiesContentProps {
  accountContext: AccountContext;
}

/** Badge color from category/risk */
function getBadgeVariant(s: DeframeStrategy): 'mint' | 'purple' | 'yellow' {
  const cat = (s.category || s.risk || '').toLowerCase();
  if (cat === 'stable' || cat === 'low') return 'mint';
  if (cat === 'high' || cat === 'aggressive') return 'yellow';
  return 'purple';
}

function formatApy(apy: number | undefined): string {
  if (apy == null || apy === 0) return '—';
  return `${apy.toFixed(2)}%`;
}

function strategyToAllocating(s: DeframeStrategy): AllocatingStrategy {
  return {
    id: s.id,
    name: getStrategyTitle(s.protocol, s.asset),
    description: getStrategyDescription(s.protocol),
    apy: formatApy(s.apy),
    strategyDetails: `${s.asset} via ${getProtocolDisplayName(s.protocol)}`,
    protocol: s.protocol,
    badgeVariant: getBadgeVariant(s),
    badgeLabel: getCategoryLabel(s),
    backedBy: getProtocolDisplayName(s.protocol),
    network: s.network,
    asset: s.asset,
    fullDescription: s.fullDescription,
  };
}

/** Sort: USDC strategies first, then by highest APY */
function sortStrategies(list: DeframeStrategy[]): DeframeStrategy[] {
  return [...list].sort((a, b) => {
    const aIsUsdc = a.asset.toUpperCase() === 'USDC' ? 0 : 1;
    const bIsUsdc = b.asset.toUpperCase() === 'USDC' ? 0 : 1;
    if (aIsUsdc !== bIsUsdc) return aIsUsdc - bIsUsdc;
    return (b.apy ?? 0) - (a.apy ?? 0);
  });
}

export function OpportunitiesContent({ accountContext }: OpportunitiesContentProps) {
  const { openAllocate } = useEarnSheetParams();
  const { strategies: rawStrategies, isLoading, error, refetch } = usePodsStrategies();
  const strategies = sortStrategies(rawStrategies);

  if (isLoading) {
    return (
      <div data-testid="earn-opportunities-loading" className="flex flex-col items-center justify-center py-12 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-purpleDanis" />
        <p className="text-sm text-muted-foreground dark:text-darkTextSecondary">
          Loading strategies...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div data-testid="earn-opportunities-error" className="flex flex-col items-center justify-center py-12 gap-4 text-center">
        <div className="rounded-xl bg-red-50 dark:bg-red-950/30 p-4">
          <p className="text-sm font-medium text-red-700 dark:text-red-400">{error}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
      </div>
    );
  }

  if (!strategies.length) {
    return (
      <div data-testid="earn-opportunities-empty" className="flex flex-col items-center justify-center py-12 gap-4 text-center">
        <p className="text-sm text-muted-foreground dark:text-darkTextSecondary">
          No strategies available at this time.
        </p>
        <Button className="px-4 py-2" variant="outline" size="sm" onClick={() => refetch()}>Refresh</Button>
      </div>
    );
  }

  return (
    <div data-testid="earn-strategy-list" className="space-y-3">
      <InfoBanner />
      {strategies.map((strategy) => {
        const allocating = strategyToAllocating(strategy);

        return (
          <StrategyCard
            key={strategy.id}
            testId={`strategy-card-${strategy.id}`}
            title={getStrategyTitle(strategy.protocol, strategy.asset)}
            description={getStrategyDescription(strategy.protocol)}
            fullDescription={strategy.fullDescription}
            backedBy={getProtocolDisplayName(strategy.protocol)}
            protocolUrl={getProtocolUrl(strategy.protocol)}
            protocolLogoSrc={getProtocolLogoSrc(strategy.protocol)}
            badgeVariant={getBadgeVariant(strategy)}
            badgeLabel={getCategoryLabel(strategy)}
            apy={formatApy(strategy.apy)}
            exposureAsset={strategy.asset}
            network={strategy.network}
            onClick={() => openAllocate(allocating)}
            className="cursor-pointer"
          />
        );
      })}
    </div>
  );
}
