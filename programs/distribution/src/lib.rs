use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("GLkNLk84MXxDpf2xJyVuzrMn2GFMYdiQUF52AEaD3FtM");

// ── Basis points ─────────────────────────────────────────────────────────────
// NOTE: This program is NOT currently deployed. The authoritative fee split is
// enforced off-chain in apps/api/src/distributionCron.ts (pre-bond) and
// apps/api/src/lpHarvestCron.ts (post-graduation). These constants must stay
// in sync with those files.
//
// Post-graduation LP split (6-way):
//   creator 25% / platform 20% / jackpot 25% / legal 10% / license 10% / holder_dividend 10%
const BPS_PLATFORM: u64 = 2000;         // 20%
const BPS_CREATOR: u64 = 2500;          // 25%
const BPS_HOLDER_DIVIDEND: u64 = 1000;  // 10% (earmarked for top-100 holder dividend)
const BPS_JACKPOT: u64 = 2500;          // 25%
// legal + license get remainder to absorb integer-division dust (≈ 20% combined)
const BPS_TOTAL: u64 = 10_000;

// ── State ─────────────────────────────────────────────────────────────────────

#[account]
pub struct DistributionConfig {
    pub authority: Pubkey,
    pub platform_treasury: Pubkey,
    pub holder_dividend_pool: Pubkey,
    pub jackpot_pool: Pubkey,
    pub legal_reserve: Pubkey,
    pub total_distributed: u64,
    pub bump: u8,
}

impl DistributionConfig {
    const LEN: usize = 8 + 32 + 32 + 32 + 32 + 32 + 8 + 1;
}

// ── Errors ────────────────────────────────────────────────────────────────────

#[error_code]
pub enum DistributionError {
    #[msg("Amount is zero")]
    ZeroAmount,
    #[msg("Share arithmetic overflowed")]
    Overflow,
    #[msg("Unauthorized")]
    Unauthorized,
}

// ── Events ────────────────────────────────────────────────────────────────────

#[event]
pub struct FeeDistributed {
    pub mint: Pubkey,
    pub creator: Pubkey,
    pub total: u64,
    pub platform: u64,
    pub creator_share: u64,
    pub holder_dividend: u64,
    pub jackpot: u64,
    pub legal: u64,
    pub source: FeeSource,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy)]
pub enum FeeSource {
    TradingFee,
    GGR,
}

// ── Accounts ──────────────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = DistributionConfig::LEN,
        seeds = [b"distribution_config"],
        bump,
    )]
    pub config: Account<'info, DistributionConfig>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Distribute<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        seeds = [b"distribution_config"],
        bump = config.bump,
    )]
    pub config: Account<'info, DistributionConfig>,

    /// CHECK: passed for event emission only, not dereferenced
    pub mint: AccountInfo<'info>,

    /// Source vault holding collected fees / GGR
    #[account(mut)]
    pub source_vault: Account<'info, TokenAccount>,

    /// PDA that owns source_vault — seeds supplied by caller via instruction data
    /// CHECK: authority verified by token CPI
    pub vault_authority: AccountInfo<'info>,

    #[account(mut, token::mint = source_vault.mint)]
    pub platform_ta: Account<'info, TokenAccount>,

    #[account(mut, token::mint = source_vault.mint)]
    pub creator_ta: Account<'info, TokenAccount>,

    #[account(mut, token::mint = source_vault.mint)]
    pub holder_dividend_ta: Account<'info, TokenAccount>,

    #[account(mut, token::mint = source_vault.mint)]
    pub jackpot_ta: Account<'info, TokenAccount>,

    #[account(mut, token::mint = source_vault.mint)]
    pub legal_ta: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

// ── Program ───────────────────────────────────────────────────────────────────

#[program]
pub mod distribution {
    use super::*;

    pub fn initialize(
        ctx: Context<Initialize>,
        platform_treasury: Pubkey,
        holder_dividend_pool: Pubkey,
        jackpot_pool: Pubkey,
        legal_reserve: Pubkey,
    ) -> Result<()> {
        let cfg = &mut ctx.accounts.config;
        cfg.authority = ctx.accounts.authority.key();
        cfg.platform_treasury = platform_treasury;
        cfg.holder_dividend_pool = holder_dividend_pool;
        cfg.jackpot_pool = jackpot_pool;
        cfg.legal_reserve = legal_reserve;
        cfg.total_distributed = 0;
        cfg.bump = ctx.bumps.config;
        Ok(())
    }

    /// Splits `amount` tokens from source_vault across all 5 revenue buckets.
    /// vault_authority_seeds allows the caller's PDA to sign the token CPI.
    pub fn distribute(
        ctx: Context<Distribute>,
        amount: u64,
        source: FeeSource,
        creator: Pubkey,
        vault_authority_seeds: Vec<Vec<u8>>,
    ) -> Result<()> {
        require!(amount > 0, DistributionError::ZeroAmount);

        let platform         = bps(amount, BPS_PLATFORM);
        let creator_sh       = bps(amount, BPS_CREATOR);
        let holder_dividend  = bps(amount, BPS_HOLDER_DIVIDEND);
        let jackpot          = bps(amount, BPS_JACKPOT);
        let legal            = amount
            .checked_sub(platform + creator_sh + holder_dividend + jackpot)
            .ok_or(DistributionError::Overflow)?;

        let seeds_refs: Vec<&[u8]> = vault_authority_seeds.iter().map(|s| s.as_slice()).collect();
        let signer_seeds: &[&[&[u8]]] = &[&seeds_refs];

        let token_pid = ctx.accounts.token_program.key();
        let from      = ctx.accounts.source_vault.to_account_info();
        let auth      = ctx.accounts.vault_authority.to_account_info();

        macro_rules! xfer {
            ($dest:expr, $amt:expr) => {
                token::transfer(
                    CpiContext::new_with_signer(
                        token_pid,
                        Transfer { from: from.clone(), to: $dest.to_account_info(), authority: auth.clone() },
                        signer_seeds,
                    ),
                    $amt,
                )?;
            };
        }

        xfer!(ctx.accounts.platform_ta,         platform);
        xfer!(ctx.accounts.creator_ta,           creator_sh);
        xfer!(ctx.accounts.holder_dividend_ta,   holder_dividend);
        xfer!(ctx.accounts.jackpot_ta,           jackpot);
        xfer!(ctx.accounts.legal_ta,             legal);

        ctx.accounts.config.total_distributed =
            ctx.accounts.config.total_distributed.saturating_add(amount);

        emit!(FeeDistributed {
            mint: ctx.accounts.mint.key(),
            creator,
            total: amount,
            platform,
            creator_share: creator_sh,
            holder_dividend,
            jackpot,
            legal,
            source,
        });

        Ok(())
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

fn bps(amount: u64, rate: u64) -> u64 {
    amount.saturating_mul(rate) / BPS_TOTAL
}
