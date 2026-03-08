import { CHAIN_IDS_TO_USDC_ADDRESSES, CHAIN_IDS_TO_EURC_ADDRESSES } from './chain-constants';
import { getBridgeChainName } from './bridge-routes';

export class ProtocolConfig {
  static bridgeKit = {
    getChainName(chainId: number) {
      return getBridgeChainName(chainId);
    },
    getUsdc(chainId: number) {
      return CHAIN_IDS_TO_USDC_ADDRESSES[chainId]!;
    },
    getEurc(chainId: number) {
      return CHAIN_IDS_TO_EURC_ADDRESSES[chainId]!;
    },
  };
}
