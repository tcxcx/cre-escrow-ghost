import type { GasEstimate, Protocol, TransferParams, WalletInfo } from '@bu/types/transfer-execution';
import { ChainService } from './ChainService';
import { ContractService } from './ContractService';
import { BridgeKitExecutor } from '../protocols/bridge-kit';
import { CircleSDKExecutor } from '../protocols/circle-sdk';
import { getSupportedProtocols } from '../constants/Chains';

export class GasEstimationService {
  private bridgeKit: BridgeKitExecutor;
  private circleSDK: CircleSDKExecutor;

  constructor(
    private chain: ChainService,
    private contract: ContractService
  ) {
    this.bridgeKit = new BridgeKitExecutor();
    this.circleSDK = new CircleSDKExecutor(this.chain, this.contract);
  }

  async estimateAll(params: TransferParams, wallet: WalletInfo): Promise<GasEstimate[]> {
    const estimates: Promise<GasEstimate>[] = [];
    const src = getSupportedProtocols(params.fromChainId);
    const dst = getSupportedProtocols(params.toChainId);

    // Cross-chain transfers via Bridge Kit
    if (params.fromChainId !== params.toChainId) {
      if (src.bridgeKit && dst.bridgeKit) {
        estimates.push(this.bridgeKit.estimate(params, wallet));
      }
    }

    // Same-chain transfers via Circle SDK
    if (params.fromChainId === params.toChainId) {
      if (params.tokenSymbol === 'USDC' || params.tokenSymbol === 'EURC') {
        estimates.push(this.circleSDK.estimate(params, wallet));
      }
    }

    if (estimates.length === 0) {
      return [];
    }

    const settledResults = await Promise.allSettled(estimates);

    return settledResults.map((result) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        const protocol = result.reason?.protocol || 'unknown';
        return {
          protocol: protocol as Protocol,
          totalGasCost: 0n,
          gasPrice: 0n,
          estimatedGas: 0n,
          available: false,
        };
      }
    });
  }
}
