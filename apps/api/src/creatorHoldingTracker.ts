/**
 * Tracks how much of their original dev allocation the creator still holds,
 * and maps that to a revenue tier.
 *
 * Tiers (step function):
 *   holdRatio ≥ 0.50  →  creator 25%,  holders +0%    (full)
 *   0 < holdRatio < 0.50  →  creator 10%,  holders +15%   (penalized)
 *   holdRatio = 0     →  creator  0.5%, holders +24.5% (dumped)
 *
 * The holder bonus is routed to the dividend pool so it gets paid out to
 * top-100 holders on the next holderDividendCron run.
 */

import { Connection, PublicKey } from "@solana/web3.js";

// 1 billion tokens × 10^6 (6 decimals)
const TOTAL_SUPPLY = BigInt(1_000_000_000) * BigInt(1_000_000);

export interface CreatorRevTier {
  holdRatio:      number; // 0–1
  creatorPct:     number; // fraction of total fees that goes to creator
  holderBonusPct: number; // fraction that goes to holder dividend pool instead
  label:          "full" | "penalized" | "dumped";
}

export function computeRevTier(holdRatio: number): CreatorRevTier {
  if (holdRatio >= 0.5) {
    return { holdRatio, creatorPct: 0.25,  holderBonusPct: 0,     label: "full"      };
  }
  if (holdRatio > 0) {
    return { holdRatio, creatorPct: 0.10,  holderBonusPct: 0.15,  label: "penalized" };
  }
  return   { holdRatio, creatorPct: 0.005, holderBonusPct: 0.245, label: "dumped"    };
}

/**
 * Fetches the creator's current token balance on-chain and returns their
 * revenue tier. Falls back to "full" on RPC errors (benefit of the doubt).
 */
export async function getCreatorRevTier(
  creatorWallet: string,
  mint:          string,
  devBuyPct:     number,
  connection:    Connection,
): Promise<CreatorRevTier> {
  // If no dev buy, creator never had an allocation — always full
  if (!devBuyPct || devBuyPct <= 0) {
    return { holdRatio: 1, creatorPct: 0.25, holderBonusPct: 0, label: "full" };
  }

  const originalAlloc = (TOTAL_SUPPLY * BigInt(Math.round(devBuyPct * 1_000))) / BigInt(100_000);
  if (originalAlloc === 0n) {
    return { holdRatio: 1, creatorPct: 0.25, holderBonusPct: 0, label: "full" };
  }

  try {
    const creatorPk = new PublicKey(creatorWallet);
    const mintPk    = new PublicKey(mint);

    const accounts = await connection.getParsedTokenAccountsByOwner(creatorPk, { mint: mintPk });
    const balance  = accounts.value.reduce((sum, acc) => {
      const raw = acc.account.data.parsed?.info?.tokenAmount?.amount ?? "0";
      return sum + BigInt(raw);
    }, 0n);

    // holdRatio capped at 1.0 (in case of rebases or rounding)
    const holdRatio = Math.min(1, Number((balance * 10_000n) / originalAlloc) / 10_000);
    return computeRevTier(holdRatio);
  } catch {
    return { holdRatio: 1, creatorPct: 0.25, holderBonusPct: 0, label: "full" };
  }
}
