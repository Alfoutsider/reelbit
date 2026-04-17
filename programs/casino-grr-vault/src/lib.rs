use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("C6yDo6weWztw38hBxqcfR53vwwz1qmc6xNXRyDC3HE8T");

// GGR = Gross Gaming Revenue = 4% house edge collected by the off-chain slot engine.
// The casino game server batches GGR per slot, then CPIs into this vault.
// A crank then calls distribute_grr() to pipe it through the distribution program.

// ── State ─────────────────────────────────────────────────────────────────────

#[account]
pub struct GrrConfig {
    pub authority: Pubkey,
    pub distribution_program: Pubkey,
    /// Casino game server signer — only it may deposit GGR
    pub game_server: Pubkey,
    pub total_received: u64,
    pub total_distributed: u64,
    pub bump: u8,
}

impl GrrConfig {
    const LEN: usize = 8 + 32 + 32 + 32 + 8 + 8 + 1;
}

/// Per-slot GGR accumulator — game server increments this; crank flushes it.
#[account]
pub struct SlotGrrAccumulator {
    pub mint: Pubkey,
    pub creator: Pubkey,
    pub pending: u64,
    pub total_flushed: u64,
    pub last_flush_ts: i64,
    pub bump: u8,
}

impl SlotGrrAccumulator {
    const LEN: usize = 8 + 32 + 32 + 8 + 8 + 8 + 1;
}

// ── Errors ────────────────────────────────────────────────────────────────────

#[error_code]
pub enum GrrError {
    #[msg("Only game server may deposit GGR")]
    NotGameServer,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Zero amount")]
    ZeroAmount,
    #[msg("Nothing pending to flush")]
    NothingPending,
}

// ── Events ────────────────────────────────────────────────────────────────────

#[event]
pub struct GrrDeposited {
    pub mint: Pubkey,
    pub amount: u64,
    pub pending: u64,
}

#[event]
pub struct GrrFlushed {
    pub mint: Pubkey,
    pub amount: u64,
    pub flushed_at: i64,
}

// ── Accounts ──────────────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = GrrConfig::LEN,
        seeds = [b"grr_config"],
        bump,
    )]
    pub config: Account<'info, GrrConfig>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(mint: Pubkey)]
pub struct RegisterSlot<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(seeds = [b"grr_config"], bump = config.bump,
              constraint = authority.key() == config.authority @ GrrError::Unauthorized)]
    pub config: Account<'info, GrrConfig>,

    #[account(
        init,
        payer = authority,
        space = SlotGrrAccumulator::LEN,
        seeds = [b"grr_acc", mint.as_ref()],
        bump,
    )]
    pub accumulator: Account<'info, SlotGrrAccumulator>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DepositGrr<'info> {
    /// Game server signer
    pub game_server: Signer<'info>,

    #[account(seeds = [b"grr_config"], bump = config.bump,
              constraint = game_server.key() == config.game_server @ GrrError::NotGameServer)]
    pub config: Account<'info, GrrConfig>,

    #[account(
        mut,
        seeds = [b"grr_acc", accumulator.mint.as_ref()],
        bump = accumulator.bump,
    )]
    pub accumulator: Account<'info, SlotGrrAccumulator>,

    #[account(mut)]
    pub game_server_ta: Account<'info, TokenAccount>,

    #[account(mut)]
    pub vault_ta: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct FlushGrr<'info> {
    /// Permissionless crank
    pub crank: Signer<'info>,

    #[account(
        mut,
        seeds = [b"grr_config"],
        bump = config.bump,
    )]
    pub config: Account<'info, GrrConfig>,

    #[account(
        mut,
        seeds = [b"grr_acc", accumulator.mint.as_ref()],
        bump = accumulator.bump,
    )]
    pub accumulator: Account<'info, SlotGrrAccumulator>,

    #[account(mut)]
    pub vault_ta: Account<'info, TokenAccount>,

    /// Distribution program's source vault
    #[account(mut)]
    pub dist_source_ta: Account<'info, TokenAccount>,

    /// CHECK: PDA owning vault_ta — seeds [b"grr_ta_auth"]
    #[account(seeds = [b"grr_ta_auth"], bump)]
    pub vault_ta_authority: AccountInfo<'info>,

    /// CHECK: distribution program — CPI target in Sprint 3
    pub distribution_program: AccountInfo<'info>,

    pub token_program: Program<'info, Token>,
}

// ── Program ───────────────────────────────────────────────────────────────────

#[program]
pub mod casino_grr_vault {
    use super::*;

    pub fn initialize(
        ctx: Context<Initialize>,
        distribution_program: Pubkey,
        game_server: Pubkey,
    ) -> Result<()> {
        let cfg = &mut ctx.accounts.config;
        cfg.authority = ctx.accounts.authority.key();
        cfg.distribution_program = distribution_program;
        cfg.game_server = game_server;
        cfg.total_received = 0;
        cfg.total_distributed = 0;
        cfg.bump = ctx.bumps.config;
        Ok(())
    }

    pub fn register_slot(
        ctx: Context<RegisterSlot>,
        mint: Pubkey,
        creator: Pubkey,
    ) -> Result<()> {
        let acc = &mut ctx.accounts.accumulator;
        acc.mint = mint;
        acc.creator = creator;
        acc.pending = 0;
        acc.total_flushed = 0;
        acc.last_flush_ts = 0;
        acc.bump = ctx.bumps.accumulator;
        Ok(())
    }

    /// Game server reports GGR for a slot after each session batch.
    pub fn deposit_grr(ctx: Context<DepositGrr>, amount: u64) -> Result<()> {
        require!(amount > 0, GrrError::ZeroAmount);

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.key(),
                Transfer {
                    from: ctx.accounts.game_server_ta.to_account_info(),
                    to: ctx.accounts.vault_ta.to_account_info(),
                    authority: ctx.accounts.game_server.to_account_info(),
                },
            ),
            amount,
        )?;

        ctx.accounts.accumulator.pending =
            ctx.accounts.accumulator.pending.saturating_add(amount);
        ctx.accounts.config.total_received =
            ctx.accounts.config.total_received.saturating_add(amount);

        emit!(GrrDeposited {
            mint: ctx.accounts.accumulator.mint,
            amount,
            pending: ctx.accounts.accumulator.pending,
        });
        Ok(())
    }

    /// Permissionless crank: forwards pending GGR to the distribution program.
    /// Sprint 3: replaces manual transfer with distribution::distribute CPI.
    pub fn flush_grr(ctx: Context<FlushGrr>) -> Result<()> {
        let pending = ctx.accounts.accumulator.pending;
        require!(pending > 0, GrrError::NothingPending);

        let bump = ctx.bumps.vault_ta_authority;
        let seeds: &[&[u8]] = &[b"grr_ta_auth", &[bump]];
        let signer: &[&[&[u8]]] = &[&[seeds[0], seeds[1]]];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.key(),
                Transfer {
                    from: ctx.accounts.vault_ta.to_account_info(),
                    to: ctx.accounts.dist_source_ta.to_account_info(),
                    authority: ctx.accounts.vault_ta_authority.to_account_info(),
                },
                signer,
            ),
            pending,
        )?;

        let now = Clock::get()?.unix_timestamp;
        let acc = &mut ctx.accounts.accumulator;
        acc.total_flushed = acc.total_flushed.saturating_add(pending);
        acc.last_flush_ts = now;
        acc.pending = 0;

        ctx.accounts.config.total_distributed =
            ctx.accounts.config.total_distributed.saturating_add(pending);

        emit!(GrrFlushed {
            mint: acc.mint,
            amount: pending,
            flushed_at: now,
        });
        Ok(())
    }
}
