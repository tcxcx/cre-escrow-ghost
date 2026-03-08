import type { StockSymbol } from '../constants/tokens';

export interface StockBonusAllocation {
  stockSymbol: StockSymbol;
  /** Percentage of salary (1-100) */
  percentage: number;
  /** Estimated number of stock tokens (calculated at execution) */
  estimatedTokens?: number;
  /** Estimated USD value (calculated at execution) */
  estimatedUsdValue?: number;
}

export interface StockBonus {
  allocations: StockBonusAllocation[];
  /** Sum of all allocation percentages (max 100) */
  totalPercentage: number;
}
