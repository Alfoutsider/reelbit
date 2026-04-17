use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("CnsFM3xfkWZdv79kERxGfJmty9NRS9jiFEV6tMTnR9gH");

// Jackpot triggers when pool balance exceeds this multiple of the configured seed amount.
// Actual trigger uses Switchboard VRF in Sprint 4 — Sprint 1 provides the vault + accounting.
const MAX_JACKPOT_BPS: u64 = 10_000; // 100% of seed = jackpot cap before forced payout

// ── State ─────────────────────────────────────────────────────────────────────

#[account]
pub struct JackpotConfig {
    pub authority: Pubkey,
    /// Only the casino GGR vault / distribution program may deposit
    pub deposit_authority: Pubkey,
    /// Switchboard VRF account — verified in Sprint 4
    pub vrf_account: Pubkey,
    pub total_deposited: u64,
    pub total_paid_out: u64,
    pub jackpot_count: u32,
    pub bump: u8,
}

impl JackpotConfig {
    const LEN: usize = 8 + 32 + 32 + 32 + 8 + 8 + 4 + 1;
}

/// Pending jackpot result from VRF — set by request_jackpot, consumed by settle_jackpot.
#[account]
pub struct JackpotRequest {
    pub player: Pubkey,
    pub mint: Pubkey,
    pub requested_at: i64,
    pub vrf_result: [u8; 32],
    pub settled: bool,
    pub bump: u8,
}

impl JackpotRequest {
    const LEN: usize = 8 + 32 + 32 + 8 + 32 + 1 + 1;
}

// ── Errors ────────────────────────────────────────────────────────────────────

#[error_code]
pub enum JackpotError {
    #[msg("Unauthorized depositor")]
    Unauthorized,
    #[msg("Zero amount")]
    ZeroAmount,
    #[msg("Request already settled")]
    AlreadySettled,
    #[msg("VRF result not yet available")]
    VrfPending,
    #[msg("Player did not win jackpot")]
    NotWinner,
}

// ── Events ────────────────────────────────────────────────────────────────────

#[event]
pub struct JackpotDeposited {
    pub amount: u64,
    pub pool_balance: u64,
}

#[event]
pub struct JackpotRequested {
    pub player: Pubkey,
    pub mint: Pubkey,
    pub requested_at: i64,
}

#[event]
pub struct JackpotWon {
    pub player: Pubkey,
    pub mint: Pubkey,
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
        space = JackpotConfig::LEN,
        seeds = [b"jackpot_config"],
        bump,
    )]
    pub config: Account<'info, JackpotConfig>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DepositJackpot<'info> {
    pub deposit_authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"jackpot_config"],
        bump = config.bump,
        constraint = deposit_authority.key() == config.deposit_authority @ JackpotError::Unauthorized,
    )]
    pub config: Account<'info, JackpotConfig>,

    #[account(mut)]
    pub source_ta: Account<'info, TokenAccount>,

    #[account(mut)]
    pub pool_ta: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(player: Pubkey, mint: Pubkey)]
pub struct RequestJackpot<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(seeds = [b"jackpot_config"], bump = config.bump)]
    pub config: Account<'info, JackpotConfig>,

    #[account(
        init,
        payer = payer,
        space = JackpotRequest::LEN,
        seeds = [b"jackpot_req", player.as_ref(), mint.as_ref()],
        bump,
    )]
    pub request: Account<'info, JackpotRequest>,

    /// CHECK: Switchboard VRF account — validated in Sprint 4
    pub vrf_account: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SettleJackpot<'info> {
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"jackpot_config"],
        bump = config.bump,
        constraint = authority.key() == config.authority @ JackpotError::Unauthorized,
    )]
    pub config: Account<'info, JackpotConfig>,

    #[account(
        mut,
        seeds = [b"jackpot_req", request.player.as_ref(), request.mint.as_ref()],
        bump = request.bump,
        constraint = !request.settled @ JackpotError::AlreadySettled,
    )]
    pub request: Account<'info, JackpotRequest>,

    #[account(mut)]
    pub pool_ta: Account<'info, TokenAccount>,

    #[account(mut)]
    pub winner_ta: Account<'info, TokenAccount>,

    /// CHECK: PDA owning pool_ta — seeds [b"jackpot_ta_auth"]
    #[account(seeds = [b"jackpot_ta_auth"], bump)]
    pub pool_ta_authority: AccountInfo<'info>,

    pub token_program: Program<'info, Token>,
}

// ── Program ───────────────────────────────────────────────────────────────────

#[program]
pub mod jackpot_pool {
    use super::*;

    pub fn initialize(
        ctx: Context<Initialize>,
        deposit_authority: Pubkey,
        vrf_account: Pubkey,
    ) -> Result<()> {
        let cfg = &mut ctx.accounts.config;
        cfg.authority = ctx.accounts.authority.key();
        cfg.deposit_authority = deposit_authority;
        cfg.vrf_account = vrf_account;
        cfg.total_deposited = 0;
        cfg.total_paid_out = 0;
        cfg.jackpot_count = 0;
        cfg.bump = ctx.bumps.config;
        Ok(())
    }

    /// Distribution program deposits the 15% jackpot slice here.
    pub fn deposit(ctx: Context<DepositJackpot>, amount: u64) -> Result<()> {
        require!(amount > 0, JackpotError::ZeroAmount);

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.key(),
                Transfer {
                    from: ctx.accounts.source_ta.to_account_info(),
                    to: ctx.accounts.pool_ta.to_account_info(),
                    authority: ctx.accounts.deposit_authority.to_account_info(),
                },
            ),
            amount,
        )?;

        ctx.accounts.config.total_deposited =
            ctx.accounts.config.total_deposited.saturating_add(amount);

        emit!(JackpotDeposited {
            amount,
            pool_balance: ctx.accounts.pool_ta.amount + amount,
        });
        Ok(())
    }

    /// Casino server CPIs here when a player triggers a jackpot spin.
    /// Sprint 4: wires real Switchboard VRF request.
    pub fn request_jackpot(
        ctx: Context<RequestJackpot>,
        player: Pubkey,
        mint: Pubkey,
    ) -> Result<()> {
        let req = &mut ctx.accounts.request;
        req.player = player;
        req.mint = mint;
        req.requested_at = Clock::get()?.unix_timestamp;
        req.vrf_result = [0u8; 32];
        req.settled = false;
        req.bump = ctx.bumps.request;

        emit!(JackpotRequested { player, mint, requested_at: req.requested_at });
        Ok(())
    }

    /// Called by authority after VRF callback (Sprint 4) provides randomness.
    /// vrf_result is the 32-byte Switchboard output — jackpot if first 2 bytes == 0.
    pub fn settle_jackpot(
        ctx: Context<SettleJackpot>,
        vrf_result: [u8; 32],
    ) -> Result<()> {
        // Sprint 4: replace with on-chain VRF account verification
        let is_winner = vrf_result[0] == 0 && vrf_result[1] == 0;
        require!(is_winner, JackpotError::NotWinner);

        let payout = ctx.accounts.pool_ta.amount;
        require!(payout > 0, JackpotError::ZeroAmount);

        let bump = ctx.bumps.pool_ta_authority;
        let seeds: &[&[u8]] = &[b"jackpot_ta_auth", &[bump]];
        let signer: &[&[&[u8]]] = &[&[seeds[0], seeds[1]]];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.key(),
                Transfer {
                    from: ctx.accounts.pool_ta.to_account_info(),
                    to: ctx.accounts.winner_ta.to_account_info(),
                    authority: ctx.accounts.pool_ta_authority.to_account_info(),
                },
                signer,
            ),
            payout,
        )?;

        ctx.accounts.request.vrf_result = vrf_result;
        ctx.accounts.request.settled = true;
        ctx.accounts.config.total_paid_out =
            ctx.accounts.config.total_paid_out.saturating_add(payout);
        ctx.accounts.config.jackpot_count += 1;

        emit!(JackpotWon {
            player: ctx.accounts.request.player,
            mint: ctx.accounts.request.mint,
            amount: payout,
        });
        Ok(())
    }
}
