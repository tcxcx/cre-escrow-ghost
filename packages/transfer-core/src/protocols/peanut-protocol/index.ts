import peanut, { getDefaultProvider } from '@squirrel-labs/peanut-sdk';
import { ethers } from 'ethers';
import { createCircleSdk } from '@bu/circle';
import { createLogger } from '@bu/logger';

const logger = createLogger({ prefix: 'transfer-core:peanut-protocol', theme: 'minimal' });
import type { WalletInfo } from '@bu/types/transfer-execution';

/** Response shape from Circle SDK's getTransaction — covers known variants */
interface CircleTransactionStatusData {
  state?: string;
  errorReason?: string;
  transaction?: { state?: string };
}

interface CircleTransactionStatusResponse {
  data?: CircleTransactionStatusData;
  state?: string;
  transaction?: { state?: string };
}

/** Internal protocol-level link creation details (different from client-facing PeanutLinkDetails in @bu/types/peanut) */
interface PeanutProtocolLinkParams {
  chainId: string;
  tokenAmount: number;
  tokenType: number;
  tokenDecimals: number;
  tokenAddress: string;
  baseUrl: string;
}
import {
  CHAIN_IDS_TO_USDC_ADDRESSES,
  CHAIN_IDS_TO_EURC_ADDRESSES,
  type SupportedChainIdType,
} from '../../constants/chain-constants';
import {
  PEANUT_CUSTOM_CONTRACT_ADDRESSES,
  PEANUT_CUSTOM_RPC_URLS,
} from '../../constants/peanut-constants';
import { getChainById } from '../../constants/Chains';
import { CHAIN_ID_TO_CIRCLE_NAME } from '../../constants/ChainMappings';
import { getChainDisplayNameFromId } from '../../utils/chain-display-names';
import { CircleSDKExecutor } from '../circle-sdk';
import { ChainService } from '../../services/ChainService';
import { ContractService } from '../../services/ContractService';
import { getAppUrl } from '@bu/env/app';
import type { SupportedCurrency } from '@bu/types/transfer-execution';
import { getPeanutGasPrivateKey as getGasPrivateKey } from '@bu/env/peanut';

// Centralized token configuration using existing constants
const TOKEN_DECIMALS = {
  USDC: 6,
  EURC: 6,
  USDg: 6,
  eUSDCg: 6,
} as const;

const TOKEN_TYPE_ERC20 = 1;

/**
 * Get token address for a given chain and token symbol using existing constants
 */
export function getTokenAddress(chainId: number, tokenSymbol: SupportedCurrency): string {
  // Use chain-constants for token addresses
  const addressMap =
    tokenSymbol === 'USDC' ? CHAIN_IDS_TO_USDC_ADDRESSES : CHAIN_IDS_TO_EURC_ADDRESSES;

  const address = addressMap[chainId];

  if (!address || address === '0x') {
    throw new Error(`${tokenSymbol} not supported on chain ${chainId}`);
  }

  return address;
}

/**
 * Validate if chain ID is supported for Peanut Protocol by checking if we have token addresses
 */
function isSupportedChain(chainId: number): chainId is SupportedChainIdType {
  // Check if we have USDC support for this chain (primary requirement)
  try {
    getTokenAddress(chainId, 'USDC');
    return true;
  } catch {
    return false;
  }
}

/**
 * Get custom contract version for supported chains - YOUR DEPLOYED CONTRACTS!
 */
function getCustomContractVersion(chainId: number, type: 'normal' | 'batch' = 'normal'): string {
  // Use custom contract versions if available

  // Fallback to legacy custom config
  const customConfig =
    PEANUT_CUSTOM_CONTRACT_ADDRESSES[chainId as keyof typeof PEANUT_CUSTOM_CONTRACT_ADDRESSES];
  if (customConfig) {
    return type === 'batch' ? customConfig.Bv4_4 || 'Bv4_4' : customConfig.v4_4 || 'v4_4';
  }

  // Fallback to SDK's getLatestContractVersion for native chains
  try {
    return peanut.getLatestContractVersion({
      chainId: chainId.toString(),
      type,
      experimental: false,
    });
  } catch (error) {
    // If SDK doesn't recognize the chain, use our custom version
    logger.warn('Chain not recognized by SDK, using custom config', { chainId });
    return type === 'batch' ? 'Bv4_4' : 'v4_4';
  }
}

/**
 * Get custom provider for chains that might not be supported by SDK's getDefaultProvider
 */
async function getCustomProvider(chainId: number): Promise<ethers.providers.JsonRpcProvider> {
  // Try SDK's getDefaultProvider first
  try {
    const provider = await getDefaultProvider(chainId.toString());
    logger.debug('Using SDK default provider', { chainId });
    return provider;
  } catch (error) {
    logger.warn('SDK default provider failed, using custom RPC', { chainId });

    // Use custom RPC URLs if available

    // Fallback to legacy custom RPC endpoints
    const rpcUrl = PEANUT_CUSTOM_RPC_URLS[chainId];
    if (!rpcUrl) {
      throw new Error(`No RPC URL configured for custom chain ${chainId}`);
    }

    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    logger.debug('Using custom RPC provider', { rpcUrl });
    return provider;
  }
}

/**
 * Helper function to determine if chain needs custom Peanut Protocol handling
 * Uses chain utilities instead of hardcoded IDs for better maintainability
 */
// 🥜 This function is now imported from peanut-chains.ts
// Keeping this wrapper for backwards compatibility
function requiresCustomPeanutContracts(chainId: number): boolean {
  // Check if we have custom contract addresses for this chain
  return chainId in PEANUT_CUSTOM_CONTRACT_ADDRESSES;
}

// Helper function alias - uses centralized chain display name utility
const getChainDisplayName = getChainDisplayNameFromId;

/**
 * Peanut Protocol Service for creating claimable payment links
 *
 * Features:
 * - Create individual claimable links for contractor onboarding
 * - Batch link creation for multiple recipients
 * - Integration with Circle wallet infrastructure using signer-agnostic approach
 * - Real Peanut Protocol link creation with proper token support
 * - DRY architecture using existing transfer-core constants
 */
export class PeanutProtocolService {
  private chainService = new ChainService();
  private contractService = new ContractService(this.chainService);
  private circleSDKExecutor = new CircleSDKExecutor(this.chainService, this.contractService);

  constructor(
    private supabase: unknown,
    private gasPrivateKeyOverride?: string,
  ) {}

  /**
   * DRY: Setup fallback wallet - extracted common logic
   */
  private async setupFallbackWallet(chainId: number): Promise<{
    wallet: ethers.Wallet;
    address: string;
  }> {
    const fallbackPrivateKey = getGasPrivateKey(this.gasPrivateKeyOverride);
    logger.debug('Credential check', {
      hasPrivateKey: !!fallbackPrivateKey,
      keyLength: fallbackPrivateKey ? fallbackPrivateKey.length : 0,
      source: this.gasPrivateKeyOverride ? 'override' : 'env',
    });

    if (!fallbackPrivateKey) {
      throw new Error(
        'PEANUT_GAS_PRIVATE_KEY is required. Set it as an env var or pass as override.'
      );
    }

    const provider = await getCustomProvider(chainId);
    const wallet = new ethers.Wallet(fallbackPrivateKey, provider);
    const address = await wallet.getAddress();

    logger.info('Local wallet configured', {
      address,
      chainId,
    });

    return { wallet, address };
  }

  /**
   * DRY: Fund fallback wallet - extracted common logic
   */
  private async fundFallbackWallet(params: {
    wallet: WalletInfo;
    chainId: number;
    tokenSymbol: SupportedCurrency;
    amount: number;
    fallbackAddress: string;
  }): Promise<string> {
    const { wallet, chainId, tokenSymbol, amount, fallbackAddress } = params;

    logger.info('Funding fallback wallet using CircleSDKExecutor');

    // Use existing CircleSDKExecutor for same-chain transfer to fallback wallet
    const transferParams = {
      fromChainId: chainId,
      toChainId: chainId, // Same-chain transfer
      tokenSymbol,
      recipientAddress: fallbackAddress,
      amount: amount.toString(),
    };

    // Get estimate for the transfer
    const transferEstimate = await this.circleSDKExecutor.estimate(transferParams, wallet);
    if (!transferEstimate.available) {
      throw new Error('CircleSDKExecutor not available for fallback wallet funding');
    }

    logger.info('Executing token transfer to fallback wallet', {
      amount,
      tokenSymbol,
    });

    // Execute the transfer using existing CircleSDKExecutor
    const transferResult = await this.circleSDKExecutor.execute({
      ...transferParams,
      wallet,
      estimate: transferEstimate,
    });

    if (!transferResult.success || !transferResult.transactionHash) {
      throw new Error(
        `Failed to transfer tokens to fallback wallet: ${transferResult.error || 'Unknown error'}`
      );
    }

    logger.info('Tokens transferred to fallback wallet', {
      transactionHash: transferResult.transactionHash,
      amount,
      tokenSymbol,
    });

    return transferResult.transactionHash;
  }

  /**
   * DRY: Confirm transfer - extracted common polling logic
   */
  private async confirmTransfer(params: {
    transactionHash: string;
    provider: ethers.providers.JsonRpcProvider;
    fallbackAddress: string;
    requiredAmount: ethers.BigNumber;
    tokenAddress: string;
  }): Promise<void> {
    const { transactionHash, provider, fallbackAddress, requiredAmount, tokenAddress } = params;

    // Wait for the Circle transfer to be fully confirmed before proceeding
    logger.info('Waiting for Circle transfer confirmation');
    let transferConfirmed = false;
    let attempts = 0;
    const maxAttempts = 30; // Wait up to 30 attempts (60 seconds)

    while (!transferConfirmed && attempts < maxAttempts) {
      try {
        // Initialize Circle SDK client
        const circleSdk = createCircleSdk();

        const transactionStatus = await circleSdk.getTransaction({
          id: transactionHash,
        });

        // Robust status extraction - handle various API response structures
        const statusResponse = transactionStatus as unknown as CircleTransactionStatusResponse;
        const actualStatus =
          statusResponse.data?.state
          ?? statusResponse.data?.transaction?.state
          ?? statusResponse.state
          ?? statusResponse.transaction?.state;

        logger.debug('Transfer status check', {
            attempt: attempts + 1,
            maxAttempts,
            status: actualStatus,
        });

        if (
          actualStatus === 'COMPLETE' ||
          actualStatus === 'CONFIRMED' ||
          actualStatus === 'SENT'
        ) {
          transferConfirmed = true;
          logger.info('Circle transfer confirmed', { status: actualStatus });
          break;
        } else if (actualStatus === 'FAILED' || actualStatus === 'CANCELED') {
          throw new Error(
            `Circle transfer failed with status: ${actualStatus}. Error: ${
              statusResponse.data?.errorReason || 'Unknown error'
            }`
          );
        }

        logger.debug('Transaction still pending, continuing to poll', { status: actualStatus || 'unknown' });
        await new Promise(resolve => setTimeout(resolve, 2000));
        attempts++;
      } catch (error) {
        logger.warn('Error checking transfer status', {
            attempt: attempts + 1,
            error: error instanceof Error ? error.message : String(error),
        });

        // Smart fallback: If API polling fails, check balance directly after a few attempts
        if (attempts >= 5) {
          logger.info('API polling failed, checking balance directly');
          const tokenContract = new ethers.Contract(
            tokenAddress,
            ['function balanceOf(address) view returns (uint256)'],
            provider
          );
          const fallbackBalance = await tokenContract.balanceOf(fallbackAddress);

          if (fallbackBalance.gte(requiredAmount)) {
            logger.info('Balance check confirms transfer completed');
            transferConfirmed = true;
            break;
          }
        }

        attempts++;
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    if (!transferConfirmed) {
      throw new Error(
        `Circle transfer did not confirm within ${maxAttempts * 2} seconds. Transaction ID: ${transactionHash}`
      );
    }

    // Additional verification: Check fallback wallet balance
    logger.info('Verifying fallback wallet token balance');
    const tokenContract = new ethers.Contract(
      tokenAddress,
      ['function balanceOf(address) view returns (uint256)'],
      provider
    );
    const fallbackBalance = await tokenContract.balanceOf(fallbackAddress);

    logger.info('Fallback wallet balance verification', {
      balance: ethers.utils.formatUnits(fallbackBalance, 6),
      required: ethers.utils.formatUnits(requiredAmount, 6),
      hasEnoughTokens: fallbackBalance.gte(requiredAmount),
    });

    if (fallbackBalance.lt(requiredAmount)) {
      throw new Error(
        `Fallback wallet still has insufficient tokens after transfer. ` +
          `Balance: ${ethers.utils.formatUnits(fallbackBalance, 6)}, ` +
          `Required: ${ethers.utils.formatUnits(requiredAmount, 6)}`
      );
    }

    logger.info('Token transfer and confirmation completed successfully');
  }

  /**
   * DRY: Create individual Peanut link - extracted common logic
   */
  private async createPeanutLink(params: {
    fallbackWallet: ethers.Wallet;
    linkDetails: PeanutProtocolLinkParams;
    password: string;
    chainId: number;
    chainName: string;
    fallbackAddress: string;
  }): Promise<{ link: string; txHash: string }> {
    const { fallbackWallet, linkDetails, password, chainId, chainName, fallbackAddress } = params;

    logger.info('Creating Peanut link with local wallet');

    // 🥜 Chain-agnostic approach: Use custom logic for chains that require it
    const requiresCustomContracts = requiresCustomPeanutContracts(chainId);

    if (requiresCustomContracts) {
      logger.info('Using CUSTOM approach', { chainName });

      // Check ETH balance for gas
      const ethBalance = await fallbackWallet.getBalance();
      logger.debug('Fallback wallet ETH balance', {
        balance: ethers.utils.formatEther(ethBalance),
      });

      if (ethBalance.isZero()) {
        throw new Error(
          `Fallback wallet ${fallbackAddress} has no ETH for gas. Please fund it with ETH on ${chainName}.`
        );
      }

      logger.info('Calling peanut.createLink for custom chain');
      const createLinkPromise = peanut.createLink({
        structSigner: {
          signer: fallbackWallet, // Use local ethers.Wallet directly
        },
        linkDetails,
        password,
        peanutContractVersion: getCustomContractVersion(chainId, 'normal'),
      });

      // Add 60 second timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Peanut createLink timed out after 60 seconds')), 60000);
      });

      let linkResult;
      try {
        linkResult = await Promise.race([createLinkPromise, timeoutPromise]);
      } catch (error) {
        logger.error('createLink failed or timed out', error instanceof Error ? error : undefined);
        if (error instanceof Error && error.message.includes('insufficient funds')) {
          throw new Error(
            `Insufficient ETH for gas. Fallback wallet ${fallbackAddress} needs ETH on ${chainName}.`
          );
        }
        throw error;
      }

      const { link, txHash } = linkResult;

      logger.info('Link created', { chainName, txHash });

      return { link, txHash };
    } else {
      logger.info('Using STANDARD SDK approach', { chainName });

      // Check ETH balance for gas
      const ethBalance = await fallbackWallet.getBalance();
      logger.debug('Fallback wallet ETH balance', {
        balance: ethers.utils.formatEther(ethBalance),
      });

      if (ethBalance.isZero()) {
        throw new Error(
          `Fallback wallet ${fallbackAddress} has no ETH for gas. Please fund it with ETH on ${chainName}.`
        );
      }

      logger.info('Calling peanut.createLink with timeout');
      const createLinkPromise = peanut.createLink({
        structSigner: {
          signer: fallbackWallet, // Use local ethers.Wallet directly
        },
        linkDetails,
        password,
        peanutContractVersion: getCustomContractVersion(chainId, 'normal'),
      });

      // Add 60 second timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Peanut createLink timed out after 60 seconds')), 60000);
      });

      let result;
      try {
        result = await Promise.race([createLinkPromise, timeoutPromise]);
      } catch (error) {
        logger.error('createLink failed or timed out', error instanceof Error ? error : undefined);
        // Check if it's a gas issue
        if (error instanceof Error && error.message.includes('insufficient funds')) {
          throw new Error(
            `Insufficient ETH for gas. Fallback wallet ${fallbackAddress} needs ETH on ${chainName}.`
          );
        }
        throw error;
      }

      logger.info('createLink completed', { txHash: result.txHash });

      // Following the working example pattern - get links from transaction
      const getLinksFromTxResponse = await peanut.getLinksFromTx({
        linkDetails,
        txHash: result.txHash,
        passwords: [password],
      });

      logger.debug('getLinksFromTx result', {
        linksLength: getLinksFromTxResponse.links?.length,
      });

      const actualLink = getLinksFromTxResponse.links?.[0];
      if (!actualLink || typeof actualLink !== 'string') {
        logger.error('No valid link found in getLinksFromTx result');
        throw new Error(
          `No valid link found. getLinksFromTx returned: ${JSON.stringify(getLinksFromTxResponse)}`
        );
      }

      logger.info('Peanut link created successfully', { txHash: result.txHash });

      return { link: actualLink, txHash: result.txHash };
    }
  }

  /**
   * Create individual Peanut link for contractor onboarding using Circle wallet
   */
  async createClaimLink(params: {
    chainId: number;
    tokenAmount: number;
    tokenSymbol: SupportedCurrency;
    wallet: WalletInfo;
    recipientEmail: string;
    recipientName?: string;
    teamId: string;
    payrollId?: string;
  }): Promise<{
    success: boolean;
    link?: string;
    linkPassword?: string;
    transactionHash?: string;
    error?: string;
  }> {
    logger.info('Creating claimable link for contractor onboarding', {
      amount: params.tokenAmount,
      tokenSymbol: params.tokenSymbol,
      chainId: params.chainId,
    });

    try {
      // Validate chain support
      if (!isSupportedChain(params.chainId)) {
        throw new Error(`Chain ${params.chainId} is not supported - no token addresses available`);
      }

      // Get token address using existing constants
      const tokenAddress = getTokenAddress(params.chainId, params.tokenSymbol);
      const tokenDecimals = TOKEN_DECIMALS[params.tokenSymbol];

      // 🔥 Get custom contract version for this chain (YOUR DEPLOYED CONTRACTS!)
      const contractVersion = getCustomContractVersion(params.chainId, 'normal');

      // 🔥 Get custom provider that handles both native and custom chains
      const provider = await getCustomProvider(params.chainId);
      const chainName = getChainDisplayName(params.chainId);

      logger.info('Creating Peanut link with custom contract config', {
        tokenAddress,
        contractVersion,
        chainName,
      });

      // Use signer-agnostic approach for Circle wallets
      const linkDetails = {
        chainId: params.chainId.toString(),
        tokenAmount: params.tokenAmount,
        tokenType: TOKEN_TYPE_ERC20,
        tokenDecimals,
        tokenAddress,
        baseUrl: `${getAppUrl()}/payroll/claim`,
      };

      logger.debug('Link details', linkDetails);

      // Generate password for the link
      const password = await peanut.getRandomString(16);

      // Use fallback approach as PRIMARY method since Circle Gas Station blocks ERC-20 approvals
      logger.info('Using fallback approach as PRIMARY method (Circle Gas Station blocks ERC-20 approvals)', {
        chainId: params.chainId,
      });

      // DRY: Use extracted methods
      const { wallet: fallbackWallet, address: fallbackAddress } = await this.setupFallbackWallet(
        params.chainId
      );

      const transactionHash = await this.fundFallbackWallet({
        wallet: params.wallet,
        chainId: params.chainId,
        tokenSymbol: params.tokenSymbol,
        amount: params.tokenAmount,
        fallbackAddress,
      });

      const requiredAmount = ethers.utils.parseUnits(params.tokenAmount.toString(), tokenDecimals);

      await this.confirmTransfer({
        transactionHash,
        provider,
        fallbackAddress,
        requiredAmount,
        tokenAddress,
      });

      const { link, txHash } = await this.createPeanutLink({
        fallbackWallet,
        linkDetails,
        password,
        chainId: params.chainId,
        chainName,
        fallbackAddress,
      });

      return {
        success: true,
        link,
        linkPassword: password,
        transactionHash: txHash,
      };
    } catch (error) {
      logger.error('Failed to create Peanut link', error instanceof Error ? error : undefined);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create claimable link',
      };
    }
  }

  /**
   * Create multiple Peanut links for batch contractor onboarding
   * DRY: Reuses all the extracted common logic
   */
  async createBatchClaimLinks(params: {
    chainId: number;
    tokenSymbol: SupportedCurrency;
    wallet: WalletInfo;
    recipients: Array<{
      email: string;
      name?: string;
      amount: number;
    }>;
    teamId: string;
    payrollId?: string;
  }): Promise<
    Array<{
      recipient: { email: string; name?: string; amount: number };
      success: boolean;
      link?: string;
      linkPassword?: string;
      transactionHash?: string;
      error?: string;
    }>
  > {
    logger.info('Creating batch links', { recipients: params.recipients.length });

    try {
      if (!isSupportedChain(params.chainId)) {
        throw new Error(`Chain ${params.chainId} not supported`);
      }

      const tokenAddress = getTokenAddress(params.chainId, params.tokenSymbol);
      const tokenDecimals = TOKEN_DECIMALS[params.tokenSymbol];
      const provider = await getCustomProvider(params.chainId);
      const chainName = getChainDisplayName(params.chainId);

      // 1. Calculate total amount = sum(all recipients' amounts)
      const totalAmount = params.recipients.reduce((sum, r) => sum + r.amount, 0);
      logger.info('Total funding needed', { totalAmount, tokenSymbol: params.tokenSymbol });

      // 2. Fund fallback wallet once with total (using CircleSDKExecutor)
      const { wallet: fallbackWallet, address: fallbackAddress } = await this.setupFallbackWallet(
        params.chainId
      );

      const transactionHash = await this.fundFallbackWallet({
        wallet: params.wallet,
        chainId: params.chainId,
        tokenSymbol: params.tokenSymbol,
        amount: totalAmount,
        fallbackAddress,
      });

      // 3. Confirm transfer (shared polling logic)
      const requiredAmount = ethers.utils.parseUnits(totalAmount.toString(), tokenDecimals);
      await this.confirmTransfer({
        transactionHash,
        provider,
        fallbackAddress,
        requiredAmount,
        tokenAddress,
      });

      const results: Array<{
        recipient: { email: string; name?: string; amount: number };
        success: boolean;
        link?: string;
        linkPassword?: string;
        transactionHash?: string;
        error?: string;
      }> = [];

      // 4. If all amounts equal: Use peanut.createLinks for batch creation (efficient single tx)
      const amounts = params.recipients.map(r => r.amount);
      const allEqual = amounts.every(a => a === amounts[0]);

      if (allEqual && params.recipients.length > 1 && amounts[0] !== undefined) {
        logger.info('Using batch creation (all amounts equal)');

        const linkDetails = {
          chainId: params.chainId.toString(),
          tokenAmount: amounts[0],
          tokenType: TOKEN_TYPE_ERC20,
          tokenDecimals,
          tokenAddress,
          baseUrl: `${getAppUrl()}/payroll/claim`,
        };

        const passwords = await Promise.all(
          params.recipients.map(() => peanut.getRandomString(16))
        );

        try {
          const result = await peanut.createLinks({
            structSigner: { signer: fallbackWallet },
            linkDetails,
            numberOfLinks: params.recipients.length,
            passwords,
            peanutContractVersion: getCustomContractVersion(params.chainId, 'batch'),
          });

          // Handle batch result properly - result is an array of created links
          if (Array.isArray(result) && result.length > 0) {
            result.forEach((linkResult, index) => {
              const recipient = params.recipients[index];
              if (recipient && linkResult) {
                results.push({
                  recipient,
                  success: true,
                  link: linkResult.link,
                  linkPassword: passwords[index],
                  transactionHash: linkResult.txHash,
                });
              }
            });
          } else {
            throw new Error('Batch creation returned unexpected result format');
          }

          logger.info('Batch creation successful', { linksCreated: results.length });
        } catch (batchError) {
          logger.warn('Batch creation failed, falling back to individual links');

          // Fallback to individual creation
          for (const recipient of params.recipients) {
            try {
              const linkDetails = {
                chainId: params.chainId.toString(),
                tokenAmount: recipient.amount,
                tokenType: TOKEN_TYPE_ERC20,
                tokenDecimals,
                tokenAddress,
                baseUrl: `${getAppUrl()}/payroll/claim`,
              };

              const password = await peanut.getRandomString(16);

              const { link, txHash } = await this.createPeanutLink({
                fallbackWallet,
                linkDetails,
                password,
                chainId: params.chainId,
                chainName,
                fallbackAddress,
              });

              results.push({
                recipient,
                success: true,
                link,
                linkPassword: password,
                transactionHash: txHash,
              });
            } catch (individualError) {
              results.push({
                recipient,
                success: false,
                error:
                  individualError instanceof Error
                    ? individualError.message
                    : 'Failed to create link',
              });
            }
          }
        }
      } else {
        // 5. Else: Create individual links sequentially (reusing local signer)
        logger.info('Using individual link creation');

        for (const recipient of params.recipients) {
          try {
            const linkDetails = {
              chainId: params.chainId.toString(),
              tokenAmount: recipient.amount,
              tokenType: TOKEN_TYPE_ERC20,
              tokenDecimals,
              tokenAddress,
              baseUrl: `${getAppUrl()}/payroll/claim`,
            };

            const password = await peanut.getRandomString(16);

            const { link, txHash } = await this.createPeanutLink({
              fallbackWallet,
              linkDetails,
              password,
              chainId: params.chainId,
              chainName,
              fallbackAddress,
            });

            results.push({
              recipient,
              success: true,
              link,
              linkPassword: password,
              transactionHash: txHash,
            });
          } catch (error) {
            results.push({
              recipient,
              success: false,
              error: error instanceof Error ? error.message : 'Failed to create link',
            });
          }
        }
      }

      // 6. Return array of results
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      logger.info('Batch completion summary', {
        total: results.length,
        successful: successCount,
        failed: failCount,
      });

      return results;
    } catch (error: unknown) {
      logger.error('Batch creation failed', error instanceof Error ? error : undefined);
      // Return failure for all in case of setup error
      return params.recipients.map(recipient => ({
        recipient,
        success: false,
        error: error instanceof Error ? error.message : 'Batch creation failed',
      }));
    }
  }

  /**
   * Legacy method - keeping for compatibility but redirecting to new approach
   */
  async createSingleClaimLink(params: {
    chainId: number;
    tokenSymbol: SupportedCurrency;
    tokenAmount: number;
    recipientEmail: string;
    recipientName?: string;
    teamId: string;
    payrollId?: string;
    wallet: WalletInfo;
  }): Promise<{
    success: boolean;
    link?: string;
    linkPassword?: string;
    transactionHash?: string;
    error?: string;
  }> {
    try {
      const result = await this.createClaimLink(params);
      return result;
    } catch (error: unknown) {
      logger.error('Failed to create single claimable link', error instanceof Error ? error : undefined);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create claimable link',
      };
    }
  }
}
