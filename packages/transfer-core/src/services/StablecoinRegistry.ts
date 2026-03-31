import {
  SupportedChainId,
  CHAIN_IDS_TO_USDC_ADDRESSES,
  CHAIN_IDS_TO_EURC_ADDRESSES,
} from '../constants/chain-constants';
import { getUsdgTokenAddress } from '@bu/env/ace';
import type { SupportedCurrency } from '@bu/types/transfer-execution';

/**
 * Stablecoin Registry
 * Centralized registry for stablecoin addresses across chains
 * Provides type-safe access with runtime guards
 */
export class StablecoinRegistry {
  /**
   * Get token address for a given chain and stablecoin type
   * @param chainId - Chain ID
   * @param tokenType - Stablecoin type (USDC, EURC)
   * @returns Token contract address
   * @throws Error if chain or token not supported
   */
  static getTokenAddress(chainId: number, tokenType: SupportedCurrency): string {
    let address: string | undefined;

    switch (tokenType) {
      case 'USDC':
        address = CHAIN_IDS_TO_USDC_ADDRESSES[chainId];
        break;
      case 'EURC':
        address = CHAIN_IDS_TO_EURC_ADDRESSES[chainId];
        break;
      case 'USDg':
        if (chainId === 11155111) {
          address = getUsdgTokenAddress();
        }
        break;
      default:
        throw new Error(`Unsupported stablecoin type: ${tokenType}`);
    }

    if (!address || address === '0x') {
      throw new Error(
        `${tokenType} is not supported on chain ${chainId}. ` +
          `Supported chains: ${this.getSupportedChainsForToken(tokenType).join(', ')}`
      );
    }

    return address;
  }

  /**
   * Check if a stablecoin is supported on a given chain
   * @param chainId - Chain ID
   * @param tokenType - Stablecoin type
   * @returns True if supported, false otherwise
   */
  static isSupported(chainId: number, tokenType: SupportedCurrency): boolean {
    try {
      this.getTokenAddress(chainId, tokenType);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get all supported stablecoins for a given chain
   * @param chainId - Chain ID
   * @returns Array of supported stablecoin types
   */
  static getSupportedTokens(chainId: number): SupportedCurrency[] {
    const tokens: SupportedCurrency[] = [];
    const tokenTypes: SupportedCurrency[] = ['USDC', 'EURC', 'USDg'];

    for (const tokenType of tokenTypes) {
      if (this.isSupported(chainId, tokenType)) {
        tokens.push(tokenType);
      }
    }

    return tokens;
  }

  /**
   * Get all chain IDs that support a given stablecoin
   * @param tokenType - Stablecoin type
   * @returns Array of supported chain IDs
   */
  static getSupportedChainsForToken(tokenType: SupportedCurrency): number[] {
    const chains: number[] = [];
    let addressMap: Record<number, string>;

    switch (tokenType) {
      case 'USDC':
        addressMap = CHAIN_IDS_TO_USDC_ADDRESSES;
        break;
      case 'EURC':
        addressMap = CHAIN_IDS_TO_EURC_ADDRESSES;
        break;
      case 'USDg':
        // USDg only on Sepolia — no address map, return directly
        return [11155111];
      default:
        return [];
    }

    for (const [chainIdStr, address] of Object.entries(addressMap)) {
      const chainId = parseInt(chainIdStr, 10);
      if (address && address !== '0x') {
        chains.push(chainId);
      }
    }

    return chains;
  }

  /**
   * Check if a token supports EIP-2612 permit (gasless approvals)
   * USDC and EURC support permit
   * @param tokenType - Stablecoin type
   * @returns True if permit is supported
   */
  static supportsPermit(tokenType: SupportedCurrency): boolean {
    return tokenType === 'USDC' || tokenType === 'EURC' || tokenType === 'USDg';
  }

  /**
   * Get token decimals (all stablecoins use 6 decimals)
   * @param tokenType - Stablecoin type
   * @returns Number of decimals
   */
  static getDecimals(tokenType: SupportedCurrency): number {
    // USDC, EURC, and USDg use 6 decimals
    return 6;
  }
}

