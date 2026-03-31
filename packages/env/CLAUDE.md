# @bu/env

Centralized environment variable resolution. 22 domain modules.

## Rules
- Subpath imports mandatory: `import { getStripeSecretKey } from '@bu/env/stripe'`
- Each domain module has getter functions: `getCircleApiKey()`, `getMotoraUrl()`, etc.
- Core `resolve()` function handles resolution — don't access `process.env` directly
- Adding new vars: create getter in appropriate domain module, add to turbo.json `globalPassThroughEnv`
- 243 files, 518 replacements done — follow existing patterns

## Domain Modules
core, blockchain, circle, bridge, stripe, supabase, motora, alfred, rain, trigger, ai, communication, identity, security, fee, providers, meetings, whatsapp, langfuse, client/next
