/**
 * Ghost Mode withdrawal — Mint/Redeem Model.
 *
 * ACE Vault → burn USDg → auto-redeem USYC if needed → USDC to user.
 *
 * Step ordering:
 *   1. Request ticket — CRE API withdrawal ticket (EIP-712 auth)
 *   2. Vault redeem — execute ticket on-chain
 *   3. Burn USDg — destroy receipt token
 *   4. Liquidity check — read treasury USDC, auto-redeem USYC if short
 *   5. Transfer USDC — treasury → user wallet
 *
 * Every step produces a StepReceipt for audit.
 */

import { v4 as uuidv4 } from 'uuid';
import { createPublicClient, http, parseAbi } from 'viem';
import { sepolia } from 'viem/chains';
import {
  getUsdgTokenAddress,
  getUsdcAddress,
  getAceVaultAddress,
  getTreasuryWalletId,
  getTreasuryWalletAddress,
} from '@bu/env/ace';
import { signWithCircleDcw, type CircleSdk } from '../signer/index';
import { buildWithdrawTypedData } from '../eip712/index';
import { requestWithdrawal } from '../client/index';
import { redeem as redeemUsyc } from '@bu/treasury-yield/teller';
import { parseUsdcAmount } from '../pipeline/amount';
import { waitForTransaction } from '../pipeline/tx';
import { executeSteps, receipt, type Step } from '../pipeline/execute';
import { kycGate, type KycContext } from '../kyc/index';
import { cctpBridgeOut } from '../cctp/index';
import { attestReserves } from '../reserves/index';
import type { PrivateWithdrawResponse } from '@bu/types/private-transfer';

const ERC20_ABI = parseAbi([
  'function balanceOf(address account) external view returns (uint256)',
]);

// ─── Context ──────────────────────────────────────────────

interface WithdrawContext {
  sdk: CircleSdk;
  walletId: string;
  walletAddress: string;
  amountWei: bigint;
  amountStr: string;
  treasuryWalletId: string;
  treasuryAddress: string;
  usdgAddress: string;
  usdcAddress: string;
  vaultAddress: string;
  destinationChain?: string;
  destinationChainId?: number;
  triggerType: 'deposit' | 'withdraw' | 'scheduled';
  // KYC fields:
  kycStatus?: string;
  kybStatus?: string;
  isTeamWallet?: boolean;
  pendingKyc?: true;
  verificationType?: 'kyc' | 'kyb';
  personaInquiryUrl?: string;
  // Populated by steps:
  ticket?: string;
}

export interface WithdrawParams {
  sdk: CircleSdk;
  teamId: string;
  amount: string;
  walletId: string;
  walletAddress: string;
  walletChainId: number;
  destinationChain?: string;
  destinationChainId?: number;
  kycStatus?: string;
  kybStatus?: string;
  isTeamWallet?: boolean;
}

// ─── Steps ────────────────────────────────────────────────

/** 1. Sign + request withdrawal ticket from CRE API */
const requestTicket: Step<WithdrawContext> = {
  name: 'request-ticket',
  async execute(ctx) {
    const typedData = buildWithdrawTypedData(ctx.walletAddress, ctx.usdgAddress, ctx.amountStr);
    const auth = await signWithCircleDcw(ctx.sdk, ctx.walletId, typedData);
    const res = await requestWithdrawal(
      ctx.walletAddress,
      ctx.usdgAddress,
      ctx.amountStr,
      typedData.message.timestamp as number,
      auth,
    );
    ctx.ticket = res.ticket;
    return receipt('request-ticket', undefined, `expires ${res.expiresAt}`);
  },
};

/** 2. Redeem ticket on-chain: vault.withdrawWithTicket() */
const vaultRedeem: Step<WithdrawContext> = {
  name: 'vault-redeem',
  async execute(ctx) {
    const key = uuidv4();
    const res = await ctx.sdk.createContractExecutionTransaction({
      idempotencyKey: key,
      walletId: ctx.treasuryWalletId,
      contractAddress: ctx.vaultAddress,
      abiFunctionSignature: 'withdrawWithTicket(address,uint256,bytes)',
      abiParameters: [ctx.usdgAddress, ctx.amountStr, ctx.ticket!],
      fee: { type: 'level', config: { feeLevel: 'HIGH' } },
    });
    const txId = (res.data as Record<string, unknown> | undefined)?.id as string | undefined;
    if (txId) await waitForTransaction(txId, ctx.sdk);
    return receipt('vault-redeem', txId ?? undefined);
  },
};

/** 3. Burn USDg receipt token */
const burnUsdg: Step<WithdrawContext> = {
  name: 'burn-usdg',
  async execute(ctx) {
    const key = uuidv4();
    const res = await ctx.sdk.createContractExecutionTransaction({
      idempotencyKey: key,
      walletId: ctx.treasuryWalletId,
      contractAddress: ctx.usdgAddress,
      abiFunctionSignature: 'burn(uint256)',
      abiParameters: [ctx.amountStr],
      fee: { type: 'level', config: { feeLevel: 'HIGH' } },
    });
    const txId = (res.data as Record<string, unknown> | undefined)?.id as string | undefined;
    if (txId) await waitForTransaction(txId, ctx.sdk);
    return receipt('burn-usdg', txId ?? undefined);
  },
};

/** 4. Check treasury USDC, auto-redeem USYC if insufficient */
const liquidityCheck: Step<WithdrawContext> = {
  name: 'liquidity-check',
  async execute(ctx) {
    const client = createPublicClient({ chain: sepolia, transport: http() });
    const usdcBalance = await client.readContract({
      address: ctx.usdcAddress as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [ctx.treasuryAddress as `0x${string}`],
    });

    if (usdcBalance >= ctx.amountWei) {
      return receipt('liquidity-check', undefined, 'sufficient');
    }

    // Auto-redeem USYC to cover the deficit
    const deficit = ctx.amountWei - usdcBalance;
    const redeemTxId = await redeemUsyc(ctx.sdk, deficit.toString());
    if (redeemTxId) await waitForTransaction(redeemTxId, ctx.sdk);
    return receipt('liquidity-check', redeemTxId ?? undefined, `redeemed ${deficit} USYC`);
  },
};

/** 5. Transfer USDC from treasury to user */
const transferUsdc: Step<WithdrawContext> = {
  name: 'transfer-usdc',
  async execute(ctx) {
    const key = uuidv4();
    const res = await ctx.sdk.createContractExecutionTransaction({
      idempotencyKey: key,
      walletId: ctx.treasuryWalletId,
      contractAddress: ctx.usdcAddress,
      abiFunctionSignature: 'transfer(address,uint256)',
      abiParameters: [ctx.walletAddress, ctx.amountStr],
      fee: { type: 'level', config: { feeLevel: 'HIGH' } },
    });
    const txId = (res.data as Record<string, unknown> | undefined)?.id as string | undefined;
    if (txId) await waitForTransaction(txId, ctx.sdk);
    return receipt('transfer-usdc', txId ?? undefined);
  },
};

// ─── Orchestrator ─────────────────────────────────────────

const WITHDRAW_STEPS: Step<WithdrawContext>[] = [
  kycGate as Step<WithdrawContext>,        // KYC/KYB FIRST
  requestTicket,       // CRE API ticket
  vaultRedeem,         // Execute ticket on-chain
  burnUsdg,            // Destroy receipt token
  liquidityCheck,      // Ensure USDC available (auto-redeem USYC)
  transferUsdc,        // USDC → user
  cctpBridgeOut as Step<WithdrawContext>,   // Bridge to spoke (skips if same-chain)
  attestReserves as Step<WithdrawContext>,  // Proof of reserves (non-throwing)
];

export async function executeWithdraw(
  params: WithdrawParams,
): Promise<PrivateWithdrawResponse> {
  const amountWei = parseUsdcAmount(params.amount);

  const ctx: WithdrawContext = {
    sdk: params.sdk,
    walletId: params.walletId,
    walletAddress: params.walletAddress,
    amountWei,
    amountStr: amountWei.toString(),
    treasuryWalletId: getTreasuryWalletId(),
    treasuryAddress: getTreasuryWalletAddress(),
    usdgAddress: getUsdgTokenAddress(),
    usdcAddress: getUsdcAddress(),
    vaultAddress: getAceVaultAddress(),
    destinationChain: params.destinationChain,
    destinationChainId: params.destinationChainId,
    triggerType: 'withdraw',
    kycStatus: params.kycStatus,
    kybStatus: params.kybStatus,
    isTeamWallet: params.isTeamWallet,
  };

  const trace = await executeSteps(WITHDRAW_STEPS, ctx);

  if (trace.failedStep === 'kyc-gate' && ctx.pendingKyc) {
    return {
      success: false,
      pendingKyc: true,
      verificationType: ctx.verificationType,
      personaInquiryUrl: ctx.personaInquiryUrl,
      error: trace.error,
    };
  }

  if (trace.error) {
    return { success: false, error: `[${trace.failedStep}] ${trace.error}` };
  }

  return {
    success: true,
    withdrawalId: ctx.ticket,
    estimatedTime: params.destinationChain ? '~15 minutes' : '~2 minutes',
  };
}
