import { supabase } from "./supabase";

export const USDC_DECIMALS = 6;
export const USDC_UNIT     = 1_000_000;
export const BONUS_WAGER_MULTIPLIER = 35;

export interface BalanceEntry {
  playable:             number;
  bonus:                number;
  wageringRequired:     number;
  wageringCompleted:    number;
  welcomeBonusClaimed:  boolean;
}

function defaultEntry(): BalanceEntry {
  return { playable: 0, bonus: 0, wageringRequired: 0, wageringCompleted: 0, welcomeBonusClaimed: false };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toEntry(row: any): BalanceEntry {
  return {
    playable:            Number(row.playable),
    bonus:               Number(row.bonus),
    wageringRequired:    Number(row.wagering_required),
    wageringCompleted:   Number(row.wagering_completed),
    welcomeBonusClaimed: row.welcome_bonus_claimed,
  };
}

async function getOrDefault(wallet: string): Promise<BalanceEntry> {
  const { data } = await supabase.from("balances").select("*").eq("wallet", wallet).maybeSingle();
  return data ? toEntry(data) : defaultEntry();
}

async function save(wallet: string, entry: BalanceEntry): Promise<void> {
  const row = {
    wallet,
    playable:              entry.playable,
    bonus:                 entry.bonus,
    wagering_required:     entry.wageringRequired,
    wagering_completed:    entry.wageringCompleted,
    welcome_bonus_claimed: entry.welcomeBonusClaimed,
  };
  const { error } = await supabase.from("balances").upsert(row, { onConflict: "wallet" });
  if (error) throw new Error(error.message);
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
  const entry = await getOrDefault(wallet);
  entry.playable += usdcUnits;
  await save(wallet, entry);
  return entry;
}

export async function applyWelcomeBonus(wallet: string, depositedUsdcUnits: number): Promise<BalanceEntry> {
  const entry = await getOrDefault(wallet);
  if (entry.welcomeBonusClaimed) return entry;
  const bonusAmt = Math.min(depositedUsdcUnits, 200 * USDC_UNIT);
  if (bonusAmt <= 0) return entry;
  entry.bonus               += bonusAmt;
  entry.wageringRequired    += bonusAmt * BONUS_WAGER_MULTIPLIER;
  entry.welcomeBonusClaimed  = true;
  await save(wallet, entry);
  return entry;
}

export async function debit(wallet: string, usdcUnits: number): Promise<BalanceEntry> {
  const entry = await getOrDefault(wallet);
  const total  = entry.playable + entry.bonus;
  if (total < usdcUnits) throw new Error(`Insufficient balance: have ${total} μUSDC, need ${usdcUnits}`);
  if (entry.playable >= usdcUnits) {
    entry.playable -= usdcUnits;
  } else {
    const fromBonus = usdcUnits - entry.playable;
    entry.playable  = 0;
    entry.bonus     = Math.max(0, entry.bonus - fromBonus);
  }
  await save(wallet, entry);
  return entry;
}

export async function recordWagering(wallet: string, usdcUnits: number): Promise<BalanceEntry> {
  const entry = await getOrDefault(wallet);
  if (entry.bonus <= 0) return entry;
  entry.wageringCompleted += usdcUnits;
  if (entry.wageringCompleted >= entry.wageringRequired && entry.wageringRequired > 0) {
    entry.playable         += entry.bonus;
    entry.bonus             = 0;
    entry.wageringRequired  = 0;
    entry.wageringCompleted = 0;
  }
  await save(wallet, entry);
  return entry;
}

export async function transfer(from: string, to: string, usdcUnits: number): Promise<void> {
  const fromEntry = await getOrDefault(from);
  if (fromEntry.playable < usdcUnits) throw new Error("Insufficient balance");
  fromEntry.playable -= usdcUnits;
  const toEntry = await getOrDefault(to);
  toEntry.playable += usdcUnits;
  await save(from, fromEntry);
  await save(to, toEntry);
}
