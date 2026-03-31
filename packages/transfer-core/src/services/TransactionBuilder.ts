import { ChainService } from './ChainService';
import { parseGwei } from 'viem';
import type { TransactionConfig } from '@bu/types/transfer-execution';

export class TransactionBuilder {
  constructor(private chain: ChainService) {}

  async build(cfg: TransactionConfig): Promise<string> {
    if (!cfg.from) {
      throw new Error('Transaction config missing from address');
    }

    const client = this.chain.getPublicClient(cfg.chainId);
    const nonce = await client.getTransactionCount({
      address: cfg.from as `0x${string}`, // Ensure proper Ethereum address type
      blockTag: 'pending',
    });

    // Prepare gas estimation parameters
    const gasEstimationParams = {
      from: cfg.from as `0x${string}`,
      to: cfg.to as `0x${string}`,
      value: cfg.value ?? 0n,
      ...(cfg.data && cfg.data !== '0x' ? { data: cfg.data as `0x${string}` } : {}),
    };

    let gas: bigint;
    let gasPrice: bigint;
    let maxFeePerGas: bigint;
    let maxPriorityFeePerGas: bigint;

    try {
      // Try to estimate gas using viem

      gas = await client.estimateGas(gasEstimationParams);
      gasPrice = await client.getGasPrice();
      maxFeePerGas = (gasPrice * 120n) / 100n; // 20% buffer
      maxPriorityFeePerGas = parseGwei('2');
    } catch (error) {
      // Check if this is the known viem serialization issue
      const isGasEstimationError =
        error &&
        typeof error === 'object' &&
        ('message' in error || 'shortMessage' in error) &&
        ((error as { message?: string }).message?.includes('transfer from the zero address') ||
          (error as { shortMessage?: string }).shortMessage?.includes('transfer from the zero address') ||
          (error as { message?: string }).message?.includes('EstimateGasExecutionError') ||
          (error as { shortMessage?: string }).shortMessage?.includes('Execution reverted'));

      if (isGasEstimationError) {
        // Use established fallback values for USDC transfers
        gas = BigInt(100000); // Conservative gas limit for ERC20 transfers
        gasPrice = BigInt(25000000000); // 25 gwei base price
        maxFeePerGas = (gasPrice * 120n) / 100n; // 20% buffer for EIP-1559
        maxPriorityFeePerGas = parseGwei('2'); // 2 gwei priority fee
      } else {
        // Re-throw unexpected errors

        throw error;
      }
    }

    const tx = {
      nonce: Number(nonce),
      to: cfg.to,
      from: cfg.from,
      value: (cfg.value ?? 0n).toString(),
      gas: gas.toString(),
      maxFeePerGas: maxFeePerGas.toString(),
      maxPriorityFeePerGas: maxPriorityFeePerGas.toString(),
      chainId: cfg.chainId,
      data: cfg.data,
    };

    return JSON.stringify(tx);
  }
}
