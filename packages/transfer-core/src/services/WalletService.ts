import type { SupabaseClient } from '@supabase/supabase-js';
import type { WalletMainType } from '@bu/types/wallets';
import {
  WALLET_COLUMNS_STRING,
  EVM_SIGNING_EXCLUDE_FILTER,
} from '@bu/wallets';
import type { WalletInfo, TransferParams } from '@bu/types/transfer-execution';
import { getCircleBlockchainName } from '../utils/blockchain';

interface WalletQueryRow {
  id: string;
  circle_wallet_id: string;
  user_id: string | null;
  team_id: string | null;
  wallet_type: string | null;
  wallet_set_id: string | null;
  wallet_address: string;
  account_type: string | null;
  blockchain: string;
  currency: string | null;
  main_type: string;
  evm_signing: boolean | null;
  is_primary: boolean | null;
  created_at: string;
  updated_at: string;
}

export class WalletService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Find the primary team wallet for transfers (single-wallet architecture)
   * This wallet both holds funds and signs transactions
   */
  async findPrimaryWallet(teamId: string, sourceChain: string): Promise<WalletQueryRow> {
    // Find the primary wallet (holds funds and signs transactions)
    const { data: primaryWallet, error: primaryError } = await this.supabase
      .from('wallets')
      .select(WALLET_COLUMNS_STRING)
      .eq('team_id', teamId)
      .eq('blockchain', sourceChain)
      .eq('main_type', 'team')
      .eq('is_primary', true)
      .returns<WalletQueryRow>()
      .single();

    if (primaryError || !primaryWallet) {
      throw new Error(`Primary wallet for ${sourceChain} not found for team ${teamId}`);
    }

    return primaryWallet;
  }

  private getSourceChainFromParams(params: TransferParams): string {
    const chainId = params.fromChainId;
    if (!chainId) {
      throw new Error('Chain ID is required');
    }
    return getCircleBlockchainName(chainId);
}

  async getTeamWallet(params: TransferParams): Promise<WalletInfo> {
    // Use the single-wallet architecture
    const sourceChain = this.getSourceChainFromParams(params);

    // Handle both team and individual wallet testing
    if (params.teamId) {
      const primaryWallet = await this.findPrimaryWallet(params.teamId, sourceChain);
      return {
        walletId: primaryWallet.circle_wallet_id,
        walletAddress: primaryWallet.wallet_address,
        walletSetId: primaryWallet.wallet_set_id ?? '',
      };
    } else if (params.userId) {
      // For individual wallet testing
      const primaryWallet = await this.findIndividualWallet(params.userId, sourceChain);
      return {
        walletId: primaryWallet.circle_wallet_id,
        walletAddress: primaryWallet.wallet_address,
        walletSetId: primaryWallet.wallet_set_id ?? '',
      };
    } else {
      throw new Error('Either teamId or userId must be provided');
    }
  }

  /**
   * Find the primary individual wallet for testing
   */
  async findIndividualWallet(userId: string, sourceChain: string): Promise<WalletQueryRow> {
    const { data: primaryWallet, error: primaryError } = await this.supabase
      .from('wallets')
      .select(WALLET_COLUMNS_STRING)
      .eq('user_id', userId)
      .eq('blockchain', sourceChain)
      .eq('main_type', 'individual')
      .or(EVM_SIGNING_EXCLUDE_FILTER) // Catches both NULL and false evm_signing
      .returns<WalletQueryRow>()
      .single();

    if (primaryError || !primaryWallet) {
      throw new Error(`Primary individual wallet for ${sourceChain} not found for user ${userId}`);
    }

    return primaryWallet;
  }

  /**
   * Find the EVM-TESTNET signing wallet for paymaster operations
   * This wallet is used to get private keys for EIP-7702 smart account creation
   */
  async findSigningWallet(teamId: string, sourceChain: string): Promise<WalletQueryRow> {
    // Look for EVM-TESTNET signing wallet in the same wallet set
    const { data: signingWallet, error: signingError } = await this.supabase
      .from('wallets')
      .select(WALLET_COLUMNS_STRING)
      .eq('team_id', teamId)
      .eq('blockchain', 'EVM-TESTNET')
      .eq('main_type', 'team')
      .eq('evm_signing', true)
      .returns<WalletQueryRow>()
      .single();

    if (signingError || !signingWallet) {
      throw new Error(`EVM-TESTNET signing wallet not found for team ${teamId}`);
    }

    return signingWallet;
  }

  /**
   * Find individual EVM-TESTNET signing wallet for paymaster operations
   */
  async findIndividualSigningWallet(userId: string): Promise<WalletQueryRow> {
    // Look for EVM-TESTNET signing wallet for individual user
    const { data: signingWallet, error: signingError } = await this.supabase
      .from('wallets')
      .select(WALLET_COLUMNS_STRING)
      .eq('user_id', userId)
      .eq('blockchain', 'EVM-TESTNET')
      .eq('main_type', 'individual')
      .eq('evm_signing', true)
      .returns<WalletQueryRow>()
      .single();

    if (signingError || !signingWallet) {
      throw new Error(`Individual EVM-TESTNET signing wallet not found for user ${userId}`);
    }

    return signingWallet;
  }

  /**
   * Find EVM-TESTNET wallet by wallet_set_id for signing operations
   * This is used when we need to find the signing wallet in the same wallet set
   * Now supports both team and individual wallet types
   */
  async findEvmWalletByWalletSetId(
    walletSetId: string,
    walletType?: WalletMainType
  ): Promise<WalletQueryRow> {
    // Build query with optional wallet type filter
    let query = this.supabase
      .from('wallets')
      .select(WALLET_COLUMNS_STRING)
      .eq('wallet_set_id', walletSetId)
      .eq('blockchain', 'EVM-TESTNET')
      .eq('evm_signing', true);

    // Add wallet type filter if specified
    if (walletType) {
      query = query.eq('main_type', walletType);
    }

    const { data: evmWallet, error: evmError } = await query.returns<WalletQueryRow>().single();

    if (evmError || !evmWallet) {
      throw new Error(
        `EVM-TESTNET wallet (${walletType || 'any'}) not found for wallet_set_id ${walletSetId}`
      );
    }

    return evmWallet;
  }

}