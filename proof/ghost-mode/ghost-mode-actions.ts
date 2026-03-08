'use server';

/**
 * Ghost Mode Server Actions
 *
 * Server-side wrappers calling Shiva /private-transfer endpoints.
 * Pattern: earn-actions.ts — JWT auth, Shiva POST/GET helpers.
 *
 * DEV-ONLY: Ghost Mode is not production-ready. All actions throw in non-development environments.
 */

import { createClient } from '@bu/supabase/server';
import { getShivaUrl } from '@/lib/shiva-actions';
import type {
  PrivateDepositResponse,
  PrivateWithdrawResponse,
  PrivateTransferResponse,
  PrivateBalanceResponse,
  ShieldedAddressResponse,
} from '@bu/schemas/private-transfer';

function assertGhostEnabled() {
  const env = process.env.NODE_ENV;
  if (env !== 'development' && env !== 'test' && process.env.NEXT_PUBLIC_GHOST_MODE_ENABLED !== 'true') {
    throw new Error('Ghost Mode is not enabled in this environment');
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getAccessToken(): Promise<string> {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('No active session');
  return session.access_token;
}

async function shivaPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const [token, shivaUrl] = await Promise.all([getAccessToken(), getShivaUrl()]);

  const res = await fetch(`${shivaUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const rawText = await res.text().catch(() => 'Unknown error');
    // Try to parse structured error responses (e.g. USDC_BALANCE_INSUFFICIENT)
    try {
      const errBody = JSON.parse(rawText) as { error?: string; message?: string };
      if (errBody.error) {
        throw new Error(errBody.error + (errBody.message ? ': ' + errBody.message : ''));
      }
    } catch (parseErr) {
      if (parseErr instanceof Error && !parseErr.message.startsWith('Unexpected')) {
        throw parseErr;
      }
    }
    throw new Error(`Shiva ${res.status}: ${rawText}`);
  }

  return res.json() as Promise<T>;
}

async function shivaGet<T>(path: string): Promise<T> {
  const [token, shivaUrl] = await Promise.all([getAccessToken(), getShivaUrl()]);

  const res = await fetch(`${shivaUrl}${path}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const err = await res.text().catch(() => 'Unknown error');
    throw new Error(`Shiva ${res.status}: ${err}`);
  }

  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Server Actions
// ---------------------------------------------------------------------------

export async function ghostDeposit(params: {
  amount: string;
  walletChainId: number;
  sourceChain?: string;
}): Promise<PrivateDepositResponse> {
  try {
    assertGhostEnabled();
    return await shivaPost<PrivateDepositResponse>('/private-transfer/deposit', params);
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function ghostWithdraw(params: {
  amount: string;
  walletChainId: number;
  destinationChain?: string;
}): Promise<PrivateWithdrawResponse> {
  try {
    assertGhostEnabled();
    return await shivaPost<PrivateWithdrawResponse>('/private-transfer/withdraw', params);
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function ghostTransfer(params: {
  to: string;
  amount: string;
  flags?: string[];
}): Promise<PrivateTransferResponse> {
  try {
    assertGhostEnabled();
    return await shivaPost<PrivateTransferResponse>('/private-transfer/transfer', params);
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function ghostBalance(): Promise<PrivateBalanceResponse | { success: false; error: string }> {
  try {
    assertGhostEnabled();
    return await shivaGet<PrivateBalanceResponse>('/private-transfer/balance');
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function ghostShieldedAddress(): Promise<ShieldedAddressResponse> {
  try {
    assertGhostEnabled();
    return await shivaGet<ShieldedAddressResponse>('/private-transfer/shielded-address');
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

// ---------------------------------------------------------------------------
// FHE Ghost Mode Actions (Layer 4 — encrypted balances)
// ---------------------------------------------------------------------------

export interface GhostFheDepositResult {
  success: boolean;
  txHash?: string;
  attestationId?: string;
  indicator?: string;
  error?: string;
}

export async function ghostFheDeposit(params: {
  amount: string;
  walletId?: string;
}): Promise<GhostFheDepositResult> {
  try {
    assertGhostEnabled();
    return await shivaPost<GhostFheDepositResult>('/ghost/deposit', params);
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export interface GhostFheTransferResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

export async function ghostFheTransfer(params: {
  to: string;
  amount: string;
}): Promise<GhostFheTransferResult> {
  try {
    assertGhostEnabled();
    return await shivaPost<GhostFheTransferResult>('/ghost/transfer', params);
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export interface GhostFheWithdrawResult {
  success: boolean;
  txHash?: string;
  attestationId?: string;
  claimId?: string;
  ctHash?: string;
  estimatedDecryptTime?: string;
  error?: string;
}

export async function ghostFheWithdraw(params: {
  amount: string;
}): Promise<GhostFheWithdrawResult> {
  try {
    assertGhostEnabled();
    return await shivaPost<GhostFheWithdrawResult>('/ghost/withdraw', params);
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export interface GhostFheBalanceResult {
  success: boolean;
  indicator: string;
  realBalance?: string;
  totalEncryptedSupply?: string;
  claims?: Array<{
    ctHash: string;
    requestedAmount: string;
    decryptedAmount: string;
    decrypted: boolean;
    to: string;
    claimed: boolean;
    status: 'pending' | 'decrypting' | 'claimable' | 'claimed';
  }>;
  error?: string;
}

export async function ghostFheBalance(): Promise<GhostFheBalanceResult> {
  try {
    assertGhostEnabled();
    return await shivaGet<GhostFheBalanceResult>('/ghost/balance');
  } catch (error) {
    return { success: false, indicator: '0', error: (error as Error).message };
  }
}

export interface GhostFheClaimResult {
  success: boolean;
  txHash?: string;
  amount?: string;
  error?: string;
}

export async function ghostFheClaim(ctHash: string): Promise<GhostFheClaimResult> {
  try {
    assertGhostEnabled();
    return await shivaPost<GhostFheClaimResult>('/ghost/claim', { ctHash });
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function ghostFheClaims(): Promise<{
  success: boolean;
  claims: GhostFheBalanceResult['claims'];
  error?: string;
}> {
  try {
    assertGhostEnabled();
    return await shivaGet('/ghost/claims');
  } catch (error) {
    return { success: false, claims: [], error: (error as Error).message };
  }
}

// ---------------------------------------------------------------------------
// Ghost Transaction History (reads directly from Supabase — no Shiva roundtrip)
// ---------------------------------------------------------------------------

export interface GhostTransactionRecord {
  id: string;
  name: string;
  description: string;
  amount: number;
  currency: string;
  status: string;
  date: string;
  note: string | null;
  metadata: {
    ghost_mode: boolean;
    ghost_type: string;
    tx_hash: string | null;
    attestation_id: string | null;
    ct_hash: string | null;
  } | null;
}

export async function getGhostHistory(): Promise<{
  success: boolean;
  transactions: GhostTransactionRecord[];
  error?: string;
}> {
  try {
    assertGhostEnabled();
    const { getGhostTransactions } = await import('@bu/supabase/queries/transactions');
    const supabase = await createClient();
    // Get user's team from session context
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, transactions: [], error: 'No user' };
    const { data: membership } = await supabase
      .from('users_on_team')
      .select('team_id')
      .eq('user_id', user.id)
      .limit(1)
      .single();
    if (!membership) return { success: false, transactions: [], error: 'No team' };

    const { data, error } = await getGhostTransactions(supabase, membership.team_id);
    if (error) throw error;
    return { success: true, transactions: (data ?? []) as GhostTransactionRecord[] };
  } catch (error) {
    return { success: false, transactions: [], error: (error as Error).message };
  }
}

export interface GhostEligibilityResult {
  eligible: boolean;
  reason?: string;
  senderGhostBalance?: string;
  recipientOnPlatform?: boolean;
  recipientVerified?: boolean;
  recipientWalletType?: 'team' | 'personal';
}

export async function ghostEligibility(
  recipientAddress: string,
  amount: string,
): Promise<GhostEligibilityResult> {
  try {
    assertGhostEnabled();
    return await shivaGet<GhostEligibilityResult>(
      `/private-transfer/eligibility?recipientAddress=${encodeURIComponent(recipientAddress)}&amount=${encodeURIComponent(amount)}`,
    );
  } catch {
    return { eligible: false, reason: 'error' };
  }
}
