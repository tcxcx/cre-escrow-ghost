/**
 * Fee recipient addresses per chain.
 */

import { resolve } from './core';

const DEFAULT_EVM_FALLBACK = '0x742d35Cc6634C0532925A3b844Bc9e7595f5bA16';

/** Default Solana fee recipient when FEE_RECIPIENT_SOL is not set */
const DEFAULT_SOL_FALLBACK = 'GkvGVGeoHR7mPoJMzo6aqESh9yndFGCYa33y3nNxBvc8';

export function getFeeRecipientEvm(): string {
  return resolve('FEE_RECIPIENT_EVM') ?? DEFAULT_EVM_FALLBACK;
}

export function getFeeRecipientSol(): string {
  return resolve('FEE_RECIPIENT_SOL') ?? DEFAULT_SOL_FALLBACK;
}

export function getFeeRecipientForChain(chain: string): string | undefined {
  const upper = chain.toUpperCase();
  // Solana must NOT fall back to an EVM address
  if (upper === 'SOL') return getFeeRecipientSol();
  return resolve(`FEE_RECIPIENT_${upper}`) ?? getFeeRecipientEvm();
}

export function getFeeRecipientEth(): string {
  // EVM chains always have a fallback — safe to assert
  return getFeeRecipientForChain('ETH')!;
}

export function getFeeRecipientArb(): string {
  return getFeeRecipientForChain('ARB')!;
}

export function getFeeRecipientAvax(): string {
  return getFeeRecipientForChain('AVAX')!;
}

export function getFeeRecipientPoly(): string {
  return getFeeRecipientForChain('POLY')!;
}

export function getFeeRecipientBase(): string {
  return getFeeRecipientForChain('BASE')!;
}

export function getBufiPayoutWalletId(): string | undefined {
  return resolve('BUFI_PAYOUT_WALLET_ID');
}

export function getBufiAutoPayoutEnabled(): boolean {
  return resolve('BUFI_AUTO_PAYOUT_ENABLED') === 'true';
}

export function getBufiAutoPayoutThreshold(): string | undefined {
  return resolve('BUFI_AUTO_PAYOUT_THRESHOLD');
}
