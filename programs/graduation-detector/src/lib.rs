use anchor_lang::prelude::*;

declare_id!("HjrWDt8x46beDUP33NCzHc4VdswYKEE2axf6F2CoDxha");

// Graduation threshold: $100k market cap denominated in lamports (6-decimal token).
// This constant is the SOL-equivalent amount kept in the bonding curve vault.
// Sprint 3 will replace this with a Pyth/Switchboard oracle price feed.
// For Sprint 1 we express it as a raw lamport threshold (100k USD at ~$150/SOL ≈ 667 SOL).
const GRADUATION_LAMPORTS: u64 = 667_000_000_000; // ~667 SOL

// ── State ─────────────────────────────────────────────────────────────────────

#[account]
pub struct GraduationState {
    pub mint: Pubkey,
    pub creator: Pubkey,
    pub dlmm_pool: Pubkey,
    /// Set once migration completes
    pub dynamic_amm_pool: Pubkey,
    pub graduated: bool,
    pub graduated_at: i64,
    pub bump: u8,
}

impl GraduationState {
    const LEN: usize = 8 + 32 + 32 + 32 + 32 + 1 + 8 + 1;
}

// ── Errors ────────────────────────────────────────────────────────────────────

#[error_code]
pub enum GraduationError {
    #[msg("Slot has not reached graduation threshold")]
    BelowThreshold,
    #[msg("Slot already graduated")]
    AlreadyGraduated,
    #[msg("Unauthorized — only creator or platform authority")]
    Unauthorized,
}

// ── Events ────────────────────────────────────────────────────────────────────

#[event]
pub struct SlotGraduated {
    pub mint: Pubkey,
    pub creator: Pubkey,
    pub dlmm_pool: Pubkey,
    pub dynamic_amm_pool: Pubkey,
    pub graduated_at: i64,
}

// ── Accounts ──────────────────────────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(mint: Pubkey)]
pub struct RegisterSlot<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        init,
        payer = creator,
        space = GraduationState::LEN,
        seeds = [b"grad_state", mint.as_ref()],
        bump,
    )]
    pub grad_state: Account<'info, GraduationState>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CheckAndGraduate<'info> {
    /// Anyone can crank graduation — permissionless check
    #[account(mut)]
    pub crank: Signer<'info>,

    #[account(
        mut,
        seeds = [b"grad_state", grad_state.mint.as_ref()],
        bump = grad_state.bump,
        constraint = !grad_state.graduated @ GraduationError::AlreadyGraduated,
    )]
    pub grad_state: Account<'info, GraduationState>,

    /// The bonding curve SOL vault — its lamport balance is the graduation signal.
    /// CHECK: we only read lamports, no deserialization needed
    pub bonding_curve_vault: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct RecordMigration<'info> {
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"grad_state", grad_state.mint.as_ref()],
        bump = grad_state.bump,
    )]
    pub grad_state: Account<'info, GraduationState>,
}

// ── Program ───────────────────────────────────────────────────────────────────

#[program]
pub mod graduation_detector {
    use super::*;

    /// Called once per slot token at launch time to create the graduation tracker.
    pub fn register_slot(
        ctx: Context<RegisterSlot>,
        mint: Pubkey,
        dlmm_pool: Pubkey,
    ) -> Result<()> {
        let gs = &mut ctx.accounts.grad_state;
        gs.mint = mint;
        gs.creator = ctx.accounts.creator.key();
        gs.dlmm_pool = dlmm_pool;
        gs.dynamic_amm_pool = Pubkey::default();
        gs.graduated = false;
        gs.graduated_at = 0;
        gs.bump = ctx.bumps.grad_state;
        Ok(())
    }

    /// Permissionless crank: checks vault balance and marks slot as graduated.
    /// Sprint 3 will follow this with a CPI to Meteora to atomically migrate the pool.
    pub fn check_and_graduate(ctx: Context<CheckAndGraduate>) -> Result<()> {
        let vault_lamports = ctx.accounts.bonding_curve_vault.lamports();
        require!(vault_lamports >= GRADUATION_LAMPORTS, GraduationError::BelowThreshold);

        let gs = &mut ctx.accounts.grad_state;
        gs.graduated = true;
        gs.graduated_at = Clock::get()?.unix_timestamp;

        emit!(SlotGraduated {
            mint: gs.mint,
            creator: gs.creator,
            dlmm_pool: gs.dlmm_pool,
            dynamic_amm_pool: gs.dynamic_amm_pool,
            graduated_at: gs.graduated_at,
        });

        Ok(())
    }

    /// Called after the off-chain migration bot completes the DLMM→Dynamic AMM swap.
    /// Records the new pool address so the casino program can find it.
    pub fn record_migration(
        ctx: Context<RecordMigration>,
        dynamic_amm_pool: Pubkey,
    ) -> Result<()> {
        require!(
            ctx.accounts.authority.key() == ctx.accounts.grad_state.creator,
            GraduationError::Unauthorized
        );
        ctx.accounts.grad_state.dynamic_amm_pool = dynamic_amm_pool;
        Ok(())
    }
}
