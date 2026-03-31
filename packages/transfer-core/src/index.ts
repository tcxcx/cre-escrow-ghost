export * from '@bu/types/transfer-execution';
export * from './safety';
// Heavy services are NOT re-exported from the barrel to reduce bundle size
// and avoid loading heavy SDKs (ethers, Circle SDK, Peanut SDK, viem) at import time.
// Use subpath imports instead:
//   import { TransferService } from '@bu/transfer-core/transfer-service';
//   import { ChainService } from '@bu/transfer-core/chain-service';
//   import { ContractService } from '@bu/transfer-core/contract-service';
//   import { CircleSDKExecutor } from '@bu/transfer-core/circle-sdk';
//   import { PeanutProtocolService } from '@bu/transfer-core/peanut-protocol';
//   import { BatchPaymentService } from '@bu/transfer-core/batch-payment-service';
//   import { CirclePayoutService } from '@bu/transfer-core/circle-payout-service';
export * from './services/WalletService';
export * from './constants/ProtocolConfig';

export * from './constants/chain-constants';
export { getTransferTiming, type ChainTimingInfo } from './constants/chain-timing';
export { GAS_LIMITS, DEFAULT_GAS_LIMIT_RANGE, getGasLimitRange, type GasLimitRange } from './constants/gas-limits';
export { MESH_SUPPORTED_NETWORKS, type MeshSupportedNetwork } from './constants/mesh-networks';
export { CCTP_STEPS, type CctpStepDef } from './constants/cctp-steps';
export { CHAIN_SORT_PRIORITY, DEFAULT_CHAIN_PRIORITY, compareChainPriority } from './constants/chain-priority';

export { getChainById, getSupportedProtocols, canTransferBetweenChains, getEvmRpcConfig, type EvmRpcConfig } from './constants/Chains';

// On-chain receipt verification for cross-chain transfers
export {
  verifyCrossChainReceipts,
  type CrossChainVerificationParams,
  type CrossChainVerificationResult,
  type TxReceiptStatus,
} from './utils/verify-transaction';

// Peanut fallback gas utilities (wallet service, pre-flight checks)
export {
  getNativeBalanceForChain,
  getPeanutFallbackNativeBalance,
  assertPeanutFallbackHasGas,
  MIN_PEANUT_GAS_ETH,
  PEANUT_NO_GAS_MESSAGE,
} from './utils/peanut-gas';

// Export chain mapping utilities
export {
  CHAIN_ID_TO_CIRCLE_NAME,
  CIRCLE_NAME_TO_CHAIN_ID,
  getChainIdFromCircleName,
  getCircleNameFromChainId,
  type CircleChainName,
} from './constants/ChainMappings';

// Export swap pool constants and utilities
export {
  CHAINS_WITH_SWAP_POOLS,
  CHAINS_WITH_TOKENS_BUT_NO_POOLS,
  isSwapAvailableOnChain,
  hasTokensButNoPool,
  getSupportedSwapChains,
  getSwapAvailabilityInfo,
  MAINNET_CHAINS_WITH_POOLS,
  MAINNET_CHAINS_WITHOUT_POOLS,
  TESTNET_CHAINS_WITH_POOLS,
  TESTNET_CHAINS_WITHOUT_POOLS,
} from './constants/swap-pools';

// Export blockchain utilities
export { getCircleBlockchainName, isChainIdSupportedByCircle } from './utils/blockchain';

// Export chain display name utilities (centralized for DRY)
export {
  CHAIN_DISPLAY_NAMES,
  getChainDisplayName,
  getChainDisplayNameFromId,
  getChainDisplayNameFromCode,
  getChainDisplayNameFromBridge,
} from './utils/chain-display-names';

// BatchPaymentService available via subpath: '@bu/transfer-core/batch-payment-service'
// BatchTransferParams, BatchTransferResult, BatchTransferRecipient, TransferGroup
// already exported via `export * from '@bu/types/transfer-execution'` above

// CircleBatchExecutor available via subpath: '@bu/transfer-core/circle-sdk'
// CirclePayoutService available via subpath: '@bu/transfer-core/circle-payout-service'
export type { CirclePayoutParams, CirclePayoutResult } from './services/CirclePayoutService';

// PeanutProtocolService is available via subpath: '@bu/transfer-core/peanut-protocol'
// WalletInfo already exported via `export * from '@bu/types/transfer-execution'` above

// Token address utilities
export {
  getTokenAddressForBlockchain,
  getUSDCAddressForBlockchain,
  getEURCAddressForBlockchain,
  getChainIdForBlockchain,
  isTokenSupportedOnBlockchain,
  getSupportedBlockchainsForToken,
  getAllSupportedBlockchains,
} from './utils/token-addresses';

// BUFI Network Payout Configuration
export {
  PAYOUT_SUPPORTED_CHAINS,
  PAYOUT_CONFIG,
  LEGACY_CHAIN_NAME_TO_ID,
  CHAIN_ID_TO_LEGACY_NAME,
  getPayoutSupportedChains,
  getDefaultPayoutChain,
  isPayoutSupportedChain,
  getPayoutChainInfo,
  getPayoutChainOptions,
  legacyChainNameToId,
  chainIdToLegacyName,
  isMainnetEnvironment,
  SOLANA_CHAIN_IDS,
  isSolanaChain,
  getSolanaChainIdForSourceChain,
  type PayoutChainId,
  type PayoutChainInfo,
} from './constants/PayoutConfig';

// Bridge Kit chain name mappings
export {
  getBridgeChainName,
  BRIDGE_CHAIN_NAMES,
  type BridgeChainName,
} from './constants/bridge-routes';
