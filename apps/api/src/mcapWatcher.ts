/**
 * MCap graduation watcher.
 *
 * Polls every 5 seconds (was 60s — see audit). The webhook handler also calls
 * `checkOneToken` synchronously after every confirmed buy so a graduation-
 * crossing trade triggers within hundreds of ms instead of waiting for the
 * next poll. The poll remains as a safety net for tokens that graduate via
 * paths the webhook doesn't observe (e.g. dropped webhook delivery).
 */

import { Connection, PublicKey } from "@solana/web3.js";
import { getSolUsdPrice } from "./pythPrice";
import { handleGraduation } from "./migration";
import { getAllThemes } from "./themeStore";
import type { SlotGraduatedEvent } from "./types";
import { config } from "./config";
import { fetchBondingCurveState } from "./tradingApi";
import { tickFakeBots } from "./fakeBots";
import { getTheme } from "./themeStore";

const MCAP_TARGET_USD    = 100_000;    // $100k
const POLL_INTERVAL_MS   = 5_000;     // 5 seconds (down from 60s)
const INITIAL_DELAY_MS   = 10_000;    // 10 seconds after API start
const TOTAL_SUPPLY       = 1_000_000_000; // 1 billion tokens

let _running = false;
// Mints currently being graduated. Prevents the periodic poll from racing the
// webhook-triggered path on the same token.
const _inFlight = new Set<string>();

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

  console.log(`[mcap-watcher] Started — polling every ${POLL_INTERVAL_MS / 1000}s for $${MCAP_TARGET_USD.toLocaleString()} MCap graduation`);
}

/**
 * Check a single token's MCap right now and graduate it if it's crossed the
 * threshold. Called from the Helius webhook after every confirmed buy to make
 * graduation effectively instant (no wait for next poll cycle).
 *
 * Safe to call concurrently — uses an in-flight set to dedupe and short-
 * circuits if the theme is already marked graduated.
 */
export async function checkOneToken(
  connection: Connection,
  mintStr: string,
): Promise<void> {
  const theme = getTheme(mintStr);
  if (!theme || theme.graduated) return;
  if (_inFlight.has(mintStr)) return;
  _inFlight.add(mintStr);

  try {
    let mint: PublicKey;
    try { mint = new PublicKey(mintStr); } catch { return; }

    const curve = await fetchBondingCurveState(connection, mint);
    if (!curve) return;

    const solPrice = await getSolUsdPrice(connection);
    const virtualSolSol    = Number(curve.virtualSol)    / 1_000_000_000;
    const virtualTokensRaw = Number(curve.virtualTokens) / 1_000_000;
    const mcapUsd = (virtualSolSol / virtualTokensRaw) * solPrice * TOTAL_SUPPLY;

    if (mcapUsd >= MCAP_TARGET_USD) {
      console.log(
        `[mcap-watcher] ⚡ instant graduation ${theme.tokenSymbol} (${mintStr.slice(0, 8)}…) ` +
        `MCap $${mcapUsd.toFixed(0)} >= $${MCAP_TARGET_USD}`,
      );
      const gradEvent: SlotGraduatedEvent = {
        mint:    mintStr,
        creator: "",
        realSol: curve.realSol,
      };
      await handleGraduation(gradEvent, connection);
    }
  } catch (err) {
    console.error(`[mcap-watcher] checkOneToken ${mintStr.slice(0, 8)}…:`, (err as Error).message);
  } finally {
    _inFlight.delete(mintStr);
  }
}
