import type {
  GasEstimate,
  Protocol,
  TransferParams,
  TransferResult,
  WalletInfo,
} from '@bu/types/transfer-execution';
import { ChainService } from '../../services/ChainService';
import { ContractService } from '../../services/ContractService';

export abstract class BaseProtocolExecutor {
  constructor(
    protected chain: ChainService,
    protected contract: ContractService
  ) {}

  abstract estimate(params: TransferParams, wallet: WalletInfo): Promise<GasEstimate>;
  abstract execute(
    params: TransferParams & { wallet: WalletInfo; estimate: GasEstimate }
  ): Promise<TransferResult>;
}
