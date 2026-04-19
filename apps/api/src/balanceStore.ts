/**
 * Internal casino balance store — all amounts in USDC micro-units (6 decimals).
 * 1 USDC = 1_000_000 units.
 *
 * Supports:
 *  - Playable balance (deposited + won, withdrawable after wagering clears)
 *  - Bonus balance   (welcome bonus, requires 35× wagering before withdraw)
 *
 * Writes are atomic (tmp-file rename). Operations are synchronous to prevent
 * race conditions during rapid spin sequences.
 */

import fs from "fs";
import path from "path";
import { config } from "./config";

export const USDC_DECIMALS = 6;
export const USDC_UNIT     = 1_000_000;   // 1 USDC in micro-units
export const BONUS_WAGER_MULTIPLIER = 35; // 35× wagering requirement on bonus

export interface BalanceEntry {
  playable:             number; // spendable + withdrawable USDC μ-units
  bonus:                number; // locked bonus USDC μ-units
  wageringRequired:     number; // USDC μ-units of wagering needed to unlock bonus
  wageringCompleted:    number; // USDC μ-units wagered so far against bonus requirement
  welcomeBonusClaimed:  boolean;
}

const DATA_DIR      = path.resolve(config.dataDir);
const BALANCE_PATH  = path.join(DATA_DIR, "balances.json");
const BALANCE_TMP   = BALANCE_PATH + ".tmp";
const DEPOSITS_PATH = path.join(DATA_DIR, "deposits.json");

function read(): Record<string, BalanceEntry> {
  try { return JSON.parse(fs.readFileSync(BALANCE_PATH, "utf-8")); }
  catch { return {}; }
}

function write(store: Record<string, BalanceEntry>): void {
  fs.mkdirSync(path.dirname(BALANCE_PATH), { recursive: true });
  fs.writeFileSync(BALANCE_TMP, JSON.stringify(store, null, 2));
  fs.renameSync(BALANCE_TMP, BALANCE_PATH);
}

function defaultEntry(): BalanceEntry {
  return { playable: 0, bonus: 0, wageringRequired: 0, wageringCompleted: 0, welcomeBonusClaimed: false };
}

// ── Deposit deduplication ─────────────────────────────────────────────────────

export function isSeenDeposit(txSig: string): boolean {
  try {
    const seen: string[] = JSON.parse(fs.readFileSync(DEPOSITS_PATH, "utf-8"));
    return seen.includes(txSig);
  } catch { return false; }
}

export function markDepositSeen(txSig: string): void {
  let seen: string[] = [];
  try { seen = JSON.parse(fs.readFileSync(DEPOSITS_PATH, "utf-8")); } catch {}
  seen.push(txSig);
  fs.mkdirSync(path.dirname(DEPOSITS_PATH), { recursive: true });
  fs.writeFileSync(DEPOSITS_PATH, JSON.stringify(seen, null, 2));
}

// ── Read ──────────────────────────────────────────────────────────────────────

export function getBalance(wallet: string): BalanceEntry {
  return read()[wallet] ?? defaultEntry();
}

export function getPlayable(wallet: string): number {
  return (read()[wallet] ?? defaultEntry()).playable;
}

// ── Write ─────────────────────────────────────────────────────────────────────

/**
 * Credit playable balance and optionally apply welcome bonus (first deposit only).
 * Returns the updated entry.
 */
export function credit(wallet: string, usdcUnits: number): BalanceEntry {
  const store = read();
  const entry = store[wallet] ?? defaultEntry();
  entry.playable += usdcUnits;
  store[wallet] = entry;
  write(store);
  return entry;
}

/**
 * Apply welcome bonus on first deposit: 100% match up to $200 USDC.
 * Requires 35× the bonus amount wagered before it converts to playable balance.
 */
export function applyWelcomeBonus(wallet: string, depositedUsdcUnits: number): BalanceEntry {
  const store = read();
  const entry = store[wallet] ?? defaultEntry();
  if (entry.welcomeBonusClaimed) return entry;

  const MAX_BONUS = 200 * USDC_UNIT; // $200
  const bonusAmt  = Math.min(depositedUsdcUnits, MAX_BONUS);
  if (bonusAmt <= 0) return entry;

  entry.bonus               += bonusAmt;
  entry.wageringRequired    += bonusAmt * BONUS_WAGER_MULTIPLIER;
  entry.welcomeBonusClaimed  = true;
  store[wallet] = entry;
  write(store);
  return entry;
}

export function debit(wallet: string, usdcUnits: number): BalanceEntry {
  const store = read();
  const entry = store[wallet] ?? defaultEntry();
  const total  = entry.playable + entry.bonus;
  if (total < usdcUnits) {
    throw new Error(`Insufficient balance: have ${total} μUSDC, need ${usdcUnits}`);
  }
  // Debit playable first; if short, use bonus
  if (entry.playable >= usdcUnits) {
    entry.playable -= usdcUnits;
  } else {
    const fromBonus = usdcUnits - entry.playable;
    entry.playable  = 0;
    entry.bonus     = Math.max(0, entry.bonus - fromBonus);
  }
  store[wallet] = entry;
  write(store);
  return entry;
}

/**
 * Record wagering. When wageringCompleted >= wageringRequired, convert bonus to playable.
 */
export function recordWagering(wallet: string, usdcUnits: number): BalanceEntry {
  const store = read();
  const entry = store[wallet] ?? defaultEntry();
  if (entry.bonus <= 0) return entry;

  entry.wageringCompleted += usdcUnits;
  if (entry.wageringCompleted >= entry.wageringRequired && entry.wageringRequired > 0) {
    entry.playable         += entry.bonus;
    entry.bonus             = 0;
    entry.wageringRequired  = 0;
    entry.wageringCompleted = 0;
  }
  store[wallet] = entry;
  write(store);
  return entry;
}

export function transfer(from: string, to: string, usdcUnits: number): void {
  const store = read();
  const fromEntry = store[from] ?? defaultEntry();
  if (fromEntry.playable < usdcUnits) throw new Error("Insufficient balance");
  fromEntry.playable -= usdcUnits;
  const toEntry = store[to] ?? defaultEntry();
  toEntry.playable += usdcUnits;
  store[from] = fromEntry;
  store[to]   = toEntry;
  write(store);
}
