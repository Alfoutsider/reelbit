use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("CBtsCTSz8Ug43aPfbVCG2XJsjPzr3p6wTGu5qyVnyVc1");

// Legal Reserve Multisig: Squads 3-of-5 controls all withdrawals.
// This program is the on-chain custodian; it only accepts deposits and
// enforces that withdrawals must be signed by the Squads multisig PDA.

// ── State ─────────────────────────────────────────────────────────────────────

#[account]
pub struct LegalReserveConfig {
    pub authority: Pubkey,
    /// Squads 3-of-5 multisig PDA — only this key may withdraw
    pub multisig: Pubkey,
    pub total_received: u64,
    pub total_withdrawn: u64,
    pub bump: u8,
}

impl LegalReserveConfig {
    const LEN: usize = 8 + 32 + 32 + 8 + 8 + 1;
}

/// Audit log entry for each withdrawal (immutable once written).
#[account]
pub struct WithdrawalRecord {
    pub sequence: u64,
    pub amount: u64,
    pub destination: Pubkey,
    pub memo: String,
    pub withdrawn_at: i64,
    pub bump: u8,
}

impl WithdrawalRecord {
    const MAX_MEMO: usize = 128;
    const LEN: usize = 8 + 8 + 8 + 32 + (4 + Self::MAX_MEMO) + 8 + 1;
}

// ── Errors ────────────────────────────────────────────────────────────────────

#[error_code]
pub enum LegalReserveError {
    #[msg("Only the Squads multisig may withdraw")]
    NotMultisig,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Zero amount")]
    ZeroAmount,
    #[msg("Insufficient reserve balance")]
    InsufficientBalance,
    #[msg("Memo too long (max 128 chars)")]
    MemoTooLong,
}

// ── Events ────────────────────────────────────────────────────────────────────

#[event]
pub struct ReserveDeposited {
    pub amount: u64,
    pub total_received: u64,
}

#[event]
pub struct ReserveWithdrawn {
    pub sequence: u64,
    pub amount: u64,
    pub destination: Pubkey,
    pub memo: String,
}

// ── Accounts ──────────────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = LegalReserveConfig::LEN,
        seeds = [b"legal_config"],
        bump,
    )]
    pub config: Account<'info, LegalReserveConfig>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    pub depositor: Signer<'info>,

    #[account(
        mut,
        seeds = [b"legal_config"],
        bump = config.bump,
    )]
    pub config: Account<'info, LegalReserveConfig>,

    #[account(mut)]
    pub source_ta: Account<'info, TokenAccount>,

    #[account(mut)]
    pub reserve_ta: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(sequence: u64)]
pub struct Withdraw<'info> {
    /// Must be the Squads multisig PDA
    #[account(mut)]
    pub multisig: Signer<'info>,

    #[account(
        mut,
        seeds = [b"legal_config"],
        bump = config.bump,
        constraint = multisig.key() == config.multisig @ LegalReserveError::NotMultisig,
    )]
    pub config: Account<'info, LegalReserveConfig>,

    #[account(mut)]
    pub reserve_ta: Account<'info, TokenAccount>,

    #[account(mut)]
    pub destination_ta: Account<'info, TokenAccount>,

    /// CHECK: PDA owning reserve_ta — seeds [b"reserve_ta_auth"]
    #[account(seeds = [b"reserve_ta_auth"], bump)]
    pub reserve_ta_authority: AccountInfo<'info>,

    /// Immutable audit log entry for this withdrawal
    #[account(
        init,
        payer = multisig,
        space = WithdrawalRecord::LEN,
        seeds = [b"withdrawal_record", sequence.to_le_bytes().as_ref()],
        bump,
    )]
    pub record: Account<'info, WithdrawalRecord>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

// ── Program ───────────────────────────────────────────────────────────────────

#[program]
pub mod legal_reserve {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, multisig: Pubkey) -> Result<()> {
        let cfg = &mut ctx.accounts.config;
        cfg.authority = ctx.accounts.authority.key();
        cfg.multisig = multisig;
        cfg.total_received = 0;
        cfg.total_withdrawn = 0;
        cfg.bump = ctx.bumps.config;
        Ok(())
    }

    /// Distribution program deposits the 15% legal slice here.
    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        require!(amount > 0, LegalReserveError::ZeroAmount);

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.key(),
                Transfer {
                    from: ctx.accounts.source_ta.to_account_info(),
                    to: ctx.accounts.reserve_ta.to_account_info(),
                    authority: ctx.accounts.depositor.to_account_info(),
                },
            ),
            amount,
        )?;

        ctx.accounts.config.total_received =
            ctx.accounts.config.total_received.saturating_add(amount);

        emit!(ReserveDeposited {
            amount,
            total_received: ctx.accounts.config.total_received,
        });
        Ok(())
    }

    /// Squads 3-of-5 multisig withdraws funds with a required memo for audit trail.
    pub fn withdraw(
        ctx: Context<Withdraw>,
        sequence: u64,
        amount: u64,
        memo: String,
    ) -> Result<()> {
        require!(amount > 0, LegalReserveError::ZeroAmount);
        require!(memo.len() <= WithdrawalRecord::MAX_MEMO, LegalReserveError::MemoTooLong);
        require!(
            ctx.accounts.reserve_ta.amount >= amount,
            LegalReserveError::InsufficientBalance
        );

        let bump = ctx.bumps.reserve_ta_authority;
        let seeds: &[&[u8]] = &[b"reserve_ta_auth", &[bump]];
        let signer: &[&[&[u8]]] = &[&[seeds[0], seeds[1]]];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.key(),
                Transfer {
                    from: ctx.accounts.reserve_ta.to_account_info(),
                    to: ctx.accounts.destination_ta.to_account_info(),
                    authority: ctx.accounts.reserve_ta_authority.to_account_info(),
                },
                signer,
            ),
            amount,
        )?;

        let now = Clock::get()?.unix_timestamp;
        let rec = &mut ctx.accounts.record;
        rec.sequence = sequence;
        rec.amount = amount;
        rec.destination = ctx.accounts.destination_ta.key();
        rec.memo = memo.clone();
        rec.withdrawn_at = now;
        rec.bump = ctx.bumps.record;

        ctx.accounts.config.total_withdrawn =
            ctx.accounts.config.total_withdrawn.saturating_add(amount);

        emit!(ReserveWithdrawn {
            sequence,
            amount,
            destination: rec.destination,
            memo,
        });
        Ok(())
    }
}
