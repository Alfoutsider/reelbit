/**
 * Fake trader bots — simulated bonding curve activity for demo/staging.
 *
 * Generates a rolling window of fake buy/sell events and writes price history
 * snapshots so the chart has data to display.
 *
 * Only active when ENABLE_FAKE_BOTS=true in env.
 */

import { appendPricePoint } from "./priceHistoryStore";

const FAKE_WALLETS = [
  { address: "7xK3gAs...", name: "whale_anon"   },
  { address: "9Wz4NqM...", name: "degen_sol"    },
  { address: "BrEjnC1...", name: "ape_machine"  },
  { address: "5yFKKCp...", name: "lucky_spin"   },
  { address: "HN7WrH2...", name: "moon_chaser"  },
  { address: "AToAev3...", name: "sol_sniper"   },
  { address: "3h1bYL4...", name: "reel_hunter"  },
  { address: "9xQFin5...", name: "jackpot_joe"  },
];

export interface FakeTradeEvent {
  wallet:    string;
  name:      string;
  type:      "buy" | "sell";
  solAmount: number;
  mcapUsd:   number;
  ts:        number;
}

const ACTIVITY_WINDOW_MS = 10 * 60 * 1000;
const recentActivity: FakeTradeEvent[] = [];

// Per-mint simulated mcap state (starts at $5k, drifts toward graduation)
const mintMcapState = new Map<string, number>();
const SOL_PRICE_USD  = 150;
const TOTAL_SUPPLY   = 1_000_000_000;
const GRAD_TARGET    = 100_000;
const START_MCAP     = 5_000;

function getSimulatedMcap(mint: string): number {
  return mintMcapState.get(mint) ?? START_MCAP;
}

function randBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function generateEvent(mint: string): FakeTradeEvent {
  const bot = FAKE_WALLETS[Math.floor(Math.random() * FAKE_WALLETS.length)];
  const type      = Math.random() < 0.7 ? "buy" : "sell";
  const solAmount = parseFloat(randBetween(0.05, 3.5).toFixed(3));

  let mcap = getSimulatedMcap(mint);
  const usdImpact = solAmount * SOL_PRICE_USD * 0.12;
  if (type === "buy") {
    mcap = Math.min(GRAD_TARGET, mcap + usdImpact);
  } else {
    mcap = Math.max(START_MCAP, mcap - usdImpact * 0.5);
  }
  mintMcapState.set(mint, mcap);

  return {
    wallet:    bot.address,
    name:      bot.name,
    type,
    solAmount,
    mcapUsd:   mcap,
    ts:        Date.now(),
  };
}

export function tickFakeBots(mint: string, currentMcapUsd?: number) {
  if (process.env.ENABLE_FAKE_BOTS !== "true") return;

  // Seed from real curve state if provided and we have no prior simulation
  if (currentMcapUsd && !mintMcapState.has(mint)) {
    mintMcapState.set(mint, currentMcapUsd);
  }

  const count = Math.random() < 0.3 ? 1 : Math.random() < 0.6 ? 2 : 3;
  for (let i = 0; i < count; i++) {
    const event = generateEvent(mint);
    recentActivity.unshift(event);

    // Write price snapshot for chart
    const mcap = event.mcapUsd;
    appendPricePoint(mint, {
      ts:              event.ts + i * 200,
      priceUsd:        mcap / TOTAL_SUPPLY,
      mcapUsd:         mcap,
      realSolLamports: Math.round((mcap / SOL_PRICE_USD) * 1_000_000_000),
      progressPct:     Math.min(100, Math.round((mcap / GRAD_TARGET) * 100)),
    });
  }

  const cutoff = Date.now() - ACTIVITY_WINDOW_MS;
  while (recentActivity.length > 0 && recentActivity[recentActivity.length - 1].ts < cutoff) {
    recentActivity.pop();
  }
  if (recentActivity.length > 50) recentActivity.splice(50);
}

export function getFakeActivity(): FakeTradeEvent[] {
  return recentActivity.slice(0, 30);
}
