/**
 * Ghost FHE Schemas — Shiva
 *
 * OpenAPI-compatible Zod schemas for FHE-encrypted Ghost Mode operations.
 * These routes handle the Layer 4 (FHE) + CRE workflow orchestration.
 */

import { z } from '@hono/zod-openapi';

// ============================================================================
// Request Schemas
// ============================================================================

export const GhostDepositBodySchema = z
  .object({
    amount: z.string().min(1).describe('USDC amount to deposit into Ghost Mode (human-readable)'),
    walletId: z.string().optional().describe('Circle wallet ID — when provided, overrides server-side wallet resolution'),
  })
  .openapi('GhostDepositBody');

export const GhostTransferBodySchema = z
  .object({
    to: z.string().min(1).describe('Recipient address for encrypted transfer'),
    amount: z.string().min(1).describe('Amount to transfer (will be FHE-encrypted on-chain)'),
  })
  .openapi('GhostTransferBody');

export const GhostWithdrawBodySchema = z
  .object({
    amount: z.string().min(1).describe('Amount to withdraw from FHE-encrypted balance'),
  })
  .openapi('GhostWithdrawBody');

export const GhostClaimBodySchema = z
  .object({
    ctHash: z.string().min(1).describe('Ciphertext hash (bytes32) from unwrap request'),
  })
  .openapi('GhostClaimBody');

// ============================================================================
// Response Schemas
// ============================================================================

export const GhostDepositResponseSchema = z
  .object({
    success: z.boolean(),
    txHash: z.string().optional(),
    attestationId: z.string().optional(),
    indicator: z.string().optional().describe('Privacy indicator (0-9999)'),
    error: z.string().optional(),
  })
  .openapi('GhostDepositResponse');

export const GhostTransferResponseSchema = z
  .object({
    success: z.boolean(),
    txHash: z.string().optional(),
    error: z.string().optional(),
  })
  .openapi('GhostTransferResponse');

export const GhostWithdrawResponseSchema = z
  .object({
    success: z.boolean(),
    txHash: z.string().optional(),
    attestationId: z.string().optional(),
    claimId: z.string().optional().describe('FHE unwrap claim ID'),
    ctHash: z.string().optional().describe('Ciphertext hash for decrypt tracking'),
    estimatedDecryptTime: z.string().optional(),
    error: z.string().optional(),
  })
  .openapi('GhostWithdrawResponse');

const ClaimSchema = z.object({
  ctHash: z.string(),
  requestedAmount: z.string(),
  decryptedAmount: z.string(),
  decrypted: z.boolean(),
  to: z.string(),
  claimed: z.boolean(),
  status: z.enum(['pending', 'decrypting', 'claimable', 'claimed']),
});

export const GhostBalanceResponseSchema = z
  .object({
    success: z.boolean(),
    indicator: z.string().describe('Privacy indicator (0-9999) — not the real balance'),
    realBalance: z.string().optional().describe('Real balance from DON state (compliance view only)'),
    totalEncryptedSupply: z.string().optional(),
    claims: z.array(ClaimSchema).optional(),
    error: z.string().optional(),
  })
  .openapi('GhostBalanceResponse');

export const GhostClaimResponseSchema = z
  .object({
    success: z.boolean(),
    txHash: z.string().optional(),
    amount: z.string().optional(),
    error: z.string().optional(),
  })
  .openapi('GhostClaimResponse');

export const GhostClaimsResponseSchema = z
  .object({
    success: z.boolean(),
    claims: z.array(ClaimSchema),
    error: z.string().optional(),
  })
  .openapi('GhostClaimsResponse');

// ============================================================================
// Inferred Types
// ============================================================================

export type GhostDepositBody = z.infer<typeof GhostDepositBodySchema>;
export type GhostTransferBody = z.infer<typeof GhostTransferBodySchema>;
export type GhostWithdrawBody = z.infer<typeof GhostWithdrawBodySchema>;
export type GhostClaimBody = z.infer<typeof GhostClaimBodySchema>;
export type GhostDepositResponse = z.infer<typeof GhostDepositResponseSchema>;
export type GhostTransferResponse = z.infer<typeof GhostTransferResponseSchema>;
export type GhostWithdrawResponse = z.infer<typeof GhostWithdrawResponseSchema>;
export type GhostBalanceResponse = z.infer<typeof GhostBalanceResponseSchema>;
export type GhostClaimResponse = z.infer<typeof GhostClaimResponseSchema>;
