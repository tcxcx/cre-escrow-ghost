import type { SupabaseClient } from '@supabase/supabase-js';
import type { TransferParams, TransferResult, WalletInfo } from '@bu/types/transfer-execution';
import { WalletService } from './WalletService';
import { ChainService } from './ChainService';
import { ContractService } from './ContractService';
import { GasEstimationService } from './GasEstimationService';
import { RouteOptimizationService } from './RouteOptimizationService';
import { BridgeKitExecutor } from '../protocols/bridge-kit';
import { CircleSDKExecutor } from '../protocols/circle-sdk';
import { getCircleBlockchainName } from '../utils/blockchain';
import { createLogger } from '@bu/logger';

const logger = createLogger({ prefix: 'transfer-core:transfer', theme: 'minimal' });

export class TransferService {
  private chain = new ChainService();
  private contract = new ContractService(this.chain);
  private walletSvc: WalletService;
  private gasSvc = new GasEstimationService(this.chain, this.contract);
  private routeSvc = new RouteOptimizationService();
  private executors: Record<string, BridgeKitExecutor | CircleSDKExecutor>;

  constructor(private supabase: SupabaseClient) {
    this.walletSvc = new WalletService(supabase);
    this.executors = {
      'bridge-kit': new BridgeKitExecutor(),
      'circle-sdk': new CircleSDKExecutor(this.chain, this.contract),
    };
  }

  async execute(params: TransferParams): Promise<TransferResult> {
    logger.info('Execute called', {
      fromChainId: params.fromChainId,
      toChainId: params.toChainId,
      amount: params.amount,
      tokenSymbol: params.tokenSymbol,
      primaryWalletId: params.primaryWalletId,
      teamId: params.teamId,
      userId: params.userId,
    });

    // Use wallet context provided by API route (single wallet for both funding and signing)
    let wallet: WalletInfo;

    if (params.primaryWalletId) {
      // ✅ NEW: Use pre-validated single wallet context from API route
      // Validate required wallet properties
      if (!params.primaryWalletAddress) {
        const error = 'Primary wallet address is required but was not provided. The wallet may not be fully initialized in the database.';
        logger.error(error, {
          primaryWalletId: params.primaryWalletId,
          primaryWalletAddress: params.primaryWalletAddress,
        });
        throw new Error(error);
      }

      wallet = {
        walletId: params.primaryWalletId,
        walletAddress: params.primaryWalletAddress,
        walletSetId: params.walletSetId || '', // walletSetId may be optional
      };

      logger.info('Using provided wallet', wallet);

      // Validate wallet chain matches fromChainId (if primaryWalletBlockchain is provided)
      // Note: API route should guarantee correctness, but we add validation here as a safety check
      if (params.primaryWalletBlockchain) {
        const expectedBlockchain = getCircleBlockchainName(params.fromChainId);
        logger.info('Validating blockchain match', {
          providedBlockchain: params.primaryWalletBlockchain,
          expectedBlockchain
        });
        if (params.primaryWalletBlockchain !== expectedBlockchain) {
          const error = `Wallet chain mismatch: Selected wallet (${params.primaryWalletId}) is on ${params.primaryWalletBlockchain} but transfer requires ${expectedBlockchain} (chainId: ${params.fromChainId})`;
          logger.error(error);
          throw new Error(error);
        }
      }
    } else {
      // ❌ FALLBACK: Legacy lookup (will be removed in future)
      logger.info('Using fallback wallet lookup');
      wallet = await this.walletSvc.getTeamWallet(params);
      logger.info('Fallback wallet found', wallet);
    }

    // Estimate gas for available protocols with detailed logging
    logger.info('Estimating gas for all protocols');
    const estimates = await this.gasSvc.estimateAll(params, wallet);
    logger.info('Gas estimates', estimates);

    // Select optimal route
    const best = this.routeSvc.selectOptimal(estimates);
    logger.info('Selected optimal route', {
      protocol: best.protocol,
      available: best.available,
      estimatedGas: best.estimatedGas
    });

    // Execute transfer
    const executor = this.executors[best.protocol as keyof typeof this.executors];
    if (!executor) {
      const error = `No executor found for protocol ${best.protocol}`;
      logger.error(error);
      throw new Error(error);
    }

    // If we have a valid estimate for a protocol, execute the transfer
    if (best.available) {
      const result = await executor.execute({ ...params, wallet, estimate: best });
      return result;
    }

    // If no protocol is available, throw an error
    const error = `No available protocol found for this transfer route`;
    logger.error(error);
    throw new Error(error);
  }

}
