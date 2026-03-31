/**
 * Base types and config schemas shared across all CRE workflows.
 *
 * Types are imported from @bu/cre (the single source of truth).
 * Runtime constants needed by workflows are kept here.
 */

// Re-export all types from the canonical package
export type {
  AttestationType,
  AttestationRecord,
  AttestationResult,
  AttestationData,
  AttestationConfig,
  TransferVerification,
  BalanceSnapshot,
  FeeReconciliation,
  RampVerification,
} from "@bu/cre/types"

import type { AttestationType } from "@bu/cre/types"

// ============================================================================
// Runtime Constants (needed by workflow handlers)
// ============================================================================

/** Maps attestation type string to the uint8 used in BUAttestation.sol */
export const ATTESTATION_OP_TYPES: Record<AttestationType, number> = {
  transfer_verify: 0,
  balance_attest: 1,
  invoice_settle: 2,
  fee_reconcile: 3,
  ramp_verify: 4,
  report_verify: 5,
  payroll_attest: 6,
  kyc_verified: 7,
  kyb_verified: 8,
  proof_of_reserves: 9,
  usdcg_supply_snapshot: 10,
  escrow_verify: 11,
  escrow_dispute: 12,
  escrow_yield_deposit: 13,
  escrow_yield_redeem: 14,
  escrow_finalize: 15,
  ghost_deposit: 16,
  ghost_transfer: 17,
  ghost_withdraw: 18,
  allowlist_sync: 19,
} as const

/** Config constraint for escrow workflow clients */
export interface EscrowClientConfig {
  chainSelectorName: string
  attestationContract: string
  gasLimit: string
  escrowFactoryAddress: string
  executorAgent: string
  owner: string
}
