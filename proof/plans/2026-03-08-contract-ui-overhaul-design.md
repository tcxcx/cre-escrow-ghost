# Contract UI Overhaul — Design System Alignment

**Date**: 2026-03-08
**Status**: Approved

## Goal
Align all contract UI components to the BUFI design system (Figma). Two user paths:
1. **Guided flow**: template → parties → milestones → escrow → review → sign
2. **Custom builder**: blank canvas or customized template with AI assist

## Design Tokens (ONLY these)
- **Purple**: `purpleDanis`, `violeta`, `purpura`, `lila`
- **Borders**: `borderFine`, `darkBorder`, `grayBorderDanis`
- **Text**: `text` (body), `darkText` (dark mode), `grayDanis` (muted), `purpleDanis` (accent)
- **Backgrounds**: `bw`, `whiteDanis`, `darkBg`
- **Green**: `vverde`, `mintDanis`
- **Opacity variants**: Use Tailwind palette (`violet-50`, `violet-950`, `emerald-50`) — NOT `/opacity` on custom CSS-variable colors
- **Shadows**: `shadow-sm`, `shadow-lg`, `shadow-xl` — no hardcoded rgba shadows
- **Rounded**: `rounded-xl` (cards), `rounded-3xl` (dialogs), `rounded-full` (pills/badges)

## Stepper Pattern
Shared across all 6 steps:
- Active: `bg-purpleDanis text-bw border-purpleDanis rounded-full`
- Inactive: `bg-bw border-borderFine text-purpleDanis rounded-full`
- Connector lines between steps

## Phases

### Phase 1 — Template Selection (DONE)
- `template-selector.tsx` — card grid with tags, AI card, import
- `contracts-sheet.tsx` — dialog wrapper

### Phase 2 — Stepper + Parties + Builder Page
- Shared stepper component
- `page-client.tsx` — stepper integration
- Payer/Payee party cards with KYC badges
- Network config sidebar (blockchain, currency, expiry, fee)

### Phase 3 — Milestones + Escrow + Signing
- Milestone detail cards
- Escrow balance, transaction history, yield
- Signing progress, signature status, terms

### Phase 4 — Builder Nodes + Canvas
- `flow-canvas.tsx`, node palette, properties panel
- All node types (clause, commission, condition, identity, milestone, party, payment, signature)
- AI assist panel, help panel, settings panel

### Phase 5 — Supporting Views
- Contract list, dashboard, filters
- Arbitration, disputes, verdict
- Notifications, sharing, collaboration

## Rules
- No hardcoded hex values
- No `/opacity` on custom CSS-variable colors
- No `text-black`, `border-black`, `bg-black` — use design tokens
- Dark mode: `dark:bg-darkBg`, `dark:border-darkBorder`, `dark:text-darkText`
- Use existing Button/Badge/Card variants where possible
