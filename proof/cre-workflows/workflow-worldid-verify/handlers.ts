/**
 * WorldID Verify Workflow Handler
 *
 * Receives WorldID proof verification data from our backend (after World API v4
 * has already confirmed the proof). Publishes an on-chain attestation to
 * BUAttestation.sol on Arbitrum Sepolia — enabling World ID proof of personhood
 * on a chain where it is not natively supported.
 *
 * Trigger: HTTP (app backend calls CRE after successful World API v4 verification)
 */

import {
  decodeJson,
  type Runtime,
  type HTTPPayload,
} from "@chainlink/cre-sdk"
import { withHttp } from "../shared/triggers"
import { publishAttestation } from "../shared/services/attestation"
import type { Config } from "./types"

// ============================================================================
// Handler: WorldID Verify (HTTP Trigger)
// ============================================================================

const worldidVerify = withHttp<Config>(
  (runtime, payload) => {
    const input = decodeJson(payload.input) as {
      contractId: string
      walletAddress: string
      nullifierHash: string
      verificationLevel: string
      userId: string
    }

    runtime.log(
      `WorldID verify: contract=${input.contractId} wallet=${input.walletAddress} level=${input.verificationLevel}`
    )

    // Publish attestation on-chain
    const attestation = publishAttestation(runtime, {
      type: "worldid_verify",
      entityId: `worldid-${input.contractId}-${input.walletAddress}`,
      data: {
        contractId: input.contractId,
        walletAddress: input.walletAddress,
        nullifierHash: input.nullifierHash,
        verificationLevel: input.verificationLevel,
        userId: input.userId,
      },
      metadata: JSON.stringify({
        provider: "worldid",
        level: input.verificationLevel,
        contract: input.contractId,
      }),
    })

    runtime.log(
      `WorldID attestation published: tx=${attestation.txHash} id=${attestation.attestationId}`
    )

    return attestation
  }
)

// ============================================================================
// Init
// ============================================================================

export const initWorkflow = (config: Config) => [
  worldidVerify(config),
]
