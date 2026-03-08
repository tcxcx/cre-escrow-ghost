/**
 * Proof of Reserves -- USDg Supply Parity Attestation.
 *
 * Final step in deposit/withdraw pipelines.
 * Reads on-chain state and writes CRE attestation proving:
 *   USDC_held + USYC_value >= USDg_supply
 *
 * Non-throwing: if attestation fails, log but don't fail the transfer.
 */

import { createPublicClient, http, parseAbi } from 'viem';
import { sepolia } from 'viem/chains';
import { createLogger } from '@bu/logger';
import {
  getUsdcAddress,
  getUsycTokenAddress,
  getTreasuryWalletAddress,
  getUsdgTokenAddress,
  getAceApiUrl,
} from '@bu/env/ace';
import { fetchJson } from '@bu/http-client';
import { receipt, type Step } from '../pipeline/execute';

const logger = createLogger({ prefix: 'private-transfer:reserves' });

const ERC20_ABI = parseAbi([
  'function balanceOf(address account) external view returns (uint256)',
  'function totalSupply() external view returns (uint256)',
]);

export interface ReserveAttestation {
  usdcBalance: string;
  usycBalance: string;
  usycValueUsdc: string;
  totalReserves: string;
  usdgSupply: string;
  ratio: string;
  timestamp: number;
  triggerType: 'deposit' | 'withdraw' | 'scheduled';
}

export interface ReservesContext {
  triggerType: 'deposit' | 'withdraw' | 'scheduled';
}

async function computeReserves(): Promise<Omit<ReserveAttestation, 'triggerType'>> {
  const client = createPublicClient({ chain: sepolia, transport: http() });
  const treasuryAddress = getTreasuryWalletAddress() as `0x${string}`;
  const usdcAddress = getUsdcAddress() as `0x${string}`;
  const usycAddress = getUsycTokenAddress() as `0x${string}`;
  const usdgAddress = getUsdgTokenAddress() as `0x${string}`;

  const [usdcBalance, usycBalance, usdgSupply] = await Promise.all([
    client.readContract({
      address: usdcAddress,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [treasuryAddress],
    }),
    client.readContract({
      address: usycAddress,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [treasuryAddress],
    }),
    client.readContract({
      address: usdgAddress,
      abi: ERC20_ABI,
      functionName: 'totalSupply',
    }),
  ]);

  // Get USYC price from oracle (8 decimals)
  // Using dynamic import to avoid circular dependency
  const { getUsycPrice, usycToUsdc } = await import('@bu/treasury-yield/oracle');
  const priceData = await getUsycPrice();
  const usycValueUsdc = usycToUsdc(usycBalance, priceData.price);
  const totalReserves = usdcBalance + usycValueUsdc;

  let ratio = '0.000000';
  if (usdgSupply > 0n) {
    const ratioBps = (totalReserves * 1_000_000n) / usdgSupply;
    const whole = ratioBps / 1_000_000n;
    const frac = ratioBps % 1_000_000n;
    ratio = `${whole}.${frac.toString().padStart(6, '0')}`;
  }

  return {
    usdcBalance: usdcBalance.toString(),
    usycBalance: usycBalance.toString(),
    usycValueUsdc: usycValueUsdc.toString(),
    totalReserves: totalReserves.toString(),
    usdgSupply: usdgSupply.toString(),
    ratio,
    timestamp: Math.floor(Date.now() / 1000),
  };
}

async function submitReserveAttestation(data: ReserveAttestation): Promise<void> {
  // Try CRE-orchestrated attestation first (trustless Chainlink function).
  // The CRE workflow-private-transfer has a proofOfReserves cron handler,
  // but per-transfer attestations provide continuous backing verification.
  try {
    const { getEnvVar } = await import('@bu/env/workers');
    const baseUrl = getEnvVar('CRE_GATEWAY_URL') ?? 'http://localhost:8088';
    const url = `${baseUrl}/workflows/workflow-private-transfer/trigger`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'proof_of_reserves',
        triggerType: data.triggerType,
        timestamp: data.timestamp,
      }),
    });

    if (response.ok) {
      logger.info('Reserve attestation submitted via CRE', { triggerType: data.triggerType });
      return;
    }
    logger.warn('CRE reserve attestation failed, falling back to direct', { status: response.status });
  } catch (creError) {
    logger.warn('CRE gateway unreachable, falling back to direct attestation', {
      error: (creError as Error).message,
    });
  }

  // Fallback: direct HTTP to ACE API (trusted server call)
  await fetchJson(`${getAceApiUrl()}/attestations`, {
    method: 'POST',
    body: JSON.stringify({
      type: 'proof_of_reserves',
      entityId: `reserves-${data.timestamp}`,
      data,
    }),
    headers: { 'Content-Type': 'application/json' },
  });
}

export const attestReserves: Step<ReservesContext> = {
  name: 'attest-reserves',
  async execute(ctx) {
    try {
      const reserves = await computeReserves();
      const attestation: ReserveAttestation = { ...reserves, triggerType: ctx.triggerType };
      await submitReserveAttestation(attestation);
      logger.info('Reserve attestation written', {
        ratio: reserves.ratio,
        totalReserves: reserves.totalReserves,
        usdgSupply: reserves.usdgSupply,
      });
      return receipt('attest-reserves', undefined, `ratio: ${reserves.ratio}`);
    } catch (error) {
      const message = (error as Error).message;
      logger.error('Reserve attestation failed (non-fatal)', { error: message });
      return receipt('attest-reserves', undefined, `failed: ${message}`);
    }
  },
};
