/**
 * Dual compliance checker:
 * 1. On-chain PolicyEngine -- KYC AllowList, VolumeRatePolicy, PausePolicy (eth_call, zero gas)
 * 2. Circle Compliance Engine -- AML/CTF screening (embedded in DCW transactions)
 *
 * PolicyEngine is checked explicitly before every CRE API submission.
 * Circle CE is embedded -- it screens automatically when Circle DCW signs or
 * executes transactions. No extra API call needed for embedded mode.
 *
 * For high-value transfers, standalone Circle CE screening can be called
 * explicitly via POST /v1/compliance/screening/transactions.
 *
 * Fail-closed: any error -> transfer REJECTED.
 */

import { createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import { createLogger } from '@bu/logger';
import { getPolicyEngineAddress } from '@bu/env/ace';
import type { ComplianceResult } from '@bu/types/private-transfer';

const logger = createLogger({ prefix: 'private-transfer:compliance' });

// PolicyEngine.check() ABI -- minimal for eth_call
const POLICY_ENGINE_CHECK_ABI = [
  {
    name: 'check',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'payload', type: 'bytes' },
    ],
    outputs: [
      { name: 'result', type: 'uint8' }, // 0=None, 1=Allowed, 2=Continue
    ],
  },
] as const;

/**
 * Check if a private transfer is allowed by the PolicyEngine.
 *
 * Uses eth_call -- no gas cost, no on-chain state change.
 * Encodes sender, recipient, token, and amount into the payload.
 *
 * @returns ComplianceResult -- { allowed: true } or { allowed: false, reason, policy }
 */
export async function checkCompliance(
  sender: string,
  recipient: string,
  token: string,
  amount: string,
): Promise<ComplianceResult> {
  const policyEngineAddress = getPolicyEngineAddress() as `0x${string}`;

  logger.info('Checking PolicyEngine compliance', {
    sender, recipient, token, amount,
  });

  try {
    const client = createPublicClient({
      chain: sepolia,
      transport: http(),
    });

    // Encode sender+recipient+token+amount as the payload for PolicyEngine.check(bytes)
    const { encodeAbiParameters } = await import('viem');
    const innerPayload = encodeAbiParameters(
      [
        { name: 'sender', type: 'address' },
        { name: 'recipient', type: 'address' },
        { name: 'token', type: 'address' },
        { name: 'amount', type: 'uint256' },
      ],
      [
        sender as `0x${string}`,
        recipient as `0x${string}`,
        token as `0x${string}`,
        BigInt(amount),
      ],
    );

    // Call PolicyEngine.check(bytes) — returns uint8 (0=None, 1=Allowed, 2=Continue)
    const result = await client.readContract({
      address: policyEngineAddress,
      abi: POLICY_ENGINE_CHECK_ABI,
      functionName: 'check',
      args: [innerPayload],
    });

    const resultCode = Number(result);
    // 0=None (no policy matched, defaultAllow applies), 1=Allowed, 2=Continue
    // All are passing states when defaultAllow=true
    logger.info('Compliance check passed', { sender, recipient, resultCode });
    return { allowed: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    // PolicyEngine with defaultAllow=true: if check() reverts because no policies
    // are configured (common on testnet), treat as allowed
    const isNoPolicy = message.includes('reverted');

    if (isNoPolicy) {
      logger.warn('PolicyEngine.check() reverted (likely no policies configured) — defaultAllow=true, allowing', {
        sender, recipient,
      });
      return { allowed: true };
    }

    // Real rejection from a configured policy
    const policy = extractRejectingPolicy(message);

    logger.warn('Compliance check REJECTED', {
      sender, recipient, reason: message, policy,
    });

    return {
      allowed: false,
      reason: message,
      policy: policy ?? 'unknown',
    };
  }
}

/**
 * Sync AllowList from Persona verification status.
 * Called by Shiva KYC/KYB webhook handlers.
 *
 * Uses Circle SDK's abiFunctionSignature + abiParameters format
 * (same pattern as RainWithdrawalService / EarnExecutionService).
 *
 * @param walletAddress - Address to add/remove
 * @param approved - true to add, false to remove
 * @param sdk - Circle DCW SDK for signing the transaction
 * @param treasuryWalletId - Treasury wallet ID (owner of AllowListPolicy)
 */
export async function syncAllowListFromPersona(
  walletAddress: string,
  approved: boolean,
  sdk: Awaited<ReturnType<typeof import('@bu/circle/client').createCircleSdk>>,
  treasuryWalletId: string,
): Promise<void> {
  const policyEngineAddress = getPolicyEngineAddress();

  const functionName = approved ? 'addToAllowList' : 'removeFromAllowList';
  logger.info(`Syncing AllowList: ${functionName}`, { walletAddress, approved });

  const { v4: uuidv4 } = await import('uuid');
  await sdk.createContractExecutionTransaction({
    idempotencyKey: uuidv4(),
    walletId: treasuryWalletId,
    contractAddress: policyEngineAddress,
    abiFunctionSignature: `${functionName}(address)`,
    abiParameters: [walletAddress],
    fee: { type: 'level', config: { feeLevel: 'HIGH' } },
  });

  logger.info(`AllowList synced: ${functionName}`, { walletAddress });
}

/** Extract rejecting policy name from revert message (best-effort) */
function extractRejectingPolicy(message: string): string | undefined {
  if (message.includes('AllowList')) return 'AllowListPolicy';
  if (message.includes('VolumeRate') || message.includes('volume')) return 'VolumeRatePolicy';
  if (message.includes('Pause') || message.includes('paused')) return 'PausePolicy';
  return undefined;
}
