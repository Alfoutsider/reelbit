/**
 * In-memory trade event store with two persistence layers:
 *   1. Local JSON snapshot — flushed on a 10s debounce so the webhook hot path
 *      isn't blocked on sync fs.writeFileSync().
 *   2. Supabase analytics_trades — written by analyticsLogTrade() in index.ts
 *      with a UNIQUE(tx_sig) constraint that gives us natural idempotency.
 *      On cold start, if the JSON snapshot is missing (first deploy or wiped
 *      disk), we backfill the in-memory cache from Supabase so the global
 *      feed and per-mint volume24h numbers don't show as zero until trades
 *      start flowing again.
 *
 * Stores the last 1000 trades per mint and the last 200 globally.
 */

import fs from "fs";
import path from "path";
import { config } from "./config";
import { supabase } from "./supabase";

export interface TradeEvent {
  txSig:       string;
  mint:        string;
  type:        "buy" | "sell";
  wallet:      string;
  solAmount:   number;  // SOL (float)
  tokenAmount: number;  // raw token units
  usdValue:    number;  // USD at time of trade
  timestamp:   number;  // epoch ms
}

const MAX_PER_MINT   = 1_000;
const MAX_GLOBAL     = 200;
const PERSIST_FILE   = () => path.join(config.dataDir, "trades.json");
// 10s is a comfortable middle ground: the snapshot is only used for cold-start
// recovery (the source of truth is Supabase), so even if a few trades go un-
// persisted before a crash, the next boot rebuilds from Supabase anyway.
const PERSIST_DEBOUNCE_MS = 10_000;
// Cap how many trades we hydrate from Supabase. 1000 covers the per-mint
// limit easily while keeping cold-start under a couple hundred ms.
const HYDRATE_LIMIT = 1_000;

// In-memory map: mint → TradeEvent[]
const store = new Map<string, TradeEvent[]>();
let globalFeed: TradeEvent[] = [];

// ── Persistence ───────────────────────────────────────────────────────────────

export function loadTrades(): void {
  let loadedFromFile = false;
  try {
    const raw = fs.readFileSync(PERSIST_FILE(), "utf-8");
    const data = JSON.parse(raw) as { byMint: Record<string, TradeEvent[]>; global: TradeEvent[] };
    for (const [mint, trades] of Object.entries(data.byMint)) {
      store.set(mint, trades);
    }
    globalFeed = data.global ?? [];
    loadedFromFile = true;
    console.log(`[tradeStore] loaded ${globalFeed.length} global / ${store.size} mints from disk`);
  } catch {
    // File doesn't exist yet — start fresh; we'll try Supabase below.
  }

  if (!loadedFromFile && config.supabaseUrl && config.supabaseKey) {
    hydrateFromSupabase().catch((err) =>
      console.warn("[tradeStore] Supabase hydrate failed (non-fatal):", err.message),
    );
  }
}

async function hydrateFromSupabase(): Promise<void> {
  const { data, error } = await supabase
    .from("trades")
    .select("tx_sig, mint, trade_type, wallet, sol_amount, token_amount, usd_value, traded_at")
    .order("traded_at", { ascending: false })
    .limit(HYDRATE_LIMIT);
  if (error) {
    console.warn("[tradeStore] hydrate query error:", error.message);
    return;
  }
  if (!data || data.length === 0) return;

  // Reverse so we unshift newest-last → final order in globalFeed is newest-first.
  for (const row of [...data].reverse()) {
    const ev: TradeEvent = {
      txSig:       row.tx_sig,
      mint:        row.mint,
      type:        row.trade_type as "buy" | "sell",
      wallet:      row.wallet,
      solAmount:   Number(row.sol_amount),
      tokenAmount: Number(row.token_amount),
      usdValue:    Number(row.usd_value),
      timestamp:   new Date(row.traded_at).getTime(),
    };
    const list = store.get(ev.mint) ?? [];
    list.unshift(ev);
    if (list.length > MAX_PER_MINT) list.length = MAX_PER_MINT;
    store.set(ev.mint, list);
    globalFeed.unshift(ev);
    if (globalFeed.length > MAX_GLOBAL) globalFeed.length = MAX_GLOBAL;
  }
  console.log(`[tradeStore] hydrated ${data.length} trades from Supabase`);
}

let persistTimer: ReturnType<typeof setTimeout> | null = null;
function flushPersist(): void {
  persistTimer = null;
  try {
    fs.mkdirSync(path.dirname(PERSIST_FILE()), { recursive: true });
    const data = {
      byMint: Object.fromEntries(store.entries()),
      global: globalFeed,
    };
    fs.writeFileSync(PERSIST_FILE(), JSON.stringify(data));
  } catch (err) {
    console.error("[tradeStore] persist failed:", (err as Error).message);
  }
}

function persist(): void {
  // Debounce so a burst of trades doesn't fsync the file 10× per second.
  if (persistTimer) return;
  persistTimer = setTimeout(flushPersist, PERSIST_DEBOUNCE_MS);
}

/** Flush any pending writes — call this on graceful shutdown (SIGTERM). */
export function flushTrades(): void {
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
  flushPersist();
}

// ── Write ─────────────────────────────────────────────────────────────────────

export function recordTrade(event: TradeEvent): void {
  // Idempotency check — Supabase already enforces this via UNIQUE(tx_sig)
  // but the in-memory cache needs its own guard. Without this a duplicate
  // webhook delivery would still double-credit volume24h until the next reboot.
  const list = store.get(event.mint) ?? [];
  if (event.txSig && list.some((t) => t.txSig === event.txSig)) {
    return;
  }
  list.unshift(event); // newest first
  if (list.length > MAX_PER_MINT) list.length = MAX_PER_MINT;
  store.set(event.mint, list);

  globalFeed.unshift(event);
  if (globalFeed.length > MAX_GLOBAL) globalFeed.length = MAX_GLOBAL;

  persist();
}

// ── Read ──────────────────────────────────────────────────────────────────────

export function getTradesForMint(mint: string, limit = 50): TradeEvent[] {
  return (store.get(mint) ?? []).slice(0, Math.min(limit, MAX_PER_MINT));
}

export function getGlobalFeed(limit = 50): TradeEvent[] {
  return globalFeed.slice(0, Math.min(limit, MAX_GLOBAL));
}

/** Sum of usdValue for trades in the last 24 hours for a given mint. */
export function getVolume24h(mint: string): number {
  const cutoff = Date.now() - 24 * 60 * 60 * 1_000;
  return (store.get(mint) ?? [])
    .filter((t) => t.timestamp >= cutoff)
    .reduce((sum, t) => sum + t.usdValue, 0);
}

/** Sum of usdValue for all trades in the last 24 hours (global). */
export function getGlobalVolume24h(): number {
  const cutoff = Date.now() - 24 * 60 * 60 * 1_000;
  return globalFeed
    .filter((t) => t.timestamp >= cutoff)
    .reduce((sum, t) => sum + t.usdValue, 0);
}
