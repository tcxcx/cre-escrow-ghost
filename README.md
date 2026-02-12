# The Ark of the New Covenant 🕊️  
**Programmable settlement for a world without lawyers, politicians, and bankers.**

> **“Cursed is the man who trusts in man…”**  
> — *Jeremiah 17:5*

That verse is basically our thesis statement.

Not because humans are evil — but because humans are human:
biased, emotional, inconsistent, incentivized, corruptible, tired, and sometimes just having a bad day.

So we’re building a system where:
- **AI can be neutral when we can’t**
- **contracts can verify reality**
- and **money moves at the speed of the internet**  
  *without asking politicians for permission.*

---

## What is this?

**The Ark of the New Covenant** is a monorepo for two systems that belong together:

### 1) Stablecoin FX Router (DeFi Bytecode FX Engine)
A **Solidity bytecode VM** that executes FX settlement workflows onchain:
- deterministic execution
- composable settlement
- verifiable receipts
- permissionless layers later (DeFi venues, hooks, intents)

### 2) AI Escrow + Adversarial Arbitration  
An AI-native escrow system where smart contracts become **actually smart**:

Instead of “release funds when someone clicks a button”, the contract asks:

> “Was the work delivered correctly?”

Then it verifies deliverables against acceptance criteria using:
- AI verification
- adversarial arguments (pro-provider vs pro-client) on disputes
- decentralized tribunal consensus across multiple model providers on the next dispute instance
- hashed outputs stored onchain for auditability and replay

No subjective approvals.  
No disputes as a business model.  
No “please review the updated PDF v17-final-final”. Where there is no Internation Chamber of Commerce available to the individual - there is the Chamber of the New Covenant.

---

## Why so dramatic papi? “Ark of the New Covenant”? Really?

Because we’re building contracts the way they were always supposed to work:

- the agreement is explicit  
- the rules are immutable  
- the judgment is auditable  
- the outcome is deterministic  

Not enforced by institutions.
Corruptible lawyers.
Enforced by a system.

This is a covenant between two parties — enforced by code, verified by AI, settled onchain. Where two parties agree that this is the way.

---

## The biblical thesis: Jeremiah 17:5

> **“Cursed is the man who trusts in man,**  
> **and makes flesh his strength,**  
> **whose heart departs from the Lord.”**  
> — *Jeremiah 17:5*

We use this verse as a metaphor for modern finance and modern institutions.

The world is built on:
- trusting middlemen
- trusting authorities
- trusting counterparties
- trusting bureaucracy

But trust doesn’t scale.

So this project is about building systems where trust is replaced by:
- cryptography
- decentralized execution
- deterministic settlement
- neutral arbitration
- receipts you can replay
- connecting systems where there is some trust to where there is none for global trust

---

## The Thesis

### Part 1 — FX should behave like software
FX is the largest market on Earth.

And yet it still runs on:
- cut-off times
- settlement windows
- correspondent chains
- bilateral risk
- gated venues
- institutional privilege

Stablecoins changed the settlement layer.  
StableFX is changing the execution layer.  

This project pushes it further:
**a programmable settlement VM that makes FX composable, auditable, and eventually permissionless.**

---

### Part 2 — Actually putting the “smart” in smart contracts
Traditional smart contracts aren’t smart — they’re just automated.

They can move money when someone clicks a button.  
But they cannot answer the most important question:

> “Was the work actually delivered correctly?”

This project changes that.

We use **AI-powered verification** to evaluate deliverables against acceptance criteria, reaching decentralized consensus on quality before releasing payment.

No human is ever in the decision loop.

Locked escrow funds don’t just sit idle — they can generate yield through DeFi protocols, distributed between both parties based on performance.

Think:
- PandaDocs meets escrow  
- minus the 3% intermediary fees  
- minus the 1% “insurance”  
- minus the lawyer layer  
- minus the political permission layer  
- minus getting ripped off by a random freelancer aka a Nigerian prince 🇳🇬 

Freelancers finally get payment guarantees.  
Clients finally get delivery guarantees.  
No middlemen.  
Just two parties, one contract, and AI that verifies the work.

Smart contracts that can finally think — and earn while they wait.

---

## Trust model

This repo is built to avoid:

> “Our server did it, trust us.”

Sources of truth are:
1) **Onchain bytecode execution logs**
2) **Hashed AI-generated documents recorded onchain**
3) **Decentralized workflows for orchestration**
4) **Deterministic receipts and replay**

The system is designed to survive thanks to Chainlink:
- outages  
- geographic distribution  
- multi-rail settlement  
- and the inevitable chaos of the real world  

---

## What’s inside?

This is a Turborepo monorepo:

- `apps/docs` — docs site
- `apps/api` - hono api for usage
- `packages/contracts` — Solidity VM + escrow + arbitration contracts
- `packages/workflows` — decentralized workflows (RFQ + AI arbitration)
- `packages/sdk` — TypeScript compiler/encoder (bytecode programs, receipts)
- `packages/gateway` — Hono API for intents, profiles, evidence upload, webhooks

---

## Running locally

Install dependencies:

```sh
bun install



# Turborepo starter

This Turborepo starter is maintained by the Turborepo core team.

## Using this example

Run the following command:

```sh
npx create-turbo@latest
```

### Utilities

This Turborepo has some additional tools already setup for you:

- [TypeScript](https://www.typescriptlang.org/) for static type checking
- [ESLint](https://eslint.org/) for code linting
- [Prettier](https://prettier.io) for code formatting

### Build

To build all apps and packages, run the following command:

```
cd i-hate-lawyers-and-bankers

# With [global `turbo`](https://turborepo.dev/docs/getting-started/installation#global-installation) installed (recommended)
turbo build

# Without [global `turbo`](https://turborepo.dev/docs/getting-started/installation#global-installation), use your package manager
npx turbo build
yarn dlx turbo build
pnpm exec turbo build
```

You can build a specific package by using a [filter](https://turborepo.dev/docs/crafting-your-repository/running-tasks#using-filters):

```
# With [global `turbo`](https://turborepo.dev/docs/getting-started/installation#global-installation) installed (recommended)
turbo build --filter=docs

# Without [global `turbo`](https://turborepo.dev/docs/getting-started/installation#global-installation), use your package manager
npx turbo build --filter=docs
yarn exec turbo build --filter=docs
pnpm exec turbo build --filter=docs
```

### Develop

To develop all apps and packages, run the following command:

```
cd my-turborepo

# With [global `turbo`](https://turborepo.dev/docs/getting-started/installation#global-installation) installed (recommended)
turbo dev

# Without [global `turbo`](https://turborepo.dev/docs/getting-started/installation#global-installation), use your package manager
npx turbo dev
yarn exec turbo dev
pnpm exec turbo dev
```

You can develop a specific package by using a [filter](https://turborepo.dev/docs/crafting-your-repository/running-tasks#using-filters):

```
# With [global `turbo`](https://turborepo.dev/docs/getting-started/installation#global-installation) installed (recommended)
turbo dev --filter=web

# Without [global `turbo`](https://turborepo.dev/docs/getting-started/installation#global-installation), use your package manager
npx turbo dev --filter=web
yarn exec turbo dev --filter=web
pnpm exec turbo dev --filter=web
```

### Remote Caching

> [!TIP]
> Vercel Remote Cache is free for all plans. Get started today at [vercel.com](https://vercel.com/signup?/signup?utm_source=remote-cache-sdk&utm_campaign=free_remote_cache).

Turborepo can use a technique known as [Remote Caching](https://turborepo.dev/docs/core-concepts/remote-caching) to share cache artifacts across machines, enabling you to share build caches with your team and CI/CD pipelines.

By default, Turborepo will cache locally. To enable Remote Caching you will need an account with Vercel. If you don't have an account you can [create one](https://vercel.com/signup?utm_source=turborepo-examples), then enter the following commands:

```
cd my-turborepo

# With [global `turbo`](https://turborepo.dev/docs/getting-started/installation#global-installation) installed (recommended)
turbo login

# Without [global `turbo`](https://turborepo.dev/docs/getting-started/installation#global-installation), use your package manager
npx turbo login
yarn exec turbo login
pnpm exec turbo login
```

This will authenticate the Turborepo CLI with your [Vercel account](https://vercel.com/docs/concepts/personal-accounts/overview).

Next, you can link your Turborepo to your Remote Cache by running the following command from the root of your Turborepo:

```
# With [global `turbo`](https://turborepo.dev/docs/getting-started/installation#global-installation) installed (recommended)
turbo link

# Without [global `turbo`](https://turborepo.dev/docs/getting-started/installation#global-installation), use your package manager
npx turbo link
yarn exec turbo link
pnpm exec turbo link
```

## Useful Links

Learn more about the power of Turborepo:

- [Tasks](https://turborepo.dev/docs/crafting-your-repository/running-tasks)
- [Caching](https://turborepo.dev/docs/crafting-your-repository/caching)
- [Remote Caching](https://turborepo.dev/docs/core-concepts/remote-caching)
- [Filtering](https://turborepo.dev/docs/crafting-your-repository/running-tasks#using-filters)
- [Configuration Options](https://turborepo.dev/docs/reference/configuration)
- [CLI Usage](https://turborepo.dev/docs/reference/command-line-reference)
