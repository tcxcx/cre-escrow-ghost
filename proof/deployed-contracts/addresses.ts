/**
 * Centralized Contract Address Registry — Sepolia Testnet (Hardened v2)
 *
 * Single source of truth for ALL deployed contract addresses.
 * Every workflow config.json and handler MUST reference these constants.
 *
 * Deployed: 2026-03-05 via DeployAll.s.sol
 * Network: Ethereum Sepolia (chainId: 11155111)
 *
 * To update after a redeploy:
 * 1. Update addresses here
 * 2. Run `bun run sync-configs` (or manually update config.json files)
 * 3. Update CLAUDE.md with the new addresses
 */

import { getShivaUrl } from '@bu/env/app'
import { getMotoraUrl } from '@bu/env/motora'
import { getSupabaseUrl } from '@bu/env/supabase'

// ============================================================================
// Bu Platform Contracts (Hardened v2)
// ============================================================================

/** BUAttestation — CRE report receiver with rate limits, TTL, severity, Pausable */
export const BU_ATTESTATION = '0xC3C7A1bd7556ba93729f859F0f1D1Cb60aeEc72C' as const

/** USDCg — PolicyEngine-gated USDC wrapper (6 decimals, auto-allocate, Ownable2Step, Pausable) */
export const USDCG = '0x2F28A8378798c5B42FC28f209E903508DD8F878b' as const

/** PolicyEngine — ERC1967Proxy → Chainlink compliance impl (defaultAllow=true) */
export const POLICY_ENGINE = '0x76b727ed158fe58CaFe4FF5F98D0D98E7244F926' as const

/** TreasuryManager — ReceiverTemplate + Pausable, CRE ALLOCATE/REDEEM, yield tracking */
export const TREASURY_MANAGER = '0x33A4a73FD81bB6314AB7dc77301894728E6825A4' as const

/** ACE Vault — Chainlink-managed, USDCg registered */
export const ACE_VAULT = '0xE588a6c73933BFD66Af9b4A07d48bcE59c0D2d13' as const

/** GhostUSDC (eUSDCg) — FHERC20Wrapper wrapping USDC via CoFHE (ETH-Sepolia) */
export const GHOST_USDC = '0x6e6Ad7EDECbb4C9B7aA9453af2ba285f6d6cCcB5' as const

/** GhostUSDC (eUSDCg) — FHERC20Wrapper wrapping USDC via CoFHE (ARB-Sepolia) */
export const GHOST_USDC_ARB = '0xA3BfA84a4b7a8de8340Df3B0CCFED33240C6F765' as const

// ============================================================================
// External Dependencies (Sepolia)
// ============================================================================

/** USDC — Circle testnet token (6 decimals) */
export const USDC = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' as const

/** USYC — Hashnote yield-bearing USDC token */
export const USYC = '0x38D3A3f8717F4DB1CcB4Ad7D8C755919440848A3' as const

/** USYC Teller — Hashnote subscription/redemption manager */
export const USYC_TELLER = '0x96424C885951ceb4B79fecb934eD857999e6f82B' as const

/** USYC Oracle — Price feed proxy (USYC → USDC exchange rate) */
export const USYC_ORACLE = '0x35b96d80C72f873bACc44A1fACfb1f5fac064f1a' as const

// ============================================================================
// Deployer / Executor
// ============================================================================

/** Deployer wallet — testnet only, private key in .deployer-wallet.json (gitignored) */
export const DEPLOYER = '0x09Ce8E2B3Fede2727dA4392Ea8Fe618305ba0474' as const

/** CRE Forwarder — placeholder until CRE Early Access grants real forwarder */
export const FORWARDER = DEPLOYER

// ============================================================================
// Chain Configuration
// ============================================================================

export const CHAIN_SELECTOR_NAME = 'ethereum-testnet-sepolia' as const
export const CHAIN_ID = 11155111 as const
export const DEFAULT_GAS_LIMIT = '500000' as const

// ============================================================================
// Service URLs — resolved from @bu/env (Node.js context only)
// In CRE WASM context, URLs come from runtime.getSecret() via secrets.yaml
// ============================================================================

export const SHIVA_API_URL = getShivaUrl() ?? 'http://localhost:8787'
export const MOTORA_API_URL = getMotoraUrl() ?? 'http://localhost:3002'
export const SUPABASE_URL = getSupabaseUrl() ?? ''
export const ACE_API_URL = 'https://convergence2026-token-api.cldev.cloud'

// ============================================================================
// Escrow Contracts — Update after deploy
// ============================================================================

/** EscrowFactory — Eth Sepolia (wired) — update after deploy */
export const ESCROW_FACTORY = '0x0f8b653aadd4f04008fdaca3429f6ea24951b129' as const

/** EscrowFactory — Arbitrum Sepolia (demo only, not wired) — update after deploy */
export const ESCROW_FACTORY_ARB = '0x0000000000000000000000000000000000000000' as const
