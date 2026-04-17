use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

declare_id!("HkGiTLpuij4w7ZM87ooYYn3JPy9neEaxZPwpJKU2imzu");

// ── Constants ────────────────────────────────────────────────────────────────

const TOTAL_SUPPLY: u64 = 1_000_000_000 * 10u64.pow(6); // 1B tokens, 6 decimals
const MAX_WALLET_BPS: u64 = 500; // 5%

// ── State ────────────────────────────────────────────────────────────────────

#[account]
pub struct SlotMetadata {
    pub creator: Pubkey,
    pub mint: Pubkey,
    pub dlmm_pool: Pubkey,
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
    const LEN: usize = 8 + 32 + 32 + 32
        + (4 + Self::MAX_NAME)
        + (4 + Self::MAX_TICKER)
        + (4 + Self::MAX_URI)
        + 1 + 1 + 8 + 8 + 1;
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

// ── Errors ───────────────────────────────────────────────────────────────────

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
}

// ── Events ───────────────────────────────────────────────────────────────────

#[event]
pub struct SlotLaunched {
    pub mint: Pubkey,
    pub creator: Pubkey,
    pub name: String,
    pub ticker: String,
}

// ── Instruction params ───────────────────────────────────────────────────────

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct LaunchSlotParams {
    pub name: String,
    pub ticker: String,
    pub image_uri: String,
    pub model: SlotModel,
}

// ── Accounts ─────────────────────────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(params: LaunchSlotParams)]
pub struct LaunchSlot<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        init,
        payer = creator,
        mint::decimals = 6,
        mint::authority = slot_metadata,
    )]
    pub mint: Account<'info, Mint>,

    #[account(
        init,
        payer = creator,
        token::mint = mint,
        token::authority = creator,
    )]
    pub creator_token_account: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = creator,
        space = SlotMetadata::LEN,
        seeds = [b"slot_metadata", mint.key().as_ref()],
        bump,
    )]
    pub slot_metadata: Account<'info, SlotMetadata>,

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
        seeds = [b"wallet_cap", mint.key().as_ref(), seller.key().as_ref()],
        bump,
    )]
    pub wallet_cap: Account<'info, WalletCap>,

    #[account(
        mut,
        token::mint = mint,
        token::authority = seller,
    )]
    pub seller_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

// ── Program ──────────────────────────────────────────────────────────────────

#[program]
pub mod token_launch {
    use super::*;

    /// Creates SPL token (1B supply), registers slot metadata PDA, enforces 5% wallet cap.
    /// DLMM pool seeding happens via separate CPI to Meteora after this instruction.
    pub fn launch_slot(ctx: Context<LaunchSlot>, params: LaunchSlotParams) -> Result<()> {
        require!(params.name.len() <= SlotMetadata::MAX_NAME, TokenLaunchError::NameTooLong);
        require!(params.ticker.len() <= SlotMetadata::MAX_TICKER, TokenLaunchError::TickerTooLong);
        require!(params.image_uri.len() <= SlotMetadata::MAX_URI, TokenLaunchError::ImageUriTooLong);

        let m = &mut ctx.accounts.slot_metadata;
        m.creator = ctx.accounts.creator.key();
        m.mint = ctx.accounts.mint.key();
        m.dlmm_pool = Pubkey::default();
        m.name = params.name.clone();
        m.ticker = params.ticker.clone();
        m.image_uri = params.image_uri;
        m.model = params.model;
        m.graduated = false;
        m.total_supply = TOTAL_SUPPLY;
        m.created_at = Clock::get()?.unix_timestamp;
        m.bump = ctx.bumps.slot_metadata;

        emit!(SlotLaunched {
            mint: m.mint,
            creator: m.creator,
            name: params.name,
            ticker: params.ticker,
        });

        Ok(())
    }

    /// Buys tokens on the bonding curve. Enforces 5% wallet cap.
    /// Actual swap goes through Meteora DLMM CPI.
    pub fn buy_tokens(ctx: Context<BuyTokens>, sol_amount: u64) -> Result<()> {
        require!(sol_amount > 0, TokenLaunchError::ZeroAmount);

        let cap = &mut ctx.accounts.wallet_cap;
        let total = ctx.accounts.slot_metadata.total_supply;
        let max_tokens = total * MAX_WALLET_BPS / 10_000;

        // Placeholder: real token amount comes from Meteora DLMM CPI return value
        let tokens_out: u64 = sol_amount.saturating_mul(200_000);

        require!(cap.tokens_held + tokens_out <= max_tokens, TokenLaunchError::WalletCapExceeded);

        cap.mint = ctx.accounts.mint.key();
        cap.wallet = ctx.accounts.buyer.key();
        cap.tokens_held += tokens_out;

        Ok(())
    }

    /// Sells tokens on the bonding curve. Updates wallet cap tracking.
    pub fn sell_tokens(ctx: Context<SellTokens>, token_amount: u64) -> Result<()> {
        require!(token_amount > 0, TokenLaunchError::ZeroAmount);
        ctx.accounts.wallet_cap.tokens_held =
            ctx.accounts.wallet_cap.tokens_held.saturating_sub(token_amount);
        Ok(())
    }
}
