/**
 * Tracks creator loyalty tier for UI display and casino GGR distribution.
 *
 * Mirrors the on-chain compute_creator_tier() logic in token-launch/src/lib.rs.
 *
 * Tiers:
 *   devBuySol < 0.2 SOL (200_000_000 lamports) → 15% forever (no skin)
 *   devBuySol >= 0.2 SOL AND:
 *     holdRatio >= 0.50 → 25% (full)
 *     0 < holdRatio < 0.50 → 15% (penalized — same as no skin)
 *     holdRatio = 0 (fully sold) → 0.5% (dumped)
 *
 * Difference from 25% always routes to holder dividend pool.
 */

import { Connection, PublicKey } from "@solana/web3.js";

const MIN_DEV_BUY_LAMPORTS = 200_000_000; // 0.2 SOL
const TOTAL_SUPPLY = BigInt(1_000_000_000) * BigInt(1_000_000);

export type CreatorTierLabel = "full" | "no-skin" | "penalized" | "dumped";

export interface CreatorRevTier {
  holdRatio:      number; // 0–1
  creatorPct:     number; // fraction of total fees going to creator (0.005 | 0.15 | 0.25)
  holderBonusPct: number; // fraction going to holder dividend pool instead
  label:          CreatorTierLabel;
  hasMinDevBuy:   boolean;
}

export function computeRevTier(holdRatio: number, hasMinDevBuy: boolean): CreatorRevTier {
  if (!hasMinDevBuy) {
    return { holdRatio, creatorPct: 0.15, holderBonusPct: 0.10, label: "no-skin",   hasMinDevBuy: false };
  }
  if (holdRatio >= 0.5) {
    return { holdRatio, creatorPct: 0.25, holderBonusPct: 0,    label: "full",      hasMinDevBuy: true  };
  }
  if (holdRatio > 0) {
    return { holdRatio, creatorPct: 0.15, holderBonusPct: 0.10, label: "penalized", hasMinDevBuy: true  };
  }
  return   { holdRatio, creatorPct: 0.005, holderBonusPct: 0.245, label: "dumped",  hasMinDevBuy: true  };
}

/**
 * Fetches creator's on-chain token balance and returns their current revenue tier.
 * Falls back to "no-skin / 15%" on RPC errors.
 */
export async function getCreatorRevTier(
  creatorWallet: string,
  mint:          string,
  devBuyPct:     number,
  hasMinDevBuy:  boolean,
  connection:    Connection,
): Promise<CreatorRevTier> {
  if (!hasMinDevBuy) {
    return computeRevTier(0, false);
  }

  if (!devBuyPct || devBuyPct <= 0) {
    return computeRevTier(1, true); // bought ≥ 0.2 SOL but devBuyPct unknown → assume full
  }

  const originalAlloc = (TOTAL_SUPPLY * BigInt(Math.round(devBuyPct * 1_000))) / BigInt(100_000);
  if (originalAlloc === 0n) return computeRevTier(1, true);

  try {
    const creatorPk = new PublicKey(creatorWallet);
    const mintPk    = new PublicKey(mint);
    const accounts  = await connection.getParsedTokenAccountsByOwner(creatorPk, { mint: mintPk });
    const balance   = accounts.value.reduce((sum, acc) => {
      const raw = acc.account.data.parsed?.info?.tokenAmount?.amount ?? "0";
      return sum + BigInt(raw);
    }, 0n);

    const holdRatio = Math.min(1, Number((balance * 10_000n) / originalAlloc) / 10_000);
    return computeRevTier(holdRatio, true);
  } catch {
    return computeRevTier(1, true);
  }
}
