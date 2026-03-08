/**
 * EVM Read/Write Helpers
 *
 * Utility functions for interacting with on-chain contracts from CRE workflows.
 * Handles network resolution, client creation, and typed contract reads.
 *
 * @example
 * ```ts
 * const value = callView(runtime, contractAddr, abi, "totalSupply")
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

// ============================================================================
// Network / Client Resolution
// ============================================================================

/** Config constraint for EVM operations */
interface EvmConfig {
  chainSelectorName: string
}

/**
 * Resolve a CRE network and create an EVMClient.
 * Throws if the chain selector name is not found.
 */
export function resolveEvmClient<C extends EvmConfig>(
  config: C,
  isTestnet = true
): EVMClient {
  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName: config.chainSelectorName,
    isTestnet,
  })

  if (!network) {
    throw new Error(
      `resolveEvmClient: Network not found for chain selector: ${config.chainSelectorName}`
    )
  }

  return new EVMClient(network.chainSelector.selector)
}

/**
 * Resolve a CRE network object (includes chainSelector and metadata).
 * Throws if not found.
 */
export function resolveNetwork<C extends EvmConfig>(config: C, isTestnet = true) {
  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName: config.chainSelectorName,
    isTestnet,
  })

  if (!network) {
    throw new Error(
      `resolveNetwork: Network not found for chain selector: ${config.chainSelectorName}`
    )
  }

  return network
}

// ============================================================================
// Contract View Calls
// ============================================================================

/**
 * Call a contract view/pure function and decode the result as bigint.
 *
 * Uses LATEST_BLOCK_NUMBER — on testnets, "finalized" block may lag behind
 * recently deployed contracts (free RPCs return 0x for finalized).
 *
 * @example
 * ```ts
 * const supply = callView(runtime, usdcgAddr, USDCG_ABI as unknown as Abi, "totalSupply")
 * const balance = callView(runtime, usdcAddr, ERC20_ABI as unknown as Abi, "balanceOf", [owner])
 * ```
 */
export function callView<C extends EvmConfig>(
  runtime: Runtime<C>,
  contractAddress: string,
  abi: Abi,
  functionName: string,
  args?: unknown[],
): bigint {
  const evmClient = resolveEvmClient(runtime.config)

  const callData = encodeFunctionData({
    abi,
    functionName,
    args: args ?? [],
  })

  const contractCall = evmClient
    .callContract(runtime, {
      call: encodeCallMsg({
        from: zeroAddress,
        to: contractAddress,
        data: callData,
      }),
      blockNumber: LATEST_BLOCK_NUMBER,
    })
    .result()

  return decodeFunctionResult({
    abi,
    functionName,
    data: bytesToHex(contractCall.data),
  }) as bigint
}

/**
 * Call a contract view function and return raw hex bytes.
 * Use this when the return type is a tuple or non-bigint.
 * Caller is responsible for decoding with decodeFunctionResult().
 *
 * @example
 * ```ts
 * const raw = callViewRaw(runtime, escrowAddr, abi, "milestones", [BigInt(0)])
 * const decoded = decodeFunctionResult({ abi, functionName: "milestones", data: raw })
 * ```
 */
export function callViewRaw<C extends EvmConfig>(
  runtime: Runtime<C>,
  contractAddress: string,
  abi: Abi,
  functionName: string,
  args?: unknown[],
): `0x${string}` {
  const evmClient = resolveEvmClient(runtime.config)

  const callData = encodeFunctionData({
    abi,
    functionName,
    args: args ?? [],
  })

  const contractCall = evmClient
    .callContract(runtime, {
      call: encodeCallMsg({
        from: zeroAddress,
        to: contractAddress,
        data: callData,
      }),
      blockNumber: LATEST_BLOCK_NUMBER,
    })
    .result()

  return bytesToHex(contractCall.data) as `0x${string}`
}
