# @bu/transfer-core

Blockchain transfer execution, protocol abstractions, chain mappings.

## Rules
- **Subpath imports mandatory** — services are lazy-loaded to avoid importing SDKs at module level
- `import { TransferService } from '@bu/transfer-core/transfer-service'`
- Never import from barrel root for services — only light types/utilities
- Protocol executors: CCTP, Peanut, Circle, BridgeKit
- Chain config, gas estimation, payout config all via subpaths
- Use `@bu/transfer-utils` for debug logging, explorers, transaction states
- Use `@bu/transfer-fiat` for Bridge, Alfred, Rain fiat flows
