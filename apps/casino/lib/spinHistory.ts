"use client";

// Local-first spin history. Persists across slot navigation and browser
// sessions in localStorage. The casino game-server is the authoritative
// record, but this gives the player a quick "bet history" view without a
// round-trip and without the API needing a per-wallet persistent log yet.
//
// Cap at 500 entries — enough for serious sessions, light enough to keep
// the localStorage write under 100kb.

const KEY = "rb_spin_history";
const MAX = 500;

export interface SpinRecord {
  ts:           number;
  mint:         string;
  tokenSymbol:  string;
  betUsdc:      number;
  payoutUsdc:   number;
  isJackpot:    boolean;
  isWin:        boolean;
  freeSpinsAwarded: number;
  // Provably-fair fingerprint for cross-checking against the session reveal
  serverSeedHash: string;
  clientSeed:     string;
  nonce:          number;
}

function read(): SpinRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(list: SpinRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {
    // Quota exhausted — drop the oldest half and retry once. If that still
    // fails (storage disabled), give up silently.
    try {
      const trimmed = list.slice(0, Math.floor(MAX / 2));
      window.localStorage.setItem(KEY, JSON.stringify(trimmed));
    } catch {}
  }
}

export function appendSpin(record: SpinRecord): void {
  const list = read();
  list.unshift(record);
  write(list);
}

export function getSpinHistory(opts?: { mint?: string; limit?: number }): SpinRecord[] {
  const list = read();
  let filtered = list;
  if (opts?.mint) filtered = filtered.filter((r) => r.mint === opts.mint);
  if (opts?.limit) filtered = filtered.slice(0, opts.limit);
  return filtered;
}

export function clearSpinHistory(): void {
  if (typeof window === "undefined") return;
  try { window.localStorage.removeItem(KEY); } catch {}
}

// Aggregate stats for the lifetime of the local history.
export interface SpinStats {
  totalSpins:    number;
  totalWagered:  number;
  totalWon:      number;
  netUsdc:       number;
  rtpPct:        number;
  jackpotsHit:   number;
  biggestWin:    number;
}

export function getStats(records?: SpinRecord[]): SpinStats {
  const list = records ?? read();
  const totalWagered = list.reduce((s, r) => s + r.betUsdc, 0);
  const totalWon     = list.reduce((s, r) => s + r.payoutUsdc, 0);
  const biggestWin   = list.reduce((m, r) => Math.max(m, r.payoutUsdc), 0);
  const jackpotsHit  = list.filter((r) => r.isJackpot).length;
  return {
    totalSpins:   list.length,
    totalWagered,
    totalWon,
    netUsdc:      totalWon - totalWagered,
    rtpPct:       totalWagered > 0 ? (totalWon / totalWagered) * 100 : 0,
    jackpotsHit,
    biggestWin,
  };
}
