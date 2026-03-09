# Contract Wizard — Guided Flow Implementation

## Gap Analysis Summary
Backend APIs all exist. Individual UI components exist for each step. **Missing**: the orchestration layer that ties template → parties → milestones → escrow → review → sign into a guided wizard with stepper, validation gates, and draft persistence.

## Two Paths (per user request):
```
Path A: Guided Wizard ("Use Template")
  Sheet → Select Template → create draft → /builder?draft=X&step=parties
  → Parties → Milestones → Escrow → Review → Sign

Path B: Custom Builder ("Customize" / "Build from Scratch")
  Sheet → /builder?template=X or blank → ReactFlow canvas → Deploy → Sign/Fund
```

## Plan

### Phase 1: Wizard Orchestration (P0)
- [x] 1. Add wizard state to `contract-store.ts`: `currentStep`, `draftAgreementId`, `wizardMode`, `completedSteps`
- [x] 2. Create `use-wizard-flow.ts` hook: step navigation, `canProceed()` validation, `goNext()`/`goBack()`/`goToStep()`
- [x] 3. Create `WizardStepper` component: 6-step pill bar, active/inactive/complete states
- [x] 4. Create `WizardLayout` component: stepper + content area + Back/Continue buttons
- [x] 5. Refactor `page-client.tsx`: detect `?step=` param → render wizard, else render canvas builder

### Phase 2: Step Components (P1)
- [x] 6. `WizardStepParties`: Payer + Payee side-by-side cards with form fields + add/remove
- [x] 7. `WizardStepMilestones`: Milestone cards (title, amount, criteria, due date) + add/remove + total amount
- [x] 8. `WizardStepEscrow`: Chain, currency, yield toggle, security info
- [x] 9. `WizardStepReview`: Full contract summary (parties, milestones, escrow settings)
- [x] 10. `WizardStepSign`: Contract naming, counterparty invites, shareable link

### Phase 3: Entry Point Wiring (P2)
- [ ] 11. "Use Template" → API creates draft → redirect to wizard step=parties
- [ ] 12. "Customize Template" → existing builder flow (canvas)
- [ ] 13. "Build from Scratch" → existing builder flow (blank canvas)

### Phase 4: Draft Persistence (P3)
- [ ] 14. Auto-save draft to Supabase (debounced)
- [ ] 15. Resume draft from `?draft=<id>`
- [ ] 16. Step validation gates (can't skip without required fields)

## Key Files
- `apps/app/src/lib/contract-store.ts` — add wizard state
- `apps/app/src/hooks/use-wizard-flow.ts` — NEW
- `apps/app/src/components/contract/contract-builder/wizard-stepper.tsx` — NEW
- `apps/app/src/components/contract/contract-builder/wizard-layout.tsx` — NEW
- `apps/app/src/components/contract/contract-builder/wizard-steps/` — NEW directory
- `apps/app/src/app/[locale]/(dashboard)/(sidebar)/contracts/builder/page-client.tsx` — refactor

## Existing Components to Reuse
- `PartyNode` form fields → extract into `WizardStepParties`
- `MilestoneNode` form → extract into `WizardStepMilestones`
- `SettingsPanel` → becomes `WizardStepEscrow`
- `ContractPreview` → becomes `WizardStepReview`
- `InviteCounterpartyModal` + `SigningView` → `WizardStepSign`

## Review
_To be filled after implementation_
