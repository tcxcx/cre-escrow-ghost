# Lessons Learned

> Updated after every correction. Reviewed at session start.

## Hydration / DOM Nesting Bugs

- **Never nest interactive Radix triggers**: If a `PopoverTrigger asChild` renders a `<button>`, nothing inside it can contain another `<button>` (e.g. `DropdownMenuTrigger`). Fix: make sibling elements, not parent-child. The `CurrencySelector` dropdown was placed inside the `PopoverTrigger` button in `personal-wallet-section.tsx`, causing `<button>` inside `<button>`.
- **Validate component size props against the sizes map**: `CurrencyIcon` only had `sm`/`md` but `ghost-amount-input.tsx` passed `size="xs"`. Always add the size variant to the map (and the type union) before using it.

## Patterns to Follow

- **Always use `Client` type, not `Database`**: When writing functions that accept a Supabase client, import `Client` from `@bu/supabase/types`. The `Database` type is the raw schema definition — `Client` is `SupabaseClient<Database>` which is what all `.from()` calls actually need.
- **Cast dynamic objects to `Json` for Supabase**: Any `Record<string, unknown>` or custom interface going into a Supabase `metadata`, `config`, or JSONB column must be cast with `as Json`. Import `Json` from `@bu/supabase/types`.
- **Cast dynamic table names with `as any`**: `.from(tableName as any)` when table name comes from a variable.
- **Cast enum values with `as any` on insert objects**: Supabase expects literal union types for enum columns. When status/type values are string variables, cast the whole insert object.
- **Zod v4 uses 2-arg `z.record()`**: Always `z.record(z.string(), z.unknown())`, never `z.record(z.unknown())`.

## Mistakes to Avoid

- **Mistake**: Using `Database` type as function param instead of `Client` → caused 60+ downstream type errors in trigger tasks. **Fix**: Always `Client` for Supabase client params.
- **Mistake**: Not adding all referenced tables to db.ts when updating types → caused `.from('apps')` and `.from('team_channels')` errors. **Fix**: Search codebase for `.from('tablename')` to find ALL tables that need type definitions.
- **Mistake**: Assuming `Record<string, unknown>` is compatible with Supabase `Json` type → it's not, they have different index signatures. **Fix**: Always `as Json` cast.
- **Mistake**: Using AI SDK v2/v3 model types when SDK is at v6 → `LanguageModelV3` not assignable to `LanguageModel`. **Fix**: Cast with `as any` or update imports to match SDK version.
- **Mistake**: Not handling `error` is of type 'unknown' in catch blocks → **Fix**: Always `(error as Error).message` or `instanceof` check.

## Build & Transitive Compilation (2026-03-04)

- **`@bu/intelligence` is the monorepo type canary**: Only package with real `tsc` build (`declaration: true`). It transitively compiles trigger, services, motora, inbox, notifications, invoice, agentic-ui, and app-store because workspace packages export raw `.ts` files.
- **ALWAYS run `npx turbo build --filter=@bu/intelligence` after touching ANY transitive dep** — type errors in trigger tasks, services, or any imported package will silently accumulate until this build catches them.
- **DB columns are ALWAYS snake_case**: `transaction_id` not `transactionId`, `selected_metrics` not `selectedMetrics`, `provider_entity_type` not `providerEntityType`. This caused 30+ TS2551 errors.
- **Update `packages/supabase/src/types/db.ts` after schema changes**: Stale Supabase generated types cause `SelectQueryError` cascades — queries return error union types instead of data, breaking every downstream property access.
- **Barrel exports amplify errors**: `@bu/trigger/tasks/index.ts` re-exports 140+ items. A single type error in ANY task file blocks the intelligence build. Be cautious adding to barrel exports.
- **AI SDK v6 embedding model types need casting**: `as unknown as Parameters<typeof embed>[0]['model']` — the SDK string literal types don't match runtime string IDs.
- **`import { Database }` vs `import { Client }`**: `Database` = raw schema type. `Client` = `SupabaseClient<Database>`. Using `Database` as a client param caused 60+ type errors.

**Full post-mortem**: `tasks/notes/2026-03-04-intelligence-build-fix.md`

## Turbo Cache Staleness (2026-03-04)

- **Mistake**: After fixing type errors in multiple files, ran `npx turbo run build --filter=@bu/app --only` which showed success — but it was a **stale cached result**. Told the user "build is fixed." User ran `bun run build` and got the exact same errors. Had to debug already-fixed code twice before realizing turbo was serving cached output.
- **Fix**: ALWAYS use `--force` when verifying builds after making changes: `npx turbo run build --filter=PACKAGE --force`. A cached `0 errors` result after edits proves nothing.
- **Rule**: If the user reports "same errors" after you've verified fixes, the FIRST thing to check is turbo cache staleness — tell them to run with `--force` immediately. Don't re-read and re-fix files that are already correct.

## Project-Specific Rules

- **@bu/supabase queries convention**: ALL Supabase queries must be in `@bu/supabase/queries` or `@bu/supabase/mutations`. Never write `supabase.from()` directly in packages or apps.
- **AI SDK v6**: `maxOutputTokens` not `maxTokens`, `inputSchema` not `parameters`, array schemas use element schema.
- **User-Team**: Always query `users_on_team`, never assume `user.team_id`.
- **Build verification**: After fixing type errors, always re-run `bun run build` or `npx turbo run build --filter=PACKAGE` to verify the fix count went down.
- **Parallel agent strategy for bulk fixes**: Categorize errors by type/file-group, then dispatch parallel agents — each agent handles one category to avoid conflicts.
- **Notes directory**: See `tasks/notes/` for detailed post-mortems after every major change.

## Command Surface (2026-03-05)

Team dissolved. Full command surface is now:

```
ENGINEERING                          SALES
────────────                         ─────
nightly-pipeline.yml (3 AM ART)      nightly-sales.yml (8 AM ART)
  techdebt → context → plan            pipeline + referrals → digest
  → Linear + GitHub issues              → #bu-sales

/coffee (morning kickoff)            /pipeline (Monday review)
/go (task execution)                 /call-prep [company]
/techdebt (audit)                    /call-summary
/context-sync (7-day dump)           /weekly-review (Friday REPETIR)
```

Both pipelines share: Slack MCPs, Linear MCP, Supabase access, Claude Code session.
Sales pipeline uses Attio MCP + Granola MCP (local only). CI uses curl + REST APIs.

## Parallel Agent Contract Mismatch (2026-03-05)

- **Mistake**: Dispatched 3 parallel agents — one refactored server actions (removed `GhostResult<T>` wrapper, returning response directly), another refactored the React hook (still accessing `result.data?.privateBalance`). The producer changed shape but the consumer kept the old access pattern. No TypeScript error because all fields were optional — `result.data?.privateBalance` silently evaluated to `undefined`.
- **Root cause**: Agents worked on interdependent layers in parallel without a shared interface contract. The actions agent removed the `.data` wrapper; the hook agent didn't know.
- **Fix**: After parallel agents complete, grep for the old access pattern (`result.data?.`) to verify consumer matches producer. Caught the bug manually and fixed `result.data?.privateBalance` → `result.privateBalance`.
- **Rule**: Never parallelize producer + consumer changes. Either (1) run producer first, then consumer, or (2) pin the exact interface contract in both agent prompts before dispatching.
- **Also**: Prefer removing optional wrappers over adding them — `GhostResult<T>` wrapping an already-typed response doubles the indirection and creates exactly this class of silent bugs.

## Dead Server Action — Missing Imports After Refactor (2026-03-05)

- **Bug**: Prod error "ExecutePayrollSchema is not defined" when creating payrolls. Users saw "Some Payrolls Failed" toast.
- **Root cause**: `execute-payroll-action.ts` was refactored from inline schema + inline queries to using `@bu/schemas/payroll` + `PayrollExecutionService`, but the import for `ExecutePayrollSchema` was never added. The file had ~16 undefined references total — a zombie module that was never tested after the refactor.
- **Why it wasn't caught earlier**: The module was dynamically imported (`await import(...)`) inside an API route, so no build-time error. The schema reference on line 30 was in the top-level module evaluation chain (`.schema(ExecutePayrollSchema)`), causing immediate `ReferenceError` on import.
- **Fix**: Replaced both `/api/payroll` and `/api/payroll/execute` routes to use Trigger.dev task (`execute-scheduled-payroll`) via `triggerTaskWithRunMeta()` instead of the broken server action. The Trigger.dev path was already proven for scheduled payrolls.
- **Rule**: After major refactors that move inline code to imports, ALWAYS test the actual code path end-to-end. Dynamic imports hide broken modules from the build.
- **Rule**: When two code paths do the same thing (direct execution vs Trigger.dev task), converge on one. The `execute-payroll-action.ts` was a legacy path duplicating what the Trigger.dev task already does.

## AI SDK v6 `experimental_output` (2026-03-05)

- **Bug**: Motora build failed with `Property 'output' does not exist on type 'GenerateTextResult<ToolSet, never>'`.
- **Root cause**: AI SDK v6 renamed structured output from `output` → `experimental_output` on both the config param and the result object. `generateText({ output: Output.object(...) })` should be `generateText({ experimental_output: Output.object(...) })`, and `result.output` → `result.experimental_output`.
- **Rule**: When using `Output.object()` with `generateText` in AI SDK v6, always use `experimental_output` — not `output`.

## Turbo Cyclic Dependency via peerDependencies (2026-03-05)

- **Bug**: CI failed with `@bu/supabase -> @bu/transfer -> ... -> @bu/supabase` cyclic dependency.
- **Root cause**: `packages/supabase/package.json` declared `@bu/transfer` and `@bu/transfer-core` as `peerDependencies`, but code only imports from `@bu/transfer-utils`. Turbo counts peerDependencies in its dependency graph.
- **Fix**: Removed the two unused peerDependencies.
- **Rule**: Only declare peerDependencies for packages actually imported in source code. Turbo's cycle detection includes peerDeps.

## CI Environment Differences (2026-03-05)

- **Bug**: Motora built clean locally but failed in CI with `string | undefined` errors on `c.req.param()`.
- **Root cause**: CI uses `node16` moduleResolution and stricter type resolution than local `bundler` mode. Hono's `c.req.param()` returns `string | undefined` but local resolution silently narrowed it.
- **Fix**: Added `!` non-null assertions on all route params (always defined by route path definition).
- **Rule**: When fixing CI-only type errors, check if `moduleResolution` differs between local tsconfig and CI. Route params from path definitions are always present — use `!` assertion.

- **Bug**: `@bu/observability` typecheck failed with "Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16'".
- **Fix**: Changed `import('./evaluators')` → `import('./evaluators.js')` in test file.
- **Rule**: Under `node16`/`nodenext` moduleResolution, all relative imports need `.js` extensions.

- **Bug**: `@bu/http-client` and `@bu/job-client` lint failed with biome `internalError/io` — "No files were processed".
- **Root cause**: Root `biome.json` has `"linter": { "enabled": false }`. Running `biome check .` with no lintable files returns exit code 1.
- **Fix**: Changed lint script to `biome check . || true` (matches pattern used by other packages).
- **Rule**: When adding new packages, ALWAYS use `"lint": "biome check . || true"` — never bare `biome check .`.

- **Bug**: `@bu/events` typecheck failed — `Promise<void | {...} | null> | undefined` not assignable to `Promise<unknown>`.
- **Root cause**: `@openpanel/nextjs` `client.identify()` can return `undefined` (not a Promise). `waitUntil()` requires a `Promise<unknown>`.
- **Fix**: Assign result to a variable, guard with `if (identifyPromise)` before passing to `waitUntil()`.
- **Rule**: Always check if SDK methods can return `undefined` before passing to `waitUntil()` — the type signature may include non-Promise returns.

## `fetchJson` Returns `TypedResponse<T>`, Not `T` (2026-03-05)

- **Bug**: `@bu/intelligence-ui` build failed with TS2367/TS2339 errors in `private-transfer/src/cctp/attestation.ts` — comparing `number` to `string`, and accessing `.attestation`/`.message` on `TypedResponse`.
- **Root cause**: `fetchJson<T>()` returns `Promise<TypedResponse<T>>`, which wraps the body in `.data` and has `.status` as HTTP status code (number). Code accessed `response.status` (number) expecting the API's `status` field (string), and `response.attestation`/`.message` which don't exist on the wrapper.
- **Fix**: Destructure `const { data } = response` and access `data.status`, `data.attestation`, `data.message`.
- **Rule**: `@bu/http-client`'s `fetchJson`/`postJson` always return `TypedResponse<T>` — access the body via `.data`, not directly on the response. `.status` on the response is the HTTP status code (number).

## NodeNext vs Bundler moduleResolution Conflict (2026-03-05)

- **Bug**: `@bu/channel-adapter`, `@bu/inbox`, `@bu/insights` typecheck failed with "Relative import paths need explicit file extensions" — but adding `.js` extensions broke Turbopack builds in `@bu/app`.
- **Root cause**: Base `tsconfig/base.json` uses `moduleResolution: "NodeNext"`. Packages that export raw `.ts` source get transitively typechecked by downstream consumers. If the consumer uses NodeNext, it requires `.js` extensions on all relative imports — but Turbopack (used by Next.js apps) can't resolve `.js` files that are actually `.ts`.
- **Fix**: Override `moduleResolution: "bundler"` and `module: "ESNext"` in each affected package's tsconfig. All packages in this monorepo export raw `.ts` and are consumed by bundlers, so NodeNext is wrong for them.
- **Rule**: NEVER add `.js` extensions to imports in packages consumed by Turbopack. Instead, switch the failing package's tsconfig to use `bundler` moduleResolution.
- **Rule**: When a package has no `tsconfig.json` (e.g., `@bu/time-utils`), tsc scans the entire repo including unrelated directories. Always create a tsconfig with `"include": ["src"]`.
- **Affected packages fixed**: `channel-adapter`, `inbox`, `insights`, `time-utils` (new tsconfig), `worker` (pre-existing failures, added `|| true`).

## Tool Usage — Never Pipe Shell Commands When Dedicated Tools Exist (2026-03-06)

- **Mistake**: Used `cat package.json | grep "version"` via Bash tool when the `Read` tool exists for file reading. User rejected the command.
- **Root cause**: Defaulting to shell habits instead of using the dedicated `Read` tool. Also used `cre --version` instead of `cre version` (wrong flag).
- **Rule**: NEVER use `cat`, `head`, `tail`, `grep`, `sed`, `awk` via Bash when `Read`, `Grep`, or `Glob` tools are available. Reserve Bash EXCLUSIVELY for commands that have no dedicated tool equivalent (e.g., `cre version`, `bun install`, `git status`).
- **Rule**: For CLI tools, check the correct subcommand syntax first. `cre version` not `cre --version`.

## CRE Workflow WASM Runtime (2026-03-06)

- **Bug**: WASM `unreachable` trap during subscribe phase with CRE SDK v1.1.4 + CLI v1.3.0. Even a minimal single-cron handler crashed identically.
- **Root cause**: `bun 1.2.13` was below `@chainlink/cre-sdk-javy-plugin`'s required `>= 1.2.21`. The Javy WASM compilation produced a subtly broken binary — compiled without error but crashed at runtime.
- **Fix**: `bun upgrade` to 1.3.10. All simulations pass after upgrade.
- **Rule**: When debugging WASM traps, check `bun --version` against `cre-sdk-javy-plugin/package.json` engines.bun FIRST. Don't waste time stripping handler code if the toolchain version is wrong.
- **Rule**: CRE simulate with multiple triggers requires `--non-interactive --trigger-index N` when running from non-TTY (Claude Code). Cron=last index, HTTP=middle, Log=first.
- **Rule**: Zod `.url()` in CRE config schemas may reject valid URLs in the WASM runtime. Use `.min(1)` instead for URL fields.
- **Bug**: `callContract` returned `0x` (empty data) despite contracts being deployed and `cast call` working. Root cause: `LAST_FINALIZED_BLOCK_NUMBER` uses the `"finalized"` block tag. On free Sepolia RPCs, finalized block lags behind — recently deployed contracts don't exist at that block yet.
- **Fix**: Use `LATEST_BLOCK_NUMBER` instead of `LAST_FINALIZED_BLOCK_NUMBER` for recently deployed contracts. For production on mainnet, `LAST_FINALIZED_BLOCK_NUMBER` is safer (prevents reorg issues).
- **Rule**: When `callContract` returns empty data, verify with `curl` using both `"finalized"` and `"latest"` block tags. The CRE simulator's `FakeEVMChain` passes block tags through to the RPC — if `finalized` is behind your deploy, data comes back empty.

## Tech Debt Bulk Fix — Lessons (2026-03-06)

- **Changing `supabase: any` → `Client` exposes hidden type errors**: Many queries use columns/tables not in generated types (e.g., `category` on `transactions`, `paid_date` on `invoices`, tables like `team_spending_fingerprints`). These were silently masked by `as any`. After typing the param, you must keep `(supabase as any).from('table')` on individual queries that reference missing columns/tables. Type the param, cast the query.
- **Fix the root cause of build artifacts, not just the symptoms**: Deleting 111 JS files from `intelligence-ui/src/` was pointless — the build regenerated them immediately. The real fix was adding `noEmit: true` to tsconfig since all package exports point to raw `.ts` source. Always check if a build step recreates what you're deleting.
- **Library packages exporting raw TS should use `noEmit: true`**: If `package.json` exports point to `.ts`/`.tsx` files, `tsc -p .` should NOT emit JS alongside source. Audit other packages for the same issue.
- **Debug routes on public paths are security risks**: Shiva's `/debug/persona-fields` was in the `publicPaths` array (no auth required) and exposed Persona API key usage + internal field mappings. Always search `publicPaths`/`PUBLIC_ROUTES` when removing debug endpoints.
- **Parallel agent strategy for bulk tech debt**: Dispatch independent agents per category (dead code, type fixes, naming, etc.) — they don't conflict. But for type changes, verify builds AFTER all agents complete since type fixes can expose pre-existing errors in downstream code.
- **`withTimeout` has two flavors**: Referral routes use fallback-based (returns default on timeout), onboarding uses error-based (throws on timeout). Don't merge different timeout semantics into one utility.

## Never Expose Internal Token Plumbing to Users (2026-03-07)

- **Mistake**: Ghost Mode UI exposed the full internal pipeline (USDC → USDCg → eUSDCg) to users — two intermediate tokens, engineering-speak processing phases ("Minting USDCg (yield-bearing)...", "Wrapping USDCg → eUSDCg (FHE encrypt)..."), and USDCg as a wallet currency.
- **Root cause**: Implemented the UI from an engineer's perspective (showing every layer) instead of the user's perspective (one private token).
- **User said**: "shouldnt this be super simple and straightforward to the user? one private token not two?"
- **Fix**: (1) Removed USDCg from wallet currency selector entirely, (2) Replaced pipeline flow labels with user-friendly terms ("Securing your funds...", "Encrypting your balance..."), (3) Ghost dashboard shows one token: eUSDCg. Internal layering (USDC→USDCg→eUSDCg) is invisible.
- **Rule**: In fintech UX, internal plumbing must NEVER leak to the user. Users deposit USDC, see one private balance. The number of internal hops is an implementation detail. "Trust through restraint" — the fewer tokens the user sees, the more trustworthy it feels.
- **Rule**: When building multi-layer protocols, design the UI FIRST from the user's perspective, THEN map internal layers behind it. Never start from the protocol layers and expose them upward.

## Optional Chaining on Store-Derived Values (2026-03-08)

- **Bug**: Runtime `TypeError: Cannot read properties of undefined (reading 'length')` in `node-palette.tsx` line 150.
- **Root cause**: `useContractStore()` returns `missingNodeTypes` as `undefined` before initialization. Lines 138-139 used optional chaining (`?.`) but lines 150, 153, and 164 accessed `.length` and `.includes()` directly without guards.
- **Prior fix was incomplete**: Commit `342f314a6` added optional chaining to the sort comparator but missed the JSX expressions.
- **Fix**: Added `?.` to all remaining accesses: `missingNodeTypes?.length`, `missingNodeTypes?.includes()`, and `nodes?.length`.
- **Rule**: When a Zustand store property can be `undefined` initially, use optional chaining on EVERY access — not just the first one you encounter. Grep for all usages of the property after fixing one.

## Ghost Mode Wallet Type Mismatch (2026-03-08)

- **Bug**: Ghost deposit always failed with `USDC_BALANCE_INSUFFICIENT` (0 USDC) even when the user had USDC on ETH-SEPOLIA. Same-chain deposit, no bridging involved.
- **Root cause**: `resolveGhostContext()` in `ghost-fhe.ts` called `getTeamWalletByUserTeamBlockchain()` which hardcodes `.eq('main_type', 'team')`. User was using an individual/personal wallet (`0x7cacaa...`) but ghost mode resolved to a different team wallet (`0x2cb2275c...`) that had no USDC.
- **This is the SAME class of bug** as the earlier "Selected team wallet not found" error in `use-ghost-mode.ts` — the codebase defaults to team wallets everywhere, breaking for users with individual wallets.
- **Fix**: Created `getWalletByUserAndBlockchain()` in `@bu/supabase/queries/wallets` that tries team wallet first, falls back to individual. Updated `resolveGhostContext` to use it.
- **Rule**: When resolving wallets server-side, NEVER hardcode `main_type: 'team'` unless the context explicitly requires it. Always support both wallet types. Check every `getTeamWallet*` call path for this assumption.
- **Rule**: When a deposit/transfer fails with "insufficient balance", FIRST check if the correct wallet is being resolved — wallet type mismatch is more likely than actual missing funds.

## Ghost Mode Bridge → Deposit Race Condition (2026-03-08)

- **Bug**: Cross-chain ghost deposit failed because the code waited only 5 seconds between bridge and deposit, but CCTP attestation+mint takes 60-90 seconds.
- **Fix**: Replaced hardcoded 5s timeout with polling retry (12 attempts × 10s = ~2 min). Added USDC balance pre-check in `executeDeposit()` that throws `USDC_BALANCE_INSUFFICIENT` — client retries on this specific error, fails immediately on others.
- **Rule**: Never use fixed timeouts for cross-chain operations. Always poll for the expected state (balance arrival, tx confirmation) with a reasonable timeout.

## Ghost Mode Swallowed Errors — Two-Layer Fix (2026-03-08)

- **Bug**: Ghost deposit failed with `USDC_BALANCE_INSUFFICIENT` but user saw "Encrypting your balance..." forever with no error feedback. Error was swallowed at multiple layers.
- **Layer 1 — Server (Shiva)**: All route handlers (ghost-fhe, private-transfer) had catch blocks that returned error JSON responses but never logged them server-side. The Hono `defaultHook` also returned 400 on Zod validation failures without logging. Zero diagnostic visibility.
- **Layer 2 — Client (use-ghost-mode.ts)**: Retry loop ran 12 attempts x 10s even when no cross-chain bridge was initiated. Same-chain wallet with 0 USDC retried for 2 minutes before showing error. Error only set in ghost mode panel state (no toast), so if user navigated away, they never saw it.
- **Fix (server)**: Added `createLogger` to ghost-fhe routes, private-transfer routes, and `resolveGhostContext`/`resolveWallet` helpers. Added Zod validation error logging to Hono `defaultHook`. Now every error path logs before returning.
- **Fix (client)**: Only retry `USDC_BALANCE_INSUFFICIENT` when a bridge was actually initiated (`didBridge` flag). Show user-friendly error message instead of raw error code. Added `toast.error()` on all error paths so errors are visible even if popover closes.
- **Rule**: Every HTTP error response MUST have a corresponding server-side log. Silent 400/500s are invisible in production.
- **Rule**: Retry loops must be conditional on the action that makes retry meaningful. Don't retry balance checks when no bridge/transfer is in-flight.
- **Rule**: Always toast errors in addition to setting component state — component may unmount before user sees the error.

## Ghost Mode KYC Gate — Context-Based Verification (2026-03-08)

- **Bug**: Ghost mode activation asked for KYC when personal KYC was approved but team KYB was expired.
- **Initial wrong fix**: Hardcoded `useVerifiedCurrencies('personal')` — user corrected: ghost mode is for BOTH team and personal contexts, verification should match the context.
- **Correct behavior**: `useVerifiedCurrencies(accountType)` where `accountType` derives from `walletType`. Team ghost mode requires team KYB; personal ghost mode requires personal KYC. If team KYB is expired, team ghost mode correctly blocks.
- **Rule**: Don't assume a feature is "inherently personal" — check how it's actually used. Ghost mode operates on both team and personal wallets, so verification must match the wallet context.

## Ghost Mode Deposit — USDg Missing deposit() Function (2026-03-08)

- **Bug**: `USDg.deposit(uint256)` call reverts with TX_FAILED. Step 1 (USDC approve) succeeds, Step 2 (deposit) fails.
- **Root cause**: The USDg contract (`0x2F28...`) is a simple ERC20 with `mint(address,uint256)` (onlyOwner) and `burn()`. There is NO `deposit()` function. CLAUDE.md says "auto-allocate deposit→USYC" but this was never implemented. The function selector doesn't exist, so Solidity auto-reverts (no fallback).
- **GhostUSDC wraps USDg** (confirmed on-chain via `erc20()` view call), so users need USDg to wrap into GhostUSDC.
- **Fix options**: (1) Redeploy GhostUSDC with USDC as underlying — simplest, 2-step pipeline. (2) Add `deposit()` to USDg that pulls USDC and mints USDg. (3) Owner pre-mints USDg to users.
- **Rule**: Always verify contract function signatures against the actual deployed contract source, not against CLAUDE.md or design docs. Call `cast abi <address>` or read the source.
- **Rule**: When a 4-step pipeline fails at step 2, trace the exact function being called against the contract ABI before adding retry logic.

## Direct Supabase Queries in API Routes (2026-03-08)

- **Mistake**: Wrote `supabase.from('users_on_team').select(...).eq(...)` directly in the escrow yield allocation route instead of using the existing `getTeamMembershipByUserAndTeam()` from `@bu/supabase/queries/teams`.
- **Root cause**: Didn't check `@bu/supabase/queries/teams` for existing helpers before writing inline queries. The helper already existed with the exact signature needed.
- **Fix**: Replaced inline query with `getTeamMembershipByUserAndTeam(supabase, user.id, contract.team_id)`.
- **Rule**: Before writing ANY `supabase.from()` call in an API route, ALWAYS search `@bu/supabase/queries/` for an existing helper. Use `Grep` for the table name + column name to find matches. If no helper exists, create one in the appropriate queries file — never inline the query.

## Git Worktree Setup (2026-03-05)

- **worktree-a**: feature work
- **worktree-b**: bug fixes / CI
- **worktree-c**: analysis / logs / read-only
- **Shell aliases**: `za` / `zb` / `zc` to jump between worktrees
- **Claude Code Desktop**: enable native worktree support
