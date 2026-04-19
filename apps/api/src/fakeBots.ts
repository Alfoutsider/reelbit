/**
 * Fake trader bots — simulated bonding curve activity for demo/staging.
 *
 * Generates a rolling window of fake buy/sell events that the /demo/activity
 * endpoint returns. No on-chain transactions are made.
 *
 * Only active when ENABLE_FAKE_BOTS=true in env.
 */

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

const ACTIVITY_WINDOW_MS = 10 * 60 * 1000; // keep last 10 min of events
const recentActivity: FakeTradeEvent[] = [];

function randBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function generateEvent(currentMcapUsd: number): FakeTradeEvent {
  const bot = FAKE_WALLETS[Math.floor(Math.random() * FAKE_WALLETS.length)];
  // 70% buy, 30% sell — simulate organic growth
  const type      = Math.random() < 0.7 ? "buy" : "sell";
  const solAmount = parseFloat(randBetween(0.05, 3.5).toFixed(3));
  return {
    wallet:    bot.address,
    name:      bot.name,
    type,
    solAmount,
    mcapUsd:   currentMcapUsd,
    ts:        Date.now(),
  };
}

export function tickFakeBots(currentMcapUsd: number) {
  if (process.env.ENABLE_FAKE_BOTS !== "true") return;

  // Occasionally produce 1–3 events
  const count = Math.random() < 0.3 ? 1 : Math.random() < 0.6 ? 2 : 3;
  for (let i = 0; i < count; i++) {
    recentActivity.unshift(generateEvent(currentMcapUsd));
  }

  // Evict events older than the window
  const cutoff = Date.now() - ACTIVITY_WINDOW_MS;
  while (recentActivity.length > 0 && recentActivity[recentActivity.length - 1].ts < cutoff) {
    recentActivity.pop();
  }

  // Hard cap at 50 entries
  if (recentActivity.length > 50) recentActivity.splice(50);
}

export function getFakeActivity(): FakeTradeEvent[] {
  return recentActivity.slice(0, 30);
}
