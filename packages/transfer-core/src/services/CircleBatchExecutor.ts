import { ethers } from 'ethers';
import { createCircleSdk } from '@bu/circle';
import type { BatchTransferRecipient, WalletInfo, TransferResult, SupportedCurrency } from '@bu/types/transfer-execution';
import { ChainService } from './ChainService';
import { CHAIN_IDS_TO_USDC_ADDRESSES } from '../constants/chain-constants';

/**
 * Circle Native Batch Executor
 *
 * Uses Circle's Programmable Wallets batch operations for:
 * - Atomic batch USDC transfers (all succeed or all fail)
 * - Massive gas savings (1 transaction vs many)
 * - Better UX (single transaction to wait for)
 *
 * Cross-chain transfers use Bridge Kit via BridgeKitExecutor instead.
 */
export class CircleBatchExecutor {
  private chainService: ChainService;

  constructor() {
    this.chainService = new ChainService();
  }

  /**
   * Execute atomic batch USDC transfers using Circle's native batch operations
   */
  async executeBatchTransfers(
    recipients: BatchTransferRecipient[],
    chainId: number,
    tokenSymbol: SupportedCurrency,
    wallet: WalletInfo
  ): Promise<TransferResult> {
    try {
      // Get USDC contract address for the chain
      const usdcAddress = this.getUSDCAddress(chainId);
      // Build ABI parameters for batch execution
      const batchParams = await this.buildBatchTransferParams(recipients, usdcAddress);
      // Execute batch transaction via Circle
      const result = await this.executeBatchTransaction(
        wallet,
        chainId,
        batchParams,
        `Atomic batch transfer: ${recipients.length} USDC transfers`
      );

      return {
        success: true,
        protocol: 'circle-batch',
        transactionHash: result.transactionHash,
        gasUsed: '0', // Exact gas usage tracked by Circle
        sourceTransactionHash: result.transactionHash,
      };
    } catch (error) {
      return {
        success: false,
        protocol: 'circle-batch',
        error: error instanceof Error ? error.message : 'Batch transfer failed',
      };
    }
  }

  /**
   * Build ABI parameters for batch USDC transfers
   */
  private async buildBatchTransferParams(
    recipients: BatchTransferRecipient[],
    usdcAddress: string
  ): Promise<any[]> {
    // ABI for USDC transfer function
    const transferABI = ['function transfer(address recipient, uint256 amount)'];
    const contractInterface = new ethers.utils.Interface(transferABI);

    const batchParams = recipients.map(recipient => {
      const amount = this.parseUSDCAmount(recipient.amount);

      // Encode the transfer function call
      const encodedTransfer = contractInterface.encodeFunctionData('transfer', [
        recipient.address,
        amount,
      ]);

      // Return batch parameter: [contractAddress, value, encodedData]
      return [
        usdcAddress, // USDC contract address
        '0', // No native token transfer
        encodedTransfer, // Encoded transfer call
      ];
    });

    return batchParams;
  }

  /**
   * Execute batch transaction via Circle's contractExecution API
   * NOTE: This method is currently not supported by Circle SDK.
   * Batch operations should be implemented using individual createTransaction calls
   * or wait for Circle SDK to add contractExecution support.
   */
  private async executeBatchTransaction(
    wallet: WalletInfo,
    chainId: number,
    batchParams: any[],
    memo: string
  ): Promise<{ transactionHash: string }> {
    // Initialize Circle SDK client
    const circleSdk = createCircleSdk();

    // Execute batch via Circle's createTransaction endpoint with batch operations
    // Note: contractExecution doesn't exist in the SDK, using createTransaction instead
    // For batch operations, we'll need to use a different approach or wait for SDK support
    throw new Error(
      'Batch execution via contractExecution is not yet supported by Circle SDK. Please use individual transactions or wait for SDK update.'
    );

    // TODO: Implement batch execution when Circle SDK supports it
    // The following is a placeholder for future implementation:
    /*
    try {
      const response = await (circleSdk as any).contractExecution({
        walletId: wallet.walletId,
        contractAddress: wallet.walletAddress,
        abiFunctionSignature: 'executeBatch((address,uint256,bytes)[])',
        abiParameters: [batchParams],
        feeLevel: 'MEDIUM',
        refId: memo,
        idempotencyKey: `batch-${Date.now()}-${Math.random()}`,
      });

      if (!response.data?.transactionHash) {
        throw new Error('No transaction hash returned from Circle batch execution');
      }

      // Wait for transaction confirmation
      await this.waitForTransactionConfirmation(response.data.transactionHash, chainId);

      return {
        transactionHash: response.data.transactionHash,
      };
    } catch (error) {
      throw error;
    }
    */
  }

  /**
   * Wait for transaction confirmation on the blockchain
   */
  private async waitForTransactionConfirmation(
    txHash: string,
    chainId: number,
    timeoutMs: number = 120000 // 2 minutes
  ): Promise<void> {
    const client = this.chainService.getPublicClient(chainId);
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      try {
        const receipt = await client.getTransactionReceipt({
          hash: txHash as `0x${string}`,
        });

        if (receipt) {
          return;
        }
      } catch (error) {
        // Transaction not yet mined, continue waiting
      }

      await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
    }

    throw new Error(`Transaction confirmation timeout: ${txHash}`);
  }

  /**
   * Get USDC contract address for chain
   */
  private getUSDCAddress(chainId: number): string {
    const address = CHAIN_IDS_TO_USDC_ADDRESSES[chainId];
    if (!address) {
      throw new Error(`USDC not supported on chain ${chainId}`);
    }
    return address;
  }

  /**
   * Parse USDC amount string to BigInt (6 decimals)
   */
  private parseUSDCAmount(amount: string): bigint {
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) {
      throw new Error(`Invalid USDC amount: ${amount}`);
    }

    // Convert to 6 decimal places (USDC standard)
    return BigInt(Math.floor(parsed * 1_000_000));
  }
}
