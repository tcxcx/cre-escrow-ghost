import type { StockSymbol } from '../constants/tokens';

export interface StockToken {
  symbol: StockSymbol;
  name: string;
  address: string;
  decimals: number;
  logoUrl?: string;
  color?: string;
}

export interface StockHolding {
  token: StockToken;
  /** Raw balance in wei */
  balance: string;
  /** Human-readable balance */
  balanceFormatted: number;
  /** USD value of holdings */
  usdValue?: number;
  /** 24h price change percentage */
  change24h?: number;
}

export interface StockPrice {
  symbol: StockSymbol;
  priceUsd: number;
  change24h: number;
  timestamp: number;
  /** Where the price came from */
  source?: 'massive' | 'finnhub' | 'yahoo';
}

export interface SwapRoute {
  fromToken: string;
  toToken: string;
  intermediateToken: string;
  amountIn: string;
  estimatedAmountOut: string;
  priceImpact: number;
  steps: SwapStep[];
}

export interface SwapStep {
  from: string;
  to: string;
  amountIn: string;
  estimatedAmountOut: string;
  pool?: string;
}

export type SwapStatus = 'idle' | 'approving' | 'swapping-weth' | 'swapping-stock' | 'confirmed' | 'failed';
