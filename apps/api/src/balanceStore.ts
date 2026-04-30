import { supabase } from "./supabase";

export const USDC_DECIMALS = 6;
export const USDC_UNIT     = 1_000_000;

// Bonus constants — these are the authoritative values for all bonus logic
export const BONUS_WAGER_MULTIPLIER = 45;
export const BONUS_MAX_USDC         = 200 * USDC_UNIT;   // $200 cap
export const BONUS_MAX_BET          = 10  * USDC_UNIT;   // $10 max bet while active
export const BONUS_EXPIRY_DAYS      = 7;

export type BonusState = 'none' | 'active' | 'completed' | 'forfeited' | 'expired';

export interface BalanceEntry {
  playable:             number;
  bonus:                number;
  wageringRequired:     number;
  wageringCompleted:    number;
  welcomeBonusClaimed:  boolean;
  bonusState:           BonusState;
  bonusAmount:          number;
  bonusGrantedAt:       string | null;
  bonusExpiresAt:       string | null;
  /** Internal — -1 means no DB row yet (use INSERT), ≥0 is the persisted version */
  version:              number;
}

function defaultEntry(): BalanceEntry {
  return {
    playable: 0, bonus: 0, wageringRequired: 0, wageringCompleted: 0,
    welcomeBonusClaimed: false, bonusState: 'none', bonusAmount: 0,
    bonusGrantedAt: null, bonusExpiresAt: null, version: -1,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toEntry(row: any): BalanceEntry {
  const entry: BalanceEntry = {
    playable:            Number(row.playable),
    bonus:               Number(row.bonus),
    wageringRequired:    Number(row.wagering_required),
    wageringCompleted:   Number(row.wagering_completed),
    welcomeBonusClaimed: row.welcome_bonus_claimed,
    bonusState:          (row.bonus_state ?? 'none') as BonusState,
    bonusAmount:         Number(row.bonus_amount ?? 0),
    bonusGrantedAt:      row.bonus_granted_at ?? null,
    bonusExpiresAt:      row.bonus_expires_at ?? null,
    version:             Number(row.version ?? 0),
  };
  // Lazy expiry: if the DB says active but expiry has passed, mark expired in-memory
  if (entry.bonusState === 'active' && entry.bonusExpiresAt && new Date(entry.bonusExpiresAt) <= new Date()) {
    entry.bonusState = 'expired';
    entry.bonus = 0;
    entry.wageringRequired = 0;
    entry.wageringCompleted = 0;
  }
  return entry;
}

function toRow(wallet: string, entry: BalanceEntry): Record<string, unknown> {
  return {
    wallet,
    playable:              entry.playable,
    bonus:                 entry.bonus,
    wagering_required:     entry.wageringRequired,
    wagering_completed:    entry.wageringCompleted,
    welcome_bonus_claimed: entry.welcomeBonusClaimed,
    bonus_state:           entry.bonusState,
    bonus_amount:          entry.bonusAmount,
    bonus_granted_at:      entry.bonusGrantedAt,
    bonus_expires_at:      entry.bonusExpiresAt,
  };
}

async function getOrDefault(wallet: string): Promise<BalanceEntry> {
  const { data } = await supabase.from("balances").select("*").eq("wallet", wallet).maybeSingle();
  return data ? toEntry(data) : defaultEntry();
}

/**
 * Persist entry with optimistic locking.
 * version === -1 → INSERT (new wallet); version ≥ 0 → UPDATE WHERE version = current.
 * Throws "CONCURRENT_MODIFICATION" if another writer updated between our read and write.
 */
async function save(wallet: string, entry: BalanceEntry): Promise<BalanceEntry> {
  if (entry.version === -1) {
    const row = { ...toRow(wallet, entry), version: 0 };
    const { error } = await supabase.from("balances").upsert(row, { onConflict: "wallet" });
    if (error) throw new Error(error.message);
    return { ...entry, version: 0 };
  }
  const newVersion = entry.version + 1;
  const row = { ...toRow(wallet, entry), version: newVersion };
  const { data, error } = await supabase
    .from("balances")
    .update(row)
    .eq("wallet", wallet)
    .eq("version", entry.version)
    .select("version");
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("CONCURRENT_MODIFICATION");
  return { ...entry, version: newVersion };
}

/** Retry wrapper — re-reads entry inside each attempt to get fresh version. */
async function withRetry<T>(fn: () => Promise<T>, retries = 4): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if ((err as Error).message === "CONCURRENT_MODIFICATION" && i < retries - 1) {
        await new Promise(r => setTimeout(r, 30 * Math.pow(2, i))); // 30, 60, 120 ms
        continue;
      }
      throw err;
    }
  }
  throw new Error("Balance update failed after max retries");
}

async function logBonus(
  wallet: string,
  event: 'grant' | 'wager' | 'complete' | 'forfeit' | 'expire',
  amount: number,
  wageringBefore: number,
  wageringAfter: number,
  meta: Record<string, unknown>,
): Promise<void> {
  await supabase.from("bonus_ledger").insert({
    wallet, event, amount,
    wagering_before: wageringBefore,
    wagering_after:  wageringAfter,
    meta,
  });
}

// ── Deposit deduplication ─────────────────────────────────────────────────────

export async function isSeenDeposit(txSig: string): Promise<boolean> {
  const { data } = await supabase.from("deposits_seen").select("tx_sig").eq("tx_sig", txSig).maybeSingle();
  return !!data;
}

export async function markDepositSeen(txSig: string): Promise<void> {
  await supabase.from("deposits_seen").insert({ tx_sig: txSig }).throwOnError();
}

// ── Read ──────────────────────────────────────────────────────────────────────

export async function getBalance(wallet: string): Promise<BalanceEntry> {
  return getOrDefault(wallet);
}

export async function getPlayable(wallet: string): Promise<number> {
  return (await getOrDefault(wallet)).playable;
}

// ── Write ─────────────────────────────────────────────────────────────────────

export async function credit(wallet: string, usdcUnits: number): Promise<BalanceEntry> {
  return withRetry(async () => {
    const entry = await getOrDefault(wallet);
    entry.playable += usdcUnits;
    return save(wallet, entry);
  });
}

/**
 * Apply welcome bonus on first deposit.
 * 100% match, capped at $200 USDC, 45× wagering requirement, expires in 7 days.
 */
export async function applyWelcomeBonus(wallet: string, depositedUsdcUnits: number): Promise<BalanceEntry> {
  return withRetry(async () => {
    const entry = await getOrDefault(wallet);
    if (entry.welcomeBonusClaimed || entry.bonusState !== 'none') return entry;

    const bonusAmt = Math.min(depositedUsdcUnits, BONUS_MAX_USDC);
    if (bonusAmt <= 0) return entry;

    const now       = new Date();
    const expiresAt = new Date(now.getTime() + BONUS_EXPIRY_DAYS * 24 * 60 * 60 * 1_000);

    entry.bonus               += bonusAmt;
    entry.wageringRequired    += bonusAmt * BONUS_WAGER_MULTIPLIER;
    entry.welcomeBonusClaimed  = true;
    entry.bonusState           = 'active';
    entry.bonusAmount          = bonusAmt;
    entry.bonusGrantedAt       = now.toISOString();
    entry.bonusExpiresAt       = expiresAt.toISOString();

    const saved = await save(wallet, entry);
    logBonus(wallet, 'grant', bonusAmt, 0, 0, {
      deposit_amount:    depositedUsdcUnits,
      wagering_required: bonusAmt * BONUS_WAGER_MULTIPLIER,
      expires_at:        expiresAt.toISOString(),
    }).catch(() => {});
    return saved;
  });
}

/**
 * Debit (bet) with full bonus enforcement:
 *  - Checks and persists bonus expiry
 *  - Enforces $10 max bet while bonus is active (violation = instant forfeit)
 *  - Debits real money first, then bonus
 *  - Optimistic-locked against concurrent debits
 */
export async function debit(wallet: string, usdcUnits: number): Promise<BalanceEntry> {
  return withRetry(async () => {
    const entry = await getOrDefault(wallet);

    // Max bet enforcement (only fires if bonus is genuinely active per in-memory state)
    if (entry.bonusState === 'active' && usdcUnits > BONUS_MAX_BET) {
      const wageringBefore = entry.wageringCompleted;
      const bonusAmount    = entry.bonusAmount;
      entry.bonusState       = 'forfeited';
      entry.bonus            = 0;
      entry.wageringRequired = 0;
      entry.wageringCompleted = 0;
      logBonus(wallet, 'forfeit', bonusAmount, wageringBefore, 0, {
        reason:     'max_bet_violation',
        bet_amount: usdcUnits,
        max_bet:    BONUS_MAX_BET,
      }).catch(() => {});
    }

    const total = entry.playable + entry.bonus;
    if (total < usdcUnits) throw new Error(`Insufficient balance: have ${total} μUSDC, need ${usdcUnits}`);

    // Real money first, then bonus — preserves bonus for wagering
    if (entry.playable >= usdcUnits) {
      entry.playable -= usdcUnits;
    } else {
      const fromBonus = usdcUnits - entry.playable;
      entry.playable  = 0;
      entry.bonus     = Math.max(0, entry.bonus - fromBonus);
    }

    return save(wallet, entry);
  });
}

/**
 * Record wagering progress toward the bonus requirement.
 * Converts bonus → playable when requirement is met.
 * Must be called after every debit (bet), not after credits (wins).
 */
export async function recordWagering(wallet: string, usdcUnits: number): Promise<BalanceEntry> {
  return withRetry(async () => {
    const entry = await getOrDefault(wallet);
    if (entry.bonusState !== 'active') return entry;

    const wageringBefore     = entry.wageringCompleted;
    entry.wageringCompleted += usdcUnits;

    if (entry.wageringCompleted >= entry.wageringRequired) {
      const bonusAmt         = entry.bonus;
      const finalWagered     = entry.wageringCompleted;
      entry.playable        += entry.bonus;
      entry.bonus            = 0;
      entry.bonusState       = 'completed';
      entry.wageringRequired = 0;
      entry.wageringCompleted = 0;
      const saved = await save(wallet, entry);
      logBonus(wallet, 'complete', bonusAmt, wageringBefore, finalWagered, {}).catch(() => {});
      return saved;
    }

    logBonus(wallet, 'wager', usdcUnits, wageringBefore, entry.wageringCompleted, {}).catch(() => {});
    return save(wallet, entry);
  });
}

/**
 * Explicitly forfeit the active bonus (e.g., user opts out).
 * Bonus balance is burned; real playable balance is unaffected.
 */
export async function forfeitBonus(wallet: string): Promise<BalanceEntry> {
  return withRetry(async () => {
    const entry = await getOrDefault(wallet);
    if (entry.bonusState !== 'active') return entry;

    const wageringBefore     = entry.wageringCompleted;
    const bonusAmount        = entry.bonusAmount;
    entry.bonusState         = 'forfeited';
    entry.bonus              = 0;
    entry.wageringRequired   = 0;
    entry.wageringCompleted  = 0;

    const saved = await save(wallet, entry);
    logBonus(wallet, 'forfeit', bonusAmount, wageringBefore, 0, { reason: 'user_requested' }).catch(() => {});
    return saved;
  });
}

/** Summary of current bonus position — used by the status endpoint. */
export async function getBonusStatus(wallet: string): Promise<{
  state: BonusState;
  bonusAmount: number;
  bonusBalance: number;
  wageringRequired: number;
  wageringCompleted: number;
  wageringRemaining: number;
  progressPct: number;
  expiresAt: string | null;
  maxBet: number;
}> {
  const entry = await getOrDefault(wallet);
  const remaining   = Math.max(0, entry.wageringRequired - entry.wageringCompleted);
  const progressPct = entry.wageringRequired > 0
    ? Math.min(100, Math.round(entry.wageringCompleted / entry.wageringRequired * 100))
    : 0;
  return {
    state:             entry.bonusState,
    bonusAmount:       entry.bonusAmount,
    bonusBalance:      entry.bonus,
    wageringRequired:  entry.wageringRequired,
    wageringCompleted: entry.wageringCompleted,
    wageringRemaining: remaining,
    progressPct,
    expiresAt:         entry.bonusExpiresAt,
    maxBet:            BONUS_MAX_BET,
  };
}

export async function transfer(from: string, to: string, usdcUnits: number): Promise<void> {
  const fromEntry = await getOrDefault(from);
  if (fromEntry.bonusState === 'active') {
    throw new Error("Transfers are locked while your welcome bonus is active. Complete wagering or forfeit the bonus first.");
  }
  if (fromEntry.playable < usdcUnits) throw new Error("Insufficient balance");
  fromEntry.playable -= usdcUnits;
  const toEntry = await getOrDefault(to);
  toEntry.playable += usdcUnits;
  // Sequential saves — from first to prevent double-spend if to-save fails
  await save(from, fromEntry);
  await save(to, toEntry);
}
