/**
 * FHE Ghost Mode Helpers
 *
 * Utility functions for interacting with GhostUSDC (FHERC20Wrapper) from CRE workflows.
 * Handles wrap/unwrap/claim operations and encrypted balance reads.
 *
 * These operations target Arbitrum Sepolia (FHE chain) while CRE runs on Ethereum Sepolia.
 *
 * @example
 * ```ts
 * const indicator = readGhostIndicator(runtime, ghostUsdcAddr, userAddr)
 * ```
 */

import {
  EVMClient,
  getNetwork,
  encodeCallMsg,
  bytesToHex,
  LATEST_BLOCK_NUMBER,
  type Runtime,
} from "@chainlink/cre-sdk"
import {
  encodeFunctionData,
  decodeFunctionResult,
  zeroAddress,
  type Abi,
} from "viem"
import { GHOST_USDC_ABI } from "../abi/ghost-usdc"

// ============================================================================
// Config constraint
// ============================================================================

/** Config constraint for FHE ghost mode operations */
export interface GhostModeConfig {
  /** Chain selector for Arbitrum Sepolia (FHE chain) */
  fheChainSelectorName: string
  /** GhostUSDC (eUSDCg) contract address on Arbitrum Sepolia */
  ghostUsdcAddress: string
}

// ============================================================================
// Client resolution
// ============================================================================

/** Resolve an EVMClient for the FHE chain (Arbitrum Sepolia) */
function resolveFheClient<C extends GhostModeConfig>(config: C): EVMClient {
  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName: config.fheChainSelectorName,
    isTestnet: true,
  })

  if (!network) {
    throw new Error(
      `resolveFheClient: Network not found for FHE chain: ${config.fheChainSelectorName}`
    )
  }

  return new EVMClient(network.chainSelector.selector)
}

/** Call a GhostUSDC view function */
function callGhostView<C extends GhostModeConfig>(
  runtime: Runtime<C>,
  functionName: string,
  args?: unknown[],
): `0x${string}` {
  const evmClient = resolveFheClient(runtime.config)
  const callData = encodeFunctionData({
    abi: GHOST_USDC_ABI as unknown as Abi,
    functionName,
    args: args ?? [],
  })

  const result = evmClient
    .callContract(runtime, {
      call: encodeCallMsg({
        from: zeroAddress,
        to: runtime.config.ghostUsdcAddress,
        data: callData,
      }),
      blockNumber: LATEST_BLOCK_NUMBER,
    })
    .result()

  return bytesToHex(result.data) as `0x${string}`
}

// ============================================================================
// Read operations
// ============================================================================

/**
 * Read the privacy indicator balance (0-9999) for a user.
 * This is the public balanceOf() — reveals nothing about actual balance.
 */
export function readGhostIndicator<C extends GhostModeConfig>(
  runtime: Runtime<C>,
  userAddress: string,
): bigint {
  const raw = callGhostView(runtime, "balanceOf", [userAddress])
  return decodeFunctionResult({
    abi: GHOST_USDC_ABI as unknown as Abi,
    functionName: "balanceOf",
    data: raw,
  }) as bigint
}

/**
 * Read the total encrypted supply of eUSDCg.
 */
export function readGhostTotalSupply<C extends GhostModeConfig>(
  runtime: Runtime<C>,
): bigint {
  const raw = callGhostView(runtime, "totalSupply")
  return decodeFunctionResult({
    abi: GHOST_USDC_ABI as unknown as Abi,
    functionName: "totalSupply",
    data: raw,
  }) as bigint
}

/**
 * Get all unwrap claim IDs for a user.
 */
export function readUserClaims<C extends GhostModeConfig>(
  runtime: Runtime<C>,
  userAddress: string,
): bigint[] {
  const raw = callGhostView(runtime, "getUserClaims", [userAddress])
  return decodeFunctionResult({
    abi: GHOST_USDC_ABI as unknown as Abi,
    functionName: "getUserClaims",
    data: raw,
  }) as bigint[]
}

/**
 * Get details of a specific unwrap claim.
 */
export function readClaim<C extends GhostModeConfig>(
  runtime: Runtime<C>,
  claimId: bigint,
): { claimant: string; amount: bigint; ctHash: bigint; claimed: boolean; createdAt: bigint } {
  const raw = callGhostView(runtime, "getClaim", [claimId])
  const decoded = decodeFunctionResult({
    abi: GHOST_USDC_ABI as unknown as Abi,
    functionName: "getClaim",
    data: raw,
  }) as [string, bigint, bigint, boolean, bigint]

  return {
    claimant: decoded[0],
    amount: decoded[1],
    ctHash: decoded[2],
    claimed: decoded[3],
    createdAt: decoded[4],
  }
}
