/**
 * CCTPv2 progress step definitions for the Bridge Kit stepper UI.
 *
 * Each step maps to a BridgeProgressStep key from `@bu/transfer-core/types`
 * and carries a human-readable label + description for display.
 */

import type { BridgeProgressStep } from '@bu/types/transfer-execution';

export interface CctpStepDef {
  key: BridgeProgressStep;
  label: string;
  description: string;
}

export const CCTP_STEPS: readonly CctpStepDef[] = [
  { key: 'approve', label: 'Approve', description: 'USDC approval' },
  { key: 'burn', label: 'Burn', description: 'Deposit & burn' },
  { key: 'fetchAttestation', label: 'Attestation', description: 'Circle attestation' },
  { key: 'mint', label: 'Mint', description: 'Receive on destination' },
] as const;
