import type {
  BatchTransferParams,
  BatchTransferResult,
  BatchTransferRecipient,
  TransferGroup,
  TransferParams,
  WalletInfo,
  Protocol,
  SupportedCurrency,
} from '@bu/types/transfer-execution';
import { createLogger } from '@bu/logger';
import { TransferService } from './TransferService';

const logger = createLogger({ prefix: 'transfer-core:batch-payment', theme: 'minimal' });
import { WalletService } from './WalletService';
import { GasEstimationService } from './GasEstimationService';
import { RouteOptimizationService } from './RouteOptimizationService';
import { ChainService } from './ChainService';
import { ContractService } from './ContractService';
import { CircleBatchExecutor } from './CircleBatchExecutor';
import { CircleSDKExecutor } from '../protocols/circle-sdk';
import { BridgeKitExecutor } from '../protocols/bridge-kit';
import { CHAIN_IDS_TO_USDC_ADDRESSES } from '../constants/chain-constants';
import { isValidBlockchainAddress } from '@bu/schemas/currency';
import {
  createPaymentClaim,
  buildFeeMetadataForPeanut,
  upsertContractorPaymentHistoryOnDirectTransfer,
} from '@bu/supabase/mutations';
// PeanutProtocolService is dynamically imported to avoid loading the heavy SDK at startup
type PeanutProtocolServiceType = import('../protocols/peanut-protocol').PeanutProtocolService;

/**
 * High-Performance Batch Payment Service with Progressive Enhancement
 *
 * Features:
 * - One-to-many transfers with intelligent grouping
 * - Cross-chain bridging via Bridge Kit
 * - Parallel execution with configurable concurrency
 * - 🥜 PROGRESSIVE ENHANCEMENT: Peanut Protocol integration for contractor onboarding
 * - 🔄 SMART ROUTING: Automatic transition from claimable links to direct transfers
 * - Comprehensive error handling and reporting
 */
export class BatchPaymentService {
  private transferService: TransferService;
  private walletService: WalletService;
  private gasService: GasEstimationService;
  private routeService: RouteOptimizationService;
  private chainService: ChainService;
  private contractService: ContractService;
  private circleBatchExecutor: CircleBatchExecutor;
  private circleSDKExecutor: CircleSDKExecutor;
  private bridgeKitExecutor: BridgeKitExecutor;
  private _peanutService: PeanutProtocolServiceType | null = null;

  constructor(private supabase: any) {
    this.chainService = new ChainService();
    this.contractService = new ContractService(this.chainService);
    this.transferService = new TransferService(supabase);
    this.walletService = new WalletService(supabase);
    this.gasService = new GasEstimationService(this.chainService, this.contractService);
    this.routeService = new RouteOptimizationService();
    this.circleBatchExecutor = new CircleBatchExecutor();
    this.circleSDKExecutor = new CircleSDKExecutor(this.chainService, this.contractService);
    this.bridgeKitExecutor = new BridgeKitExecutor();
    // peanutService is lazily loaded when needed
  }

  /**
   * Lazily loads PeanutProtocolService to avoid loading the heavy SDK at startup
   */
  private async getPeanutService(gasPrivateKey?: string): Promise<PeanutProtocolServiceType> {
    if (!this._peanutService) {
      const { PeanutProtocolService } = await import('../protocols/peanut-protocol');
      this._peanutService = new PeanutProtocolService(this.supabase, gasPrivateKey);
    }
    return this._peanutService;
  }

  /**
   * 🔄 ENHANCED: Execute batch payments with progressive enhancement and intelligent routing
   */
  async executeBatch(params: BatchTransferParams): Promise<BatchTransferResult> {
    const startTime = Date.now();

    logger.info('Starting progressive batch payment execution', {
      recipientCount: params.recipients.length,
    });

    try {
      // 1. Validate and prepare wallet context
      const wallet = await this.prepareWalletContext(params);

      // 🥜 2. NEW: Analyze recipients and determine routing strategy
      const recipientAnalysis = await this.analyzeRecipientsForRouting(params, wallet);

      logger.info('Recipient routing analysis', {
        directTransfers: recipientAnalysis.directTransferRecipients.length,
        claimableLinks: recipientAnalysis.claimableLinkRecipients.length,
        totalRecipients: params.recipients.length,
      });

      // 3. Execute direct transfers for established contractors
      const directTransferResults = await this.executeDirectTransfers(
        recipientAnalysis.directTransferRecipients,
        params,
        wallet
      );

      // 3b. Update contractor_payment_history for successful direct transfers (audit trail)
      if (params.teamId) {
        const updatePromises = directTransferResults
          .filter(r => r.success && r.recipient.email)
          .map(r =>
            upsertContractorPaymentHistoryOnDirectTransfer(this.supabase, {
              contractorEmail: r.recipient.email!,
              teamId: params.teamId!,
              walletAddress: r.recipient.address,
              transactionHash: r.transactionHash,
              sourceChainId: params.fromChainId,
              destChainId: r.recipient.chainId ?? params.fromChainId,
            })
          );
        const updateResults = await Promise.allSettled(updatePromises);
        updateResults.forEach((result, i) => {
          if (result.status === 'rejected') {
            logger.warn('Failed to update contractor payment history', { error: result.reason });
          } else if (result.value.error) {
            logger.warn('Contractor payment history update error', { detail: result.value.error.message });
          }
        });
      }

      // 🥜 4. NEW: Create claimable links for new contractors
      const claimableLinkResults = await this.executeClaimableLinks(
        recipientAnalysis.claimableLinkRecipients,
        params,
        wallet
      );

      // 5. Combine results
      const allResults = [...directTransferResults, ...claimableLinkResults];
      const executionTime = Date.now() - startTime;

      // 6. Compile final results with progressive enhancement metrics
      const finalResult = this.compileProgressiveResults(
        allResults,
        recipientAnalysis,
        executionTime
      );

      logger.info('Progressive batch execution completed', {
        totalTransfers: finalResult.totalTransfers,
        successful: finalResult.successfulTransfers,
        failed: finalResult.failedTransfers,
        directTransfers: recipientAnalysis.directTransferRecipients.length,
        claimableLinks: recipientAnalysis.claimableLinkRecipients.length,
        executionTimeMs: finalResult.executionTimeMs,
      });

      return finalResult;
    } catch (error) {
      logger.error('Progressive batch execution failed', error instanceof Error ? error : undefined);

      return {
        success: false,
        totalTransfers: params.recipients.length,
        successfulTransfers: 0,
        failedTransfers: params.recipients.length,
        results: params.recipients.map(recipient => ({
          recipient,
          success: false,
          error: error instanceof Error ? error.message : 'Progressive batch execution failed',
        })),
        totalGasUsed: '0',
        executionTimeMs: Date.now() - startTime,
        optimization: {
          sameChainCount: 0,
          crossChainCount: 0,
          protocolBreakdown: {} as Record<Protocol, number>,
        },
        progressiveEnhancement: {
          directTransferCount: 0,
          claimableLinkCount: 0,
          newContractorCount: 0,
          establishedContractorCount: 0,
          graduationRate: 0,
        },
      };
    }
  }

  /**
   * 🥜 NEW: Analyze recipients to determine routing strategy (direct vs claimable links)
   */
  private async analyzeRecipientsForRouting(
    params: BatchTransferParams,
    wallet: WalletInfo
  ): Promise<{
    directTransferRecipients: BatchTransferRecipient[];
    claimableLinkRecipients: BatchTransferRecipient[];
    routingDecisions: Array<{
      recipient: BatchTransferRecipient;
      routingMethod: 'direct_transfer' | 'claimable_link';
      reason: string;
      hasWalletAddress: boolean;
      hasClaimedBefore: boolean;
    }>;
  }> {
    logger.info('Analyzing recipients for progressive routing');

    const directTransferRecipients: BatchTransferRecipient[] = [];
    const claimableLinkRecipients: BatchTransferRecipient[] = [];
    const routingDecisions: Array<{
      recipient: BatchTransferRecipient;
      routingMethod: 'direct_transfer' | 'claimable_link';
      reason: string;
      hasWalletAddress: boolean;
      hasClaimedBefore: boolean;
    }> = [];

    for (const recipient of params.recipients) {
      // Check if recipient has a wallet address (direct address or email-based lookup)
      const hasDirectWalletAddress = this.isValidWalletAddress(recipient.address);

      // Check contractor payment history for email-based recipients
      // Note: Contractors don't have their own teams until they create workspaces during claim process
      let hasClaimedBefore = false;
      let contractorWalletAddress: string | null = null;

      if (!hasDirectWalletAddress && this.isEmailAddress(recipient.address)) {
        try {
          // Query contractor payment history for this specific team relationship
          // team_id here is the paying team, not the contractor's team (they may not have one yet)
          const { data: contractorHistory } = await this.supabase
            .from('contractor_payment_history')
            .select('wallet_address, payment_method, total_claims_successful, has_bufi_workspace')
            .eq('contractor_email', recipient.address)
            .eq('team_id', params.teamId) // The team that's paying them
            .single();

          if (contractorHistory) {
            hasClaimedBefore = contractorHistory.total_claims_successful > 0;
            contractorWalletAddress = contractorHistory.wallet_address;

            logger.info('Found contractor history', {
                hasClaimedBefore,
                hasWallet: !!contractorWalletAddress,
                hasBufiWorkspace: contractorHistory.has_bufi_workspace,
            });
          }
        } catch (error) {
          logger.debug('No payment history found - treating as new contractor', { teamId: params.teamId });
        }
      }

      // Determine routing method
      if (hasDirectWalletAddress) {
        // Direct wallet address provided
        directTransferRecipients.push(recipient);
        routingDecisions.push({
          recipient,
          routingMethod: 'direct_transfer',
          reason: 'Direct wallet address provided',
          hasWalletAddress: true,
          hasClaimedBefore: false,
        });
      } else if (contractorWalletAddress && hasClaimedBefore) {
        // Contractor has claimed before and has wallet - upgrade to direct transfer
        const upgradedRecipient: BatchTransferRecipient = {
          ...recipient,
          address: contractorWalletAddress, // Use stored wallet address
        };
        directTransferRecipients.push(upgradedRecipient);
        routingDecisions.push({
          recipient,
          routingMethod: 'direct_transfer',
          reason: 'Established contractor with stored wallet address',
          hasWalletAddress: true,
          hasClaimedBefore: true,
        });
      } else {
        // New contractor or email-based recipient - use claimable link
        claimableLinkRecipients.push(recipient);
        routingDecisions.push({
          recipient,
          routingMethod: 'claimable_link',
          reason: hasClaimedBefore
            ? 'Contractor claimed before but no wallet stored'
            : 'New contractor - first payment via claimable link',
          hasWalletAddress: false,
          hasClaimedBefore,
        });
      }
    }

    logger.info('Recipient routing analysis complete', {
      totalRecipients: params.recipients.length,
      directTransfers: directTransferRecipients.length,
      claimableLinks: claimableLinkRecipients.length,
    });

    return {
      directTransferRecipients,
      claimableLinkRecipients,
      routingDecisions,
    };
  }

  /**
   * 🥜 NEW: Execute claimable link creation for contractors without wallet addresses
   */
  private async executeClaimableLinks(
    recipients: BatchTransferRecipient[],
    params: BatchTransferParams,
    wallet: WalletInfo
  ): Promise<
    Array<{
      recipient: BatchTransferRecipient;
      success: boolean;
      transactionHash?: string;
      claimLink?: string;
      claimCode?: string;
      error?: string;
      protocol?: Protocol;
      gasUsed?: string;
    }>
  > {
    if (recipients.length === 0) {
      logger.debug('No claimable link recipients to process');
      return [];
    }

    // Pre-flight: ensure Peanut fallback wallet has gas before creating links
    const { assertPeanutFallbackHasGas } = await import('../utils/peanut-gas');
    await assertPeanutFallbackHasGas(params.fromChainId);

    logger.info('Creating claimable links for contractor onboarding', { count: recipients.length });

    // Compute fee metadata for the Peanut path (post-transaction billing, NOT atomic)
    const feeMetadata = buildFeeMetadataForPeanut(
      params.platformFee,
      params.feeRecipientAddress
    );

    if (feeMetadata) {
      logger.debug('Fee metadata for Peanut links', feeMetadata);
    }

    const results: Array<{
      recipient: BatchTransferRecipient;
      success: boolean;
      transactionHash?: string;
      claimLink?: string;
      claimCode?: string;
      error?: string;
      protocol?: Protocol;
      gasUsed?: string;
    }> = [];

    // Use batch creation if multiple recipients need Peanut links
    const shouldUseBatchCreation = recipients.length > 1;

    if (shouldUseBatchCreation) {
      logger.info('Using batch Peanut link creation for multiple recipients');

      try {
        // Use individual calls since batch method is temporarily disabled
        for (let i = 0; i < recipients.length; i++) {
          const recipient = recipients[i]!;

          try {
            const peanutService = await this.getPeanutService(params.peanutGasPrivateKey);
            const linkResult = await peanutService.createClaimLink({
              chainId: params.fromChainId,
              tokenSymbol: params.tokenSymbol as SupportedCurrency,
              tokenAmount: parseFloat(recipient.amount),
              recipientEmail: recipient.address,
              recipientName: recipient.name,
              teamId: params.teamId!,
              payrollId: params.payrollId,
              wallet,
            });

            if (linkResult?.link) {
              const { data: claimData, error: claimError } = await createPaymentClaim(
                this.supabase,
                {
                  recipientEmail: recipient.address,
                  recipientName: recipient.name,
                  amount: parseFloat(recipient.amount),
                  currency: params.tokenSymbol,
                  peanutLink: linkResult.link,
                  peanutPassword: linkResult.linkPassword,
                  transactionHash: linkResult.transactionHash,
                  payrollId: params.payrollId,
                  teamId: params.teamId!,
                  feeMetadata: feeMetadata ?? undefined,
                  originalRecipient: recipient,
                }
              );

              if (claimError) throw claimError;
              const claimCode = claimData!.claimCode;

              results.push({
                recipient,
                success: true,
                transactionHash: linkResult.transactionHash,
                claimLink: linkResult.link,
                claimCode,
                protocol: 'peanut-protocol' as Protocol,
                gasUsed: '0', // Peanut Protocol handles gas
              });

              logger.info('Peanut link created', { recipient: recipient.address });
            } else {
              results.push({
                recipient,
                success: false,
                error: 'Failed to create claimable link',
                protocol: 'peanut-protocol' as Protocol,
                gasUsed: '0',
              });

              logger.error('Failed to create Peanut link', { recipient: recipient.address });
            }
          } catch (error) {
            results.push({
              recipient,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
              protocol: 'peanut-protocol' as Protocol,
              gasUsed: '0',
            });

            logger.error('Error creating Peanut link', error instanceof Error ? error : undefined);
          }
        }
      } catch (error) {
        logger.error('Batch claimable link creation failed', error instanceof Error ? error : undefined);

        // Fall back to individual creation
        for (const recipient of recipients) {
          results.push({
            recipient,
            success: false,
            error: 'Batch creation failed, manual creation required',
            protocol: 'peanut-protocol' as Protocol,
            gasUsed: '0',
          });
        }
      }
    } else {
      // Individual link creation
      logger.info('Creating individual claimable links');

      for (const recipient of recipients) {
        try {
          const peanutService = await this.getPeanutService(params.peanutGasPrivateKey);
          const linkResult = await peanutService.createClaimLink({
            chainId: params.fromChainId,
            tokenAmount: parseFloat(recipient.amount),
            tokenSymbol: params.tokenSymbol as SupportedCurrency,
            wallet,
            recipientEmail: recipient.address,
            recipientName: recipient.name,
            teamId: params.teamId!,
            payrollId: params.payrollId,
          });

          if (linkResult.success && linkResult.link) {
            const { data: claimData, error: claimError } = await createPaymentClaim(
              this.supabase,
              {
                recipientEmail: recipient.address,
                recipientName: recipient.name,
                amount: parseFloat(recipient.amount),
                currency: params.tokenSymbol,
                peanutLink: linkResult.link,
                peanutPassword: linkResult.linkPassword,
                transactionHash: linkResult.transactionHash,
                payrollId: params.payrollId,
                teamId: params.teamId!,
                feeMetadata: feeMetadata ?? undefined,
                originalRecipient: recipient,
              }
            );

            if (claimError) throw claimError;
            const claimCode = claimData!.claimCode;

            results.push({
              recipient,
              success: true,
              transactionHash: linkResult.transactionHash,
              claimLink: linkResult.link,
              claimCode,
              protocol: 'peanut-protocol' as Protocol,
              gasUsed: '0',
            });
          } else {
            results.push({
              recipient,
              success: false,
              error: linkResult.error || 'Failed to create claimable link',
              protocol: 'peanut-protocol' as Protocol,
              gasUsed: '0',
            });
          }
        } catch (error) {
          logger.error('Individual link creation failed', error instanceof Error ? error : undefined);

          results.push({
            recipient,
            success: false,
            error: error instanceof Error ? error.message : 'Link creation failed',
            protocol: 'peanut-protocol' as Protocol,
            gasUsed: '0',
          });
        }
      }
    }

    logger.info('Claimable link creation completed', {
      successful: results.filter(r => r.success).length,
      total: results.length,
    });

    return results;
  }

  /**
   * Execute direct transfers for established contractors (existing logic enhanced)
   */
  private async executeDirectTransfers(
    recipients: BatchTransferRecipient[],
    params: BatchTransferParams,
    wallet: WalletInfo
  ): Promise<
    Array<{
      recipient: BatchTransferRecipient;
      success: boolean;
      transactionHash?: string;
      error?: string;
      protocol?: Protocol;
      gasUsed?: string;
    }>
  > {
    if (recipients.length === 0) {
      logger.debug('No direct transfer recipients to process');
      return [];
    }

    logger.info('Executing direct transfers for established contractors', { count: recipients.length });

    // Use existing batch payment logic for direct transfers
    const directTransferParams: BatchTransferParams = {
      ...params,
      recipients,
    };

    // Execute using existing optimized batch transfer logic
    try {
      const transferGroups = await this.optimizeTransferGroups(directTransferParams, wallet);
      const results = await this.executeTransferGroupsWithAtomicBatching(
        transferGroups,
        directTransferParams,
        wallet
      );

      return results;
    } catch (error) {
      logger.error('Direct transfers failed', error instanceof Error ? error : undefined);

      return recipients.map(recipient => ({
        recipient,
        success: false,
        error: error instanceof Error ? error.message : 'Direct transfer failed',
        protocol: 'circle-sdk' as Protocol,
        gasUsed: '0',
      }));
    }
  }

  /**
   * Check if string is a valid wallet address (EVM or Solana)
   */
  private isValidWalletAddress(address: string): boolean {
    return isValidBlockchainAddress(address);
  }

  /**
   * Check if string is an email address
   */
  private isEmailAddress(address: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address);
  }

  /**
   * Compile progressive enhancement results with metrics
   */
  private compileProgressiveResults(
    results: Array<{
      recipient: BatchTransferRecipient;
      success: boolean;
      transactionHash?: string;
      claimLink?: string;
      claimCode?: string;
      error?: string;
      protocol?: Protocol;
      gasUsed?: string;
    }>,
    recipientAnalysis: {
      directTransferRecipients: BatchTransferRecipient[];
      claimableLinkRecipients: BatchTransferRecipient[];
      routingDecisions: Array<{
        recipient: BatchTransferRecipient;
        routingMethod: 'direct_transfer' | 'claimable_link';
        reason: string;
        hasWalletAddress: boolean;
        hasClaimedBefore: boolean;
      }>;
    },
    executionTimeMs: number
  ): BatchTransferResult {
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    const totalGasUsed = results.reduce((total, result) => {
      return total + BigInt(result.gasUsed || '0');
    }, 0n);

    const protocolBreakdown: Record<Protocol, number> = {} as Record<Protocol, number>;
    results.forEach(result => {
      if (result.protocol) {
        protocolBreakdown[result.protocol] = (protocolBreakdown[result.protocol] || 0) + 1;
      }
    });

    // Progressive enhancement metrics
    const directTransferCount = recipientAnalysis.directTransferRecipients.length;
    const claimableLinkCount = recipientAnalysis.claimableLinkRecipients.length;
    const newContractorCount = recipientAnalysis.routingDecisions.filter(
      d => !d.hasClaimedBefore && d.routingMethod === 'claimable_link'
    ).length;
    const establishedContractorCount = recipientAnalysis.routingDecisions.filter(
      d => d.hasClaimedBefore && d.routingMethod === 'direct_transfer'
    ).length;
    const graduationRate =
      directTransferCount + claimableLinkCount > 0
        ? (establishedContractorCount / (directTransferCount + claimableLinkCount)) * 100
        : 0;

    return {
      success: failed.length === 0,
      totalTransfers: results.length,
      successfulTransfers: successful.length,
      failedTransfers: failed.length,
      results: results.map(r => ({
        recipient: r.recipient,
        success: r.success,
        transactionHash: r.transactionHash,
        error: r.error,
        protocol: r.protocol,
        gasUsed: r.gasUsed,
        claimLink: r.claimLink,
        claimCode: r.claimCode,
      })),
      totalGasUsed: totalGasUsed.toString(),
      executionTimeMs,
      optimization: {
        sameChainCount: recipientAnalysis.directTransferRecipients.length,
        crossChainCount: 0, // All same-chain for now
        protocolBreakdown,
      },
      progressiveEnhancement: {
        directTransferCount,
        claimableLinkCount,
        newContractorCount,
        establishedContractorCount,
        graduationRate,
      },
    };
  }

  /**
   * Prepare wallet context using single-wallet architecture
   */
  private async prepareWalletContext(params: BatchTransferParams): Promise<WalletInfo> {
    if (params.primaryWalletId) {
      return {
        walletId: params.primaryWalletId,
        walletAddress: params.primaryWalletAddress || '',
        walletSetId: params.walletSetId || '',
      };
    }

    // Fallback to legacy lookup
    const transferParams = {
      fromChainId: params.fromChainId,
      toChainId: params.fromChainId, // Dummy for wallet lookup
      amount: '1',
      tokenSymbol: params.tokenSymbol,
      recipientAddress: '0x0000000000000000000000000000000000000000',
      teamId: params.teamId,
      userId: params.userId,
    } as TransferParams;

    return await this.walletService.getTeamWallet(transferParams);
  }

  /**
   * Enhanced transfer group optimization with mixed network intelligence
   */
  private async optimizeTransferGroups(
    params: BatchTransferParams,
    wallet: WalletInfo
  ): Promise<TransferGroup[]> {
    logger.info('Optimizing transfer groups with mixed-network intelligence');

    const groups: TransferGroup[] = [];
    const chainGroups = new Map<number, BatchTransferRecipient[]>();

    // Analyze recipient distribution
    const networkAnalysis = this.analyzeRecipientDistribution(params);
    logger.debug('Network distribution analysis', networkAnalysis);

    // Group recipients by destination chain
    for (const recipient of params.recipients) {
      const chainId = recipient.chainId || params.fromChainId;
      if (!chainGroups.has(chainId)) {
        chainGroups.set(chainId, []);
      }
      chainGroups.get(chainId)!.push(recipient);
    }

    let executionOrder = 0;

    // 🔥 PRIORITY 1: ATOMIC same-chain batches (highest efficiency)
    for (const [chainId, recipients] of chainGroups) {
      const isSameChain = chainId === params.fromChainId;

      if (isSameChain && params.tokenSymbol === 'USDC' && recipients.length > 1) {
        logger.info('ATOMIC PRIORITY: same-chain recipients in 1 atomic transaction', { count: recipients.length });

        groups.push({
          chainId,
          protocol: 'circle-batch' as Protocol,
          recipients,
          estimatedGasCost: 0n,
          executionOrder: executionOrder++,
          batchType: 'atomic-same-chain', // New field for UX tracking
        });
        continue;
      }
    }

    // 🎯 PRIORITY 2: Same-chain transfers using Circle SDK
    // Note: Same-chain transfers should use Circle SDK directly
    for (const [chainId, recipients] of chainGroups) {
      const isSameChain = chainId === params.fromChainId;

      if (isSameChain && (params.tokenSymbol === 'USDC' || params.tokenSymbol === 'EURC')) {
        logger.info('SAME-CHAIN: recipients using Circle SDK', { count: recipients.length });

        // Use circle-sdk protocol for same-chain transfers
        groups.push({
          chainId,
          protocol: 'circle-sdk' as Protocol,
          recipients,
          estimatedGasCost: 0n,
          executionOrder: executionOrder++,
          batchType: 'same-chain-fallback',
        });
        continue;
      }
    }

    logger.debug('Same-chain transfers routed to Circle SDK');

    // 🌉 PRIORITY 3: Cross-chain transfers via Bridge Kit
    for (const [chainId, recipients] of chainGroups) {
      const isSameChain = chainId === params.fromChainId;

      if (!isSameChain) {
        logger.info('CROSS-CHAIN BRIDGE', { recipients: recipients.length, chainId });

        groups.push({
          chainId,
          protocol: 'bridge-kit' as Protocol,
          recipients,
          estimatedGasCost: 0n,
          executionOrder: executionOrder++,
          batchType: 'atomic-cross-chain',
        });
        continue;
      }
    }

    // 🔄 PRIORITY 4: Fallback protocols with optimization
    for (const [chainId, recipients] of chainGroups) {
      const isSameChain = chainId === params.fromChainId;

      // Skip if already processed by higher priority protocols
      if (groups.some(g => g.chainId === chainId)) continue;

      logger.info('FALLBACK: Optimizing route', { recipients: recipients.length, chainId });

      const sampleTransfer: TransferParams = {
        fromChainId: params.fromChainId,
        toChainId: chainId,
        amount: recipients[0]!.amount,
        tokenSymbol: params.tokenSymbol as SupportedCurrency,
        recipientAddress: recipients[0]!.address,
      };

      try {
        const estimates = await this.gasService.estimateAll(sampleTransfer, wallet);
        const bestRoute = this.routeService.selectOptimal(estimates);

        if (bestRoute.available) {
          groups.push({
            chainId,
            protocol: bestRoute.protocol,
            recipients,
            estimatedGasCost: bestRoute.totalGasCost * BigInt(recipients.length),
            executionOrder: executionOrder++,
            batchType: 'same-chain-fallback',
          });
        }
      } catch (error) {
        logger.error('Failed to estimate route', error instanceof Error ? error : undefined);
      }
    }

    // Enhanced sorting with mixed-network intelligence
    return this.sortGroupsByOptimalExecution(groups, networkAnalysis);
  }

  /**
   * Analyze recipient distribution for mixed-network optimization
   */
  private analyzeRecipientDistribution(params: BatchTransferParams): {
    sameChainCount: number;
    crossChainCount: number;
    uniqueDestinations: number;
    canUseAtomicBatching: boolean;
    recommendedStrategy: 'atomic-first' | 'parallel-mixed' | 'sequential-optimized';
  } {
    const chainCounts = new Map<number, number>();

    for (const recipient of params.recipients) {
      const chainId = recipient.chainId || params.fromChainId;
      chainCounts.set(chainId, (chainCounts.get(chainId) || 0) + 1);
    }

    const sameChainCount = chainCounts.get(params.fromChainId) || 0;
    const crossChainCount = params.recipients.length - sameChainCount;
    const uniqueDestinations = chainCounts.size;

    // Determine if atomic batching is beneficial
    const canUseAtomicBatching = sameChainCount > 1 && params.tokenSymbol === 'USDC';

    // Recommend execution strategy
    let recommendedStrategy: 'atomic-first' | 'parallel-mixed' | 'sequential-optimized';

    if (canUseAtomicBatching && crossChainCount <= 2) {
      recommendedStrategy = 'atomic-first'; // Atomic same-chain batch + parallel cross-chain
    } else if (uniqueDestinations <= 3 && crossChainCount > 0) {
      recommendedStrategy = 'parallel-mixed'; // Parallel execution across all chains
    } else {
      recommendedStrategy = 'sequential-optimized'; // Sequential with intelligent ordering
    }

    return {
      sameChainCount,
      crossChainCount,
      uniqueDestinations,
      canUseAtomicBatching,
      recommendedStrategy,
    };
  }

  /**
   * Sort groups for optimal mixed-network execution
   */
  private sortGroupsByOptimalExecution(
    groups: TransferGroup[],
    analysis: ReturnType<typeof BatchPaymentService.prototype.analyzeRecipientDistribution>
  ): TransferGroup[] {
    return groups.sort((a, b) => {
      // Priority 1: Atomic same-chain batches first (highest efficiency)
      if (a.protocol === 'circle-batch' && b.protocol !== 'circle-batch') return -1;
      if (a.protocol !== 'circle-batch' && b.protocol === 'circle-batch') return 1;

      // Priority 2: Cross-chain bridge-kit
      if (a.protocol === 'bridge-kit' && b.protocol !== 'bridge-kit') return -1;
      if (a.protocol !== 'bridge-kit' && b.protocol === 'bridge-kit') return 1;

      // Priority 3: Larger recipient groups first (batching efficiency)
      if (a.recipients.length !== b.recipients.length) {
        return b.recipients.length - a.recipients.length;
      }

      // Priority 4: Lower gas cost first
      if (a.estimatedGasCost !== b.estimatedGasCost) {
        return Number(a.estimatedGasCost - b.estimatedGasCost);
      }

      return a.executionOrder - b.executionOrder;
    });
  }

  /**
   * Execute transfer groups with ATOMIC batch execution when possible
   */
  private async executeTransferGroupsWithAtomicBatching(
    groups: TransferGroup[],
    params: BatchTransferParams,
    wallet: WalletInfo
  ): Promise<
    Array<{
      recipient: BatchTransferRecipient;
      success: boolean;
      transactionHash?: string;
      error?: string;
      protocol?: Protocol;
      gasUsed?: string;
    }>
  > {
    const maxConcurrency = params.maxConcurrency || 3;
    const results: Array<{
      recipient: BatchTransferRecipient;
      success: boolean;
      transactionHash?: string;
      error?: string;
      protocol?: Protocol;
      gasUsed?: string;
    }> = [];

    logger.info('Executing groups with ATOMIC batching', { groups: groups.length, maxConcurrency });

    // Process groups in order (atomic batches first, then circle-sdk, then cross-chain)
    for (const group of groups) {
      logger.info('Processing group', { recipients: group.recipients.length, chainId: group.chainId, protocol: group.protocol });

      if (group.protocol === 'circle-batch') {
        const groupResults = await this.executeAtomicBatchGroup(group, params, wallet);
        results.push(...groupResults);
      } else if (group.protocol === 'circle-sdk') {
        const groupResults = await this.executeCircleSDKGroup(group, params, wallet);
        results.push(...groupResults);
      } else if (group.protocol === 'bridge-kit') {
        const groupResults = await this.executeBridgeKitGroup(group, params, wallet);
        results.push(...groupResults);
      } else {
        const groupResults = await this.executeConcurrentGroup(
          group,
          params,
          wallet,
          maxConcurrency
        );
        results.push(...groupResults);
      }
    }

    return results;
  }

  /**
   * Execute ATOMIC batch transfers using Circle's native batch operations
   */
  private async executeAtomicBatchGroup(
    group: TransferGroup,
    params: BatchTransferParams,
    wallet: WalletInfo
  ): Promise<
    Array<{
      recipient: BatchTransferRecipient;
      success: boolean;
      transactionHash?: string;
      error?: string;
      protocol?: Protocol;
      gasUsed?: string;
    }>
  > {
    logger.info('Executing ATOMIC batch', { transfers: group.recipients.length });

    try {
      const result = await this.circleBatchExecutor.executeBatchTransfers(
        group.recipients,
        group.chainId,
        params.tokenSymbol as SupportedCurrency,
        wallet
      );

      if (result.success) {
        logger.info('ATOMIC batch completed', { transfers: group.recipients.length, txHash: result.transactionHash });

        return group.recipients.map(recipient => ({
          recipient,
          success: true,
          transactionHash: result.transactionHash,
          protocol: 'circle-batch' as Protocol,
          gasUsed: '0',
        }));
      } else {
        logger.error('ATOMIC batch failed', { error: result.error });

        return group.recipients.map(recipient => ({
          recipient,
          success: false,
          error: result.error || 'Atomic batch transfer failed',
          protocol: 'circle-batch' as Protocol,
          gasUsed: '0',
        }));
      }
    } catch (error) {
      logger.error('ATOMIC batch execution error', error instanceof Error ? error : undefined);

      return group.recipients.map(recipient => ({
        recipient,
        success: false,
        error: error instanceof Error ? error.message : 'Atomic batch execution failed',
        protocol: 'circle-batch' as Protocol,
        gasUsed: '0',
      }));
    }
  }

  /**
   * Execute cross-chain transfers via Bridge Kit (one per recipient)
   */
  private async executeBridgeKitGroup(
    group: TransferGroup,
    params: BatchTransferParams,
    wallet: WalletInfo
  ): Promise<
    Array<{
      recipient: BatchTransferRecipient;
      success: boolean;
      transactionHash?: string;
      error?: string;
      protocol?: Protocol;
      gasUsed?: string;
    }>
  > {
    logger.info('Executing cross-chain transfers via Bridge Kit', { count: group.recipients.length });

    const results: Array<{
      recipient: BatchTransferRecipient;
      success: boolean;
      transactionHash?: string;
      error?: string;
      protocol?: Protocol;
      gasUsed?: string;
    }> = [];

    for (const recipient of group.recipients) {
      try {
        const transferParams: TransferParams = {
          fromChainId: params.fromChainId,
          toChainId: group.chainId,
          amount: recipient.amount,
          tokenSymbol: params.tokenSymbol as SupportedCurrency,
          recipientAddress: recipient.address,
          teamId: params.teamId,
          userId: params.userId,
          primaryWalletId: params.primaryWalletId,
          primaryWalletAddress: params.primaryWalletAddress,
          walletSetId: params.walletSetId,
          // Forward fee fields from batch params
          ...(params.platformFee && { platformFee: params.platformFee }),
          ...(params.feeRecipientAddress && { feeRecipientAddress: params.feeRecipientAddress }),
          ...(params.transferSpeed && { transferSpeed: params.transferSpeed }),
          ...(params.maxFee && { maxFee: params.maxFee }),
        };

        const estimate = await this.bridgeKitExecutor.estimate(transferParams, wallet);
        const result = await this.bridgeKitExecutor.execute({
          ...transferParams,
          wallet,
          estimate,
        });

        if (result.success) {
          logger.info('Bridge Kit transfer completed', { txHash: result.transactionHash });
          results.push({
            recipient,
            success: true,
            transactionHash: result.transactionHash,
            protocol: 'bridge-kit' as Protocol,
            gasUsed: '0',
          });
        } else {
          logger.error('Bridge Kit transfer failed', { error: result.error });
          results.push({
            recipient,
            success: false,
            error: result.error || 'Bridge Kit transfer failed',
            protocol: 'bridge-kit' as Protocol,
            gasUsed: '0',
          });
        }
      } catch (error) {
        logger.error('Bridge Kit execution error', error instanceof Error ? error : undefined);
        results.push({
          recipient,
          success: false,
          error: error instanceof Error ? error.message : 'Bridge Kit execution failed',
          protocol: 'bridge-kit' as Protocol,
          gasUsed: '0',
        });
      }
    }

    return results;
  }



  /**
   * Execute group with controlled concurrency
   */
  private async executeConcurrentGroup(
    group: TransferGroup,
    params: BatchTransferParams,
    wallet: WalletInfo,
    maxConcurrency: number
  ): Promise<
    Array<{
      recipient: BatchTransferRecipient;
      success: boolean;
      transactionHash?: string;
      error?: string;
      protocol?: Protocol;
      gasUsed?: string;
    }>
  > {
    logger.info('Executing concurrent group', { transfers: group.recipients.length, maxConcurrency });

    const results = [];

    for (let i = 0; i < group.recipients.length; i += maxConcurrency) {
      const batch = group.recipients.slice(i, i + maxConcurrency);

      logger.debug('Processing batch', { batchNum: Math.floor(i / maxConcurrency) + 1, transfers: batch.length });

      const batchPromises = batch.map(async recipient => {
        try {
          const transferParams: TransferParams = {
            fromChainId: params.fromChainId,
            toChainId: group.chainId,
            amount: recipient.amount,
            tokenSymbol: params.tokenSymbol as SupportedCurrency,
            recipientAddress: recipient.address,
            primaryWalletId: params.primaryWalletId,
            primaryWalletAddress: params.primaryWalletAddress,
            walletSetId: params.walletSetId,
          };

          logger.debug('Executing transfer', { amount: recipient.amount, tokenSymbol: params.tokenSymbol, protocol: group.protocol });

          const result = await this.transferService.execute(transferParams);

          return {
            recipient,
            success: result.success,
            transactionHash: result.transactionHash,
            error: result.error,
            protocol: group.protocol,
            gasUsed: result.gasUsed || '0',
          };
        } catch (error) {
          logger.error('Transfer failed', error instanceof Error ? error : undefined);

          return {
            recipient,
            success: false,
            error: error instanceof Error ? error.message : 'Transfer failed',
            protocol: group.protocol,
            gasUsed: '0',
          };
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          logger.error('Batch promise rejected', { reason: result.reason });
          results.push({
            recipient: batch[0]!,
            success: false,
            error: 'Batch execution failed',
            protocol: group.protocol,
            gasUsed: '0',
          });
        }
      }

      if (i + maxConcurrency < group.recipients.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  /**
   * Execute Circle SDK group (same-chain transfers using Circle SDK directly)
   */
  private async executeCircleSDKGroup(
    group: TransferGroup,
    params: BatchTransferParams,
    wallet: WalletInfo
  ): Promise<
    Array<{
      recipient: BatchTransferRecipient;
      success: boolean;
      transactionHash?: string;
      error?: string;
      protocol?: Protocol;
      gasUsed?: string;
    }>
  > {
    logger.info('Executing Circle SDK group', { transfers: group.recipients.length });

    const results = [];

    for (const recipient of group.recipients) {
      try {
        logger.debug('Executing Circle SDK transfer', { amount: recipient.amount, tokenSymbol: params.tokenSymbol });

        // Prepare transfer parameters for CircleSDKExecutor
        const transferParams = {
          fromChainId: params.fromChainId,
          toChainId: params.fromChainId, // Same chain
          tokenSymbol: params.tokenSymbol as SupportedCurrency,
          amount: recipient.amount,
          recipientAddress: recipient.address,
          teamId: params.teamId,
          userId: params.userId,
          primaryWalletId: wallet.walletId,
          primaryWalletAddress: wallet.walletAddress,
          walletSetId: wallet.walletSetId,
        };

        // Get gas estimate
        const estimate = await this.circleSDKExecutor.estimate(transferParams, wallet);

        // Execute the transfer
        const result = await this.circleSDKExecutor.execute({
          ...transferParams,
          wallet,
          estimate,
        });

        if (result.success) {
          logger.info('Circle SDK transfer completed', { txHash: result.transactionHash });

          results.push({
            recipient,
            success: true,
            transactionHash: result.transactionHash,
            protocol: 'circle-sdk' as Protocol,
            gasUsed: result.gasUsed || '0',
          });
        } else {
          logger.error('Circle SDK transfer failed', { error: result.error });

          results.push({
            recipient,
            success: false,
            error: result.error || 'Circle SDK transfer failed',
            protocol: 'circle-sdk' as Protocol,
            gasUsed: '0',
          });
        }
      } catch (error) {
        logger.error('Circle SDK transfer error', error instanceof Error ? error : undefined);

        results.push({
          recipient,
          success: false,
          error: error instanceof Error ? error.message : 'Circle SDK transfer failed',
          protocol: 'circle-sdk' as Protocol,
          gasUsed: '0',
        });
      }
    }

    return results;
  }

  /**
   * Compile final results with comprehensive statistics
   */
  private compileResults(
    results: Array<{
      recipient: BatchTransferRecipient;
      success: boolean;
      transactionHash?: string;
      error?: string;
      protocol?: Protocol;
      gasUsed?: string;
    }>,
    groups: TransferGroup[],
    executionTimeMs: number
  ): BatchTransferResult {
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    const totalGasUsed = results.reduce((total, result) => {
      return total + BigInt(result.gasUsed || '0');
    }, 0n);

    const protocolBreakdown: Record<Protocol, number> = {} as Record<Protocol, number>;
    const sameChainCount = results.filter(r => {
      const recipientChainId = r.recipient.chainId || groups[0]?.chainId;
      return recipientChainId === groups[0]?.chainId;
    }).length;

    results.forEach(result => {
      if (result.protocol) {
        protocolBreakdown[result.protocol] = (protocolBreakdown[result.protocol] || 0) + 1;
      }
    });

    return {
      success: failed.length === 0,
      totalTransfers: results.length,
      successfulTransfers: successful.length,
      failedTransfers: failed.length,
      results,
      totalGasUsed: totalGasUsed.toString(),
      executionTimeMs,
      optimization: {
        sameChainCount,
        crossChainCount: results.length - sameChainCount,
        protocolBreakdown,
      },
    };
  }
}
