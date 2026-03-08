/**
 * Ghost FHE Routes — Shiva
 *
 * HTTP routes for FHE-encrypted Ghost Mode operations (Layer 4):
 *  - POST /ghost/deposit    — Approve USDCg + wrap into GhostUSDC
 *  - POST /ghost/transfer   — Execute encrypted peer-to-peer transfer
 *  - POST /ghost/withdraw   — Request FHE unwrap (async decrypt)
 *  - GET  /ghost/balance    — Read privacy indicator + DON state
 *  - GET  /ghost/claims     — List pending unwrap claims
 *  - POST /ghost/claim      — Claim specific unwrapped amount
 *
 * These routes orchestrate CRE workflows for compliance + yield + FHE operations.
 * Business logic is split between CRE (on-chain) and Shiva (API + auth).
 */

import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import { jwtAuth } from '../middleware/auth';
import { resolveRole } from '../middleware/role-auth';
import {
  GhostDepositBodySchema,
  GhostDepositResponseSchema,
  GhostTransferBodySchema,
  GhostTransferResponseSchema,
  GhostWithdrawBodySchema,
  GhostWithdrawResponseSchema,
  GhostBalanceResponseSchema,
  GhostClaimsResponseSchema,
  GhostClaimBodySchema,
  GhostClaimResponseSchema,
} from '../schemas/ghost-fhe.schemas';
import { ErrorResponseSchema } from '../schemas/common.schemas';
import { getPrimaryTeamWallet, getWalletByUserAndBlockchain } from '@bu/supabase/queries/wallets';
import { resolveVerificationStatus } from '@bu/supabase/queries/verification';
import { insertGhostTransaction } from '@bu/supabase/queries/transactions';
import { toWei6, fromWei6 } from '@bu/utils/format';
import { supabaseAdmin } from '../config/supabase';
import {
  readGhostBalance,
  readGhostClaims,
  readDonBalance,
  executeDeposit,
  executeWithdraw,
  executeClaim,
  executeTransfer,
} from '../services/ghost-fhe.service';
import { createLogger } from '@bu/logger';

const logger = createLogger({ prefix: 'ghost-fhe-routes' });

export const ghostFheRoutes = new OpenAPIHono();

// Apply JWT auth and role resolution
ghostFheRoutes.use('/*', jwtAuth);
ghostFheRoutes.use('/*', resolveRole);

// ─── Shared Helpers ───────────────────────────────────────

const authErrorResponses = {
  400: { description: 'Invalid input data', content: { 'application/json': { schema: ErrorResponseSchema } } },
  401: { description: 'Unauthorized', content: { 'application/json': { schema: ErrorResponseSchema } } },
  404: { description: 'Wallet not found', content: { 'application/json': { schema: ErrorResponseSchema } } },
  500: { description: 'Internal server error', content: { 'application/json': { schema: ErrorResponseSchema } } },
} as const;

async function resolveGhostContext(c: { get: (key: string) => unknown; json: (data: unknown, status: number) => Response }) {
  const userId = c.get('userId') as string;
  const teamId = c.get('teamId') as string;

  logger.info('resolveGhostContext: start', { userId, teamId });

  // Ghost contracts are deployed on ETH-Sepolia — resolve that chain specifically.
  // Try both team AND individual wallets — user may be using either type.
  let walletId: string;
  let walletDbId: string;
  let walletAddress: string;

  const sepoliaWallet = await getWalletByUserAndBlockchain(supabaseAdmin, userId, teamId, 'ETH-SEPOLIA');

  if (sepoliaWallet && sepoliaWallet.circle_wallet_id && sepoliaWallet.wallet_address) {
    walletId = sepoliaWallet.circle_wallet_id;
    walletDbId = sepoliaWallet.id;
    walletAddress = sepoliaWallet.wallet_address;
    logger.info('resolveGhostContext: using ETH-SEPOLIA wallet', { walletId, walletAddress, walletType: sepoliaWallet.main_type });
  } else {
    // Fallback to primary team wallet (may be wrong chain)
    logger.warn('resolveGhostContext: ETH-SEPOLIA wallet not found, falling back to primary', { userId, teamId, sepoliaWallet: !!sepoliaWallet });
    const wallet = await getPrimaryTeamWallet(supabaseAdmin, userId, teamId);
    if (!wallet || !wallet.wallet_address) {
      logger.error('resolveGhostContext: NO wallet found → 404', { userId, teamId, wallet: !!wallet });
      return { ok: false as const, response: c.json({ error: 'NOT_FOUND', message: 'No primary team wallet found' }, 404) };
    }
    if (!wallet.circle_wallet_id) {
      logger.error('resolveGhostContext: wallet missing circle_wallet_id → 400 WALLET_NOT_SYNCED', { userId, teamId, walletId: wallet.id });
      return { ok: false as const, response: c.json({ error: 'WALLET_NOT_SYNCED', message: 'Wallet not synced with Circle. Please reconnect your wallet.' }, 400) };
    }
    walletId = wallet.circle_wallet_id;
    walletDbId = wallet.id;
    walletAddress = wallet.wallet_address;
    logger.warn('resolveGhostContext: using fallback wallet', {
      walletDbId,
      walletAddress,
      walletId,
      blockchain: (wallet as Record<string, unknown>).blockchain,
    });
  }

  const { kycStatus, kybStatus } = await resolveVerificationStatus(supabaseAdmin, userId, teamId);
  logger.info('resolveGhostContext: verification status', { kycStatus, kybStatus });

  // Accept either KYC (personal) or KYB (team) approval
  if (kycStatus !== 'approved' && kybStatus !== 'approved') {
    logger.error('resolveGhostContext: KYC/KYB not approved → 403', { kycStatus, kybStatus });
    return { ok: false as const, response: c.json({ error: 'KYC_REQUIRED', message: 'Ghost Mode requires KYC verification' }, 403) };
  }

  return {
    ok: true as const,
    userId,
    teamId,
    walletDbId,
    walletAddress,
    walletId,
  };
}

/**
 * Sync on-chain eUSDCg indicator back to the wallets table.
 * Non-fatal — errors are logged but don't break the flow.
 */
async function syncEusdcgIndicator(walletDbId: string, walletAddress: string) {
  try {
    const { indicator } = await readGhostBalance(walletAddress);
    await supabaseAdmin
      .from('wallets')
      .update({ eusdcg_balance: parseFloat(indicator), updated_at: new Date().toISOString() })
      .eq('id', walletDbId);
  } catch (err) {
    console.error('[ghost] eUSDCg indicator sync failed:', (err as Error).message);
  }
}

// ─── POST /ghost/deposit ─────────────────────────────────

ghostFheRoutes.openapi(
  createRoute({
    method: 'post',
    path: '/deposit',
    tags: ['ghost-fhe'],
    summary: 'Deposit USDC into FHE-encrypted Ghost Mode',
    description: 'Initiates the full deposit pipeline: compliance check → USYC yield allocation → USDCg mint → FHE wrap → DON state update → attestation',
    security: [{ BearerAuth: [] }],
    request: {
      body: { required: true, content: { 'application/json': { schema: GhostDepositBodySchema } } },
    },
    responses: {
      200: { description: 'Deposit initiated', content: { 'application/json': { schema: GhostDepositResponseSchema } } },
      ...authErrorResponses,
    },
  }),
  async (c) => {
    try {
      const ctx = await resolveGhostContext(c);
      if (!ctx.ok) return ctx.response;

      const { amount, walletId: clientWalletId } = c.req.valid('json');

      // If client provided a specific wallet ID, look it up and override the resolved wallet.
      // This handles the case where the user is using an individual wallet but
      // resolveGhostContext found a team wallet (which may have no USDC).
      let depositWalletId = ctx.walletId;
      let depositWalletAddress = ctx.walletAddress;
      if (clientWalletId && clientWalletId !== ctx.walletId) {
        const { data: clientWallet } = await supabaseAdmin
          .from('wallets')
          .select('id, circle_wallet_id, wallet_address')
          .eq('circle_wallet_id', clientWalletId)
          .eq('user_id', ctx.userId)
          .maybeSingle();
        if (clientWallet?.wallet_address) {
          depositWalletId = clientWallet.circle_wallet_id;
          depositWalletAddress = clientWallet.wallet_address;
          logger.info('Ghost deposit: using client-provided wallet override', {
            clientWalletId,
            depositWalletAddress,
            originalWallet: ctx.walletAddress,
          });
        }
      }

      logger.info('Ghost deposit: validated input', { amount, walletId: depositWalletId, walletAddress: depositWalletAddress });

      const amountWei = toWei6(amount);
      logger.info('Ghost deposit: starting executeDeposit', { amountWei });

      const result = await executeDeposit(depositWalletId, depositWalletAddress, amountWei);

      // Trigger CRE ghost-deposit workflow (trustless Chainlink function).
      // CRE verifies compliance, reads FHE state, checks yield allocation,
      // updates DON state, and publishes on-chain attestation.
      // Non-fatal: deposit succeeds even if CRE gateway is unreachable.
      let attestationId = `ghost-deposit-${ctx.walletAddress.slice(2, 10)}-${amountWei}`;
      try {
        const { triggerCreWorkflowWithFallback } = await import('../services/cre-trigger.service');
        const creResult = await triggerCreWorkflowWithFallback<{ attestationId?: string; txHash?: string }>(
          {
            action: 'ghost_deposit',
            userAddress: depositWalletAddress,
            usdcAmount: amountWei,
            txHash: result.txHash,
          },
          async () => {
            logger.warn('CRE ghost-deposit fallback: attestation deferred');
            return { attestationId: `deferred-${attestationId}`, txHash: result.txHash };
          },
        );
        if (creResult.attestationId) attestationId = creResult.attestationId;
        logger.info('CRE ghost-deposit workflow completed', { attestationId, creTxHash: creResult.txHash });
      } catch (creError) {
        logger.warn('CRE ghost-deposit workflow failed (non-fatal) — deposit still valid, attestation deferred', {
          error: (creError as Error).message,
        });
      }

      // Persist audit trail
      try {
        await insertGhostTransaction(supabaseAdmin, {
          teamId: ctx.teamId,
          userId: ctx.userId,
          type: 'ghost_deposit',
          amount: parseFloat(amount),
          txHash: result.txHash,
          attestationId,
        });
      } catch (err) { console.error('[ghost] audit insert failed:', (err as Error).message); }

      // Read updated indicator after deposit and sync to DB
      const balance = await readGhostBalance(ctx.walletAddress).catch(() => null);
      await syncEusdcgIndicator(ctx.walletDbId, ctx.walletAddress);

      return c.json({
        success: true,
        txHash: result.txHash,
        attestationId,
        indicator: balance?.indicator ?? '0',
      }, 200);
    } catch (error) {
      const msg = (error as Error).message;
      const stack = (error as Error).stack;
      logger.error('Ghost deposit FAILED', { error: msg, stack });
      if (msg.includes('USDC_BALANCE_INSUFFICIENT')) {
        return c.json({ error: 'USDC_BALANCE_INSUFFICIENT', message: msg }, 400);
      }
      if (msg.includes('timed out') || msg.includes('CANCELLED') || msg.includes('FAILED')) {
        return c.json({ error: 'TX_FAILED', message: msg }, 502);
      }
      return c.json({ error: 'INTERNAL_ERROR', message: msg }, 500);
    }
  },
);

// ─── POST /ghost/transfer ────────────────────────────────

ghostFheRoutes.openapi(
  createRoute({
    method: 'post',
    path: '/transfer',
    tags: ['ghost-fhe'],
    summary: 'Execute Ghost Mode transfer',
    description: 'Sends a transfer on GhostUSDC. Currently uses plaintext ERC20 transfer (FHE confidentialTransfer requires client-side Fhenix SDK). PolicyEngine compliance still enforced at contract level.',
    security: [{ BearerAuth: [] }],
    request: {
      body: { required: true, content: { 'application/json': { schema: GhostTransferBodySchema } } },
    },
    responses: {
      200: { description: 'Transfer executed', content: { 'application/json': { schema: GhostTransferResponseSchema } } },
      ...authErrorResponses,
    },
  }),
  async (c) => {
    try {
      const ctx = await resolveGhostContext(c);
      if (!ctx.ok) return ctx.response;

      const { to, amount } = c.req.valid('json');
      const amountWei = toWei6(amount);

      const result = await executeTransfer(ctx.walletId, to, amountWei);

      // Trigger CRE verification for ghost transfer (trustless Chainlink function).
      // Note: workflow-ghost-transfer also fires automatically via ConfidentialTransfer
      // event log trigger, but HTTP trigger ensures verification even if log is delayed.
      try {
        const { triggerCreWorkflowWithFallback } = await import('../services/cre-trigger.service');
        await triggerCreWorkflowWithFallback(
          {
            action: 'ghost_transfer',
            userAddress: ctx.walletAddress,
            recipient: to,
            amount: amountWei,
            txHash: result.txHash,
          },
          async () => {
            logger.warn('CRE ghost-transfer fallback: verification deferred');
            return { success: true };
          },
        );
      } catch (creError) {
        logger.warn('CRE ghost-transfer verification failed (non-fatal)', {
          error: (creError as Error).message,
        });
      }

      // Persist audit trail
      try {
        await insertGhostTransaction(supabaseAdmin, {
          teamId: ctx.teamId,
          userId: ctx.userId,
          type: 'ghost_transfer',
          amount: parseFloat(amount),
          txHash: result.txHash,
        });
      } catch (err) { console.error('[ghost] audit insert failed:', (err as Error).message); }

      return c.json({
        success: true,
        txHash: result.txHash,
      }, 200);
    } catch (error) {
      const msg = (error as Error).message;
      if (msg.includes('timed out') || msg.includes('CANCELLED') || msg.includes('FAILED')) {
        return c.json({ error: 'TX_FAILED', message: msg }, 502);
      }
      return c.json({ error: 'INTERNAL_ERROR', message: msg }, 500);
    }
  },
);

// ─── POST /ghost/withdraw ────────────────────────────────

ghostFheRoutes.openapi(
  createRoute({
    method: 'post',
    path: '/withdraw',
    tags: ['ghost-fhe'],
    summary: 'Withdraw from FHE-encrypted Ghost Mode',
    description: 'Initiates async FHE unwrap: decrypt claim created → coprocessor decrypts → user claims → USDC returned',
    security: [{ BearerAuth: [] }],
    request: {
      body: { required: true, content: { 'application/json': { schema: GhostWithdrawBodySchema } } },
    },
    responses: {
      200: { description: 'Withdrawal initiated', content: { 'application/json': { schema: GhostWithdrawResponseSchema } } },
      ...authErrorResponses,
    },
  }),
  async (c) => {
    try {
      const ctx = await resolveGhostContext(c);
      if (!ctx.ok) return ctx.response;

      const { amount } = c.req.valid('json');
      const amountWei = toWei6(amount);

      const result = await executeWithdraw(ctx.walletId, ctx.walletAddress, amountWei);

      // Trigger CRE ghost-withdraw workflow (trustless Chainlink function).
      // Validates DON state, verifies backing, checks claim status, publishes attestation.
      try {
        const { triggerCreWorkflowWithFallback } = await import('../services/cre-trigger.service');
        await triggerCreWorkflowWithFallback(
          {
            action: 'ghost_withdraw',
            userAddress: ctx.walletAddress,
            amount: amountWei,
          },
          async () => {
            logger.warn('CRE ghost-withdraw fallback: verification deferred');
            return { success: true };
          },
        );
      } catch (creError) {
        logger.warn('CRE ghost-withdraw workflow failed (non-fatal)', {
          error: (creError as Error).message,
        });
      }

      const attestationId = `ghost-withdraw-${ctx.walletAddress.slice(2, 10)}-${amountWei}`;

      // Read claims to find the latest one (just created)
      const claims = await readGhostClaims(ctx.walletAddress).catch(() => []);
      const latestClaim = claims.length > 0 ? claims[claims.length - 1] : null;

      // Persist audit trail
      try {
        await insertGhostTransaction(supabaseAdmin, {
          teamId: ctx.teamId,
          userId: ctx.userId,
          type: 'ghost_withdraw',
          amount: parseFloat(amount),
          txHash: result.txHash,
          attestationId,
          claimId: latestClaim?.ctHash,
        });
      } catch (err) { console.error('[ghost] audit insert failed:', (err as Error).message); }

      // Sync eUSDCg indicator after withdraw (balance decreased)
      await syncEusdcgIndicator(ctx.walletDbId, ctx.walletAddress);

      return c.json({
        success: true,
        txHash: result.txHash,
        attestationId,
        claimId: latestClaim?.ctHash ?? '0x' + '0'.repeat(64),
        ctHash: latestClaim?.ctHash ?? '0x' + '0'.repeat(64),
        estimatedDecryptTime: '30-300 seconds',
      }, 200);
    } catch (error) {
      const msg = (error as Error).message;
      if (msg.includes('timed out') || msg.includes('CANCELLED') || msg.includes('FAILED')) {
        return c.json({ error: 'TX_FAILED', message: msg }, 502);
      }
      return c.json({ error: 'INTERNAL_ERROR', message: msg }, 500);
    }
  },
);

// ─── GET /ghost/balance ──────────────────────────────────

ghostFheRoutes.openapi(
  createRoute({
    method: 'get',
    path: '/balance',
    tags: ['ghost-fhe'],
    summary: 'Get Ghost Mode balance',
    description: 'Returns privacy indicator (public) and DON state balance (compliance view). Indicator is 0-9999 and reveals nothing about actual balance.',
    security: [{ BearerAuth: [] }],
    responses: {
      200: { description: 'Balance retrieved', content: { 'application/json': { schema: GhostBalanceResponseSchema } } },
      ...authErrorResponses,
    },
  }),
  async (c) => {
    try {
      const ctx = await resolveGhostContext(c);
      if (!ctx.ok) return ctx.response;

      // Read on-chain indicator + total supply
      const onChain = await readGhostBalance(ctx.walletAddress);

      // Passively sync eUSDCg indicator to DB on every balance read
      await syncEusdcgIndicator(ctx.walletDbId, ctx.walletAddress);

      // Read DON state for real balance (compliance view — requires EIP-712)
      const donBalance = await readDonBalance(ctx.walletAddress, ctx.walletId);

      // Read pending claims
      const claims = await readGhostClaims(ctx.walletAddress);

      return c.json({
        success: true,
        indicator: onChain.indicator,
        realBalance: donBalance ?? undefined,
        totalEncryptedSupply: onChain.totalEncryptedSupply,
        claims,
      }, 200);
    } catch (error) {
      const msg = (error as Error).message;
      if (msg.includes('timed out') || msg.includes('CANCELLED') || msg.includes('FAILED')) {
        return c.json({ error: 'TX_FAILED', message: msg }, 502);
      }
      return c.json({ error: 'INTERNAL_ERROR', message: msg }, 500);
    }
  },
);

// ─── GET /ghost/claims ───────────────────────────────────

ghostFheRoutes.openapi(
  createRoute({
    method: 'get',
    path: '/claims',
    tags: ['ghost-fhe'],
    summary: 'List pending unwrap claims',
    description: 'Returns all FHE unwrap claims for the user with their decrypt status',
    security: [{ BearerAuth: [] }],
    responses: {
      200: { description: 'Claims retrieved', content: { 'application/json': { schema: GhostClaimsResponseSchema } } },
      ...authErrorResponses,
    },
  }),
  async (c) => {
    try {
      const ctx = await resolveGhostContext(c);
      if (!ctx.ok) return ctx.response;

      const claims = await readGhostClaims(ctx.walletAddress);

      return c.json({
        success: true,
        claims,
      }, 200);
    } catch (error) {
      const msg = (error as Error).message;
      if (msg.includes('timed out') || msg.includes('CANCELLED') || msg.includes('FAILED')) {
        return c.json({ error: 'TX_FAILED', message: msg }, 502);
      }
      return c.json({ error: 'INTERNAL_ERROR', message: msg }, 500);
    }
  },
);

// ─── POST /ghost/claim ───────────────────────────────────

ghostFheRoutes.openapi(
  createRoute({
    method: 'post',
    path: '/claim',
    tags: ['ghost-fhe'],
    summary: 'Claim unwrapped tokens',
    description: 'Claims decrypted tokens after FHE unwrap completes. Must wait for coprocessor to finish decryption.',
    security: [{ BearerAuth: [] }],
    request: {
      body: { required: true, content: { 'application/json': { schema: GhostClaimBodySchema } } },
    },
    responses: {
      200: { description: 'Claim processed', content: { 'application/json': { schema: GhostClaimResponseSchema } } },
      ...authErrorResponses,
    },
  }),
  async (c) => {
    try {
      const ctx = await resolveGhostContext(c);
      if (!ctx.ok) return ctx.response;

      const { ctHash } = c.req.valid('json');

      const result = await executeClaim(ctx.walletId, ctHash);

      // Read claim details for the amount
      const claims = await readGhostClaims(ctx.walletAddress).catch(() => []);
      const claimedItem = claims.find((cl) => cl.ctHash === ctHash);
      const claimedAmount = claimedItem?.decryptedAmount ? fromWei6(claimedItem.decryptedAmount) : 0;

      // Persist audit trail
      if (claimedAmount > 0) {
        try {
          await insertGhostTransaction(supabaseAdmin, {
            teamId: ctx.teamId,
            userId: ctx.userId,
            type: 'ghost_claim',
            amount: claimedAmount,
            txHash: result.txHash,
            claimId: ctHash,
          });
        } catch (err) { console.error('[ghost] audit insert failed:', (err as Error).message); }
      }

      // Sync eUSDCg indicator after claim (balance changed)
      await syncEusdcgIndicator(ctx.walletDbId, ctx.walletAddress);

      return c.json({
        success: true,
        txHash: result.txHash,
        amount: claimedItem?.requestedAmount ?? '0',
      }, 200);
    } catch (error) {
      const msg = (error as Error).message;
      if (msg.includes('timed out') || msg.includes('CANCELLED') || msg.includes('FAILED')) {
        return c.json({ error: 'TX_FAILED', message: msg }, 502);
      }
      return c.json({ error: 'INTERNAL_ERROR', message: msg }, 500);
    }
  },
);
