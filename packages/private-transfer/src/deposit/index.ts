/**
 * Ghost Mode deposit — Mint/Redeem Model.
 *
 * USDC deposit → USDg receipt token → ACE Vault private balance.
 * USDC is forwarded to USYC (Hashnote yield) — Bu keeps the spread.
 *
 * Step ordering follows Circle Mint principles:
 *   1. Compliance FIRST — screen before any funds move
 *   2. Transfer USDC — user wallet → treasury
 *   3. Subscribe USYC — USDC → USYC via Hashnote Teller
 *   4. Mint USDg — receipt token for the deposit
 *   5. Vault deposit — USDg into ACE Vault (private balance)
 *   6. Query balance — return updated shielded balance
 *
 * Every step produces a StepReceipt for audit. If any step fails,
 * the operation halts and returns the trace of what completed.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  getUsdgTokenAddress,
  getUsdcAddress,
  getAceVaultAddress,
  getTreasuryWalletId,
  getTreasuryWalletAddress,
} from '@bu/env/ace';
import { signWithCircleDcw, type CircleSdk } from '../signer/index';
import { buildBalancesTypedData } from '../eip712/index';
import { queryBalances } from '../client/index';
import { checkCompliance } from '../compliance/index';
import { subscribe } from '@bu/treasury-yield/teller';
import { parseUsdcAmount, formatUsdcAmount } from '../pipeline/amount';
import { waitForTransaction } from '../pipeline/tx';
import { executeSteps, receipt, type Step } from '../pipeline/execute';
import { kycGate, type KycContext } from '../kyc/index';
import { cctpBridgeIn } from '../cctp/index';
import { attestReserves } from '../reserves/index';
import type { PrivateDepositResponse } from '@bu/types/private-transfer';

// ─── Context ──────────────────────────────────────────────

interface DepositContext {
  sdk: CircleSdk;
  walletId: string;         // user's Circle DCW wallet
  walletAddress: string;    // user's on-chain address
  amountWei: bigint;        // 6-decimal bigint
  amountStr: string;        // bigint.toString() for SDK calls
  treasuryWalletId: string;
  treasuryAddress: string;
  usdgAddress: string;
  usdcAddress: string;
  vaultAddress: string;
  sourceChainId?: number;
  triggerType: 'deposit' | 'withdraw' | 'scheduled';
  // KYC fields:
  kycStatus?: string;
  kybStatus?: string;
  isTeamWallet?: boolean;
  pendingKyc?: true;
  verificationType?: 'kyc' | 'kyb';
  personaInquiryUrl?: string;
  // Populated by steps:
  transferTxId?: string;
  privateBalance?: string;
}

export interface DepositParams {
  sdk: CircleSdk;
  teamId: string;
  amount: string;           // Human-readable USDC (e.g., "5000.00")
  walletId: string;
  walletAddress: string;
  walletChainId: number;
  sourceChainId?: number;
  sourceChain?: string;
  kycStatus?: string;
  kybStatus?: string;
  isTeamWallet?: boolean;
}

// ─── Steps ────────────────────────────────────────────────

/** 1. Screen compliance BEFORE any funds move */
const complianceCheck: Step<DepositContext> = {
  name: 'compliance-check',
  async execute(ctx) {
    const result = await checkCompliance(
      ctx.walletAddress,
      ctx.treasuryAddress,
      ctx.usdcAddress,
      ctx.amountStr,
    );
    if (!result.allowed) {
      throw new Error(`Compliance rejected: ${result.reason} [${result.policy}]`);
    }
    return receipt('compliance-check', undefined, 'allowed');
  },
};

/** 2. Transfer USDC from user wallet to treasury */
const transferUsdc: Step<DepositContext> = {
  name: 'transfer-usdc',
  async execute(ctx) {
    const key = uuidv4();
    const res = await ctx.sdk.createContractExecutionTransaction({
      idempotencyKey: key,
      walletId: ctx.walletId,
      contractAddress: ctx.usdcAddress,
      abiFunctionSignature: 'transfer(address,uint256)',
      abiParameters: [ctx.treasuryAddress, ctx.amountStr],
      fee: { type: 'level', config: { feeLevel: 'HIGH' } },
    });
    const txId = (res.data as Record<string, unknown> | undefined)?.id as string | undefined;
    if (!txId) throw new Error('USDC transfer returned no transaction ID');
    await waitForTransaction(txId, ctx.sdk);
    ctx.transferTxId = txId;
    return receipt('transfer-usdc', txId);
  },
};

/** 3. Subscribe USDC to USYC via Hashnote Teller (approve + deposit)
 *  Non-fatal: yield allocation is an optimization, not required for deposit */
const subscribeUsyc: Step<DepositContext> = {
  name: 'subscribe-usyc',
  async execute(ctx) {
    try {
      const txId = await subscribe(ctx.sdk, ctx.amountStr);
      if (txId) await waitForTransaction(txId, ctx.sdk);
      return receipt('subscribe-usyc', txId ?? undefined);
    } catch (error) {
      const msg = (error as Error).message;
      const { createLogger } = await import('@bu/logger');
      createLogger({ prefix: 'private-transfer:deposit' }).warn(
        'USYC subscription failed (non-fatal) — USDC stays in treasury. ' +
        'Hashnote requires wallet entitlement on Sepolia: check ' +
        'https://api.dev.hashnote.com/v1/entitlements/token_access?address=TREASURY_ADDRESS&symbol=USYC. ' +
        'Official Sepolia Teller: 0xbb0524426bc1d13dAB721DB69D86374FC6BaCDba (verify against addresses.ts). ' +
        'Yield allocation deferred to treasury-rebalance CRE cron once entitled.',
        { error: msg },
      );
      return receipt('subscribe-usyc', undefined, `skipped: ${msg}`);
    }
  },
};

/** 4. Mint USDg receipt token to treasury */
const mintUsdg: Step<DepositContext> = {
  name: 'mint-usdg',
  async execute(ctx) {
    const key = uuidv4();
    const res = await ctx.sdk.createContractExecutionTransaction({
      idempotencyKey: key,
      walletId: ctx.treasuryWalletId,
      contractAddress: ctx.usdgAddress,
      abiFunctionSignature: 'mint(address,uint256)',
      abiParameters: [ctx.treasuryAddress, ctx.amountStr],
      fee: { type: 'level', config: { feeLevel: 'HIGH' } },
    });
    const txId = (res.data as Record<string, unknown> | undefined)?.id as string | undefined;
    if (!txId) throw new Error('USDg mint returned no transaction ID');
    await waitForTransaction(txId, ctx.sdk);
    return receipt('mint-usdg', txId);
  },
};

/** 5. Approve vault + deposit USDg into ACE Vault */
const vaultDeposit: Step<DepositContext> = {
  name: 'vault-deposit',
  async execute(ctx) {
    // 5a. Approve
    const approveKey = uuidv4();
    const approveRes = await ctx.sdk.createContractExecutionTransaction({
      idempotencyKey: approveKey,
      walletId: ctx.treasuryWalletId,
      contractAddress: ctx.usdgAddress,
      abiFunctionSignature: 'approve(address,uint256)',
      abiParameters: [ctx.vaultAddress, ctx.amountStr],
      fee: { type: 'level', config: { feeLevel: 'HIGH' } },
    });
    const approveTxId = (approveRes.data as Record<string, unknown> | undefined)?.id as string | undefined;
    if (!approveTxId) throw new Error('USDg approve returned no transaction ID');
    await waitForTransaction(approveTxId, ctx.sdk);

    // 5b. Deposit
    const depositKey = uuidv4();
    const depositRes = await ctx.sdk.createContractExecutionTransaction({
      idempotencyKey: depositKey,
      walletId: ctx.treasuryWalletId,
      contractAddress: ctx.vaultAddress,
      abiFunctionSignature: 'deposit(address,uint256)',
      abiParameters: [ctx.usdgAddress, ctx.amountStr],
      fee: { type: 'level', config: { feeLevel: 'HIGH' } },
    });
    const depositTxId = (depositRes.data as Record<string, unknown> | undefined)?.id as string | undefined;
    if (depositTxId) await waitForTransaction(depositTxId, ctx.sdk);
    return receipt('vault-deposit', depositTxId ?? undefined);
  },
};

/** 6. Query updated private balance from CRE API */
const queryBalance: Step<DepositContext> = {
  name: 'query-balance',
  async execute(ctx) {
    const typedData = buildBalancesTypedData(ctx.walletAddress);
    const auth = await signWithCircleDcw(ctx.sdk, ctx.walletId, typedData);
    const balances = await queryBalances(
      ctx.walletAddress,
      typedData.message.timestamp as number,
      auth,
    );
    const rawBalance = balances.balances[ctx.usdgAddress] ?? '0';
    ctx.privateBalance = formatUsdcAmount(BigInt(rawBalance));
    return receipt('query-balance', undefined, ctx.privateBalance);
  },
};

// ─── Orchestrator ─────────────────────────────────────────

const DEPOSIT_STEPS: Step<DepositContext>[] = [
  kycGate as Step<DepositContext>,       // KYC/KYB FIRST
  cctpBridgeIn as Step<DepositContext>,  // Bridge from spoke (skips if same-chain)
  complianceCheck,    // Screen compliance — no funds move until approved
  transferUsdc,       // User USDC → treasury
  subscribeUsyc,      // USDC → USYC (yield)
  mintUsdg,           // Mint receipt token
  vaultDeposit,       // USDg → ACE Vault
  queryBalance,       // Return shielded balance
  attestReserves as Step<DepositContext>,  // Proof of reserves (non-throwing)
];

export async function executeDeposit(
  params: DepositParams,
): Promise<PrivateDepositResponse> {
  const amountWei = parseUsdcAmount(params.amount);

  const ctx: DepositContext = {
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
    sourceChainId: params.sourceChainId,
    triggerType: 'deposit',
    kycStatus: params.kycStatus,
    kybStatus: params.kybStatus,
    isTeamWallet: params.isTeamWallet,
  };

  const trace = await executeSteps(DEPOSIT_STEPS, ctx);

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
    depositId: ctx.transferTxId,
    privateBalance: ctx.privateBalance,
  };
}
