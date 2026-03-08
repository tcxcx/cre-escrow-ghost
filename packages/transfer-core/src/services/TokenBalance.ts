import { createKitClient } from '@bu/circle';
import { createLogger } from '@bu/logger';

const logger = createLogger({ prefix: 'transfer-core:token-balance', theme: 'minimal' });
import type {
  USDKitChain,
  USDKitClient,
  USDKitAccount,
  TokenBalanceResult,
  TokenBalancesResult,
  GetTokenBalanceParams,
  GetTokenBalancesParams,
} from '../types/usdckit';
import { StablecoinRegistry } from './StablecoinRegistry';
import type { SupportedCurrency } from '@bu/types/transfer-execution';

// Type aliases for backward compatibility
type Chain = USDKitChain;
type Client = USDKitClient;
type Account = USDKitAccount;

/**
 * Token Balance Service
 *
 * Handles querying token balances for accounts on different chains.
 * Provides utilities for balance checking and formatting.
 */
export class TokenBalanceService {
  private clientCache = new Map<string, Client>();

  /**
   * Get or create a USDCKit client for the given chain
   */
  private getClient(chain: Chain): Client {
    const cacheKey = chain.id.toString();
    if (!this.clientCache.has(cacheKey)) {
      const client = createKitClient(chain);
      this.clientCache.set(cacheKey, client);
    }
    return this.clientCache.get(cacheKey)!;
  }

  /**
   * Get balance for a specific token
   *
   * @param params - Token balance query parameters
   * @returns Token balance result
   */
  async getTokenBalance({
    account,
    chain,
    tokenSymbol,
  }: {
    account: Account;
    chain: Chain;
    tokenSymbol?: SupportedCurrency;
  }): Promise<TokenBalanceResult> {
    const client = this.getClient(chain);

    // Get token address from StablecoinRegistry (works across all chains)
    const token = tokenSymbol
      ? (StablecoinRegistry.getTokenAddress(chain.id, tokenSymbol) as `0x${string}`)
      : undefined;

    const params = {
      account,
      ...(token && { token }),
    } as GetTokenBalanceParams;

    try {
      const result = await client.getTokenBalance(params);
      return result;
    } catch (error) {
      throw new Error(
        `Failed to get ${tokenSymbol || 'native'} balance for ${account.address}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Get balances for multiple tokens
   *
   * @param params - Token balances query parameters
   * @returns Token balances result
   */
  async getTokenBalances({
    account,
    chain,
    tokenSymbols,
  }: {
    account: Account;
    chain: Chain;
    tokenSymbols?: SupportedCurrency[];
  }): Promise<TokenBalancesResult> {
    const client = this.getClient(chain);

    // Get token addresses from StablecoinRegistry
    const tokens = tokenSymbols
      ?.map(symbol => StablecoinRegistry.getTokenAddress(chain.id, symbol) as `0x${string}`)
      .filter(Boolean);

    const params = {
      account,
      ...(tokens && tokens.length > 0 && { tokens }),
    } as GetTokenBalancesParams;

    try {
      const result = await client.getTokenBalances(params);
      return result;
    } catch (error) {
      throw new Error(
        `Failed to get token balances for ${account.address}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Get native token balance
   *
   * @param params - Balance query parameters
   * @returns Native token balance
   */
  async getNativeBalance({
    account,
    chain,
  }: {
    account: Account;
    chain: Chain;
  }): Promise<TokenBalanceResult> {
    return this.getTokenBalance({ account, chain });
  }

  /**
   * Check if account has sufficient balance for a transfer
   *
   * @param params - Balance check parameters
   * @returns Boolean indicating if balance is sufficient
   */
  async hasSufficientBalance({
    account,
    chain,
    amount,
    tokenSymbol,
  }: {
    account: Account;
    chain: Chain;
    amount: string | bigint;
    tokenSymbol?: SupportedCurrency;
  }): Promise<boolean> {
    try {
      const balance = await this.getTokenBalance({ account, chain, tokenSymbol });
      const balanceValue = balance.value;

      if (typeof balanceValue === 'bigint') {
        const requiredAmount = typeof amount === 'bigint' ? amount : BigInt(amount);
        return balanceValue >= requiredAmount;
      }

      if (typeof balanceValue === 'string') {
        const requiredAmount = typeof amount === 'string' ? amount : amount.toString();
        return BigInt(balanceValue) >= BigInt(requiredAmount);
      }

      return false;
    } catch (error) {
      logger.error('Error checking balance', error instanceof Error ? error : undefined);
      return false;
    }
  }
}