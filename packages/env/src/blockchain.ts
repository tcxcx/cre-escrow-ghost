/**
 * Blockchain environment detection and identifiers.
 *
 * Absorbs: packages/utils/src/envs.ts (isMainnetEnvironment, getBlockchainIdentifiers, wallet chains)
 */

import { resolve, isProd } from './core';
import { getAppUrl } from './app';

export function isMainnetEnvironment(): boolean {
  if (isProd()) return true;

  const env = resolve('ENVIRONMENT');
  if (env === 'production' || env === 'mainnet') return true;

  const appUrl = getAppUrl();
  if (appUrl.includes('desk.bu.finance')) return true;

  if (resolve('VERCEL_ENV') === 'production') return true;

  return false;
}

export function getBlockchainIdentifiers() {
  const isMainnet = isMainnetEnvironment();
  return {
    avax: isMainnet ? 'AVAX' : 'AVAX-FUJI',
    evm: isMainnet ? 'EVM' : 'EVM-TESTNET',
    base: isMainnet ? 'BASE' : 'BASE-SEPOLIA',
    sol: isMainnet ? 'SOL' : 'SOL-DEVNET',
    robin: isMainnet ? 'ROBIN' : 'ROBIN-TESTNET',
    isMainnet,
  };
}

export function getTeamWalletBlockchains(): string[] {
  const isMainnet = isMainnetEnvironment();
  const { avax, evm, base, sol, robin } = getBlockchainIdentifiers();
  if (isMainnet) {
    return [avax, evm, sol];
  }
  return [avax, base, evm, 'ETH-SEPOLIA', sol, robin];
}

export function getIndividualWalletBlockchains(): string[] {
  const isMainnet = isMainnetEnvironment();
  const { avax, evm, sol } = getBlockchainIdentifiers();

  if (isMainnet) {
    return [avax, evm, sol];
  }
  return [
    'EVM-TESTNET',
    'ETH-SEPOLIA',
    'AVAX-FUJI',
    'MATIC-AMOY',
    'ARB-SEPOLIA',
    'UNI-SEPOLIA',
    'BASE-SEPOLIA',
    'OP-SEPOLIA',
    'SOL-DEVNET',
    'ARC-TESTNET',
    'CODEX-TESTNET',
    'HYPEREVM-TESTNET',
    'INK-TESTNET',
    'LINEA-SEPOLIA',
    'MONAD-TESTNET',
    'PLUME-TESTNET',
    'SEI-TESTNET',
    'SONIC-TESTNET',
    'XDC-APOTHEM',
    'ROBIN-TESTNET',
  ];
}

export function getPrimaryBlockchain(): string {
  return getBlockchainIdentifiers().avax;
}

export function getSigningBlockchain(): string {
  return getBlockchainIdentifiers().evm;
}

export function getSolanaBlockchain(): string {
  return getBlockchainIdentifiers().sol;
}

export function getDefaultBalanceBlockchain(): string {
  return getPrimaryBlockchain();
}

export function getNetworkMode(): string | undefined {
  return resolve('NETWORK_MODE');
}
