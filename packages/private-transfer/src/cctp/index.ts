/**
 * CCTP Bridge Steps -- Hub-and-Spoke cross-chain USDC transfers.
 *
 * Hub: ACE Vault chain (Sepolia)
 * Spokes: Ethereum, Arbitrum, Base, Polygon, etc.
 *
 * Uses CCTP: depositForBurn() -> attestation -> receiveMessage()
 * All on-chain calls via createContractExecutionTransaction (Circle DCW).
 */

import { v4 as uuidv4 } from 'uuid';
import { keccak256, toHex } from 'viem';
import { createLogger } from '@bu/logger';
import { getAceChainId } from '@bu/env/ace';
import { waitForCctpAttestation } from './attestation';
import { waitForTransaction } from '../pipeline/tx';
import { receipt, type Step } from '../pipeline/execute';
import type { CircleSdk } from '../signer/index';

const logger = createLogger({ prefix: 'private-transfer:cctp' });

/** CCTP domain IDs per chain */
const CCTP_DOMAINS: Record<number, number> = {
  1: 0, 43114: 1, 10: 2, 42161: 3, 8453: 6, 137: 7,
  11155111: 0, 43113: 1, 421614: 3, 84532: 6,
};

/** TokenMessenger addresses per chain */
const TOKEN_MESSENGER: Record<number, string> = {
  11155111: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5',
  421614: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5',
  84532: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5',
  43113: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5',
};

/** MessageTransmitter addresses per chain */
const MESSAGE_TRANSMITTER: Record<number, string> = {
  11155111: '0x7865fAfC2db2093669d92c0F33AeEF291086BEFD',
  421614: '0x7865fAfC2db2093669d92c0F33AeEF291086BEFD',
  84532: '0x7865fAfC2db2093669d92c0F33AeEF291086BEFD',
  43113: '0x7865fAfC2db2093669d92c0F33AeEF291086BEFD',
};

/** USDC addresses per chain */
const USDC_ADDRESSES: Record<number, string> = {
  11155111: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
  421614: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
  84532: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  43113: '0x5425890298aed601595a70AB815c96711a31Bc65',
  1: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  42161: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
};

export interface CctpContext {
  sdk: CircleSdk;
  walletId: string;
  walletAddress: string;
  treasuryWalletId: string;
  treasuryAddress: string;
  amountStr: string;
  sourceChainId?: number;
  destinationChainId?: number;
  sourceChain?: string;
  destinationChain?: string;
}

function addressToBytes32(address: string): string {
  return '0x' + address.replace('0x', '').padStart(64, '0');
}

export const cctpBridgeIn: Step<CctpContext> = {
  name: 'cctp-bridge-in',
  async execute(ctx) {
    const aceChainId = getAceChainId();
    if (!ctx.sourceChainId || ctx.sourceChainId === aceChainId) {
      return receipt('cctp-bridge-in', undefined, 'same-chain -- skipped');
    }

    const sourceDomain = CCTP_DOMAINS[ctx.sourceChainId];
    const destDomain = CCTP_DOMAINS[aceChainId];
    const tokenMessenger = TOKEN_MESSENGER[ctx.sourceChainId];
    const messageTransmitter = MESSAGE_TRANSMITTER[aceChainId];
    const sourceUsdc = USDC_ADDRESSES[ctx.sourceChainId];

    if (sourceDomain === undefined || destDomain === undefined) {
      throw new Error(`CCTP not supported for chain ${ctx.sourceChainId}`);
    }
    if (!tokenMessenger || !messageTransmitter || !sourceUsdc) {
      throw new Error(`Missing CCTP contracts for chain ${ctx.sourceChainId}`);
    }

    logger.info('CCTP bridge in: burning on source chain', {
      sourceChainId: ctx.sourceChainId, destChainId: aceChainId, amount: ctx.amountStr,
    });

    // 1. Approve
    await ctx.sdk.createContractExecutionTransaction({
      idempotencyKey: uuidv4(),
      walletId: ctx.walletId,
      contractAddress: sourceUsdc,
      abiFunctionSignature: 'approve(address,uint256)',
      abiParameters: [tokenMessenger, ctx.amountStr],
      fee: { type: 'level', config: { feeLevel: 'HIGH' } },
    });

    // 2. Burn on source
    const burnRes = await ctx.sdk.createContractExecutionTransaction({
      idempotencyKey: uuidv4(),
      walletId: ctx.walletId,
      contractAddress: tokenMessenger,
      abiFunctionSignature: 'depositForBurn(uint256,uint32,bytes32,address)',
      abiParameters: [ctx.amountStr, destDomain.toString(), addressToBytes32(ctx.treasuryAddress), sourceUsdc],
      fee: { type: 'level', config: { feeLevel: 'HIGH' } },
    });
    const burnTxId = (burnRes.data as Record<string, unknown> | undefined)?.id as string | undefined;
    if (burnTxId) await waitForTransaction(burnTxId, ctx.sdk);

    // 3. Wait for CCTP attestation
    const messageHash = keccak256(toHex(`${burnTxId ?? 'unknown'}-${Date.now()}`));
    const attestation = await waitForCctpAttestation(messageHash);

    // 4. Receive on hub
    const receiveRes = await ctx.sdk.createContractExecutionTransaction({
      idempotencyKey: uuidv4(),
      walletId: ctx.treasuryWalletId,
      contractAddress: messageTransmitter,
      abiFunctionSignature: 'receiveMessage(bytes,bytes)',
      abiParameters: [attestation.message, attestation.attestation],
      fee: { type: 'level', config: { feeLevel: 'HIGH' } },
    });
    const receiveTxId = (receiveRes.data as Record<string, unknown> | undefined)?.id as string | undefined;
    if (receiveTxId) await waitForTransaction(receiveTxId, ctx.sdk);

    return receipt('cctp-bridge-in', receiveTxId ?? undefined, `bridged from chain ${ctx.sourceChainId}`);
  },
};

export const cctpBridgeOut: Step<CctpContext> = {
  name: 'cctp-bridge-out',
  async execute(ctx) {
    const aceChainId = getAceChainId();
    if (!ctx.destinationChainId || ctx.destinationChainId === aceChainId) {
      return receipt('cctp-bridge-out', undefined, 'same-chain -- skipped');
    }

    const sourceDomain = CCTP_DOMAINS[aceChainId];
    const destDomain = CCTP_DOMAINS[ctx.destinationChainId];
    const tokenMessenger = TOKEN_MESSENGER[aceChainId];
    const messageTransmitter = MESSAGE_TRANSMITTER[ctx.destinationChainId];
    const hubUsdc = USDC_ADDRESSES[aceChainId];

    if (sourceDomain === undefined || destDomain === undefined) {
      throw new Error(`CCTP not supported for chain ${ctx.destinationChainId}`);
    }
    if (!tokenMessenger || !messageTransmitter || !hubUsdc) {
      throw new Error(`Missing CCTP contracts for chain ${ctx.destinationChainId}`);
    }

    logger.info('CCTP bridge out: burning on hub chain', {
      sourceChainId: aceChainId, destChainId: ctx.destinationChainId, amount: ctx.amountStr,
    });

    // 1. Approve
    await ctx.sdk.createContractExecutionTransaction({
      idempotencyKey: uuidv4(),
      walletId: ctx.treasuryWalletId,
      contractAddress: hubUsdc,
      abiFunctionSignature: 'approve(address,uint256)',
      abiParameters: [tokenMessenger, ctx.amountStr],
      fee: { type: 'level', config: { feeLevel: 'HIGH' } },
    });

    // 2. Burn on hub
    const burnRes = await ctx.sdk.createContractExecutionTransaction({
      idempotencyKey: uuidv4(),
      walletId: ctx.treasuryWalletId,
      contractAddress: tokenMessenger,
      abiFunctionSignature: 'depositForBurn(uint256,uint32,bytes32,address)',
      abiParameters: [ctx.amountStr, destDomain.toString(), addressToBytes32(ctx.walletAddress), hubUsdc],
      fee: { type: 'level', config: { feeLevel: 'HIGH' } },
    });
    const burnTxId = (burnRes.data as Record<string, unknown> | undefined)?.id as string | undefined;
    if (burnTxId) await waitForTransaction(burnTxId, ctx.sdk);

    // 3. Wait for CCTP attestation
    const messageHash = keccak256(toHex(`${burnTxId ?? 'unknown'}-${Date.now()}`));
    const attestation = await waitForCctpAttestation(messageHash);

    // 4. Receive on destination (user wallet)
    const receiveRes = await ctx.sdk.createContractExecutionTransaction({
      idempotencyKey: uuidv4(),
      walletId: ctx.walletId,
      contractAddress: messageTransmitter,
      abiFunctionSignature: 'receiveMessage(bytes,bytes)',
      abiParameters: [attestation.message, attestation.attestation],
      fee: { type: 'level', config: { feeLevel: 'HIGH' } },
    });
    const receiveTxId = (receiveRes.data as Record<string, unknown> | undefined)?.id as string | undefined;
    if (receiveTxId) await waitForTransaction(receiveTxId, ctx.sdk);

    return receipt('cctp-bridge-out', receiveTxId ?? undefined, `bridged to chain ${ctx.destinationChainId}`);
  },
};
