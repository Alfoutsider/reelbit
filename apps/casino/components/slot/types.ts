import type { SymbolId } from "./symbols";

export interface WinLine {
  paylineIndex: number;
  symbols: SymbolId[];
  multiplier: number;
  payout: number;
}

export interface SpinResult {
  model: string;
  reels: SymbolId[][];
  winLines: WinLine[];
  totalPayout: number;
  betAmount: number;
  isJackpot: boolean;
  freeSpinsAwarded: number;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
}
