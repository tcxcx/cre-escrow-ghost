'use client';

import { OpportunitiesContent } from './opportunities-content';
import { MyEarningsContent } from './my-earnings-content';
import { StockOpportunitiesContent } from './stock-opportunities-content';
import { StockHoldingsContent } from './stock-holdings-content';
import type { SheetMode } from '@/hooks/use-earn-params';

export type AccountContext = 'team' | 'personal';
export type TabContext = 'opportunities' | 'my-positions';

interface EarnContentProps {
  accountContext: AccountContext;
  tabContext: TabContext;
  sheetMode: SheetMode;
}

/**
 * Shared content component. Routes to the correct content based on
 * sheetMode (earn | stocks) and tabContext (opportunities | my-positions).
 */
export function EarnContent({ accountContext, tabContext, sheetMode }: EarnContentProps) {
  if (sheetMode === 'stocks') {
    return tabContext === 'opportunities'
      ? <StockOpportunitiesContent />
      : <StockHoldingsContent />;
  }

  return tabContext === 'opportunities'
    ? <OpportunitiesContent accountContext={accountContext} />
    : <MyEarningsContent accountContext={accountContext} />;
}
