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
    #[msg("Destination token account doesn't match the configured wallet")]
    DestinationMismatch,
    #[msg("vault_authority_seeds is empty")]
    EmptySeeds,
    #[msg("vault_authority_seeds derived a different key than vault_authority")]
    SeedDerivationMismatch,
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
    /// Only the registered authority can trigger distribution. Without this
    /// gate the original instruction was permissionless — any signer who
    /// happened to know the source_vault could call distribute() with their
    /// own destination ATAs and (because `vault_authority_seeds` was caller-
    /// supplied) potentially route the entire vault wherever they liked.
    /// In practice the on-chain seed-signing only works if the supplied
    /// seeds actually derive to a PDA that owns source_vault, but treating
    /// that as the only line of defence is fragile — pin the caller too.
    #[account(
        mut,
        constraint = payer.key() == config.authority @ DistributionError::Unauthorized,
    )]
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

    /// PDA that owns source_vault. Validated below against the seeds the
    /// caller provides (see `verify_seeds_match`).
    /// CHECK: seed derivation cross-checked in handler.
    pub vault_authority: AccountInfo<'info>,

    /// All five destination ATAs are pinned to the authorities recorded in
    /// DistributionConfig. Without these constraints the caller could pass
    /// their own ATAs and steal the split. token::authority verifies the
    /// owner of the ATA, which is what we actually care about.
    #[account(
        mut,
        token::mint = source_vault.mint,
        token::authority = config.platform_treasury,
    )]
    pub platform_ta: Account<'info, TokenAccount>,

    /// Creator ATA owner is supplied as an instruction arg (different per
    /// distribution round) and cross-checked in the handler — config doesn't
    /// store the per-mint creator, only the platform-wide buckets do.
    #[account(mut, token::mint = source_vault.mint)]
    pub creator_ta: Account<'info, TokenAccount>,

    #[account(
        mut,
        token::mint = source_vault.mint,
        token::authority = config.holder_dividend_pool,
    )]
    pub holder_dividend_ta: Account<'info, TokenAccount>,

    #[account(
        mut,
        token::mint = source_vault.mint,
        token::authority = config.jackpot_pool,
    )]
    pub jackpot_ta: Account<'info, TokenAccount>,

    #[account(
        mut,
        token::mint = source_vault.mint,
        token::authority = config.legal_reserve,
    )]
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
    /// vault_authority_seeds allows the caller's PDA to sign the token CPI;
    /// we re-derive against this program's id and require the result match
    /// the supplied vault_authority key, so a caller can't smuggle in seeds
    /// that resolve to a PDA they control.
    pub fn distribute(
        ctx: Context<Distribute>,
        amount: u64,
        source: FeeSource,
        creator: Pubkey,
        vault_authority_seeds: Vec<Vec<u8>>,
    ) -> Result<()> {
        require!(amount > 0, DistributionError::ZeroAmount);
        require!(!vault_authority_seeds.is_empty(), DistributionError::EmptySeeds);

        // Cross-check that the supplied seeds actually derive to the
        // vault_authority account passed in. This program id is the
        // signing program, so the PDA must derive against `crate::ID`.
        // Strip the trailing bump byte (caller supplies it) and re-derive.
        let seed_slices: Vec<&[u8]> = vault_authority_seeds
            .iter()
            .map(|v| v.as_slice())
            .collect();
        let (derived, _bump) = Pubkey::find_program_address(
            // exclude the bump suffix the caller provides for signing
            &seed_slices[..seed_slices.len().saturating_sub(1)],
            &crate::ID,
        );
        require_keys_eq!(
            derived,
            ctx.accounts.vault_authority.key(),
            DistributionError::SeedDerivationMismatch,
        );

        // creator_ta owner must match the creator pubkey passed by the caller —
        // anchor's token::authority constraint can't take a runtime arg, so
        // we check it manually here.
        require_keys_eq!(
            ctx.accounts.creator_ta.owner,
            creator,
            DistributionError::DestinationMismatch,
        );

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
    (amount as u128 * rate as u128 / BPS_TOTAL as u128) as u64
}
