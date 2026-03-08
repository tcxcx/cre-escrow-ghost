# Escrow Pipeline E2E Wiring Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Wire the 8 contract email templates into the contracts controller lifecycle, create a signing reminder Trigger.dev cron job, build workspace invitation endpoint, and add deliverable upload UI — connecting the existing CRE escrow workflows to the user-facing pipeline.

**Architecture:** CRE workflows (verify, finalize, dispute, monitor, yield) are already fully implemented with confidential HTTP, on-chain settlement, and attestation. The gap is purely in the **notification layer** (emails not sent), **invitation flow** (no workspace search/invite), **reminder automation** (no cron), and **deliverable submission UI** (API exists, no frontend). We wire `@bu/resend` via Trigger.dev tasks following the invoice email pattern.

**Tech Stack:** Trigger.dev v4, @bu/resend, @bu/email, Hono (Shiva), React (Next.js App Router), Supabase

---

## What's Already Built (Do NOT Recreate)

| Layer | Component | Status |
|-------|-----------|--------|
| CRE | workflow-escrow-verify | FULLY IMPLEMENTED — confidential AI verify + attestation |
| CRE | workflow-escrow-finalize | FULLY IMPLEMENTED — on-chain setDecision + executeDecision + attestation |
| CRE | workflow-escrow-dispute | FULLY IMPLEMENTED — 4-layer arbitration + lockMilestone + attestation |
| CRE | workflow-escrow-monitor | FULLY IMPLEMENTED — EVM log + cron proof-of-reserves |
| CRE | workflow-escrow-yield | FULLY IMPLEMENTED — Motora deposit/redeem + attestation |
| Backend | contracts.controller.ts | FULLY IMPLEMENTED — 12 methods (list/get/create/sign/fund/submit/dispute/appeal/finalize/release/artifacts/receipt) |
| Backend | cre-trigger.service.ts | FULLY IMPLEMENTED — triggerCreWorkflowWithFallback for all 5 workflows |
| API | 13 contract routes in Shiva | FULLY IMPLEMENTED |
| Email | 8 contract templates | JUST CREATED — not wired to any send logic |

---

### Task 1: Create Contract Email Trigger.dev Task

**Files:**
- Create: `packages/trigger/tasks/contracts/send-contract-email.tsx`

**Step 1: Create the task file**

This task handles ALL 8 contract email templates via a `template` discriminator, following the invoice email pattern.

```tsx
import { sendEmail } from '@bu/resend';
import {
  ContractInvitationEmail,
  ContractSignedEmail,
  ContractFundedEmail,
  ContractSigningReminderEmail,
  ContractDeliverableSubmittedEmail,
  ContractVerificationResultEmail,
  ContractDisputeResolvedEmail,
  ContractCompletedEmail,
} from '@bu/email';
import { task } from '@trigger.dev/sdk';
import { createLogger } from '@bu/logger';
import { z } from 'zod/v3';

const logger = createLogger({ prefix: 'trigger:send-contract-email', theme: 'tag' });

const schema = z.object({
  template: z.enum([
    'contract-invitation',
    'contract-signed',
    'contract-funded',
    'contract-signing-reminder',
    'contract-deliverable-submitted',
    'contract-verification-result',
    'contract-dispute-resolved',
    'contract-completed',
  ]),
  to: z.string().email(),
  subject: z.string(),
  props: z.record(z.unknown()),
});

type Schema = z.infer<typeof schema>;

const TEMPLATE_MAP: Record<string, React.FC<any>> = {
  'contract-invitation': ContractInvitationEmail,
  'contract-signed': ContractSignedEmail,
  'contract-funded': ContractFundedEmail,
  'contract-signing-reminder': ContractSigningReminderEmail,
  'contract-deliverable-submitted': ContractDeliverableSubmittedEmail,
  'contract-verification-result': ContractVerificationResultEmail,
  'contract-dispute-resolved': ContractDisputeResolvedEmail,
  'contract-completed': ContractCompletedEmail,
};

export const sendContractEmail = task<'send-contract-email', Schema>({
  id: 'send-contract-email',
  queue: { concurrencyLimit: 10 },
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 10000,
  },
  run: async ({ template, to, subject, props }) => {
    logger.info('Sending contract email', { template, to });

    const Component = TEMPLATE_MAP[template];
    if (!Component) throw new Error(`Unknown template: ${template}`);

    const result = await sendEmail({
      from: 'BOT',
      to,
      subject,
      react: <Component {...props} />,
      category: 'contract',
      template,
    });

    if (!result.success) {
      logger.error('Email send failed', { template, to, error: result.error });
      throw new Error(result.error);
    }

    logger.info('Contract email sent', { template, to, messageId: result.messageId });
    return { success: true, messageId: result.messageId };
  },
});
```

**Step 2: Add CONTRACTS sender to senders.ts**

Add to `packages/resend/src/senders.ts`:

```typescript
/** Contract lifecycle emails (invitations, signing, escrow, disputes) */
CONTRACTS: 'BUFI Contracts <contracts@bu.finance>',
```

Update the task to use `from: 'CONTRACTS'` instead of `'BOT'`.

**Step 3: Export from trigger index**

Add to `packages/trigger/src/index.ts`:

```typescript
// Contract emails
export { sendContractEmail } from '../tasks/contracts/send-contract-email';
```

**Step 4: Add typed wrapper to trigger client**

Add to `packages/trigger/src/client.ts`:

```typescript
export async function triggerSendContractEmail(payload: {
  template: string;
  to: string;
  subject: string;
  props: Record<string, unknown>;
}): Promise<{ runId: string; publicToken: string }> {
  return triggerTaskWithRunMeta('send-contract-email', payload);
}
```

**Step 5: Commit**

```bash
git add packages/trigger/tasks/contracts/send-contract-email.tsx packages/trigger/src/index.ts packages/trigger/src/client.ts packages/resend/src/senders.ts
git commit -m "feat(trigger): add contract email send task with 8 template support"
```

---

### Task 2: Wire Email Sending in Contracts Controller

**Files:**
- Modify: `apps/shiva/src/controllers/contracts.controller.ts`

**Step 1: Add trigger import**

At the top of the file, add:

```typescript
import { triggerTask } from '@bu/trigger'
```

**Step 2: Wire email in `createFromTemplate()` (invitation)**

After the successful insert at line ~126 (`return c.json({ success: true, agreementId }, 201)`), add email trigger BEFORE the return:

```typescript
// Send invitation email to counterparty
const counterpartyEmail = safeString(body.counterpartyEmail)
if (counterpartyEmail) {
  await triggerTask('send-contract-email', {
    template: 'contract-invitation',
    to: counterpartyEmail,
    subject: `${safeString(body.senderName, 'Someone')} invited you to sign a contract`,
    props: {
      recipientName: safeString(body.counterpartyName, 'Counterparty'),
      senderName: safeString(body.senderName),
      senderTeamName: safeString(body.senderTeamName),
      contractTitle: body.title || 'Untitled Agreement',
      totalAmount: String(body.totalAmount || '0'),
      currency: safeString(body.currency, 'USDC'),
      milestoneCount: Array.isArray(body.milestones) ? body.milestones.length : 0,
      link: `https://desk.bu.finance/contracts/${agreementId}/sign`,
    },
  }).catch((err) => logger.warn('Failed to trigger invitation email', { error: (err as Error).message }))
}
```

**Step 3: Wire email in `sign()` (both-parties-signed notification)**

After status update at line ~177, when `status === 'ACTIVE'`:

```typescript
if (status === 'ACTIVE') {
  // Both parties signed — notify both
  const payerAddr = safeString(agreement.payer_address)
  const payeeAddr = safeString(agreement.payee_address)
  const agreementJson = agreement.agreement_json as Record<string, unknown>
  const counterpartyEmail = safeString(agreementJson.counterpartyEmail)
  const creatorEmail = safeString(agreementJson.creatorEmail)

  const emailProps = {
    contractTitle: safeString(agreement.title),
    totalAmount: String(agreement.total_amount || '0'),
    currency: 'USDC',
    payerName: safeString(agreementJson.payerName, 'Payer'),
    payeeName: safeString(agreementJson.payeeName, 'Payee'),
    signedAt: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    link: `https://desk.bu.finance/contracts/${agreementId}`,
  }

  for (const email of [counterpartyEmail, creatorEmail].filter(Boolean)) {
    triggerTask('send-contract-email', {
      template: 'contract-signed',
      to: email,
      subject: `Contract "${safeString(agreement.title)}" fully signed`,
      props: { ...emailProps, recipientName: email === creatorEmail ? safeString(agreementJson.payerName) : safeString(agreementJson.payeeName) },
    }).catch((err) => logger.warn('Failed to trigger signed email', { error: (err as Error).message }))
  }
}
```

**Step 4: Wire email in `fund()` (escrow funded notification)**

After the successful update at line ~267, notify the payee:

```typescript
// Notify payee that escrow is funded
const agreementJson2 = typeof agreement.agreement_json === 'object' && agreement.agreement_json !== null
  ? (agreement.agreement_json as Record<string, unknown>)
  : {}
const payeeEmail = safeString(agreementJson2.counterpartyEmail)
if (payeeEmail) {
  const { data: firstMs } = await supabaseAdmin.from('milestones')
    .select('title')
    .eq('agreement_id', agreementId)
    .eq('index', 0)
    .maybeSingle()

  triggerTask('send-contract-email', {
    template: 'contract-funded',
    to: payeeEmail,
    subject: `Escrow funded — ${safeString(agreement.title)} is ready`,
    props: {
      recipientName: safeString(agreementJson2.payeeName, 'Contractor'),
      contractTitle: safeString(agreement.title),
      fundedAmount: String(amount),
      currency: 'USDC',
      payerName: safeString(agreementJson2.payerName, 'Client'),
      firstMilestoneTitle: safeString(firstMs?.title, 'Milestone 1'),
      link: `https://desk.bu.finance/contracts/${agreementId}`,
    },
  }).catch((err) => logger.warn('Failed to trigger funded email', { error: (err as Error).message }))
}
```

**Step 5: Wire email in `submitDeliverable()` (deliverable submitted)**

After the successful submission at line ~367, notify the payer:

```typescript
// Notify payer of deliverable submission
const { data: agreementForEmail } = await supabaseAdmin.from('escrow_agreements_v3')
  .select('title, agreement_json')
  .eq('agreement_id', agreementId)
  .single()

if (agreementForEmail) {
  const aj = agreementForEmail.agreement_json as Record<string, unknown>
  const payerEmail = safeString(aj.creatorEmail)
  if (payerEmail) {
    const { count: totalMs } = await supabaseAdmin.from('milestones')
      .select('*', { count: 'exact', head: true })
      .eq('agreement_id', agreementId)

    triggerTask('send-contract-email', {
      template: 'contract-deliverable-submitted',
      to: payerEmail,
      subject: `Deliverable submitted for "${safeString(milestone.title)}"`,
      props: {
        recipientName: safeString(aj.payerName, 'Client'),
        payeeName: safeString(aj.payeeName, 'Contractor'),
        contractTitle: safeString(agreementForEmail.title),
        milestoneTitle: safeString(milestone.title),
        milestoneIndex: safeNumber(milestone.index) + 1,
        totalMilestones: totalMs ?? 1,
        milestoneAmount: String(safeNumber(milestone.amount)),
        currency: 'USDC',
        link: `https://desk.bu.finance/contracts/${agreementId}/milestone/${milestoneId}`,
      },
    }).catch((err) => logger.warn('Failed to trigger deliverable email', { error: (err as Error).message }))
  }

  // Also send verification result email
  const verdictTemplate = report.verdict === 'PASS' ? 'Passed' : 'Rejected'
  for (const emailAddr of [safeString(aj.creatorEmail), safeString(aj.counterpartyEmail)].filter(Boolean)) {
    triggerTask('send-contract-email', {
      template: 'contract-verification-result',
      to: emailAddr,
      subject: `AI Verification ${verdictTemplate}: ${safeString(milestone.title)}`,
      props: {
        recipientName: emailAddr === safeString(aj.creatorEmail) ? safeString(aj.payerName) : safeString(aj.payeeName),
        contractTitle: safeString(agreementForEmail.title),
        milestoneTitle: safeString(milestone.title),
        milestoneIndex: safeNumber(milestone.index) + 1,
        verdict: report.verdict === 'PASS' ? 'PASS' : 'REJECTED',
        confidence: safeNumber(report.confidence),
        summary: safeString(report.summary, 'Verification complete.'),
        disputeWindowDays: Math.ceil(DEFAULT_ARBITRATION_CONFIG.disputeWindowHours / 24),
        link: `https://desk.bu.finance/contracts/${agreementId}/milestone/${milestoneId}`,
      },
    }).catch((err) => logger.warn('Failed to trigger verification email', { error: (err as Error).message }))
  }
}
```

**Step 6: Wire email in `finalize()` (dispute resolved + completion)**

After the finalize update (line ~717-719), when all milestones released:

```typescript
// Send dispute resolution email if there was a dispute
if (dispute) {
  const { data: agr } = await supabaseAdmin.from('escrow_agreements_v3')
    .select('title, agreement_json')
    .eq('agreement_id', agreementId)
    .single()
  const aj = agr?.agreement_json as Record<string, unknown> ?? {}

  for (const emailAddr of [safeString(aj.creatorEmail), safeString(aj.counterpartyEmail)].filter(Boolean)) {
    triggerTask('send-contract-email', {
      template: 'contract-dispute-resolved',
      to: emailAddr,
      subject: `Dispute resolved: ${safeString(milestone.title)}`,
      props: {
        recipientName: emailAddr === safeString(aj.creatorEmail) ? safeString(aj.payerName) : safeString(aj.payeeName),
        contractTitle: safeString(agr?.title),
        milestoneTitle: safeString(milestone.title),
        finalVerdict: getVerdictType(payeeBps),
        payeePercentage: Math.round(payeeBps / 100),
        milestoneAmount: String(safeNumber(milestone.amount)),
        currency: 'USDC',
        arbitrationLayer: dispute.status === 'L4_COMPLETE' ? 'Supreme Court (Layer 4)' : 'Tribunal (Layer 3)',
        summary: safeString(finalizeResult.summary, 'Arbitration complete.'),
        canAppeal: dispute.status !== 'L4_COMPLETE',
        link: `https://desk.bu.finance/contracts/${agreementId}/dispute/${dispute.id}`,
      },
    }).catch((err) => logger.warn('Failed to trigger dispute email', { error: (err as Error).message }))
  }
}

// Send completion email when all milestones released
if (allReleased) {
  const { data: agr2 } = await supabaseAdmin.from('escrow_agreements_v3')
    .select('title, total_amount, agreement_json')
    .eq('agreement_id', agreementId)
    .single()
  const aj2 = agr2?.agreement_json as Record<string, unknown> ?? {}

  for (const emailAddr of [safeString(aj2.creatorEmail), safeString(aj2.counterpartyEmail)].filter(Boolean)) {
    triggerTask('send-contract-email', {
      template: 'contract-completed',
      to: emailAddr,
      subject: `Contract "${safeString(agr2?.title)}" completed`,
      props: {
        recipientName: emailAddr === safeString(aj2.creatorEmail) ? safeString(aj2.payerName) : safeString(aj2.payeeName),
        contractTitle: safeString(agr2?.title),
        totalAmount: String(safeNumber(agr2?.total_amount)),
        totalReleased: String(safeNumber(agr2?.total_amount)),
        currency: 'USDC',
        milestoneCount: (allMilestones ?? []).length,
        payerName: safeString(aj2.payerName),
        payeeName: safeString(aj2.payeeName),
        completedAt: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        link: `https://desk.bu.finance/contracts/${agreementId}`,
      },
    }).catch((err) => logger.warn('Failed to trigger completion email', { error: (err as Error).message }))
  }
}
```

**Step 7: Commit**

```bash
git add apps/shiva/src/controllers/contracts.controller.ts
git commit -m "feat(contracts): wire 8 email templates to contract lifecycle events"
```

---

### Task 3: Create Signing Reminder Trigger.dev Cron Job

**Files:**
- Create: `packages/trigger/tasks/contracts/signing-reminder-cron.ts`

**Step 1: Create the cron task**

```typescript
import { schedules, task } from '@trigger.dev/sdk';
import { createClient } from '@bu/supabase/job';
import { createLogger } from '@bu/logger';

const logger = createLogger({ prefix: 'trigger:signing-reminder', theme: 'tag' });

export const signingReminderCron = schedules.task({
  id: 'signing-reminder-cron',
  // Run daily at 9am UTC
  cron: '0 9 * * *',
  run: async () => {
    logger.info('Running signing reminder cron');
    const supabase = createClient();

    // Find agreements pending signature for >24h
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: pendingAgreements, error } = await supabase
      .from('escrow_agreements_v3')
      .select('agreement_id, title, total_amount, agreement_json, created_at')
      .in('status', ['DRAFT', 'PENDING_SIGN'])
      .lt('created_at', oneDayAgo);

    if (error) {
      logger.error('Failed to query pending agreements', { error: error.message });
      throw new Error(error.message);
    }

    if (!pendingAgreements?.length) {
      logger.info('No pending agreements found');
      return { sent: 0 };
    }

    let sent = 0;
    const { triggerTask } = await import('@bu/trigger');

    for (const agreement of pendingAgreements) {
      const aj = agreement.agreement_json as Record<string, unknown> ?? {};
      const signatures = Array.isArray(aj.signatures) ? aj.signatures as Array<Record<string, unknown>> : [];
      const signedRoles = new Set(signatures.map((s) => String(s.signerRole ?? s.role).toLowerCase()));

      // Determine who hasn't signed
      const unsignedEmail = !signedRoles.has('payee')
        ? String(aj.counterpartyEmail ?? '')
        : !signedRoles.has('payer')
          ? String(aj.creatorEmail ?? '')
          : null;

      if (!unsignedEmail) continue;

      const recipientName = !signedRoles.has('payee')
        ? String(aj.payeeName ?? 'Counterparty')
        : String(aj.payerName ?? 'Creator');

      await triggerTask('send-contract-email', {
        template: 'contract-signing-reminder',
        to: unsignedEmail,
        subject: `Reminder: Sign "${agreement.title}"`,
        props: {
          recipientName,
          senderTeamName: String(aj.senderTeamName ?? aj.payerTeamName ?? 'Bu Finance'),
          contractTitle: agreement.title,
          totalAmount: String(agreement.total_amount ?? '0'),
          currency: 'USDC',
          createdAt: new Date(agreement.created_at).toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric',
          }),
          link: `https://desk.bu.finance/contracts/${agreement.agreement_id}/sign`,
        },
      }).catch((err) => logger.warn('Failed to send reminder', { agreementId: agreement.agreement_id, error: (err as Error).message }));

      sent++;
    }

    logger.info('Signing reminders sent', { sent, total: pendingAgreements.length });
    return { sent, total: pendingAgreements.length };
  },
});
```

**Step 2: Export from trigger index**

Add to `packages/trigger/src/index.ts`:

```typescript
export { signingReminderCron } from '../tasks/contracts/signing-reminder-cron';
```

**Step 3: Commit**

```bash
git add packages/trigger/tasks/contracts/signing-reminder-cron.ts packages/trigger/src/index.ts
git commit -m "feat(trigger): add daily signing reminder cron job"
```

---

### Task 4: Build Workspace Search & Invitation Endpoint

**Files:**
- Create: `apps/shiva/src/controllers/workspace-invite.controller.ts`
- Modify: `apps/shiva/src/routes/contracts.ts`

**Step 1: Create workspace invite controller**

```typescript
/**
 * Workspace Invite Controller
 *
 * Enables searching for Bu workspaces and sending contract invitations
 * to other teams on the platform.
 */

import type { Context } from 'hono'
import { supabaseAdmin } from '../config/supabase'
import { createLogger } from '@bu/logger'
import { triggerTask } from '@bu/trigger'

const logger = createLogger({ prefix: 'workspace-invite' })

export class WorkspaceInviteController {
  /**
   * Search workspaces by name or email domain
   * GET /contracts/workspaces/search?q=acme
   */
  async search(c: Context): Promise<Response> {
    try {
      const query = c.req.query('q')?.trim()
      if (!query || query.length < 2) {
        return c.json({ error: 'Query must be at least 2 characters' }, 400)
      }

      const { data: teams, error } = await supabaseAdmin
        .from('teams')
        .select('id, name, logo_url, created_at')
        .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(10)

      if (error) return c.json({ error: error.message }, 500)

      // Don't expose internal IDs — map to safe shape
      const results = (teams ?? []).map((t: any) => ({
        id: t.id,
        name: t.name,
        logoUrl: t.logo_url,
      }))

      return c.json({ workspaces: results })
    } catch (error) {
      return c.json({ error: (error as Error).message }, 500)
    }
  }

  /**
   * Send contract invitation to a workspace
   * POST /contracts/:id/invite
   */
  async invite(c: Context): Promise<Response> {
    try {
      const agreementId = c.req.param('id')
      const body = await c.req.json()
      const targetTeamId = body.teamId as string | undefined
      const targetEmail = body.email as string | undefined

      if (!targetTeamId && !targetEmail) {
        return c.json({ error: 'teamId or email is required' }, 400)
      }

      // Fetch agreement
      const { data: agreement, error } = await supabaseAdmin
        .from('escrow_agreements_v3')
        .select('agreement_id, title, total_amount, agreement_json')
        .eq('agreement_id', agreementId)
        .single()

      if (error || !agreement) return c.json({ error: 'Agreement not found' }, 404)

      const aj = agreement.agreement_json as Record<string, unknown> ?? {}

      let recipientEmail = targetEmail || ''
      let recipientName = 'Counterparty'

      // If teamId provided, look up the team owner's email
      if (targetTeamId) {
        const { data: teamOwner } = await supabaseAdmin
          .from('users_on_team')
          .select('user:user_id(email, full_name)')
          .eq('team_id', targetTeamId)
          .eq('role', 'owner')
          .limit(1)
          .maybeSingle()

        if (teamOwner?.user) {
          const user = teamOwner.user as Record<string, unknown>
          recipientEmail = String(user.email ?? '')
          recipientName = String(user.full_name ?? 'Team Owner')
        }
      }

      if (!recipientEmail) {
        return c.json({ error: 'Could not resolve recipient email' }, 400)
      }

      // Store counterparty info on agreement
      const updatedJson = {
        ...aj,
        counterpartyEmail: recipientEmail,
        counterpartyName: recipientName,
        counterpartyTeamId: targetTeamId || null,
        invitedAt: new Date().toISOString(),
      }

      await supabaseAdmin.from('escrow_agreements_v3')
        .update({ agreement_json: updatedJson, status: 'PENDING_SIGN', updated_at: new Date().toISOString() })
        .eq('agreement_id', agreementId)

      // Send invitation email via Trigger
      await triggerTask('send-contract-email', {
        template: 'contract-invitation',
        to: recipientEmail,
        subject: `${String(aj.payerName ?? aj.senderName ?? 'Someone')} invited you to sign a contract`,
        props: {
          recipientName,
          senderName: String(aj.payerName ?? aj.senderName ?? ''),
          senderTeamName: String(aj.payerTeamName ?? aj.senderTeamName ?? ''),
          contractTitle: agreement.title,
          totalAmount: String(agreement.total_amount ?? '0'),
          currency: 'USDC',
          milestoneCount: Array.isArray(aj.milestones) ? (aj.milestones as unknown[]).length : 0,
          link: `https://desk.bu.finance/contracts/${agreementId}/sign`,
        },
      })

      logger.info('Contract invitation sent', { agreementId, recipientEmail })
      return c.json({ success: true, sentTo: recipientEmail })
    } catch (error) {
      logger.error('Invitation failed', { error: (error as Error).message })
      return c.json({ error: (error as Error).message }, 500)
    }
  }
}
```

**Step 2: Register routes in contracts.ts**

Add to `apps/shiva/src/routes/contracts.ts`:

```typescript
import { WorkspaceInviteController } from '../controllers/workspace-invite.controller'
const workspaceInvite = new WorkspaceInviteController()

// Workspace search & invitation
contractRoutes.get('/workspaces/search', (c) => workspaceInvite.search(c))
contractRoutes.post('/:id/invite', (c) => workspaceInvite.invite(c))
```

**Step 3: Commit**

```bash
git add apps/shiva/src/controllers/workspace-invite.controller.ts apps/shiva/src/routes/contracts.ts
git commit -m "feat(shiva): add workspace search and contract invitation endpoint"
```

---

### Task 5: Add Deliverable Upload UI Component

**Files:**
- Create: `apps/app/src/components/contract/contracts/submit/deliverable-submit-form.tsx`
- Create: `apps/app/src/app/api/contracts/agreements/[id]/milestones/[msId]/upload/route.ts`

**Step 1: Create Supabase Storage upload API route**

```typescript
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@bu/supabase/server'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; msId: string }> },
) {
  const { id: agreementId, msId: milestoneId } = await params
  const supabase = await createClient()

  const formData = await req.formData()
  const files = formData.getAll('files') as File[]

  if (!files.length) {
    return NextResponse.json({ error: 'No files provided' }, { status: 400 })
  }

  const uploadedRefs: Array<{ name: string; url: string; size: number; type: string }> = []

  for (const file of files) {
    const bytes = await file.arrayBuffer()
    const path = `contracts/${agreementId}/${milestoneId}/${Date.now()}_${file.name}`

    const { error } = await supabase.storage
      .from('arbitration-documents')
      .upload(path, bytes, {
        contentType: file.type,
        upsert: false,
      })

    if (error) {
      return NextResponse.json({ error: `Upload failed: ${error.message}` }, { status: 500 })
    }

    const { data: urlData } = supabase.storage
      .from('arbitration-documents')
      .getPublicUrl(path)

    uploadedRefs.push({
      name: file.name,
      url: urlData.publicUrl,
      size: file.size,
      type: file.type,
    })
  }

  return NextResponse.json({ files: uploadedRefs })
}
```

**Step 2: Create the deliverable submit form component**

```tsx
'use client'

import { useState, useCallback } from 'react'
import { Button } from '@bu/ui/button'
import { Textarea } from '@bu/ui/textarea'
import { Upload, FileText, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { cn } from '@bu/ui/cn'

interface DeliverableSubmitFormProps {
  agreementId: string
  milestoneId: string
  milestoneTitle: string
  onSuccess?: () => void
}

type UploadedFile = { name: string; url: string; size: number; type: string }

export function DeliverableSubmitForm({
  agreementId,
  milestoneId,
  milestoneTitle,
  onSuccess,
}: DeliverableSubmitFormProps) {
  const [files, setFiles] = useState<File[]>([])
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [notes, setNotes] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const droppedFiles = Array.from(e.dataTransfer.files)
    setFiles((prev) => [...prev, ...droppedFiles])
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)])
    }
  }, [])

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    setError(null)
    setIsUploading(true)

    try {
      // Step 1: Upload files to Supabase Storage
      let fileRefs: UploadedFile[] = uploadedFiles
      if (files.length > 0) {
        const formData = new FormData()
        for (const file of files) {
          formData.append('files', file)
        }

        const uploadRes = await fetch(
          `/api/contracts/agreements/${agreementId}/milestones/${milestoneId}/upload`,
          { method: 'POST', body: formData },
        )

        if (!uploadRes.ok) {
          const err = await uploadRes.json()
          throw new Error(err.error || 'Upload failed')
        }

        const uploadData = await uploadRes.json()
        fileRefs = [...uploadedFiles, ...uploadData.files]
        setUploadedFiles(fileRefs)
      }

      setIsUploading(false)
      setIsSubmitting(true)

      // Step 2: Submit deliverable to Shiva
      const submitRes = await fetch(
        `/api/contracts/agreements/${agreementId}/milestones/${milestoneId}/submit`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            files: fileRefs,
            notes,
          }),
        },
      )

      if (!submitRes.ok) {
        const err = await submitRes.json()
        throw new Error(err.error || 'Submission failed')
      }

      setSuccess(true)
      onSuccess?.()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsUploading(false)
      setIsSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center gap-4 p-8 text-center">
        <CheckCircle2 className="w-12 h-12 text-emerald-500" />
        <h3 className="text-lg font-semibold text-foreground">Deliverable Submitted</h3>
        <p className="text-sm text-muted-foreground">
          The AI arbitrator is now verifying your submission for "{milestoneTitle}".
          You'll be notified when verification is complete.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-1">Submit Deliverable</h3>
        <p className="text-sm text-muted-foreground">
          Upload your work for "{milestoneTitle}" — it will be verified by the AI arbitrator.
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleFileDrop}
        className={cn(
          'border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer',
          'border-border hover:border-primary/50 hover:bg-primary/5',
        )}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <Upload className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">Drop files here or click to browse</p>
        <p className="text-xs text-muted-foreground mt-1">PDF, images, ZIP, or any document</p>
        <input
          id="file-input"
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="flex flex-col gap-2">
          {files.map((file, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <button type="button" onClick={() => removeFile(i)} className="p-1 hover:bg-muted rounded">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Notes */}
      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">
          Submission Notes
        </label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Describe what you're delivering, any notes for the reviewer..."
          rows={4}
          maxLength={2000}
        />
        <p className="text-xs text-muted-foreground mt-1 text-right">
          {notes.length}/2000
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Submit */}
      <Button
        onClick={handleSubmit}
        disabled={isUploading || isSubmitting || (files.length === 0 && uploadedFiles.length === 0)}
        className="w-full"
      >
        {isUploading ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading Files...</>
        ) : isSubmitting ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting for AI Verification...</>
        ) : (
          'Submit Deliverable'
        )}
      </Button>
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add apps/app/src/components/contract/contracts/submit/deliverable-submit-form.tsx apps/app/src/app/api/contracts/agreements/\[id\]/milestones/\[msId\]/upload/route.ts
git commit -m "feat(contracts): add deliverable upload UI and Supabase Storage upload route"
```

---

### Task 6: Store Email Addresses in Deploy Modal

**Files:**
- Modify: `apps/app/src/components/contract/contract-builder/deploy-modal.tsx`

**Step 1: Pass email addresses to createFromTemplate**

The deploy modal already collects `counterpartyEmail` and `inviteMethod`. We need to ensure these are sent to the API along with the creator's info so the controller can trigger emails.

Find the `createAgreementFromTemplate` call and add:

```typescript
counterpartyEmail: counterpartyEmail,
counterpartyName: counterpartyName,
creatorEmail: session?.user?.email || '',
senderName: session?.user?.user_metadata?.full_name || '',
senderTeamName: teamName || '',
payerName: session?.user?.user_metadata?.full_name || '',
payeeName: counterpartyName || '',
payerTeamName: teamName || '',
```

This ensures `agreement_json` has `creatorEmail` and `counterpartyEmail` for all email triggers.

**Step 2: Commit**

```bash
git add apps/app/src/components/contract/contract-builder/deploy-modal.tsx
git commit -m "feat(contracts): pass email addresses to agreement for lifecycle notifications"
```

---

### Task 7: Build and Verify

**Step 1: Build trigger package**

```bash
npx turbo run build --filter=@bu/trigger --force
```

**Step 2: Build email package**

```bash
npx turbo run build --filter=@bu/email --force
```

**Step 3: Build Shiva**

```bash
npx turbo run build --filter=shiva --force
```

**Step 4: Build app**

```bash
npx turbo run build --filter=@bu/app --force
```

**Step 5: Commit if any fixes needed**

```bash
git add -A && git commit -m "fix: build fixes for escrow pipeline wiring"
```

---

## Summary of What Gets Wired

| Lifecycle Event | Email Template | Trigger Point |
|----------------|---------------|---------------|
| Contract created | `contract-invitation` | `createFromTemplate()` + `invite()` |
| Both parties sign | `contract-signed` | `sign()` when status→ACTIVE |
| Escrow funded | `contract-funded` | `fund()` |
| Pending 24h+ | `contract-signing-reminder` | Daily cron at 9am UTC |
| Deliverable submitted | `contract-deliverable-submitted` | `submitDeliverable()` |
| AI verdict returned | `contract-verification-result` | `submitDeliverable()` (after verification) |
| Dispute resolved | `contract-dispute-resolved` | `finalize()` when dispute exists |
| All milestones done | `contract-completed` | `finalize()` when allReleased |
