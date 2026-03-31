/**
 * Non-blocking contract notification triggers
 *
 * Inserts workspace_notifications after lifecycle state changes.
 * All calls are fire-and-forget wrapped in .catch() so notification
 * failures never break the main API flow.
 *
 * Follows the same pattern as trigger-email.ts.
 */
import { insertContractNotification } from '@bu/supabase/mutations'
import type { ContractNotificationType, InsertContractNotificationParams } from '@bu/supabase/mutations'
import { getUserTeamMembership } from '@bu/supabase/queries'
import { createLogger } from '@bu/logger'
import type { SupabaseClient } from '@supabase/supabase-js'

const logger = createLogger({ prefix: 'api:contracts:notification' })

// Re-export type for convenience
export type { ContractNotificationType }

interface NotificationContext {
  supabase: SupabaseClient
  userId: string
  agreementId: string
  contractTitle: string
}

/**
 * Resolve the team IDs for both the current user and the agreement creator.
 * Returns { userTeamId, creatorTeamId } — either may be null if lookup fails.
 */
async function resolveTeamIds(
  supabase: SupabaseClient,
  userId: string,
  agreementId: string,
): Promise<{ userTeamId: string | null; creatorTeamId: string | null }> {
  const [userTeam, agreement] = await Promise.all([
    getUserTeamMembership(supabase as any, userId),
    supabase
      .from('escrow_agreements_v3')
      .select('team_id')
      .eq('agreement_id', agreementId)
      .maybeSingle(),
  ])

  return {
    userTeamId: userTeam?.team_id ?? null,
    creatorTeamId: (agreement.data as any)?.team_id ?? null,
  }
}

/**
 * Fire-and-forget: insert a notification for a single team. Never throws.
 */
function fireNotification(
  supabase: SupabaseClient,
  params: InsertContractNotificationParams,
): void {
  insertContractNotification(supabase as any, params).catch((err) => {
    logger.warn('Failed to insert contract notification (non-fatal)', {
      type: params.type,
      teamId: params.teamId,
      error: (err as Error).message,
    })
  })
}

/**
 * Insert a notification for both teams (deduplicates if same team).
 */
function fireBothTeams(
  supabase: SupabaseClient,
  teamIds: string[],
  params: Omit<InsertContractNotificationParams, 'teamId'>,
): void {
  const unique = [...new Set(teamIds)]
  for (const teamId of unique) {
    fireNotification(supabase, { ...params, teamId })
  }
}

// ============================================================================
// Lifecycle notification triggers
// ============================================================================

/**
 * Contract created from template — notify counterparty's team.
 * Called after from-template route succeeds.
 */
export function triggerContractReceivedNotification(ctx: NotificationContext): void {
  resolveTeamIds(ctx.supabase, ctx.userId, ctx.agreementId)
    .then(({ userTeamId, creatorTeamId }) => {
      // The creator's team already knows — notify the OTHER team.
      // If userTeamId === creatorTeamId, there's no counterparty team to notify yet.
      // The counterparty will get notified once they join.
      // For now, notify the creator team as a confirmation.
      const teamId = creatorTeamId ?? userTeamId
      if (!teamId) return

      fireNotification(ctx.supabase, {
        teamId,
        type: 'contract_received',
        title: 'New contract created',
        message: `"${ctx.contractTitle}" has been created and sent for signing.`,
        contractId: ctx.agreementId,
        contractName: ctx.contractTitle,
        actionUrl: `/contracts/${ctx.agreementId}`,
      })
    })
    .catch(() => { /* non-fatal */ })
}

/**
 * Contract signed — notify both teams.
 */
export function triggerCounterpartySignedNotification(ctx: NotificationContext): void {
  resolveTeamIds(ctx.supabase, ctx.userId, ctx.agreementId)
    .then(({ userTeamId, creatorTeamId }) => {
      const teamIds = [userTeamId, creatorTeamId].filter(Boolean) as string[]
      if (teamIds.length === 0) return

      fireBothTeams(ctx.supabase, teamIds, {
        type: 'counterparty_signed',
        title: 'Contract signed',
        message: `"${ctx.contractTitle}" has been signed.`,
        contractId: ctx.agreementId,
        contractName: ctx.contractTitle,
        actionUrl: `/contracts/${ctx.agreementId}`,
      })
    })
    .catch(() => { /* non-fatal */ })
}

/**
 * Escrow funded — notify both teams.
 */
export function triggerPaymentFundedNotification(ctx: NotificationContext): void {
  resolveTeamIds(ctx.supabase, ctx.userId, ctx.agreementId)
    .then(({ userTeamId, creatorTeamId }) => {
      const teamIds = [userTeamId, creatorTeamId].filter(Boolean) as string[]
      if (teamIds.length === 0) return

      fireBothTeams(ctx.supabase, teamIds, {
        type: 'payment_released',
        title: 'Escrow funded',
        message: `"${ctx.contractTitle}" escrow has been funded and is ready to begin.`,
        contractId: ctx.agreementId,
        contractName: ctx.contractTitle,
        actionUrl: `/contracts/${ctx.agreementId}`,
      })
    })
    .catch(() => { /* non-fatal */ })
}

/**
 * Deliverable submitted for milestone — notify payer's team.
 */
export function triggerMilestoneSubmittedNotification(
  ctx: NotificationContext & { milestoneTitle: string },
): void {
  resolveTeamIds(ctx.supabase, ctx.userId, ctx.agreementId)
    .then(({ userTeamId, creatorTeamId }) => {
      // The payer is typically the creator. Notify the creator's team.
      // If the submitter IS the creator, notify the other team (counterparty).
      const targetTeamId =
        userTeamId === creatorTeamId
          ? creatorTeamId // submitter is creator — notify same team (payer reviews)
          : creatorTeamId ?? userTeamId
      if (!targetTeamId) return

      fireNotification(ctx.supabase, {
        teamId: targetTeamId,
        type: 'milestone_verified',
        title: 'Deliverable submitted',
        message: `A deliverable has been submitted for "${ctx.milestoneTitle}" in "${ctx.contractTitle}".`,
        contractId: ctx.agreementId,
        contractName: ctx.contractTitle,
        actionUrl: `/contracts/${ctx.agreementId}`,
      })
    })
    .catch(() => { /* non-fatal */ })
}

/**
 * Dispute filed on milestone — notify both teams.
 */
export function triggerDisputeOpenedNotification(
  ctx: NotificationContext & { milestoneTitle?: string },
): void {
  resolveTeamIds(ctx.supabase, ctx.userId, ctx.agreementId)
    .then(({ userTeamId, creatorTeamId }) => {
      const teamIds = [userTeamId, creatorTeamId].filter(Boolean) as string[]
      if (teamIds.length === 0) return

      const msLabel = ctx.milestoneTitle ? ` on "${ctx.milestoneTitle}"` : ''
      fireBothTeams(ctx.supabase, teamIds, {
        type: 'dispute_opened',
        title: 'Dispute opened',
        message: `A dispute has been filed${msLabel} in "${ctx.contractTitle}".`,
        contractId: ctx.agreementId,
        contractName: ctx.contractTitle,
        actionUrl: `/contracts/${ctx.agreementId}`,
        urgency: 'high',
      })
    })
    .catch(() => { /* non-fatal */ })
}

/**
 * Milestone finalized / payment released — notify payee's team.
 */
export function triggerPaymentReleasedNotification(ctx: NotificationContext): void {
  resolveTeamIds(ctx.supabase, ctx.userId, ctx.agreementId)
    .then(({ userTeamId, creatorTeamId }) => {
      const teamIds = [userTeamId, creatorTeamId].filter(Boolean) as string[]
      if (teamIds.length === 0) return

      fireBothTeams(ctx.supabase, teamIds, {
        type: 'payment_released',
        title: 'Payment released',
        message: `A milestone payment has been released for "${ctx.contractTitle}".`,
        contractId: ctx.agreementId,
        contractName: ctx.contractTitle,
        actionUrl: `/contracts/${ctx.agreementId}`,
      })
    })
    .catch(() => { /* non-fatal */ })
}
