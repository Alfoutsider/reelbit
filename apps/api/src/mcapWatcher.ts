/**
 * MCap graduation watcher.
 *
 * Polls every 60 seconds. For each non-graduated token:
 *   1. Reads bonding curve state from on-chain
 *   2. Fetches SOL/USD price from Pyth
 *   3. Computes virtual MCap = (virtualSol / LAMPORTS_PER_SOL) * solPrice * (totalSupply / virtualTokens)
 *   4. If MCap >= $100,000 → triggers handleGraduation
 *
 * This is the primary graduation trigger. The on-chain GRADUATION_LAMPORTS check
 * in buy_tokens acts as a safety net only.
 */

import { Connection, PublicKey } from "@solana/web3.js";
import { getSolUsdPrice } from "./pythPrice";
import { handleGraduation } from "./migration";
import { getAllThemes } from "./themeStore";
import type { SlotGraduatedEvent } from "./types";
import { config } from "./config";
import { fetchBondingCurveState } from "./tradingApi";
import { tickFakeBots } from "./fakeBots";

const MCAP_TARGET_USD    = 100_000;    // $100k
const POLL_INTERVAL_MS   = 60_000;    // 60 seconds
const INITIAL_DELAY_MS   = 10_000;    // 10 seconds after API start
const TOTAL_SUPPLY       = 1_000_000_000; // 1 billion tokens

let _running = false;

async function checkGraduation(connection: Connection): Promise<void> {
  if (_running) return;
  _running = true;

  try {
    const solPrice = await getSolUsdPrice(connection);
    const themes   = getAllThemes().filter((t) => !t.graduated);
    if (themes.length === 0) return;

    for (const theme of themes) {
      let mint: PublicKey;
      try { mint = new PublicKey(theme.mint); } catch { continue; }

      try {
        const curve = await fetchBondingCurveState(connection, mint);
        if (!curve) continue;

        const virtualSolSol    = Number(curve.virtualSol)    / 1_000_000_000;
        const virtualTokensRaw = Number(curve.virtualTokens) / 1_000_000; // token units (6 dec)

        // MCap = price_per_token_usd * total_supply_tokens
        // price_per_token_sol = virtualSol / virtualTokens
        // price_per_token_usd = price_per_token_sol * solPrice
        // mcap_usd = price_per_token_usd * TOTAL_SUPPLY
        const mcapUsd = (virtualSolSol / virtualTokensRaw) * solPrice * TOTAL_SUPPLY;

        tickFakeBots(theme.mint, mcapUsd);

        if (mcapUsd >= MCAP_TARGET_USD) {
          console.log(
            `[mcap-watcher] 🎓 ${theme.tokenSymbol} (${theme.mint.slice(0, 8)}…) ` +
            `MCap $${mcapUsd.toFixed(0)} >= $${MCAP_TARGET_USD} — triggering graduation`,
          );

          const gradEvent: SlotGraduatedEvent = {
            mint:    theme.mint,
            creator: "", // handleGraduation reads creator from on-chain BondingCurveVault
            realSol: curve.realSol,
          };
          await handleGraduation(gradEvent, connection);
        }
      } catch (err) {
        console.error(
          `[mcap-watcher] Error checking ${theme.mint.slice(0, 8)}…:`,
          (err as Error).message,
        );
      }
    }
  } finally {
    _running = false;
  }
}

export function startMcapWatcher(connection: Connection): void {
  setTimeout(() => {
    checkGraduation(connection).catch(console.error);
    setInterval(() => checkGraduation(connection).catch(console.error), POLL_INTERVAL_MS);
  }, INITIAL_DELAY_MS);

  console.log("[mcap-watcher] Started — polling every 60s for $100k MCap graduation");
}
