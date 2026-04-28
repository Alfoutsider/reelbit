/**
 * In-memory trade event store with JSON file persistence.
 * Stores the last 1000 trades per mint and the last 200 globally.
 */

import fs from "fs";
import path from "path";
import { config } from "./config";

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

// In-memory map: mint → TradeEvent[]
const store = new Map<string, TradeEvent[]>();
let globalFeed: TradeEvent[] = [];

// ── Persistence ───────────────────────────────────────────────────────────────

export function loadTrades(): void {
  try {
    const raw = fs.readFileSync(PERSIST_FILE(), "utf-8");
    const data = JSON.parse(raw) as { byMint: Record<string, TradeEvent[]>; global: TradeEvent[] };
    for (const [mint, trades] of Object.entries(data.byMint)) {
      store.set(mint, trades);
    }
    globalFeed = data.global ?? [];
  } catch {
    // File doesn't exist yet — start fresh
  }
}

function persist(): void {
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

// ── Write ─────────────────────────────────────────────────────────────────────

export function recordTrade(event: TradeEvent): void {
  const list = store.get(event.mint) ?? [];
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
