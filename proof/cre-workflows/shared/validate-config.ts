/**
 * Config Validation — Fail-fast guard for CRE workflow configs.
 *
 * Call at handler startup to catch zero addresses, missing fields,
 * and stale values BEFORE hitting the blockchain.
 *
 * Note: URLs are no longer in config.json — they come from CRE secrets
 * (runtime.getSecret). Only contract addresses and chain config are validated here.
 */

import { BU_ATTESTATION, TREASURY_MANAGER, POLICY_ENGINE, ACE_VAULT, USDCG } from './addresses'

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

/** Known hardened v2 addresses — used to warn about stale configs */
const KNOWN_ADDRESSES: Record<string, string> = {
  attestationContract: BU_ATTESTATION,
  treasuryManagerAddress: TREASURY_MANAGER,
  policyEngineAddress: POLICY_ENGINE,
  vaultAddress: ACE_VAULT,
  usdcgAddress: USDCG,
}

interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Validate a workflow config object.
 * Returns errors (zero addresses) and warnings (stale addresses).
 */
export function validateConfig(config: Record<string, unknown>): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Check for zero addresses in any field ending with "Address" or "Contract"
  for (const [key, value] of Object.entries(config)) {
    if (typeof value !== 'string') continue

    const isAddressField =
      key.endsWith('Address') ||
      key.endsWith('Contract') ||
      key === 'executorAgent' ||
      key === 'vaultAddress'

    if (!isAddressField) continue

    // Error: zero address (will revert on-chain)
    if (value === ZERO_ADDRESS) {
      // Skip known placeholders
      if (key === 'escrowFactoryAddress' || key === 'ghostUsdcAddress') continue
      errors.push(`${key} is zero address — transactions will revert`)
    }

    // Warning: address doesn't match known hardened v2
    if (key in KNOWN_ADDRESSES && value !== KNOWN_ADDRESSES[key]) {
      warnings.push(
        `${key} may be stale: config has ${value.slice(0, 10)}..., expected ${KNOWN_ADDRESSES[key]!.slice(0, 10)}...`
      )
    }
  }

  // Guard: URLs should NOT be in config.json — they belong in CRE secrets
  for (const [key, value] of Object.entries(config)) {
    if (typeof value !== 'string') continue
    if (key.toLowerCase().includes('url') || key.toLowerCase().includes('api')) {
      if (value.startsWith('http')) {
        warnings.push(`${key} contains a URL in config.json — move to CRE secrets (secrets.yaml + .env)`)
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Assert config is valid. Throws on errors, logs warnings.
 * Call this at the top of every workflow handler.
 */
export function assertConfigValid(
  config: Record<string, unknown>,
  workflowName: string,
  log?: (msg: string) => void
): void {
  const result = validateConfig(config)

  for (const warning of result.warnings) {
    const msg = `[${workflowName}] CONFIG WARNING: ${warning}`
    if (log) log(msg)
  }

  if (!result.valid) {
    const msg = `[${workflowName}] CONFIG ERRORS:\n${result.errors.map(e => `  - ${e}`).join('\n')}`
    throw new Error(msg)
  }
}
