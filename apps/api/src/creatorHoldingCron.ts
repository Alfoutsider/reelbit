/**
 * Creator holding check — runs every 5 minutes.
 *
 * Read-only: no transactions. Just fetches each creator's current token
 * balance and updates the cached creatorHoldRatio in themeStore.
 *
 * This keeps the casino GGR split accurate between 30-min claim_fees runs.
 * The actual on-chain fee split already reads live balance at claim time,
 * so this cron is purely for the off-chain GGR distribution.
 */

import { Connection, PublicKey } from "@solana/web3.js";
import { getAllThemes, setCreatorHoldRatio, setCreatorDevBuyInfo } from "./themeStore";
import { getCreatorRevTier } from "./creatorHoldingTracker";
import { config } from "./config";

const CHECK_INTERVAL_MS = 5 * 60 * 1_000; // 5 minutes
const TOTAL_SUPPLY      = BigInt(1_000_000_000) * BigInt(1_000_000);

export function startCreatorHoldingCron(connection: Connection): void {
  const run = async () => {
    const themes = getAllThemes().filter(
      (t) => !t.graduated && t.creator && (t.devBuyPct ?? 0) > 0,
    );

    if (themes.length === 0) return;

    for (const theme of themes) {
      try {
        const hasMinDevBuy = theme.devHasMinBuy ?? false;

        // If dev never bought ≥ 0.2 SOL they are permanently in the 15% "no-skin"
        // tier regardless of their current balance. Do not update holdRatio —
        // computeRevTier() gates on hasMinDevBuy first, but we skip the RPC call
        // entirely to avoid any chance of a 0-balance read being misused.
        if (!hasMinDevBuy) continue;

        const tier = await getCreatorRevTier(
          theme.creator!,
          theme.mint,
          theme.devBuyPct!,
          true,
          connection,
        );
        setCreatorHoldRatio(theme.mint, tier.holdRatio);
      } catch {
        // Non-fatal — stale cache is better than crashing
      }
    }
  };

  // First check after 2 min (let API fully start)
  setTimeout(() => run().catch(console.error), 2 * 60 * 1_000);
  setInterval(() => run().catch(console.error), CHECK_INTERVAL_MS);

  console.log("[holding] Creator holding cron started (5-min interval)");
}
