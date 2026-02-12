import type { SupabaseClient } from "@supabase/supabase-js";
import type { EscrowAgreementWithDetails } from "@repo/types/escrow";

export const createEscrowService = (supabase: SupabaseClient) => ({
  async getAgreements(
    profileId: string
  ): Promise<EscrowAgreementWithDetails[]> {
    const { data, error } = await supabase
      .from("escrow_agreements")
      .select(
        `
        *,
        depositor_wallet:wallets!escrow_agreements_depositor_wallet_id_fkey(
          profile_id, wallet_address, profiles(name, full_name, email, company_name, auth_user_id)
        ),
        beneficiary_wallet:wallets!escrow_agreements_beneficiary_wallet_id_fkey(
          profile_id, wallet_address, profiles(name, full_name, email, company_name, auth_user_id)
        ),
        transaction:transactions(amount, currency, status, circle_contract_address)
      `
      )
      .or(
        `depositor_wallet_id.in.(select id from wallets where profile_id='${profileId}'),beneficiary_wallet_id.in.(select id from wallets where profile_id='${profileId}')`
      )
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch agreements: ${error.message}`);
    }

    return (data as unknown as EscrowAgreementWithDetails[]) ?? [];
  },
});
