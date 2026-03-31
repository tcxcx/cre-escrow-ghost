use anchor_lang::prelude::*;
use anchor_spl::token_interface::{
    self, Mint, TokenAccount, TokenInterface, TransferChecked,
};

declare_id!("DTtYVUNVUSbT8gY7yjLJzxYaZAFFSh1WaGdoQrDUyWEG");

// ── Constants ────────────────────────────────────────────────────────────────

pub const MAX_MILESTONES: usize = 10;
pub const MAX_EXTRA_PAYOUTS: usize = 5;
pub const BPS_DENOMINATOR: u16 = 10_000;

// ── Program ──────────────────────────────────────────────────────────────────

#[program]
pub mod bu_escrow {
    use super::*;

    /// Create a new escrow agreement. PDA replaces the EVM factory pattern.
    pub fn create_agreement(
        ctx: Context<CreateAgreement>,
        agreement_id: [u8; 32],
        milestone_amounts: Vec<u64>,
        protocol_fee_bps: u16,
        dispute_window_seconds: u32,
        appeal_window_seconds: u32,
    ) -> Result<()> {
        require!(
            !milestone_amounts.is_empty() && milestone_amounts.len() <= MAX_MILESTONES,
            EscrowError::InvalidMilestoneCount
        );
        require!(protocol_fee_bps <= BPS_DENOMINATOR, EscrowError::InvalidBps);

        let escrow = &mut ctx.accounts.escrow.load_init()?;
        escrow.agreement_id = agreement_id;
        escrow.payer = ctx.accounts.payer_party.key();
        escrow.payee = ctx.accounts.payee_party.key();
        escrow.token_mint = ctx.accounts.token_mint.key();
        escrow.executor = ctx.accounts.executor.key();
        escrow.protocol_fee_bps = protocol_fee_bps;
        escrow.protocol_fee_recipient = ctx.accounts.protocol_fee_recipient.key();
        escrow.dispute_window_seconds = dispute_window_seconds;
        escrow.appeal_window_seconds = appeal_window_seconds;
        escrow.bump = ctx.bumps.escrow;
        escrow.vault_bump = ctx.bumps.vault;
        escrow.milestone_count = milestone_amounts.len() as u8;

        for (i, &amount) in milestone_amounts.iter().enumerate() {
            escrow.milestones[i] = Milestone {
                amount,
                released: 0,
                funded: 0,
                locked: 0,
                status: MilestoneStatus::Pending as u8,
                dispute_window_end: 0,
                final_receipt_hash: [0u8; 32],
                _padding: [0u8; 5],
            };
        }

        emit!(AgreementCreated {
            agreement_id,
            payer: escrow.payer,
            payee: escrow.payee,
            token_mint: escrow.token_mint,
            milestone_count: escrow.milestone_count,
        });

        Ok(())
    }

    /// Fund a specific milestone. Payer transfers USDC into the PDA vault.
    pub fn fund_milestone(ctx: Context<FundMilestone>, milestone_index: u8) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow.load_mut()?;
        require!(escrow.payer == ctx.accounts.payer_authority.key(), EscrowError::OnlyPayer);
        let idx = milestone_index as usize;
        require!(idx < escrow.milestone_count as usize, EscrowError::InvalidMilestone);

        let ms = &mut escrow.milestones[idx];
        require!(ms.funded == 0, EscrowError::AlreadyFunded);
        require!(ms.status == MilestoneStatus::Pending as u8, EscrowError::WrongStatus);

        let amount = ms.amount;
        let decimals = ctx.accounts.token_mint.decimals;

        token_interface::transfer_checked(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                TransferChecked {
                    from: ctx.accounts.payer_token_account.to_account_info(),
                    mint: ctx.accounts.token_mint.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                    authority: ctx.accounts.payer_authority.to_account_info(),
                },
            ),
            amount,
            decimals,
        )?;

        ms.funded = 1;
        ms.status = MilestoneStatus::Funded as u8;

        emit!(MilestoneFunded {
            agreement_id: escrow.agreement_id,
            milestone_index,
            amount,
        });

        Ok(())
    }

    /// Lock a milestone for arbitration (dispute). Executor only.
    pub fn lock_milestone(
        ctx: Context<ExecutorAction>,
        milestone_index: u8,
        dispute_hash: [u8; 32],
    ) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow.load_mut()?;
        require!(escrow.executor == ctx.accounts.executor.key(), EscrowError::OnlyExecutor);
        let idx = milestone_index as usize;
        require!(idx < escrow.milestone_count as usize, EscrowError::InvalidMilestone);

        let ms = &mut escrow.milestones[idx];
        require!(ms.funded == 1, EscrowError::NotFunded);
        require!(ms.locked == 0, EscrowError::AlreadyLocked);
        require!(
            ms.status == MilestoneStatus::Funded as u8
                || ms.status == MilestoneStatus::Submitted as u8
                || ms.status == MilestoneStatus::Approved as u8
                || ms.status == MilestoneStatus::Rejected as u8,
            EscrowError::CannotLockInCurrentStatus
        );

        ms.locked = 1;
        ms.status = MilestoneStatus::Disputed as u8;

        emit!(MilestoneLocked {
            agreement_id: escrow.agreement_id,
            milestone_index,
            dispute_hash,
        });

        Ok(())
    }

    /// Update milestone status. Used by CRE for SUBMITTED → VERIFYING → APPROVED/REJECTED.
    pub fn set_milestone_status(
        ctx: Context<ExecutorAction>,
        milestone_index: u8,
        new_status: u8,
    ) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow.load_mut()?;
        require!(escrow.executor == ctx.accounts.executor.key(), EscrowError::OnlyExecutor);
        let idx = milestone_index as usize;
        require!(idx < escrow.milestone_count as usize, EscrowError::InvalidMilestone);

        let dispute_window_seconds = escrow.dispute_window_seconds;
        let agreement_id = escrow.agreement_id;

        let ms = &mut escrow.milestones[idx];

        // Open dispute window when approved
        if new_status == MilestoneStatus::Approved as u8 && ms.dispute_window_end == 0 {
            let clock = Clock::get()?;
            ms.dispute_window_end =
                clock.unix_timestamp as u64 + dispute_window_seconds as u64;

            emit!(DisputeWindowStarted {
                agreement_id,
                milestone_index,
                window_end: ms.dispute_window_end,
            });
        }

        ms.status = new_status;

        emit!(MilestoneStatusChanged {
            agreement_id,
            milestone_index,
            new_status,
        });

        Ok(())
    }

    /// Record arbitration decision before execution. Immutable once set.
    pub fn set_decision(
        ctx: Context<ExecutorAction>,
        milestone_index: u8,
        payee_bps: u16,
        extra_payouts: Vec<ExtraPayoutInput>,
        final_receipt_hash: [u8; 32],
    ) -> Result<()> {
        require!(payee_bps <= BPS_DENOMINATOR, EscrowError::InvalidBps);
        require!(final_receipt_hash != [0u8; 32], EscrowError::EmptyReceiptHash);
        require!(extra_payouts.len() <= MAX_EXTRA_PAYOUTS, EscrowError::TooManyExtraPayouts);

        let escrow = &mut ctx.accounts.escrow.load_mut()?;
        require!(escrow.executor == ctx.accounts.executor.key(), EscrowError::OnlyExecutor);
        let idx = milestone_index as usize;
        require!(idx < escrow.milestone_count as usize, EscrowError::InvalidMilestone);

        let d = &mut escrow.decisions[idx];
        require!(d.is_set == 0, EscrowError::DecisionAlreadySet);

        d.payee_bps = payee_bps;
        d.receipt_hash = final_receipt_hash;
        d.is_set = 1;
        d.extra_payout_count = extra_payouts.len() as u8;

        for (i, ep) in extra_payouts.iter().enumerate() {
            d.extra_payouts[i] = ExtraPayout {
                to: ep.to,
                amount: ep.amount,
            };
        }

        escrow.milestones[idx].final_receipt_hash = final_receipt_hash;

        emit!(DecisionSet {
            agreement_id: escrow.agreement_id,
            milestone_index,
            payee_bps,
            final_receipt_hash,
        });

        Ok(())
    }

    /// Execute the decision — distribute funds from vault according to the split.
    pub fn execute_decision<'info>(
        ctx: Context<'_, '_, 'info, 'info, ExecuteDecision<'info>>,
        milestone_index: u8,
    ) -> Result<()> {
        // Load escrow data and extract everything we need before dropping the borrow
        let (
            agreement_id,
            vault_bump,
            ms_amount,
            ms_funded,
            ms_status,
            d_is_set,
            d_payee_bps,
            d_extra_payout_count,
            extra_payouts_data,
        ) = {
            let escrow = ctx.accounts.escrow.load()?;
            require!(escrow.executor == ctx.accounts.executor.key(), EscrowError::OnlyExecutor);
            let idx = milestone_index as usize;
            require!(idx < escrow.milestone_count as usize, EscrowError::InvalidMilestone);

            let ms = &escrow.milestones[idx];
            let d = &escrow.decisions[idx];

            (
                escrow.agreement_id,
                escrow.vault_bump,
                ms.amount,
                ms.funded,
                ms.status,
                d.is_set,
                d.payee_bps,
                d.extra_payout_count,
                d.extra_payouts,
            )
        };

        require!(ms_funded == 1, EscrowError::NotFunded);
        require!(ms_status != MilestoneStatus::Released as u8, EscrowError::AlreadyReleased);
        require!(d_is_set == 1, EscrowError::NoDecisionSet);

        let decimals = ctx.accounts.token_mint.decimals;

        let signer_seeds: &[&[&[u8]]] = &[&[
            b"vault",
            agreement_id.as_ref(),
            &[vault_bump],
        ]];

        // Extra payouts
        let mut total_extra: u64 = 0;
        let extra_count = d_extra_payout_count as usize;
        let remaining = &ctx.remaining_accounts;
        require!(remaining.len() >= extra_count, EscrowError::MissingExtraPayoutAccounts);

        for i in 0..extra_count {
            let ep = &extra_payouts_data[i];
            require!(ep.to != Pubkey::default(), EscrowError::ZeroPayoutAddress);
            require!(remaining[i].key() == ep.to, EscrowError::PayoutAccountMismatch);

            total_extra = total_extra.checked_add(ep.amount).ok_or(EscrowError::Overflow)?;

            token_interface::transfer_checked(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    TransferChecked {
                        from: ctx.accounts.vault.to_account_info(),
                        mint: ctx.accounts.token_mint.to_account_info(),
                        to: remaining[i].to_account_info(),
                        authority: ctx.accounts.vault.to_account_info(),
                    },
                    signer_seeds,
                ),
                ep.amount,
                decimals,
            )?;
        }

        require!(total_extra <= ms_amount, EscrowError::ExtraPayoutsExceedAmount);

        let distributable = ms_amount - total_extra;
        let payee_amount = (distributable as u128 * d_payee_bps as u128 / BPS_DENOMINATOR as u128) as u64;
        let payer_amount = distributable - payee_amount;

        if payee_amount > 0 {
            token_interface::transfer_checked(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    TransferChecked {
                        from: ctx.accounts.vault.to_account_info(),
                        mint: ctx.accounts.token_mint.to_account_info(),
                        to: ctx.accounts.payee_token_account.to_account_info(),
                        authority: ctx.accounts.vault.to_account_info(),
                    },
                    signer_seeds,
                ),
                payee_amount,
                decimals,
            )?;
        }

        if payer_amount > 0 {
            token_interface::transfer_checked(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    TransferChecked {
                        from: ctx.accounts.vault.to_account_info(),
                        mint: ctx.accounts.token_mint.to_account_info(),
                        to: ctx.accounts.payer_token_account.to_account_info(),
                        authority: ctx.accounts.vault.to_account_info(),
                    },
                    signer_seeds,
                ),
                payer_amount,
                decimals,
            )?;
        }

        // Update milestone state
        {
            let mut escrow = ctx.accounts.escrow.load_mut()?;
            let ms = &mut escrow.milestones[milestone_index as usize];
            ms.released = ms_amount;
            ms.locked = 0;
            ms.status = MilestoneStatus::Released as u8;
        }

        emit!(DecisionExecuted {
            agreement_id,
            milestone_index,
            payee_amount,
            payer_amount,
        });

        Ok(())
    }

    /// Cancel a milestone (admin/executor only).
    pub fn cancel_milestone(ctx: Context<ExecutorAction>, milestone_index: u8) -> Result<()> {
        let mut escrow = ctx.accounts.escrow.load_mut()?;
        require!(escrow.executor == ctx.accounts.executor.key(), EscrowError::OnlyExecutor);
        let idx = milestone_index as usize;
        require!(idx < escrow.milestone_count as usize, EscrowError::InvalidMilestone);

        let status = escrow.milestones[idx].status;
        require!(
            status != MilestoneStatus::Released as u8
                && status != MilestoneStatus::Cancelled as u8,
            EscrowError::WrongStatus
        );

        let agreement_id = escrow.agreement_id;
        escrow.milestones[idx].status = MilestoneStatus::Cancelled as u8;

        emit!(MilestoneStatusChanged {
            agreement_id,
            milestone_index,
            new_status: MilestoneStatus::Cancelled as u8,
        });

        Ok(())
    }
}

// ── Account Contexts ─────────────────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(agreement_id: [u8; 32])]
pub struct CreateAgreement<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = 8 + std::mem::size_of::<Escrow>(),
        seeds = [b"escrow", agreement_id.as_ref()],
        bump,
    )]
    pub escrow: AccountLoader<'info, Escrow>,

    #[account(
        init,
        payer = authority,
        seeds = [b"vault", agreement_id.as_ref()],
        bump,
        token::mint = token_mint,
        token::authority = vault,
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,

    pub token_mint: InterfaceAccount<'info, Mint>,

    /// CHECK: Stored as pubkey, validated at fund time.
    pub payer_party: UncheckedAccount<'info>,
    /// CHECK: Stored as pubkey, validated at execute time.
    pub payee_party: UncheckedAccount<'info>,
    /// CHECK: Stored as pubkey, validated in executor instructions.
    pub executor: UncheckedAccount<'info>,
    /// CHECK: Stored as pubkey for later fee distribution.
    pub protocol_fee_recipient: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct FundMilestone<'info> {
    #[account(mut)]
    pub payer_authority: Signer<'info>,

    #[account(mut)]
    pub escrow: AccountLoader<'info, Escrow>,

    #[account(
        mut,
        token::mint = token_mint,
        token::authority = payer_authority,
    )]
    pub payer_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(mut)]
    pub vault: InterfaceAccount<'info, TokenAccount>,

    pub token_mint: InterfaceAccount<'info, Mint>,
    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct ExecutorAction<'info> {
    pub executor: Signer<'info>,

    #[account(mut)]
    pub escrow: AccountLoader<'info, Escrow>,
}

#[derive(Accounts)]
pub struct ExecuteDecision<'info> {
    pub executor: Signer<'info>,

    #[account(mut)]
    pub escrow: AccountLoader<'info, Escrow>,

    #[account(mut)]
    pub vault: InterfaceAccount<'info, TokenAccount>,

    pub token_mint: InterfaceAccount<'info, Mint>,

    #[account(mut, token::mint = token_mint)]
    pub payee_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(mut, token::mint = token_mint)]
    pub payer_token_account: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
}

// ── State (zero_copy for large accounts) ─────────────────────────────────────

#[account(zero_copy)]
#[repr(C)]
pub struct Escrow {
    pub agreement_id: [u8; 32],       // 32
    pub payer: Pubkey,                 // 32
    pub payee: Pubkey,                 // 32
    pub token_mint: Pubkey,            // 32
    pub executor: Pubkey,              // 32
    pub protocol_fee_recipient: Pubkey, // 32
    pub dispute_window_seconds: u32,   // 4
    pub appeal_window_seconds: u32,    // 4
    pub protocol_fee_bps: u16,         // 2
    pub bump: u8,                      // 1
    pub vault_bump: u8,                // 1
    pub milestone_count: u8,           // 1
    pub _padding: [u8; 3],            // 3 → total 16 (aligned)
    pub milestones: [Milestone; MAX_MILESTONES],
    pub decisions: [Decision; MAX_MILESTONES],
}

#[zero_copy]
#[derive(Default)]
#[repr(C)]
pub struct Milestone {
    pub amount: u64,
    pub released: u64,
    pub dispute_window_end: u64,
    pub final_receipt_hash: [u8; 32],
    pub funded: u8,
    pub locked: u8,
    pub status: u8,
    pub _padding: [u8; 5],
}

#[zero_copy]
#[derive(Default)]
#[repr(C)]
pub struct Decision {
    pub receipt_hash: [u8; 32],
    pub extra_payouts: [ExtraPayout; MAX_EXTRA_PAYOUTS],
    pub payee_bps: u16,
    pub is_set: u8,
    pub extra_payout_count: u8,
    pub _padding: [u8; 4],
}

#[zero_copy]
#[derive(Default)]
#[repr(C)]
pub struct ExtraPayout {
    pub to: Pubkey,
    pub amount: u64,
}

/// Input struct for set_decision (non-zero-copy, for instruction args).
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ExtraPayoutInput {
    pub to: Pubkey,
    pub amount: u64,
}

// ── Enums (as u8 constants for zero_copy compat) ─────────────────────────────

pub struct MilestoneStatus;
impl MilestoneStatus {
    pub const Pending: u8 = 0;
    pub const Funded: u8 = 1;
    pub const Submitted: u8 = 2;
    pub const Verifying: u8 = 3;
    pub const Approved: u8 = 4;
    pub const Rejected: u8 = 5;
    pub const Disputed: u8 = 6;
    pub const Released: u8 = 7;
    pub const Cancelled: u8 = 8;
}

// ── Events ───────────────────────────────────────────────────────────────────

#[event]
pub struct AgreementCreated {
    pub agreement_id: [u8; 32],
    pub payer: Pubkey,
    pub payee: Pubkey,
    pub token_mint: Pubkey,
    pub milestone_count: u8,
}

#[event]
pub struct MilestoneFunded {
    pub agreement_id: [u8; 32],
    pub milestone_index: u8,
    pub amount: u64,
}

#[event]
pub struct MilestoneLocked {
    pub agreement_id: [u8; 32],
    pub milestone_index: u8,
    pub dispute_hash: [u8; 32],
}

#[event]
pub struct MilestoneStatusChanged {
    pub agreement_id: [u8; 32],
    pub milestone_index: u8,
    pub new_status: u8,
}

#[event]
pub struct DisputeWindowStarted {
    pub agreement_id: [u8; 32],
    pub milestone_index: u8,
    pub window_end: u64,
}

#[event]
pub struct DecisionSet {
    pub agreement_id: [u8; 32],
    pub milestone_index: u8,
    pub payee_bps: u16,
    pub final_receipt_hash: [u8; 32],
}

#[event]
pub struct DecisionExecuted {
    pub agreement_id: [u8; 32],
    pub milestone_index: u8,
    pub payee_amount: u64,
    pub payer_amount: u64,
}

// ── Errors ───────────────────────────────────────────────────────────────────

#[error_code]
pub enum EscrowError {
    #[msg("Invalid milestone count (must be 1..10)")]
    InvalidMilestoneCount,
    #[msg("Basis points must be <= 10000")]
    InvalidBps,
    #[msg("Invalid milestone index")]
    InvalidMilestone,
    #[msg("Milestone already funded")]
    AlreadyFunded,
    #[msg("Wrong milestone status for this operation")]
    WrongStatus,
    #[msg("Only the payer can call this")]
    OnlyPayer,
    #[msg("Only the executor can call this")]
    OnlyExecutor,
    #[msg("Milestone not funded")]
    NotFunded,
    #[msg("Milestone already locked")]
    AlreadyLocked,
    #[msg("Cannot lock milestone in current status")]
    CannotLockInCurrentStatus,
    #[msg("Decision already set for this milestone")]
    DecisionAlreadySet,
    #[msg("Receipt hash cannot be empty")]
    EmptyReceiptHash,
    #[msg("Too many extra payouts (max 5)")]
    TooManyExtraPayouts,
    #[msg("No decision set for this milestone")]
    NoDecisionSet,
    #[msg("Milestone already released")]
    AlreadyReleased,
    #[msg("Extra payouts exceed milestone amount")]
    ExtraPayoutsExceedAmount,
    #[msg("Zero payout address")]
    ZeroPayoutAddress,
    #[msg("Payout account mismatch")]
    PayoutAccountMismatch,
    #[msg("Missing extra payout token accounts")]
    MissingExtraPayoutAccounts,
    #[msg("Arithmetic overflow")]
    Overflow,
}
