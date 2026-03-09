/**
 * Escrow Deploy Handler
 *
 * Deploys a new EscrowWithAgentV3 contract on-chain via the EscrowFactory.
 *
 * Flow:
 * 1. Parse HTTP payload as DeployPayload
 * 2. Encode createEscrow call data via CRE consensus report
 * 3. Write on-chain via EVMClient
 * 4. Post callback to Supabase cre_callbacks with deployed address
 * 5. Publish escrow attestation on BUAttestation
 */

import type { Runtime, HTTPPayload } from "@chainlink/cre-sdk"
import {
  EVMClient,
  getNetwork,
  hexToBase64,
  bytesToHex,
  decodeJson,
} from "@chainlink/cre-sdk"
import { encodeAbiParameters, parseAbiParameters, keccak256, toHex } from "viem"
import { withHttp } from "../shared/triggers"
import { supabaseClient } from "../shared/clients/presets"
import { publishAttestation } from "../shared/services/attestation"
import type { Config, DeployPayload } from "./types"

// ============================================================================
// Handler: Deploy Escrow Contract (HTTP Trigger)
// ============================================================================

const deployEscrow = withHttp<Config>(
  (runtime: Runtime<Config>, payload: HTTPPayload) => {
    // Step 1: Parse payload
    const body = decodeJson<DeployPayload>(payload.body)

    runtime.log(
      `Escrow deploy: agreement=${body.agreementId} payer=${body.payerAddress} payee=${body.payeeAddress} total=${body.totalAmount}`
    )

    // Step 2: Encode createEscrow parameters for the factory
    // Factory signature: createEscrow(address payer, address payee, address token, uint256 totalAmount, address executorAgent, uint256[] amounts, string[] descriptions)
    // Scale amounts to USDC base units (6 decimals)
    const USDC_DECIMALS = 1_000_000
    const milestoneAmounts = body.milestones.map((m) => BigInt(Math.round(m.amount * USDC_DECIMALS)))
    const milestoneDescriptions = body.milestones.map((m) => m.description)

    const callData = encodeAbiParameters(
      parseAbiParameters(
        "bytes32 agreementHash, address payer, address payee, address token, uint256 totalAmount, uint256[] milestoneAmounts, string[] milestoneDescriptions"
      ),
      [
        (body.agreementHash || keccak256(toHex(body.agreementId))) as `0x${string}`,
        body.payerAddress as `0x${string}`,
        body.payeeAddress as `0x${string}`,
        body.tokenAddress as `0x${string}`,
        BigInt(Math.round(body.totalAmount * USDC_DECIMALS)),
        milestoneAmounts,
        milestoneDescriptions,
      ]
    )

    // Wrap with action type for CRE consensus report
    const reportData = encodeAbiParameters(
      parseAbiParameters("uint8 actionType, bytes data"),
      [6, callData] // actionType 6 = CREATE_ESCROW
    )

    runtime.log(
      `Encoded createEscrow: ${body.milestones.length} milestones, factory=${runtime.config.escrowFactoryAddress}`
    )

    // Step 3: Sign via CRE consensus and write on-chain
    const reportResponse = runtime
      .report({
        encodedPayload: hexToBase64(reportData),
        encoderName: "evm",
        signingAlgo: "ecdsa",
        hashingAlgo: "keccak256",
      })
      .result()

    const network = getNetwork({
      chainFamily: "evm",
      chainSelectorName: runtime.config.chainSelectorName,
      isTestnet: true,
    })

    if (!network) {
      throw new Error(
        `deployEscrow: Network not found: ${runtime.config.chainSelectorName}`
      )
    }

    const evmClient = new EVMClient(network.chainSelector.selector)
    const writeResult = evmClient
      .writeReport(runtime, {
        receiver: runtime.config.escrowFactoryAddress,
        report: reportResponse,
        gasConfig: { gasLimit: runtime.config.gasLimit },
      })
      .result()

    const txHash = bytesToHex(writeResult.txHash ?? new Uint8Array(32))
    runtime.log(`Factory tx: ${txHash}`)

    // Step 4: Post callback to Supabase cre_callbacks
    const supa = supabaseClient<Config>()
    supa.post(
      runtime,
      "/cre_callbacks",
      {
        workflow: "escrow-deploy",
        status: "pending",
        agreement_id: body.agreementId,
        tx_hash: txHash,
        factory_address: runtime.config.escrowFactoryAddress,
        payer: body.payerAddress,
        payee: body.payeeAddress,
        token: body.tokenAddress,
        total_amount: body.totalAmount,
        milestone_count: body.milestones.length,
        callback_url: body.callbackUrl ?? null,
      },
      (raw) => JSON.parse(raw) as { id: string }
    )

    runtime.log("Callback posted to cre_callbacks")

    // Step 5: Publish attestation on BUAttestation
    const agreementHash = body.agreementHash || keccak256(toHex(body.agreementId)) as string

    const attestation = publishAttestation(runtime, {
      type: "escrow_verify",
      entityId: `deploy-${body.agreementId}`,
      data: {
        agreementId: body.agreementId,
        agreementHash,
        factoryAddress: runtime.config.escrowFactoryAddress,
        payerAddress: body.payerAddress,
        payeeAddress: body.payeeAddress,
        tokenAddress: body.tokenAddress,
        totalAmount: body.totalAmount.toString(),
        milestoneCount: body.milestones.length.toString(),
        txHash,
      },
      metadata: JSON.stringify({
        agreementId: body.agreementId,
        txHash,
        milestoneCount: body.milestones.length,
      }),
    })

    runtime.log(`Attestation published: tx=${attestation.txHash}`)

    return `Escrow deploy: agreement=${body.agreementId} factory_tx=${txHash} attestation_tx=${attestation.txHash}`
  }
)

// ============================================================================
// Workflow Init
// ============================================================================

export const initWorkflow = (config: Config) => [
  deployEscrow(config),
]
