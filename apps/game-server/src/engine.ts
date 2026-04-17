import type { SymbolId } from "./paytable";
import { PAYTABLE_3REEL, PAYTABLE_5REEL, buildReelStrip } from "./paytable";
import { spinReels, type SpinSeed } from "./rng";

export type SlotModel = "Classic3Reel" | "Standard5Reel" | "FiveReelFreeSpins";

// ── Payline definitions ────────────────────────────────────────────────────────

// 3-reel: 1 payline (center row — positions are [reel0, reel1, reel2] row index)
// We spin 3 rows per reel, center row is index 1
const PAYLINES_3REEL = [[1, 1, 1]];

// 5-reel 20 paylines (row indices 0=top, 1=center, 2=bottom, 3=row4, 4=row5)
const PAYLINES_5REEL = [
  [1, 1, 1, 1, 1], // center
  [0, 0, 0, 0, 0], // top
  [2, 2, 2, 2, 2], // bottom
  [0, 1, 2, 1, 0], // V shape
  [2, 1, 0, 1, 2], // inverted V
  [1, 0, 0, 0, 1],
  [1, 2, 2, 2, 1],
  [0, 0, 1, 2, 2],
  [2, 2, 1, 0, 0],
  [1, 1, 0, 1, 1],
  [1, 1, 2, 1, 1],
  [0, 1, 1, 1, 0],
  [2, 1, 1, 1, 2],
  [0, 0, 2, 0, 0],
  [2, 2, 0, 2, 2],
  [1, 0, 1, 2, 1],
  [1, 2, 1, 0, 1],
  [0, 2, 0, 2, 0],
  [2, 0, 2, 0, 2],
  [1, 0, 2, 0, 1],
];

// ── Win evaluation ─────────────────────────────────────────────────────────────

function matchesPattern(symbols: SymbolId[], pattern: string): boolean {
  const parts = pattern.split(",");
  // Wildcard "*" matches any symbol in trailing positions
  for (let i = 0; i < parts.length; i++) {
    if (parts[i] === "*") continue;
    if (parts[i] !== symbols[i]) return false;
  }
  return true;
}

function evalLine(symbols: SymbolId[], paytable: Record<string, number>, wilds: boolean): number {
  // Substitute WILD for highest-value symbol if present
  let effective = [...symbols];
  if (wilds) {
    const hasWild = effective.some((s) => s === "WILD");
    if (hasWild) {
      // Find the non-wild symbol that appears most to determine what wild becomes
      const nonWilds = effective.filter((s) => s !== "WILD");
      const first = nonWilds[0];
      if (first) effective = effective.map((s) => (s === "WILD" ? first : s));
    }
  }

  for (const [pattern, mult] of Object.entries(paytable)) {
    if (matchesPattern(effective, pattern)) return mult;
  }
  return 0;
}

// ── Spin result ────────────────────────────────────────────────────────────────

export interface WinLine {
  paylineIndex: number;
  symbols: SymbolId[];
  multiplier: number;
  payout: number; // in lamports
}

export interface SpinResult {
  model: SlotModel;
  reels: SymbolId[][];  // [reel][row] — 3 visible rows per reel
  winLines: WinLine[];
  totalPayout: number;  // lamports
  betAmount: number;    // lamports
  isJackpot: boolean;
  freeSpinsAwarded: number;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
}

// Reels are stored as strips; we show 3 visible rows per reel
function getVisibleRows(strip: SymbolId[], position: number): [SymbolId, SymbolId, SymbolId] {
  const len = strip.length;
  return [
    strip[(position - 1 + len) % len],
    strip[position % len],
    strip[(position + 1) % len],
  ];
}

export class SlotEngine {
  private strips: Map<string, SymbolId[][]> = new Map();
  private sessions: Map<string, { serverSeed: string; nonce: number; serverSeedHash: string }> = new Map();

  getStrips(model: SlotModel): SymbolId[][] {
    if (!this.strips.has(model)) {
      this.strips.set(model, buildReelStrip(model));
    }
    return this.strips.get(model)!;
  }

  createSession(sessionId: string, serverSeed: string, serverSeedHash: string): void {
    this.sessions.set(sessionId, { serverSeed, nonce: 0, serverSeedHash });
  }

  spin(
    sessionId: string,
    clientSeed: string,
    betLamports: number,
    model: SlotModel,
  ): SpinResult {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error("Session not found");

    const { serverSeed, nonce, serverSeedHash } = session;
    session.nonce++;

    const seed: SpinSeed = { serverSeed, clientSeed, nonce };
    const strips = this.getStrips(model);
    const spinResult = spinReels(strips, seed);

    const is5reel = model !== "Classic3Reel";
    const reelCount = is5reel ? 5 : 3;
    const rowCount = 3;

    // Build visible grid [reel][row]
    const reelGrid: SymbolId[][] = [];
    for (let r = 0; r < reelCount; r++) {
      const pos = Math.floor((spinResult[r] as unknown as number) * strips[r].length);
      // spinResult gives a SymbolId but we need position — recalculate
      const stripLen = strips[r].length;
      const stripPos = strips[r].indexOf(spinResult[r]);
      const rows = getVisibleRows(strips[r], stripPos);
      reelGrid.push([...rows]);
    }

    const paylines = is5reel ? PAYLINES_5REEL : PAYLINES_3REEL;
    const paytable = is5reel ? PAYTABLE_5REEL : PAYTABLE_3REEL;

    const winLines: WinLine[] = [];
    for (let pl = 0; pl < paylines.length; pl++) {
      const line = paylines[pl];
      const lineSymbols = line.map((row, reel) => reelGrid[reel][row]);
      const mult = evalLine(lineSymbols, paytable, is5reel);
      if (mult > 0) {
        winLines.push({
          paylineIndex: pl,
          symbols: lineSymbols,
          multiplier: mult,
          payout: Math.floor(betLamports * mult),
        });
      }
    }

    const totalPayout = winLines.reduce((sum, w) => sum + w.payout, 0);
    const isJackpot = winLines.some((w) => w.symbols.every((s) => s === "SEVEN"));

    // Free spins: awarded on 3+ scatter (BELL) in 5-reel free spins model
    let freeSpinsAwarded = 0;
    if (model === "FiveReelFreeSpins") {
      const bellCount = reelGrid.flat().filter((s) => s === "BELL").length;
      if (bellCount >= 3) freeSpinsAwarded = bellCount * 5;
    }

    return {
      model,
      reels: reelGrid,
      winLines,
      totalPayout,
      betAmount: betLamports,
      isJackpot,
      freeSpinsAwarded,
      serverSeedHash,
      clientSeed,
      nonce,
    };
  }
}
