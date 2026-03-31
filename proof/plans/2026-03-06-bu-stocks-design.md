# @bu/stocks — Design Document

**Date**: 2026-03-06
**Branch**: next-ui
**Status**: Approved

## Overview

New package `@bu/stocks` mapping Robinhood Chain testnet smart contracts for tokenized stock trading. Includes a dashboard Stock Widget with purchase sheet, and payroll stock benefits (informal 401k for contractors/freelancers).

Three delivery layers:
1. `@bu/stocks` package — constants, types, services
2. Stock Widget — dashboard widget + purchase sheet
3. Payroll Stock Benefits — percentage-of-salary stock allocations per recipient

## Robinhood Chain Testnet

- **Chain ID**: 46630
- **RPC**: https://rpc.testnet.chain.robinhood.com
- **Explorer**: https://explorer.testnet.chain.robinhood.com
- **Type**: Arbitrum L2 (fraud proofs, token bridge)
- **Wallet**: Alchemy ERC-4337 smart wallets (already configured as `ROBIN-TESTNET`)
- **Gas**: Sponsored via Alchemy Gas Manager policy

## 1. @bu/stocks Package

### Structure

```
packages/stocks/
  package.json
  tsconfig.json
  src/
    index.ts                    # Barrel: types + constants (light)
    constants/
      chain.ts                  # Robinhood Chain config
      tokens.ts                 # Stock token + WETH addresses + logos
      protocol.ts               # L1/L2 bridge, rollup, gateway addresses
      abis.ts                   # ERC-20 ABI fragment
    types/
      stock.ts                  # StockSymbol, StockToken, StockHolding, StockPrice
      payroll.ts                # StockBonusAllocation
    services/                   # Heavy — subpath imports only
      balance.ts                # getStockBalances(address)
      price.ts                  # getStockPrice(symbol)
      swap.ts                   # buildSwapRoute, estimateSwap, executeSwap
```

### Constants

```typescript
// chain.ts
export const ROBINHOOD_CHAIN = {
  id: 46630,
  name: 'Robinhood Chain Testnet',
  rpcUrl: 'https://rpc.testnet.chain.robinhood.com',
  explorer: 'https://explorer.testnet.chain.robinhood.com',
  isTestnet: true,
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
} as const;

// tokens.ts
export const STOCK_TOKENS = {
  TSLA: {
    symbol: 'TSLA', name: 'Tesla',
    address: '0xC9f9c86933092BbbfFF3CCb4b105A4A94bf3Bd4E',
    logoUrl: 'https://logo.clearbit.com/tesla.com',
    color: '#CC0000',
  },
  AMZN: {
    symbol: 'AMZN', name: 'Amazon',
    address: '0x5884aD2f920c162CFBbACc88C9C51AA75eC09E02',
    logoUrl: 'https://logo.clearbit.com/amazon.com',
    color: '#FF9900',
  },
  PLTR: {
    symbol: 'PLTR', name: 'Palantir',
    address: '0x1FBE1a0e43594b3455993B5dE5Fd0A7A266298d0',
    logoUrl: 'https://logo.clearbit.com/palantir.com',
    color: '#101820',
  },
  NFLX: {
    symbol: 'NFLX', name: 'Netflix',
    address: '0x3b8262A63d25f0477c4DDE23F83cfe22Cb768C93',
    logoUrl: 'https://logo.clearbit.com/netflix.com',
    color: '#E50914',
  },
  AMD: {
    symbol: 'AMD', name: 'AMD',
    address: '0x71178BAc73cBeb415514eB542a8995b82669778d',
    logoUrl: 'https://logo.clearbit.com/amd.com',
    color: '#ED1C24',
  },
} as const;

export const WETH_ADDRESS = '0x7943e237c7F95DA44E0301572D358911207852Fa';
export type StockSymbol = keyof typeof STOCK_TOKENS;

// protocol.ts — L1 Ethereum contracts
export const PROTOCOL_CONTRACTS = {
  rollup: '0xdc5F8E399DBd8a9F5F87AeC4C23Beb12431b386D',
  sequencerInbox: '0xA0D9dB3DC9791D54b5183C1C1866eFe1eCA7D414',
  delayedInbox: '0xF2939afA86F6f933A3CE17fCAB007907B6b0B7a4',
  bridge: '0x96295BDad104eaD97cC08797b3dC68efF59CcF30',
  outbox: '0x8D180Caf588f3Da027BEf1F42a106Da93F90b166',
} as const;

export const BRIDGE_CONTRACTS = {
  l1: {
    gatewayRouter: '0xF6F11aAEE80875776C264d93B37B34cE437382D1',
    erc20Gateway: '0x52C2976cbDEf48BcC51d07d3c523769F76ECBd09',
    wethGateway: '0x8f8A6799F2b1978c6586318543c73D8Fb12f218f',
    weth: '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9',
  },
  l2: {
    gatewayRouter: '0x77bF00A6A90c600f214b34BAFBB7918c0cF113A8',
    erc20Gateway: '0x8689aFB9086734e12beA6b5DF541a1da252Ea32a',
    wethGateway: '0x5A8F55202A625D12FFCb76F857FE4563bC8Ce413',
    weth: '0x7943e237c7F95DA44E0301572D358911207852Fa',
    multicall: '0xa432504b6F04Cafe775b09D8AA92e8dbe41Ec7a8',
  },
} as const;
```

### Types

```typescript
// types/stock.ts
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
  balance: string;
  balanceFormatted: number;
  usdValue?: number;
  change24h?: number;
}

export interface StockPrice {
  symbol: StockSymbol;
  priceUsd: number;
  change24h: number;
  timestamp: number;
}

// types/payroll.ts
export interface StockBonusAllocation {
  stockSymbol: StockSymbol;
  percentage: number;        // 1-100
  estimatedTokens?: number;
  estimatedUsdValue?: number;
}
```

### Services (subpath imports)

- `balance.ts`: `getStockBalances(address: string): Promise<StockHolding[]>` — multicall ERC-20 balanceOf across all 5 tokens
- `price.ts`: `getStockPrice(symbol: StockSymbol): Promise<StockPrice>` — on-chain or Alchemy price feed
- `swap.ts`: `buildSwapRoute(from: 'USDC', to: StockSymbol, amount: string)` — 2-hop route USDC->WETH->STOCK, executed via Alchemy UserOp

## 2. Stock Widget

### Widget Registration

9th widget in the dashboard system. Registered in `widget-registry.ts`, added to `WidgetId` union in dashboard store, added to `custom-dashboard/data.ts` config.

### StockWidget Component

Located at `apps/app/src/components/widgets/stocks/index.tsx`.

Anatomy (mirrors TokenPortfolioWidget):
- Header: "Stock Portfolio" + `[Buy Stocks +]` button (Plus icon)
- Total USD value of all stock holdings
- Chain badge: "Robinhood Chain Testnet" + truncated wallet address
- Token list: company logo (Clearbit, h-8 w-8 rounded-full), symbol, name, balance, USD value, 24h change (emerald/red)
- Scrollable: maxHeight 320px
- Skeleton: 3 shimmer rows
- Empty state: chart emoji + "No stock tokens yet" + "Buy your first stock token to get started" + CTA button
- FeatureGuard wrapper

### StockPurchaseSheet

Located at `apps/app/src/components/widgets/stocks/stock-purchase-sheet.tsx`.

Uses `Sheet` with `side="right"` (branded variant with purple shadow + rounded corners).

3-step flow:
1. **Select Stock** — grid of 5 stock cards with logo, symbol, live price. Selected card gets indigo ring.
2. **Amount** — USDC input with wallet balance display and [MAX] button.
3. **Review** — swap route visualization (USDC -> WETH -> STOCK), estimated tokens, price impact, gas (sponsored).

CTA: "Buy [SYMBOL]" button with purpleDanis background.

Post-submit: progress steps with checkmark/spinner/X indicators (same pattern as ghost-mode-monitor events).

Data flow:
- Balance from `@bu/alchemy-wallets` (USDC on Robinhood Chain)
- Prices from `@bu/stocks/services/price`
- Swap route from `@bu/stocks/services/swap`
- Execution via `@bu/alchemy-wallets` (ERC-4337 UserOp, gas sponsored)

## 3. Payroll Stock Benefits

### Type Changes

`PayrollRecipient` in `@bu/types/payroll.ts` gains:

```typescript
stockBonus?: {
  allocations: StockBonusAllocation[];
  totalPercentage: number;
};
```

### Schema Changes

`@bu/schemas/payroll.ts` gains stockBonus validation:

```typescript
stockBonus: z.object({
  allocations: z.array(z.object({
    stockSymbol: z.enum(['TSLA', 'AMZN', 'PLTR', 'NFLX', 'AMD']),
    percentage: z.number().min(1).max(100),
  })),
  totalPercentage: z.number().max(100),
}).optional()
```

### UI Changes

`RecipientRow` in payroll sheet gains a collapsible "Stock Bonus" section:
- Toggle to expand/collapse (motion accordion)
- [+ Add Stock] button to add allocation rows
- Each row: stock logo + Select dropdown + percentage input + estimated USD/tokens + delete
- Total banner: "Total stock bonus: $X (Y% of $salary)"

### Execution Changes

In `payroll-execution.service.ts`:
1. Main stablecoin payments execute as normal (USDC/EURC batches)
2. After main batch, a separate stock bonus batch triggers:
   - For each recipient with stockBonus allocations
   - Calculate USD: salary * percentage / 100
   - Route through @bu/stocks/services/swap (USDC -> WETH -> STOCK)
   - Execute via Alchemy wallet on Robinhood Chain
   - Send stock tokens to recipient wallet address
3. Both batches tracked in executionMetadata

## 4. Integration Points

| File | Change |
|---|---|
| `packages/stocks/` | NEW package |
| `packages/types/src/payroll.ts` | Add stockBonus to PayrollRecipient |
| `packages/schemas/src/payroll.ts` | Add stockBonus validation |
| `packages/transfer-core/src/constants/chain-constants.ts` | Add ROBINHOOD_TESTNET: 46630 |
| `apps/app/src/components/widgets/stocks/` | NEW StockWidget + StockPurchaseSheet |
| `apps/app/src/components/dashboard-renderer/widget-registry.ts` | Register 'stocks' |
| `apps/app/src/store/dashboard/index.tsx` | Add 'stocks' to WidgetId |
| `apps/app/src/components/sheets/custom-dashboard/data.ts` | Add stocks widget config |
| `apps/app/src/app-sidebar/widget-url-mapping.ts` | Add stocks URL mapping |
| `apps/app/src/components/payroll/components/sheet/components/RecipientRow/` | Add StockBonusField |
| `apps/app/src/components/payroll/components/sheet/schema.ts` | Add stockBonus to form |
| `packages/services/src/payroll-execution.service.ts` | Stock bonus batch execution |

Consumed as-is (no changes):
- `@bu/alchemy-wallets` — ROBIN-TESTNET config exists
- `@bu/ui` — Sheet, Select, Input, Button, Carousel
- `@bu/circle` — USDC balance queries

## 5. Dev-Only Gating

All stock features gated behind feature flag (FeatureGuard). This is a dev/testnet-only feature — no mainnet contracts exist yet.
