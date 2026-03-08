/**
 * ACE (Automated Compliance Engine) + Treasury environment.
 *
 * Covers: Chainlink CRE, ghostUSD, PolicyEngine, USYC, Gateway, Treasury.
 */

import { required, resolveNumber } from './core';

// ---------------------------------------------------------------------------
// Chainlink CRE / ACE Vault
// ---------------------------------------------------------------------------

export function getAceApiUrl(): string {
  return required('ACE_API_URL');
}

export function getAceVaultAddress(): string {
  return required('ACE_VAULT_ADDRESS');
}

export function getUsdgTokenAddress(): string {
  return required('USDG_TOKEN_ADDRESS');
}

export function getPolicyEngineAddress(): string {
  return required('POLICY_ENGINE_ADDRESS');
}

export function getAceChainId(): number {
  return resolveNumber('ACE_CHAIN_ID', 11155111); // Sepolia default
}

export function getUsdcAddress(): string {
  return required('USDC_ADDRESS');
}

export function getGhostUsdcAddress(): string {
  return required('GHOST_USDC_ADDRESS');
}

// ---------------------------------------------------------------------------
// USYC (Hashnote)
// ---------------------------------------------------------------------------

export function getUsycTokenAddress(): string {
  return required('USYC_TOKEN_ADDRESS');
}

export function getUsycTellerAddress(): string {
  return required('USYC_TELLER_ADDRESS');
}

export function getUsycOracleAddress(): string {
  return required('USYC_ORACLE_ADDRESS');
}

// ---------------------------------------------------------------------------
// Circle Gateway
// ---------------------------------------------------------------------------

export function getGatewayApiUrl(): string {
  return required('GATEWAY_API_URL');
}

export function getGatewayWalletAddress(): string {
  return required('GATEWAY_WALLET_ADDRESS');
}

export function getGatewayMinterAddress(): string {
  return required('GATEWAY_MINTER_ADDRESS');
}

// ---------------------------------------------------------------------------
// Treasury
// ---------------------------------------------------------------------------

export function getTreasuryWalletId(): string {
  return required('TREASURY_WALLET_ID');
}

export function getTreasuryWalletAddress(): string {
  return required('TREASURY_WALLET_ADDRESS');
}

export function getUsdcBufferRatio(): number {
  return resolveNumber('USDC_BUFFER_RATIO', 0.15);
}
