/**
 * KYC (User) Handler
 *
 * Handles webhook events for individual user KYC inquiries.
 * Updates user kyc_status and triggers Bridge/Alfred integrations.
 */

import { createLogger } from '@bu/logger';
import type { WebhookContext, WebhookPayload, HandlerResult } from '../types';
import { PersonaStatus, EntityType, mapPersonaStatus } from '../types';
import { updatePersonaInquiryStatus } from '../helpers/db-queries';
import { submitKycToAlfredIfApplicable } from '../helpers/alfred-sync';
import {
  createBridgeCustomerFromApproval,
  updateUserCustomerId,
} from '../helpers/bridge-sync';
import { updateUserKycStatusFromWebhook } from '@bu/supabase/queries/verification';
import type { Client } from '@bu/supabase/types';

const logger = createLogger({ prefix: 'shiva:webhook:persona:kyc' });

// ============================================================================
// Main Handler
// ============================================================================

/**
 * Handle KYC (user) webhook event
 */
export async function handleKycWebhook(
  ctx: WebhookContext,
  payload: WebhookPayload,
  userId: string,
  userEmail?: string
): Promise<HandlerResult> {
  const { supabase, honoContext } = ctx;
  const { inquiryId, status, countryCode, eventId, eventName } = payload;

  if (!status) {
    logger.info('[KYC] Missing status:', { userId, inquiryId });
    return { handled: false, shouldContinue: true };
  }

  logger.info('[KYC] Processing user KYC webhook:', { userId, inquiryId, status });

  try {
    // Map Persona status to app KYC status
    const kycStatus = mapPersonaStatus(status);

    // Update user's kyc_status (terminal-status-protected — never overwrites rejected/declined/failed)
    const { error: userUpdateError } = await updateUserKycStatusFromWebhook(
      supabase, userId, kycStatus, { eventId, eventName },
    );

    if (userUpdateError) {
      logger.error('[KYC] Failed to update user kyc_status:', {
        userId,
        error: userUpdateError,
      });
      return { handled: true, shouldContinue: false, error: String(userUpdateError) };
    }

    logger.info('[KYC] User KYC status updated:', {
      eventId,
      eventName,
      userId,
      status,
      kycStatus,
      guard: 'terminal_status_protected',
    });

    // Update persona_inquiries table
    if (inquiryId) {
      await updatePersonaInquiryStatus(supabase, inquiryId, status, userId, undefined, countryCode);

      // Submit KYC to Alfred if applicable
      await submitKycToAlfredIfApplicable(inquiryId, status, honoContext);
    }

    // Create Bridge customer if approved
    if (status === PersonaStatus.APPROVED && inquiryId) {
      await handleKycApproved(supabase, userId, inquiryId, userEmail);
    }

    // Sync AllowList for Ghost Mode private transfers
    if (status === PersonaStatus.APPROVED || status === PersonaStatus.DECLINED ||
        status === PersonaStatus.FAILED || status === PersonaStatus.EXPIRED) {
      try {
        const { syncAllowListFromPersona } = await import('@bu/private-transfer/compliance');
        const { getCircleSdk } = await import('@bu/private-transfer/signer');
        const { getTreasuryWalletId } = await import('@bu/env/ace');
        const { getPrimaryTeamWallet } = await import('@bu/supabase/queries/wallets');
        const { getUserTeamsQuery } = await import('@bu/supabase/queries');

        // Resolve user's team (KYC handler only has userId, not teamId)
        const { data: teams } = await getUserTeamsQuery(supabase, userId);
        const teamId = teams?.[0]?.team_id;
        if (teamId) {
          const wallet = await getPrimaryTeamWallet(supabase, userId, teamId);
          if (wallet?.wallet_address) {
            const sdk = await getCircleSdk();
            await syncAllowListFromPersona(
              wallet.wallet_address,
              status === PersonaStatus.APPROVED,
              sdk,
              getTreasuryWalletId(),
            );
            logger.info('[KYC] AllowList synced', {
              userId, approved: status === PersonaStatus.APPROVED,
            });

            // Write CRE attestation for KYC verification
            try {
              const { writeKycAttestation } = await import('@bu/private-transfer/kyc');
              await writeKycAttestation({
                walletAddress: wallet.wallet_address,
                verificationType: 'kyc',
                personaInquiryId: payload.inquiryId ?? 'unknown',
                status: kycStatus,
              });
              logger.info('KYC attestation written', { walletAddress: wallet.wallet_address });
            } catch (attestError) {
              logger.warn('KYC attestation write failed', {
                error: (attestError as Error).message,
              });
            }

            // Trigger CRE workflow for trustless AllowList sync + attestation
            try {
              const { triggerCreWorkflow } = await import('../../../../services/cre-trigger.service');
              await triggerCreWorkflow({
                action: 'allowlist_sync',
                walletAddress: wallet.wallet_address,
                approved: status === PersonaStatus.APPROVED,
                verificationType: 'kyc',
                personaInquiryId: payload.inquiryId ?? 'unknown',
                status,
              });
            } catch (creErr) {
              logger.warn('CRE AllowList sync failed (non-fatal, direct calls already executed)', {
                error: (creErr as Error).message,
              });
            }

            // Trigger CRE WorldID verify workflow — publishes on-chain attestation
            // for identity verification (proof of personhood).
            // Payload matches workflow-worldid-verify handler:
            // { contractId, walletAddress, nullifierHash, verificationLevel, userId }
            if (status === PersonaStatus.APPROVED) {
              try {
                const { triggerCreWorkflow: triggerCre } = await import('../../../../services/cre-trigger.service');
                await triggerCre({
                  action: 'worldid_verify',
                  contractId: payload.inquiryId ?? 'unknown',
                  walletAddress: wallet.wallet_address,
                  nullifierHash: payload.inquiryId ?? 'unknown',
                  verificationLevel: 'kyc',
                  userId,
                });
                logger.info('[KYC] CRE WorldID verify triggered', { userId, walletAddress: wallet.wallet_address });
              } catch (creErr) {
                logger.warn('CRE WorldID verify failed (non-fatal)', {
                  error: (creErr as Error).message,
                });
              }
            }
          }
        }
      } catch (error) {
        // Non-fatal — don't block webhook processing for AllowList sync
        logger.warn('[KYC] AllowList sync failed (non-fatal)', {
          userId, error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return { handled: true, shouldContinue: false };
  } catch (error) {
    logger.error('[KYC] Error handling webhook:', {
      userId,
      inquiryId,
      error: error instanceof Error ? error.message : String(error),
    });
    return { handled: true, shouldContinue: false, error: String(error) };
  }
}

// ============================================================================
// Status Handlers
// ============================================================================

/**
 * Handle KYC "approved" status
 * Creates Bridge customer and updates user
 */
async function handleKycApproved(
  supabase: Client,
  userId: string,
  inquiryId: string,
  userEmail?: string
): Promise<void> {
  logger.info('[KYC] Handling approved status - creating Bridge customer:', {
    userId,
    inquiryId,
    hasEmail: !!userEmail,
  });

  try {
    const result = await createBridgeCustomerFromApproval(
      inquiryId,
      EntityType.USER,
      userId,
      supabase,
      userEmail
    );

    if (result.success && result.customerId) {
      await updateUserCustomerId(userId, result.customerId);
    }
  } catch (error) {
    logger.error('[KYC] Error creating Bridge customer:', {
      userId,
      inquiryId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
