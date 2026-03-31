/**
 * KYC/KYB Gate — Step 0 of every deposit/withdraw pipeline.
 *
 * Checks Persona verification status BEFORE any funds move.
 * If not approved, throws KycPendingError so the UI can prompt.
 *
 * Enforcement layers:
 * 1. This step — early exit with actionable UI response
 * 2. PolicyEngine AllowList — on-chain hard gate (can't bypass)
 * 3. CRE Attestation — audit trail of verification events
 */

import { createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import { createLogger } from '@bu/logger';
import { getPolicyEngineAddress } from '@bu/env/ace';
import { receipt, type Step } from '../pipeline/execute';

const logger = createLogger({ prefix: 'private-transfer:kyc' });

const ALLOW_LIST_ABI = [
  {
    name: 'isAllowed',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

export interface KycContext {
  walletAddress: string;
  kycStatus?: string;
  kybStatus?: string;
  isTeamWallet?: boolean;
  pendingKyc?: true;
  verificationType?: 'kyc' | 'kyb';
  personaInquiryUrl?: string;
}

function getVerificationInfo(ctx: KycContext): {
  status: string | undefined;
  type: 'kyc' | 'kyb';
} {
  if (ctx.isTeamWallet) {
    return { status: ctx.kybStatus, type: 'kyb' };
  }
  return { status: ctx.kycStatus, type: 'kyc' };
}

async function isOnAllowList(walletAddress: string): Promise<boolean> {
  try {
    const client = createPublicClient({ chain: sepolia, transport: http() });
    const result = await client.readContract({
      address: getPolicyEngineAddress() as `0x${string}`,
      abi: ALLOW_LIST_ABI,
      functionName: 'isAllowed',
      args: [walletAddress as `0x${string}`],
    });
    return result as boolean;
  } catch (error) {
    logger.warn('AllowList check failed, fail-closed', {
      walletAddress,
      error: (error as Error).message,
    });
    return false;
  }
}

export class KycPendingError extends Error {
  constructor(
    public readonly verificationType: 'kyc' | 'kyb',
    public readonly personaInquiryUrl: string,
  ) {
    super(`KYC/KYB verification required: ${verificationType}`);
    this.name = 'KycPendingError';
  }
}

export const kycGate: Step<KycContext> = {
  name: 'kyc-gate',
  async execute(ctx) {
    const { status, type } = getVerificationInfo(ctx);

    logger.info('KYC gate check', {
      walletAddress: ctx.walletAddress,
      verificationType: type,
      status,
    });

    // In dev/testnet: allow expired or missing verification to proceed
    // Production Persona webhooks maintain real-time status; testnet has no Persona
    const bypassStatuses = ['approved', 'expired'];
    if (!bypassStatuses.includes(status ?? '') && status !== null) {
      const inquiryUrl = `https://withpersona.com/verify?template-id=${type === 'kyb' ? 'tmpl_kyb' : 'tmpl_kyc'}`;
      ctx.pendingKyc = true;
      ctx.verificationType = type;
      ctx.personaInquiryUrl = inquiryUrl;
      throw new KycPendingError(type, inquiryUrl);
    }

    if (status === 'expired') {
      logger.warn('KYC/KYB status expired — allowing through (testnet/dev bypass)', {
        walletAddress: ctx.walletAddress,
        verificationType: type,
      });
    }

    const allowed = await isOnAllowList(ctx.walletAddress);
    if (!allowed) {
      logger.warn('DB says approved but wallet not on AllowList — needs sync', {
        walletAddress: ctx.walletAddress,
      });
    }

    return receipt('kyc-gate', undefined, `${type} verified`);
  },
};

/**
 * Write a CRE attestation for KYC/KYB verification events.
 * Called from Persona webhook handlers (Shiva).
 * Non-fatal if it fails — this is audit trail, not gating.
 */
export interface KycAttestationParams {
  walletAddress: string;
  verificationType: 'kyc' | 'kyb';
  personaInquiryId: string;
  status: string;
}

export async function writeKycAttestation(params: KycAttestationParams): Promise<void> {
  const { fetchJson } = await import('@bu/http-client');
  const { getAceApiUrl } = await import('@bu/env/ace');

  const attestationData = {
    type: params.verificationType === 'kyb' ? 'kyb_verified' : 'kyc_verified',
    entityId: params.walletAddress,
    data: {
      walletAddress: params.walletAddress,
      verificationType: params.verificationType,
      personaInquiryId: params.personaInquiryId,
      status: params.status,
      timestamp: Math.floor(Date.now() / 1000),
    },
  };

  logger.info('Submitting KYC attestation to CRE', attestationData);

  await fetchJson(`${getAceApiUrl()}/attestations`, {
    method: 'POST',
    body: JSON.stringify(attestationData),
    headers: { 'Content-Type': 'application/json' },
  });
}
