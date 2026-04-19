/**
 * Persistent session store — survives server restarts.
 *
 * Data is written to data/sessions.json using an atomic temp-file rename so a
 * crash mid-write never corrupts the store. All operations are synchronous to
 * avoid race conditions on the nonce (which must be strictly monotonic for
 * provably-fair verification).
 *
 * Sessions expire after SESSION_TTL_MS of inactivity and are pruned on startup
 * and periodically during operation.
 */

import fs from "fs";
import path from "path";
import type { SlotModel } from "./engine";

export interface Session {
  id:             string;
  wallet:         string;
  mint:           string;  // token mint — identifies jackpot vault on jackpot win
  model:          SlotModel;
  serverSeed:     string;  // revealed only on /session/reveal
  serverSeedHash: string;  // shared with client on /session/create
  nonce:          number;  // incremented on every spin
  createdAt:      number;  // ms timestamp
  lastSpinAt:     number;  // ms timestamp — used for TTL
}

const STORE_PATH = path.resolve(process.cwd(), "data/sessions.json");
const STORE_TMP  = STORE_PATH + ".tmp";
const SESSION_TTL_MS   = 4 * 60 * 60 * 1_000; // 4 hours idle → expire
const PRUNE_INTERVAL_MS = 30 * 60 * 1_000;     // prune every 30 min

// In-memory cache — kept in sync with disk on every write
let cache: Record<string, Session> = {};

function readDisk(): Record<string, Session> {
  try {
    return JSON.parse(fs.readFileSync(STORE_PATH, "utf-8"));
  } catch {
    return {};
  }
}

function writeDisk(store: Record<string, Session>): void {
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
  // Atomic write: write to .tmp then rename
  fs.writeFileSync(STORE_TMP, JSON.stringify(store));
  fs.renameSync(STORE_TMP, STORE_PATH);
}

/** Call once at startup — loads disk into in-memory cache and prunes expired. */
export function initSessionStore(): void {
  cache = readDisk();
  pruneExpired();
  console.log(`[session-store] Loaded ${Object.keys(cache).length} session(s) from disk`);

  setInterval(() => {
    pruneExpired();
  }, PRUNE_INTERVAL_MS);
}

function pruneExpired(): void {
  const cutoff = Date.now() - SESSION_TTL_MS;
  let pruned = 0;
  for (const id of Object.keys(cache)) {
    if (cache[id].lastSpinAt < cutoff) {
      delete cache[id];
      pruned++;
    }
  }
  if (pruned > 0) {
    writeDisk(cache);
    console.log(`[session-store] Pruned ${pruned} expired session(s)`);
  }
}

export function createSession(session: Session): void {
  cache[session.id] = session;
  writeDisk(cache);
}

export function getSession(id: string): Session | null {
  return cache[id] ?? null;
}

/** Atomically increment nonce and update lastSpinAt. Returns updated session. */
export function incrementNonce(id: string): Session {
  const session = cache[id];
  if (!session) throw new Error("Session not found");
  session.nonce++;
  session.lastSpinAt = Date.now();
  writeDisk(cache);
  return session;
}

/** Delete session (called on /session/reveal). Returns the revealed session or null. */
export function consumeSession(id: string): Session | null {
  const session = cache[id] ?? null;
  if (session) {
    delete cache[id];
    writeDisk(cache);
  }
  return session;
}
