import { AVAX_FUJI } from '@circle-fin/usdckit/chains';
import { createKitClient } from '@bu/circle';
import type {
  USDKitChain,
  USDKitClient,
  USDKitAccount,
  FeeValuesEIP1559,
  TransferParams,
  TransferResult,
  ChainParam,
} from '../types/usdckit';
import type { SupportedCurrency } from '@bu/types/transfer-execution';

// Type aliases for backward compatibility
type Chain = USDKitChain;
type Client = USDKitClient;
type Account = USDKitAccount;

/**
 * Transfer Kit Service
 *
 * Simplified wrapper for token and native currency transfers using USDCKit.
 * Supports same-chain and cross-chain transfers via Bridge Kit.
 */
export class TransferKit {
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
   * Execute a transfer between accounts
   *
   * @param params - Transfer parameters
   * @returns Array of transfer results with transaction hashes
   */
  async transfer({
    from,
    to,
    amount,
    chain,
    tokenSymbol,
    fees,
    signal,
  }: {
    from: Account;
    to: Account;
    amount: string | bigint;
    chain: Chain;
    tokenSymbol?: SupportedCurrency;
    fees?: FeeValuesEIP1559 & { gas?: bigint };
    signal?: AbortSignal;
  }): Promise<TransferResult> {
    const client = this.getClient(chain);

    const token = tokenSymbol && tokenSymbol in chain.contracts
      ? chain.contracts[tokenSymbol as keyof typeof chain.contracts]
      : undefined;

    const transferParams = {
      from,
      to,
      amount: typeof amount === 'string' ? (amount as `${number}`) : amount.toString() as `${number}`,
      ...(token && { token }),
      ...(fees && { fees }),
      ...(signal && { signal }),
    } as TransferParams;

    try {
      const result = await client.transfer(transferParams);
      return result;
    } catch (error) {
      throw new Error(
        `Failed to transfer ${tokenSymbol || 'native'} from ${from.address} to ${to.address}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Execute a cross-chain transfer (USDC only)
   *
   * @param params - Cross-chain transfer parameters
   * @returns Array of transfer results with transaction hashes
   */
  async transferCrossChain({
    from,
    to,
    amount,
    fromChain,
    toChain,
    tokenSymbol = 'USDC',
    fees,
    signal,
  }: {
    from: Account;
    to: Account;
    amount: string | bigint;
    fromChain: Chain;
    toChain: Chain;
    tokenSymbol?: 'USDC';
    fees?: FeeValuesEIP1559 & { gas?: bigint };
    signal?: AbortSignal;
  }): Promise<{ hash: `0x${string}` }[]> {
    if (tokenSymbol !== 'USDC') {
      throw new Error('Cross-chain transfers are only supported for USDC');
    }

    const client = this.getClient(fromChain);

    const token = fromChain.contracts[tokenSymbol];
    if (!token) {
      throw new Error(`Token ${tokenSymbol} not supported on chain ${fromChain.id}`);
    }

    try {
      const params = {
        from,
        to,
        amount: typeof amount === 'string' ? (amount as `${number}`) : amount.toString() as `${number}`,
        token: typeof token === 'string' ? token : token.address,
        chain: fromChain as unknown as TransferParams['chain'],
        ...(fees && { fees }),
        ...(signal && { signal }),
      } as TransferParams;
      const result = await client.transfer(params);
      return result;
    } catch (error) {
      throw new Error(
        `Failed to execute cross-chain transfer from ${fromChain.id} to ${toChain.id}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }
}