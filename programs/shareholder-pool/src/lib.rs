use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("2aWNKw6Y3yTyxf1A64BvJBd3K3UJSqwymg8ncTbsirNm");

// ── State ─────────────────────────────────────────────────────────────────────

#[account]
pub struct ShareholderPoolConfig {
    pub authority: Pubkey,
    /// Total shares issued (fixed at init — no dilution)
    pub total_shares: u64,
    /// Running total of tokens ever deposited — used for checkpoint accounting
    pub lifetime_deposits: u64,
    /// Index: amount deposited per share since inception (scaled by PRECISION)
    pub reward_index: u128,
    pub bump: u8,
}

impl ShareholderPoolConfig {
    const LEN: usize = 8 + 32 + 8 + 8 + 16 + 1;
}

/// One per shareholder wallet — tracks their share count and last claimed index.
#[account]
pub struct ShareholderAccount {
    pub owner: Pubkey,
    pub shares: u64,
    /// reward_index value at last claim — used to compute pending rewards
    pub debt_index: u128,
    pub total_claimed: u64,
    pub bump: u8,
}

impl ShareholderAccount {
    const LEN: usize = 8 + 32 + 8 + 16 + 8 + 1;
}

const PRECISION: u128 = 1_000_000_000_000;

// ── Errors ────────────────────────────────────────────────────────────────────

#[error_code]
pub enum ShareholderError {
    #[msg("No pending rewards")]
    NoPendingRewards,
    #[msg("Zero shares")]
    ZeroShares,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Arithmetic overflow")]
    Overflow,
}

// ── Events ────────────────────────────────────────────────────────────────────

#[event]
pub struct RewardsDeposited {
    pub amount: u64,
    pub new_reward_index: u128,
}

#[event]
pub struct RewardsClaimed {
    pub owner: Pubkey,
    pub amount: u64,
}

// ── Accounts ──────────────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = ShareholderPoolConfig::LEN,
        seeds = [b"shareholder_config"],
        bump,
    )]
    pub config: Account<'info, ShareholderPoolConfig>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(owner: Pubkey)]
pub struct RegisterShareholder<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(seeds = [b"shareholder_config"], bump = config.bump,
              constraint = authority.key() == config.authority @ ShareholderError::Unauthorized)]
    pub config: Account<'info, ShareholderPoolConfig>,

    #[account(
        init,
        payer = authority,
        space = ShareholderAccount::LEN,
        seeds = [b"shareholder", owner.as_ref()],
        bump,
    )]
    pub shareholder: Account<'info, ShareholderAccount>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DepositRewards<'info> {
    /// Distribution program's PDA — only it may deposit
    pub depositor: Signer<'info>,

    #[account(
        mut,
        seeds = [b"shareholder_config"],
        bump = config.bump,
    )]
    pub config: Account<'info, ShareholderPoolConfig>,

    #[account(mut)]
    pub source_ta: Account<'info, TokenAccount>,

    #[account(mut)]
    pub pool_ta: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Claim<'info> {
    pub owner: Signer<'info>,

    #[account(seeds = [b"shareholder_config"], bump = config.bump)]
    pub config: Account<'info, ShareholderPoolConfig>,

    #[account(
        mut,
        seeds = [b"shareholder", owner.key().as_ref()],
        bump = shareholder.bump,
        constraint = shareholder.owner == owner.key() @ ShareholderError::Unauthorized,
    )]
    pub shareholder: Account<'info, ShareholderAccount>,

    #[account(mut)]
    pub pool_ta: Account<'info, TokenAccount>,

    #[account(mut)]
    pub owner_ta: Account<'info, TokenAccount>,

    /// CHECK: PDA owning pool_ta — seeds [b"pool_ta_auth"]
    #[account(seeds = [b"pool_ta_auth"], bump)]
    pub pool_ta_authority: AccountInfo<'info>,

    pub token_program: Program<'info, Token>,
}

// ── Program ───────────────────────────────────────────────────────────────────

#[program]
pub mod shareholder_pool {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, total_shares: u64) -> Result<()> {
        require!(total_shares > 0, ShareholderError::ZeroShares);
        let cfg = &mut ctx.accounts.config;
        cfg.authority = ctx.accounts.authority.key();
        cfg.total_shares = total_shares;
        cfg.lifetime_deposits = 0;
        cfg.reward_index = 0;
        cfg.bump = ctx.bumps.config;
        Ok(())
    }

    /// Authority assigns shares to a shareholder (called once per wallet at setup).
    pub fn register_shareholder(
        ctx: Context<RegisterShareholder>,
        owner: Pubkey,
        shares: u64,
    ) -> Result<()> {
        require!(shares > 0, ShareholderError::ZeroShares);
        let sh = &mut ctx.accounts.shareholder;
        sh.owner = owner;
        sh.shares = shares;
        // Debt index = current index so new holders don't claim historical rewards
        sh.debt_index = ctx.accounts.config.reward_index;
        sh.total_claimed = 0;
        sh.bump = ctx.bumps.shareholder;
        Ok(())
    }

    /// Distribution program deposits the 20% shareholder slice here.
    pub fn deposit_rewards(ctx: Context<DepositRewards>, amount: u64) -> Result<()> {
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.key(),
                Transfer {
                    from: ctx.accounts.source_ta.to_account_info(),
                    to: ctx.accounts.pool_ta.to_account_info(),
                    authority: ctx.accounts.depositor.to_account_info(),
                },
            ),
            amount,
        )?;

        let cfg = &mut ctx.accounts.config;
        let delta = (amount as u128)
            .checked_mul(PRECISION)
            .ok_or(ShareholderError::Overflow)?
            .checked_div(cfg.total_shares as u128)
            .ok_or(ShareholderError::Overflow)?;

        cfg.reward_index = cfg.reward_index.checked_add(delta).ok_or(ShareholderError::Overflow)?;
        cfg.lifetime_deposits = cfg.lifetime_deposits.saturating_add(amount);

        emit!(RewardsDeposited { amount, new_reward_index: cfg.reward_index });
        Ok(())
    }

    /// Shareholder pulls their accumulated rewards.
    pub fn claim(ctx: Context<Claim>) -> Result<()> {
        let pending = pending_rewards(
            &ctx.accounts.shareholder,
            ctx.accounts.config.reward_index,
        )?;
        require!(pending > 0, ShareholderError::NoPendingRewards);

        let bump = ctx.bumps.pool_ta_authority;
        let seeds: &[&[u8]] = &[b"pool_ta_auth", &[bump]];
        let signer: &[&[&[u8]]] = &[&[seeds[0], seeds[1]]];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.key(),
                Transfer {
                    from: ctx.accounts.pool_ta.to_account_info(),
                    to: ctx.accounts.owner_ta.to_account_info(),
                    authority: ctx.accounts.pool_ta_authority.to_account_info(),
                },
                signer,
            ),
            pending,
        )?;

        let sh = &mut ctx.accounts.shareholder;
        sh.debt_index = ctx.accounts.config.reward_index;
        sh.total_claimed = sh.total_claimed.saturating_add(pending);

        emit!(RewardsClaimed { owner: sh.owner, amount: pending });
        Ok(())
    }
}

fn pending_rewards(sh: &ShareholderAccount, current_index: u128) -> Result<u64> {
    let index_delta = current_index.saturating_sub(sh.debt_index);
    let raw = index_delta
        .checked_mul(sh.shares as u128)
        .ok_or(error!(ShareholderError::Overflow))?
        / PRECISION;
    Ok(raw as u64)
}
