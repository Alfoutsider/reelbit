import { createHash, createHmac, randomBytes } from "crypto";
import type { SymbolId } from "./paytable";

export interface SpinSeed {
  serverSeed: string;
  clientSeed: string;
  nonce: number;
}

/**
 * Provably fair RNG: HMAC-SHA256(serverSeed, clientSeed:nonce)
 * Returns a float [0, 1) for each reel.
 */
export function generateReelPositions(
  seed: SpinSeed,
  reelCount: number,
): number[] {
  const results: number[] = [];
  for (let i = 0; i < reelCount; i++) {
    const hmac = createHmac("sha256", seed.serverSeed)
      .update(`${seed.clientSeed}:${seed.nonce}:${i}`)
      .digest("hex");
    // Take first 8 hex chars → uint32, divide by 2^32 to get [0, 1)
    const value = parseInt(hmac.slice(0, 8), 16) / 0x100000000;
    results.push(value);
  }
  return results;
}

/** Returns the strip index (position) for each reel, not the symbol. */
export function spinReels(
  strips: SymbolId[][],
  seed: SpinSeed,
): number[] {
  const positions = generateReelPositions(seed, strips.length);
  return strips.map((strip, i) => Math.floor(positions[i] * strip.length) % strip.length);
}

export function newServerSeed(): string {
  return randomBytes(32).toString("hex");
}

export function hashServerSeed(seed: string): string {
  return createHash("sha256").update(seed).digest("hex");
}
