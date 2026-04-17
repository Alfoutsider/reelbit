use anchor_lang::prelude::*;
use anchor_lang::system_program;
use anchor_spl::token::{self, Mint, MintTo, Token, TokenAccount, Transfer};

declare_id!("HkGiTLpuij4w7ZM87ooYYn3JPy9neEaxZPwpJKU2imzu");

// ── Constants ─────────────────────────────────────────────────────────────────

const TOTAL_SUPPLY: u64 = 1_000_000_000 * 10u64.pow(6); // 1B tokens, 6 dec

// pump.fun-style virtual reserves — starting mcap ≈ $5k
const VIRTUAL_SOL_RESERVES: u64 = 30 * 1_000_000_000; // 30 SOL
const VIRTUAL_TOKEN_RESERVES: u64 = 1_073_000_191_000_000; // 1.073B tokens (6 dec)

// Tokens seeded into the curve (≈80% of supply; rest locked for grad liquidity)
const CURVE_TOKEN_SUPPLY: u64 = 793_100_000_000_000; // 793.1M tokens

const MAX_WALLET_BPS: u64 = 500; // 5%

// ~85 SOL in vault triggers graduation ($100k mcap at $1.2k/SOL; Sprint 5 adds oracle)
const GRADUATION_LAMPORTS: u64 = 85_000_000_000;

// ── State ─────────────────────────────────────────────────────────────────────

#[account]
pub struct SlotMetadata {
    pub creator: Pubkey,
    pub mint: Pubkey,
    pub name: String,
    pub ticker: String,
    pub image_uri: String,
    pub model: SlotModel,
    pub graduated: bool,
    pub total_supply: u64,
    pub created_at: i64,
    pub bump: u8,
}

impl SlotMetadata {
    const MAX_NAME: usize = 32;
    const MAX_TICKER: usize = 10;
    const MAX_URI: usize = 200;
    const LEN: usize = 8 + 32 + 32
        + (4 + Self::MAX_NAME)
        + (4 + Self::MAX_TICKER)
        + (4 + Self::MAX_URI)
        + 1 + 1 + 8 + 8 + 1;
}

/// Bonding curve vault — holds SOL lamports, tracks virtual/real reserves.
#[account]
pub struct BondingCurveVault {
    pub mint: Pubkey,
    pub creator: Pubkey,
    pub virtual_sol: u64,
    pub virtual_tokens: u64,
    pub real_sol: u64,
    pub real_tokens: u64,
    pub bump: u8,
}

impl BondingCurveVault {
    const LEN: usize = 8 + 32 + 32 + 8 + 8 + 8 + 8 + 1;

    /// x*y=k buy: sol_in → tokens_out
    pub fn tokens_for_sol(&self, sol_in: u64) -> u64 {
        let num = (self.virtual_tokens as u128) * (sol_in as u128);
        let den = (self.virtual_sol as u128) + (sol_in as u128);
        (num / den) as u64
    }

    /// x*y=k sell: tokens_in → sol_out
    pub fn sol_for_tokens(&self, tokens_in: u64) -> u64 {
        let num = (self.virtual_sol as u128) * (tokens_in as u128);
        let den = (self.virtual_tokens as u128) + (tokens_in as u128);
        (num / den) as u64
    }
}

#[account]
pub struct WalletCap {
    pub mint: Pubkey,
    pub wallet: Pubkey,
    pub tokens_held: u64,
    pub bump: u8,
}

impl WalletCap {
    const LEN: usize = 8 + 32 + 32 + 8 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum SlotModel {
    Classic3Reel,
    Standard5Reel,
    FiveReelFreeSpins,
}

// ── Errors ────────────────────────────────────────────────────────────────────

#[error_code]
pub enum TokenLaunchError {
    #[msg("Wallet would exceed 5% token cap")]
    WalletCapExceeded,
    #[msg("Name too long (max 32 chars)")]
    NameTooLong,
    #[msg("Ticker too long (max 10 chars)")]
    TickerTooLong,
    #[msg("Image URI too long (max 200 chars)")]
    ImageUriTooLong,
    #[msg("Slot already graduated")]
    AlreadyGraduated,
    #[msg("Zero amount not allowed")]
    ZeroAmount,
    #[msg("Insufficient tokens in curve")]
    InsufficientTokens,
    #[msg("Slippage tolerance exceeded")]
    SlippageExceeded,
    #[msg("Insufficient SOL in vault")]
    InsufficientSol,
}

// ── Events ────────────────────────────────────────────────────────────────────

#[event]
pub struct SlotLaunched {
    pub mint: Pubkey,
    pub creator: Pubkey,
    pub name: String,
    pub ticker: String,
}

#[event]
pub struct TokensBought {
    pub mint: Pubkey,
    pub buyer: Pubkey,
    pub sol_in: u64,
    pub tokens_out: u64,
    pub real_sol: u64,
    pub real_tokens: u64,
}

#[event]
pub struct TokensSold {
    pub mint: Pubkey,
    pub seller: Pubkey,
    pub tokens_in: u64,
    pub sol_out: u64,
    pub real_sol: u64,
    pub real_tokens: u64,
}

#[event]
pub struct SlotGraduated {
    pub mint: Pubkey,
    pub creator: Pubkey,
    pub real_sol: u64,
}

// ── Instruction params ────────────────────────────────────────────────────────

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct LaunchSlotParams {
    pub name: String,
    pub ticker: String,
    pub image_uri: String,
    pub model: SlotModel,
}

// ── Accounts ──────────────────────────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(params: LaunchSlotParams)]
pub struct LaunchSlot<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        init,
        payer = creator,
        mint::decimals = 6,
        mint::authority = bonding_curve_vault,
    )]
    pub mint: Account<'info, Mint>,

    #[account(
        init,
        payer = creator,
        token::mint = mint,
        token::authority = bonding_curve_vault,
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = creator,
        space = SlotMetadata::LEN,
        seeds = [b"slot_metadata", mint.key().as_ref()],
        bump,
    )]
    pub slot_metadata: Account<'info, SlotMetadata>,

    #[account(
        init,
        payer = creator,
        space = BondingCurveVault::LEN,
        seeds = [b"bonding_curve", mint.key().as_ref()],
        bump,
    )]
    pub bonding_curve_vault: Account<'info, BondingCurveVault>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct BuyTokens<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,

    pub mint: Account<'info, Mint>,

    #[account(
        mut,
        seeds = [b"slot_metadata", mint.key().as_ref()],
        bump = slot_metadata.bump,
        constraint = !slot_metadata.graduated @ TokenLaunchError::AlreadyGraduated,
    )]
    pub slot_metadata: Account<'info, SlotMetadata>,

    #[account(
        mut,
        seeds = [b"bonding_curve", mint.key().as_ref()],
        bump = bonding_curve_vault.bump,
    )]
    pub bonding_curve_vault: Account<'info, BondingCurveVault>,

    #[account(
        mut,
        token::mint = mint,
        token::authority = bonding_curve_vault,
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = buyer,
        space = WalletCap::LEN,
        seeds = [b"wallet_cap", mint.key().as_ref(), buyer.key().as_ref()],
        bump,
    )]
    pub wallet_cap: Account<'info, WalletCap>,

    #[account(
        init_if_needed,
        payer = buyer,
        token::mint = mint,
        token::authority = buyer,
    )]
    pub buyer_token_account: Account<'info, TokenAccount>,

    #[account(mut, address = slot_metadata.creator)]
    pub creator: SystemAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SellTokens<'info> {
    #[account(mut)]
    pub seller: Signer<'info>,

    pub mint: Account<'info, Mint>,

    #[account(
        mut,
        seeds = [b"slot_metadata", mint.key().as_ref()],
        bump = slot_metadata.bump,
        constraint = !slot_metadata.graduated @ TokenLaunchError::AlreadyGraduated,
    )]
    pub slot_metadata: Account<'info, SlotMetadata>,

    #[account(
        mut,
        seeds = [b"bonding_curve", mint.key().as_ref()],
        bump = bonding_curve_vault.bump,
    )]
    pub bonding_curve_vault: Account<'info, BondingCurveVault>,

    #[account(
        mut,
        token::mint = mint,
        token::authority = bonding_curve_vault,
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"wallet_cap", mint.key().as_ref(), seller.key().as_ref()],
        bump = wallet_cap.bump,
    )]
    pub wallet_cap: Account<'info, WalletCap>,

    #[account(
        mut,
        token::mint = mint,
        token::authority = seller,
    )]
    pub seller_token_account: Account<'info, TokenAccount>,

    #[account(mut, address = slot_metadata.creator)]
    pub creator: SystemAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

// ── Program ───────────────────────────────────────────────────────────────────

#[program]
pub mod token_launch {
    use super::*;

    pub fn launch_slot(ctx: Context<LaunchSlot>, params: LaunchSlotParams) -> Result<()> {
        require!(params.name.len() <= SlotMetadata::MAX_NAME, TokenLaunchError::NameTooLong);
        require!(params.ticker.len() <= SlotMetadata::MAX_TICKER, TokenLaunchError::TickerTooLong);
        require!(params.image_uri.len() <= SlotMetadata::MAX_URI, TokenLaunchError::ImageUriTooLong);

        let mint_key = ctx.accounts.mint.key();

        let m = &mut ctx.accounts.slot_metadata;
        m.creator = ctx.accounts.creator.key();
        m.mint = mint_key;
        m.name = params.name.clone();
        m.ticker = params.ticker.clone();
        m.image_uri = params.image_uri;
        m.model = params.model;
        m.graduated = false;
        m.total_supply = TOTAL_SUPPLY;
        m.created_at = Clock::get()?.unix_timestamp;
        m.bump = ctx.bumps.slot_metadata;

        let v = &mut ctx.accounts.bonding_curve_vault;
        v.mint = mint_key;
        v.creator = ctx.accounts.creator.key();
        v.virtual_sol = VIRTUAL_SOL_RESERVES;
        v.virtual_tokens = VIRTUAL_TOKEN_RESERVES;
        v.real_sol = 0;
        v.real_tokens = CURVE_TOKEN_SUPPLY;
        v.bump = ctx.bumps.bonding_curve_vault;

        // Mint curve supply into vault token account (PDA signs)
        let vault_bump = ctx.accounts.bonding_curve_vault.bump;
        let vault_seeds: &[&[u8]] = &[b"bonding_curve", mint_key.as_ref(), &[vault_bump]];
        let signer_seeds = &[vault_seeds];

        let token_pid = ctx.accounts.token_program.key();
        token::mint_to(
            CpiContext::new_with_signer(
                token_pid,
                MintTo {
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.vault_token_account.to_account_info(),
                    authority: ctx.accounts.bonding_curve_vault.to_account_info(),
                },
                signer_seeds,
            ),
            CURVE_TOKEN_SUPPLY,
        )?;

        emit!(SlotLaunched {
            mint: mint_key,
            creator: ctx.accounts.creator.key(),
            name: params.name,
            ticker: params.ticker,
        });

        Ok(())
    }

    /// Buy tokens from the curve. sol_amount = lamports in, min_tokens_out = slippage guard.
    pub fn buy_tokens(ctx: Context<BuyTokens>, sol_amount: u64, min_tokens_out: u64) -> Result<()> {
        require!(sol_amount > 0, TokenLaunchError::ZeroAmount);

        let tokens_out = ctx.accounts.bonding_curve_vault.tokens_for_sol(sol_amount);
        require!(tokens_out > 0, TokenLaunchError::ZeroAmount);
        require!(tokens_out >= min_tokens_out, TokenLaunchError::SlippageExceeded);
        require!(tokens_out <= ctx.accounts.bonding_curve_vault.real_tokens, TokenLaunchError::InsufficientTokens);

        // 5% wallet cap check
        let max_tokens = ctx.accounts.slot_metadata.total_supply * MAX_WALLET_BPS / 10_000;
        require!(
            ctx.accounts.wallet_cap.tokens_held + tokens_out <= max_tokens,
            TokenLaunchError::WalletCapExceeded,
        );

        // 0.5% creator fee, remaining SOL goes to vault
        let creator_fee = sol_amount * 50 / 10_000;
        let vault_sol = sol_amount.saturating_sub(creator_fee);

        let sys_pid = ctx.accounts.system_program.key();

        // buyer → vault
        system_program::transfer(
            CpiContext::new(
                sys_pid,
                system_program::Transfer {
                    from: ctx.accounts.buyer.to_account_info(),
                    to: ctx.accounts.bonding_curve_vault.to_account_info(),
                },
            ),
            vault_sol,
        )?;

        // buyer → creator fee
        if creator_fee > 0 {
            system_program::transfer(
                CpiContext::new(
                    sys_pid,
                    system_program::Transfer {
                        from: ctx.accounts.buyer.to_account_info(),
                        to: ctx.accounts.creator.to_account_info(),
                    },
                ),
                creator_fee,
            )?;
        }

        // vault → buyer token transfer (PDA signed)
        let mint_key = ctx.accounts.mint.key();
        let vault_bump = ctx.accounts.bonding_curve_vault.bump;
        let vault_seeds: &[&[u8]] = &[b"bonding_curve", mint_key.as_ref(), &[vault_bump]];
        let signer_seeds = &[vault_seeds];

        let token_pid = ctx.accounts.token_program.key();
        token::transfer(
            CpiContext::new_with_signer(
                token_pid,
                Transfer {
                    from: ctx.accounts.vault_token_account.to_account_info(),
                    to: ctx.accounts.buyer_token_account.to_account_info(),
                    authority: ctx.accounts.bonding_curve_vault.to_account_info(),
                },
                signer_seeds,
            ),
            tokens_out,
        )?;

        // Update reserves
        let vault = &mut ctx.accounts.bonding_curve_vault;
        vault.virtual_sol += sol_amount;
        vault.virtual_tokens -= tokens_out;
        vault.real_sol += vault_sol;
        vault.real_tokens -= tokens_out;

        // Update wallet cap
        let cap = &mut ctx.accounts.wallet_cap;
        cap.mint = mint_key;
        cap.wallet = ctx.accounts.buyer.key();
        cap.tokens_held += tokens_out;
        cap.bump = ctx.bumps.wallet_cap;

        let new_real_sol = vault.real_sol;
        let new_real_tokens = vault.real_tokens;

        emit!(TokensBought {
            mint: mint_key,
            buyer: ctx.accounts.buyer.key(),
            sol_in: sol_amount,
            tokens_out,
            real_sol: new_real_sol,
            real_tokens: new_real_tokens,
        });

        // Auto-graduate when vault SOL threshold is reached
        if new_real_sol >= GRADUATION_LAMPORTS {
            ctx.accounts.slot_metadata.graduated = true;
            emit!(SlotGraduated {
                mint: mint_key,
                creator: ctx.accounts.slot_metadata.creator,
                real_sol: new_real_sol,
            });
        }

        Ok(())
    }

    /// Sell tokens back to the curve.
    pub fn sell_tokens(ctx: Context<SellTokens>, token_amount: u64, min_sol_out: u64) -> Result<()> {
        require!(token_amount > 0, TokenLaunchError::ZeroAmount);

        let gross_sol = ctx.accounts.bonding_curve_vault.sol_for_tokens(token_amount);
        require!(gross_sol > 0, TokenLaunchError::ZeroAmount);
        require!(gross_sol <= ctx.accounts.bonding_curve_vault.real_sol, TokenLaunchError::InsufficientSol);

        let creator_fee = gross_sol * 50 / 10_000;
        let net_sol = gross_sol.saturating_sub(creator_fee * 2);
        require!(net_sol >= min_sol_out, TokenLaunchError::SlippageExceeded);

        let token_pid = ctx.accounts.token_program.key();

        // seller tokens → vault token account
        token::transfer(
            CpiContext::new(
                token_pid,
                Transfer {
                    from: ctx.accounts.seller_token_account.to_account_info(),
                    to: ctx.accounts.vault_token_account.to_account_info(),
                    authority: ctx.accounts.seller.to_account_info(),
                },
            ),
            token_amount,
        )?;

        // vault SOL → seller + creator (PDA signed)
        let mint_key = ctx.accounts.mint.key();
        let vault_bump = ctx.accounts.bonding_curve_vault.bump;
        let vault_seeds: &[&[u8]] = &[b"bonding_curve", mint_key.as_ref(), &[vault_bump]];
        let signer_seeds = &[vault_seeds];
        let sys_pid = ctx.accounts.system_program.key();

        system_program::transfer(
            CpiContext::new_with_signer(
                sys_pid,
                system_program::Transfer {
                    from: ctx.accounts.bonding_curve_vault.to_account_info(),
                    to: ctx.accounts.seller.to_account_info(),
                },
                signer_seeds,
            ),
            net_sol,
        )?;

        if creator_fee > 0 {
            system_program::transfer(
                CpiContext::new_with_signer(
                    sys_pid,
                    system_program::Transfer {
                        from: ctx.accounts.bonding_curve_vault.to_account_info(),
                        to: ctx.accounts.creator.to_account_info(),
                    },
                    signer_seeds,
                ),
                creator_fee,
            )?;
        }

        // Update reserves
        let vault = &mut ctx.accounts.bonding_curve_vault;
        vault.virtual_sol -= gross_sol;
        vault.virtual_tokens += token_amount;
        vault.real_sol -= gross_sol;
        vault.real_tokens += token_amount;

        ctx.accounts.wallet_cap.tokens_held =
            ctx.accounts.wallet_cap.tokens_held.saturating_sub(token_amount);

        let new_real_sol = vault.real_sol;
        let new_real_tokens = vault.real_tokens;

        emit!(TokensSold {
            mint: mint_key,
            seller: ctx.accounts.seller.key(),
            tokens_in: token_amount,
            sol_out: net_sol,
            real_sol: new_real_sol,
            real_tokens: new_real_tokens,
        });

        Ok(())
    }
}
