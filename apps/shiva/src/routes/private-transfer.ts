/**
 * Private Transfer Routes
 *
 * HTTP routes for Ghost Mode private transfer operations:
 *  - POST /deposit          — Shield funds into private balance
 *  - POST /transfer         — Send private transfer to shielded address
 *  - POST /withdraw         — Unshield funds back to public wallet
 *  - GET  /balance          — Query private balance
 *  - GET  /shielded-address — Get shielded address for receiving
 *
 * Routes handle HTTP concerns only. Business logic in @bu/private-transfer.
 */

import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import { jwtAuth } from '../middleware/auth';
import { resolveRole } from '../middleware/role-auth';
import {
  DepositBodySchema,
  DepositResponseSchema,
  TransferBodySchema,
  TransferResponseSchema,
  WithdrawBodySchema,
  WithdrawResponseSchema,
  BalanceResponseSchema,
  ShieldedAddressResponseSchema,
  EligibilityQuerySchema,
  EligibilityResponseSchema,
} from '../schemas/private-transfer.schemas';
import { ErrorResponseSchema } from '../schemas/common.schemas';
import { getPrimaryTeamWallet } from '@bu/supabase/queries/wallets';
import {
  resolveVerificationStatus,
  resolveUserKycStatus,
  resolveTeamKybStatus,
} from '@bu/supabase/queries/verification';
import { supabaseAdmin } from '../config/supabase';
import { createLogger } from '@bu/logger';

const logger = createLogger({ prefix: 'private-transfer-routes' });

export const privateTransferRoutes = new OpenAPIHono();

// Apply JWT auth and role resolution to all private transfer routes
privateTransferRoutes.use('/*', jwtAuth);
privateTransferRoutes.use('/*', resolveRole);

// ─── Shared Helpers ───────────────────────────────────────

type WalletResolution =
  | { ok: true; userId: string; teamId: string; walletId: string; walletAddress: string; kycStatus: string | null; kybStatus: string | null; isTeamWallet: boolean }
  | { ok: false; response: Response };

async function resolveWallet(c: { get: (key: string) => unknown; json: (data: unknown, status: number) => Response }): Promise<WalletResolution> {
  const userId = c.get('userId') as string;
  const teamId = c.get('teamId') as string;

  logger.info('resolveWallet: start', { userId, teamId });

  const wallet = await getPrimaryTeamWallet(supabaseAdmin, userId, teamId);
  if (!wallet || !wallet.wallet_address) {
    logger.error('resolveWallet: no wallet found → 404', { userId, teamId, wallet: !!wallet, hasAddress: wallet?.wallet_address ?? null });
    return { ok: false, response: c.json({ error: 'NOT_FOUND', message: 'No primary team wallet found' }, 404) };
  }

  logger.info('resolveWallet: wallet found', { walletId: wallet.circle_wallet_id, walletAddress: wallet.wallet_address });

  // Centralized verification resolution with flight check + self-heal
  const { kycStatus, kybStatus } = await resolveVerificationStatus(supabaseAdmin, userId, teamId);

  return {
    ok: true,
    userId,
    teamId,
    walletId: wallet.circle_wallet_id,
    walletAddress: wallet.wallet_address,
    kycStatus,
    kybStatus,
    isTeamWallet: true,
  };
}

async function lazyCircleSdk() {
  const { getCircleSdk } = await import('@bu/private-transfer/signer');
  return getCircleSdk();
}

const authErrorResponses = {
  400: { description: 'Invalid input data', content: { 'application/json': { schema: ErrorResponseSchema } } },
  401: { description: 'Unauthorized', content: { 'application/json': { schema: ErrorResponseSchema } } },
  404: { description: 'Wallet not found', content: { 'application/json': { schema: ErrorResponseSchema } } },
  500: { description: 'Internal server error', content: { 'application/json': { schema: ErrorResponseSchema } } },
} as const;

// ─── POST /deposit ─────────────────────────────────────────

privateTransferRoutes.openapi(
  createRoute({
    method: 'post',
    path: '/deposit',
    tags: ['private-transfer'],
    summary: 'Deposit into private balance',
    description: 'Shield funds from public wallet into private balance via Motora gateway',
    security: [{ BearerAuth: [] }],
    request: {
      body: {
        required: true,
        content: { 'application/json': { schema: DepositBodySchema } },
      },
    },
    responses: {
      200: {
        description: 'Deposit initiated successfully',
        content: { 'application/json': { schema: DepositResponseSchema } },
      },
      ...authErrorResponses,
    },
  }),
  async (c) => {
    try {
      const resolved = await resolveWallet(c);
      if (!resolved.ok) return resolved.response;

      const body = c.req.valid('json');
      logger.info('POST /deposit: executing', { amount: body.amount, walletId: resolved.walletId });
      const sdk = await lazyCircleSdk();
      const { executeDeposit } = await import('@bu/private-transfer/deposit');

      const result = await executeDeposit({
        sdk,
        teamId: resolved.teamId,
        amount: body.amount,
        walletId: resolved.walletId,
        walletAddress: resolved.walletAddress,
        walletChainId: body.walletChainId,
        sourceChain: body.sourceChain,
        kycStatus: resolved.kycStatus ?? undefined,
        kybStatus: resolved.kybStatus ?? undefined,
        isTeamWallet: resolved.isTeamWallet,
      });

      if (!result.success) {
        const statusCode = result.pendingKyc ? 403 : 500;
        logger.error('POST /deposit: returned success=false', { result: JSON.stringify(result) });
        return c.json(result, statusCode);
      }
      return c.json(result, 200);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('POST /deposit FAILED', { error: msg, stack: (error as Error).stack });
      return c.json(
        { error: 'INTERNAL_ERROR', message: msg },
        500,
      );
    }
  },
);

// ─── POST /transfer ────────────────────────────────────────

privateTransferRoutes.openapi(
  createRoute({
    method: 'post',
    path: '/transfer',
    tags: ['private-transfer'],
    summary: 'Execute private transfer',
    description: 'Send a shielded transfer to a recipient address',
    security: [{ BearerAuth: [] }],
    request: {
      body: {
        required: true,
        content: { 'application/json': { schema: TransferBodySchema } },
      },
    },
    responses: {
      200: {
        description: 'Transfer executed successfully',
        content: { 'application/json': { schema: TransferResponseSchema } },
      },
      ...authErrorResponses,
    },
  }),
  async (c) => {
    try {
      const resolved = await resolveWallet(c);
      if (!resolved.ok) return resolved.response;

      const body = c.req.valid('json');
      const sdk = await lazyCircleSdk();
      const { executePrivateTransfer } = await import('@bu/private-transfer/executor');

      const result = await executePrivateTransfer({
        sdk,
        walletId: resolved.walletId,
        walletAddress: resolved.walletAddress,
        recipient: body.to,
        amount: body.amount,
        flags: body.flags,
      });

      if (!result.success) return c.json(result, 500);
      return c.json(result, 200);
    } catch (error) {
      return c.json(
        { error: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' },
        500,
      );
    }
  },
);

// ─── POST /withdraw ────────────────────────────────────────

privateTransferRoutes.openapi(
  createRoute({
    method: 'post',
    path: '/withdraw',
    tags: ['private-transfer'],
    summary: 'Withdraw from private balance',
    description: 'Unshield funds from private balance back to public wallet',
    security: [{ BearerAuth: [] }],
    request: {
      body: {
        required: true,
        content: { 'application/json': { schema: WithdrawBodySchema } },
      },
    },
    responses: {
      200: {
        description: 'Withdrawal initiated successfully',
        content: { 'application/json': { schema: WithdrawResponseSchema } },
      },
      ...authErrorResponses,
    },
  }),
  async (c) => {
    try {
      const resolved = await resolveWallet(c);
      if (!resolved.ok) return resolved.response;

      const body = c.req.valid('json');
      const sdk = await lazyCircleSdk();
      const { executeWithdraw } = await import('@bu/private-transfer/withdraw');

      const result = await executeWithdraw({
        sdk,
        teamId: resolved.teamId,
        amount: body.amount,
        walletId: resolved.walletId,
        walletAddress: resolved.walletAddress,
        walletChainId: body.walletChainId,
        destinationChain: body.destinationChain,
        kycStatus: resolved.kycStatus ?? undefined,
        kybStatus: resolved.kybStatus ?? undefined,
        isTeamWallet: resolved.isTeamWallet,
      });

      if (!result.success) return c.json(result, 500);
      return c.json(result, 200);
    } catch (error) {
      return c.json(
        { error: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' },
        500,
      );
    }
  },
);

// ─── GET /balance ──────────────────────────────────────────

privateTransferRoutes.openapi(
  createRoute({
    method: 'get',
    path: '/balance',
    tags: ['private-transfer'],
    summary: 'Get private balance',
    description: 'Query shielded balance for the authenticated user',
    security: [{ BearerAuth: [] }],
    responses: {
      200: {
        description: 'Balance retrieved successfully',
        content: { 'application/json': { schema: BalanceResponseSchema } },
      },
      ...authErrorResponses,
    },
  }),
  async (c) => {
    try {
      const resolved = await resolveWallet(c);
      if (!resolved.ok) return resolved.response;

      logger.info('GET /balance: wallet resolved, loading Circle SDK', { walletId: resolved.walletId, walletAddress: resolved.walletAddress });
      const sdk = await lazyCircleSdk();
      logger.info('GET /balance: Circle SDK loaded, calling getPrivateBalance');
      const { getPrivateBalance } = await import('@bu/private-transfer/executor');

      const result = await getPrivateBalance(sdk, resolved.walletId, resolved.walletAddress);

      if (!result.success) {
        logger.error('GET /balance: getPrivateBalance returned success=false', { result: JSON.stringify(result) });
        return c.json(result, 500);
      }
      logger.info('GET /balance: success', { balanceKeys: Object.keys(result.balances ?? {}) });
      return c.json(result, 200);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;
      logger.error('GET /balance FAILED', { error: msg, stack });
      return c.json(
        { error: 'INTERNAL_ERROR', message: msg },
        500,
      );
    }
  },
);

// ─── GET /shielded-address ─────────────────────────────────

privateTransferRoutes.openapi(
  createRoute({
    method: 'get',
    path: '/shielded-address',
    tags: ['private-transfer'],
    summary: 'Get shielded address',
    description: 'Get the shielded address for receiving private transfers',
    security: [{ BearerAuth: [] }],
    responses: {
      200: {
        description: 'Shielded address retrieved successfully',
        content: { 'application/json': { schema: ShieldedAddressResponseSchema } },
      },
      ...authErrorResponses,
    },
  }),
  async (c) => {
    try {
      const resolved = await resolveWallet(c);
      if (!resolved.ok) return resolved.response;

      const sdk = await lazyCircleSdk();
      const { getShieldedAddress } = await import('@bu/private-transfer/executor');

      const result = await getShieldedAddress(sdk, resolved.walletId, resolved.walletAddress);

      if (!result.success) return c.json(result, 500);
      return c.json(result, 200);
    } catch (error) {
      return c.json(
        { error: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' },
        500,
      );
    }
  },
);

// ─── GET /eligibility ─────────────────────────────────────

privateTransferRoutes.openapi(
  createRoute({
    method: 'get',
    path: '/eligibility',
    tags: ['private-transfer'],
    summary: 'Check private transfer eligibility',
    description: 'Check if sender can send privately to a recipient based on wallet type and verification status',
    security: [{ BearerAuth: [] }],
    request: {
      query: EligibilityQuerySchema,
    },
    responses: {
      200: {
        description: 'Eligibility result',
        content: { 'application/json': { schema: EligibilityResponseSchema } },
      },
      ...authErrorResponses,
    },
  }),
  async (c) => {
    try {
      const resolved = await resolveWallet(c);
      if (!resolved.ok) return resolved.response;

      const { recipientAddress, amount } = c.req.valid('query');

      // Sender's USDCg balance
      const sdk = await lazyCircleSdk();
      const { getPrivateBalance } = await import('@bu/private-transfer/executor');
      const balanceResult = await getPrivateBalance(sdk, resolved.walletId, resolved.walletAddress);
      const senderBalance = balanceResult.success
        ? Object.values(balanceResult.balances).reduce((sum: number, v: string) => sum + parseFloat(v || '0'), 0).toString()
        : '0';

      // Recipient wallet lookup — wallet type determines KYC vs KYB requirement
      const recipientWallet = await supabaseAdmin
        .from('wallets')
        .select('user_id, team_id, main_type')
        .eq('wallet_address', recipientAddress)
        .maybeSingle();

      if (!recipientWallet.data) {
        return c.json({ eligible: false, reason: 'recipient_not_on_platform', recipientOnPlatform: false }, 200);
      }

      const isTeamWallet = recipientWallet.data.main_type === 'team' || !!recipientWallet.data.team_id;
      const recipientWalletType = isTeamWallet ? 'team' as const : 'personal' as const;

      // Resolve recipient verification with flight check + self-heal
      const [recipientKycStatus, recipientKybStatus] = await Promise.all([
        recipientWallet.data.user_id
          ? resolveUserKycStatus(supabaseAdmin, recipientWallet.data.user_id)
          : Promise.resolve(null),
        recipientWallet.data.team_id
          ? resolveTeamKybStatus(supabaseAdmin, recipientWallet.data.team_id)
          : Promise.resolve(null),
      ]);

      const { checkPrivateEligibility } = await import('@bu/private-transfer/eligibility');
      const result = checkPrivateEligibility({
        senderUsdcgBalance: senderBalance,
        recipientOnPlatform: true,
        recipientWalletType,
        recipientKycStatus,
        recipientKybStatus,
        amount,
      });

      return c.json(result, 200);
    } catch (error) {
      return c.json(
        { error: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' },
        500,
      );
    }
  },
);
