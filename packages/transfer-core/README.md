# @bu/transfer-core

`@bu/transfer-core` is a TypeScript library that provides a unified, protocol-agnostic API for moving tokens across EVM chains via Bridge Kit. It handles:

• Wallet lookup (Supabase)
• Gas estimation
• Route optimization (cheapest available)
• Transaction building, signing (Circle SDK), and submission

You can use it in both web and mobile apps in a Turborepo monorepo setup.

---

## Features

• Single orchestrator (`TransferService`)
• Chain-client management (`ChainService`)
• ABI encoding & contract calls (`ContractService`)
• Gas estimation per protocol (`BridgeKitExecutor`)
• Route optimization (`RouteOptimizationService`)
• Transaction building (`TransactionBuilder`)
• Wallet lookup (`WalletService`)
• Fully testable, DRY, and extensible

---

## Installation

In your monorepo root `package.json`:

```
{
  "private": true,
  "workspaces": ["packages/*"],
  …
}
```

Add `transfer-core` as a workspace:

```
cd packages/transfer-core
bun install viem @bu/circle
```

Then in your web-app or mobile-app:

```
bun install @bu/transfer-core
```

---

## Usage

### Web (Next.js)

```ts
// app/actions/sendMultiChain.ts
'use server'

import { authActionClient } from '../safe-action'
import { multiChainTransfer } from './schema'
import { revalidateTag } from 'next/cache'
import { TransferService } from 'transfer-core'
import { createClient } from '@supabase/supabase-js'
import { LogEvents } from '@bu/events/events'

const supabase = createClient(…your config…)

export const sendMultiChainTransfer =
  authActionClient
    .schema(multiChainTransfer)
    .metadata({
      name: 'multi-chain-transfer',
      track: {
        event: LogEvents.SendMultiChainTransfer.name,
        channel: LogEvents.SendMultiChainTransfer.channel
      }
    })
    .action(async ({ parsedInput, ctx: { user } }) => {
      const svc = new TransferService(supabase)
      const result = await svc.execute(parsedInput)
      if (result.success) {
        revalidateTag(`user_${user.id}`)
        revalidateTag(`team_${parsedInput.teamId}`)
        revalidateTag(`transactions_${parsedInput.teamId}`)
      }
      return result
    })
```

### Mobile (React Native)

```ts
import { TransferService, TransferParams } from 'transfer-core'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(…)
const svc = new TransferService(supabase)

async function sendTransfer(params: TransferParams) {
  const result = await svc.execute(params)
  if (result.success) {
    console.log('Approval Tx:', result.data.approvalTx)
    console.log('Main Tx:', result.data.bridgeTx)
  } else {
    console.error('Transfer failed:', result.error)
  }
}
```

---

## API

### TransferService

```ts
constructor(supabaseClient: SupabaseClient)

execute(params: TransferParams): Promise<TransferResult>
```

- **params**
  • fromChainId: number
  • toChainId: number
  • tokenAddress: string
  • amount: string (decimal)
  • recipient: string (0x…)
  • teamId: string
  • decimals: number

- **returns**
  • `{ success: true, data: { protocol, status, approvalTx, bridgeTx?, quote? } }`
  • or `{ success: false, error: string }`

### Types

```ts
interface GasEstimate {
  protocol: 'bridge-kit' | 'circle-sdk';
  totalGasCost: bigint;
  gasPrice: bigint;
  estimatedGas: bigint;
  available: boolean;
}

interface TransferResult {
  success: boolean;
  data?: {
    protocol: 'bridge-kit' | 'circle-sdk';
    status: 'pending' | 'completed';
    approvalTx: string;
    bridgeTx?: string;
    quote?: string;
  };
  error?: string;
}
```

---

## Project Structure

```
packages/
└─ transfer-core/
   ├─ src/
   │  ├─ constants/
   │  │   ├─ ContractABIs.ts
   │  │   └─ ProtocolConfig.ts
   │  ├─ protocols/
   │  │   ├─ base/index.ts
   │  │   ├─ bridge-kit/index.ts
   │  │   └─ circle-sdk/index.ts
   │  ├─ services/
   │  │   ├─ ChainService.ts
   │  │   ├─ ContractService.ts
   │  │   ├─ GasEstimationService.ts
   │  │   ├─ RouteOptimizationService.ts
   │  │   ├─ TransactionBuilder.ts
   │  │   ├─ WalletService.ts
   │  │   └─ TransferService.ts
   │  ├─ types.ts
   │  └─ index.ts
   ├─ package.json
   └─ tsconfig.json
```

---

## Extending

To add a new bridge protocol:

1. Create `packages/transfer-core/src/protocols/<your>/YourExecutor.ts`
2. Extend `BaseProtocolExecutor`
3. Implement `estimate()` and `execute()`
4. Register in `TransferService` executors map

---

## Development

From repo root:

```
npm install
npx turbo run build    # builds all packages
npx turbo run lint     # lint checks
```

In `transfer-core`:

```
npm run build
npm run lint
```

---

## Contributing

1. Fork the repo
2. Create your feature branch
3. Run `npm install` & `npm run build`
4. Open a PR against `main`

---

With `transfer-core` you get a clean, DRY, testable foundation for any cross-chain token transfer flow in both web and mobile apps.

### Types

- `types.ts` declares all of your domain shapes—`TransferParams`, `GasEstimate`, `TransferResult`, etc.
- No single-letter aliases here—everything is spelled out so you can jump straight to a type's definition.

### Constants

- `constants/ContractABIs.ts` holds your ABIs in one place; you refer to them by key (ERC20, BRIDGE_ROUTER, …).
- `constants/ProtocolConfig.ts` knows how to look up router addresses, domain IDs, etc. again by descriptive names.

### Services

- `ChainService` wraps "give me a viem public client for chain X."
- `ContractService` wraps "read or encode a function call against ABI Y."
- `TransactionBuilder` wraps "build the JSON blob you send into Circle."
- `WalletService` wraps "fetch my team's Circle wallet from Supabase."
- `GasEstimationService` fires off estimators in parallel, catches failures, normalizes the results.
- `RouteOptimizationService` says "pick the cheapest available route."
- `TransferService` is your one-stop orchestrator: fetch wallet → estimate gas → pick route → execute.

### Protocol Executors

- `BaseProtocolExecutor` defines the shape of "estimate(…)" and "execute(…)" plus the shared logic for building & signing a sequence of transactions.
- `BridgeKitExecutor` implements cross-chain bridging flows via Circle Bridge Kit.
- `CircleSDKExecutor` implements same-chain transfers via Circle SDK.

Once it's wired up like this you get:
– **Single Responsibility**: any one file does only one thing
– **Testability**: you can mock, say, `ChainService` or `ContractService` and unit-test your `BridgeKitExecutor` in isolation
– **Extensibility**: adding "NewBridgeExecutor" just means "new class implements BaseProtocolExecutor"
– **DRY**: eliminates duplicate code, including ABI fragments and nonce-fetching logic
