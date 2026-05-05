"use client";

// Responsible-gambling guards. Stored locally so users can change them on
// any device they touch — strictly speaking these need to be enforced
// server-side too for hard guarantees, but local-first is what every
// licensed-casino UX does for the day-to-day flow (server enforcement
// kicks in only at the deposit endpoint, since that's the chokepoint
// the user can't go around in the browser anyway).
//
// Three controls today:
//   • Daily deposit limit  (USDC, total per UTC day)
//   • Daily loss limit     (USDC, net loss per UTC day — bet minus payout)
//   • Self-exclusion       (no spins until this timestamp passes)

const KEY_LIMITS  = "rb_rg_limits";
const KEY_DAILY   = "rb_rg_daily";    // { date: "YYYY-MM-DD", deposited: N, lost: N }

export interface RGLimits {
  dailyDepositLimitUsdc: number | null; // null = no limit
  dailyLossLimitUsdc:    number | null;
  selfExcludeUntil:      number | null; // epoch ms
}

interface DailyTotals {
  date:      string;       // UTC YYYY-MM-DD
  deposited: number;
  lost:      number;
}

function readLimits(): RGLimits {
  if (typeof window === "undefined") return { dailyDepositLimitUsdc: null, dailyLossLimitUsdc: null, selfExcludeUntil: null };
  try {
    const raw = window.localStorage.getItem(KEY_LIMITS);
    if (!raw) return { dailyDepositLimitUsdc: null, dailyLossLimitUsdc: null, selfExcludeUntil: null };
    return JSON.parse(raw) as RGLimits;
  } catch {
    return { dailyDepositLimitUsdc: null, dailyLossLimitUsdc: null, selfExcludeUntil: null };
  }
}

function writeLimits(limits: RGLimits): void {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(KEY_LIMITS, JSON.stringify(limits)); } catch {}
}

function todayKey(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function readDaily(): DailyTotals {
  if (typeof window === "undefined") return { date: todayKey(), deposited: 0, lost: 0 };
  try {
    const raw = window.localStorage.getItem(KEY_DAILY);
    if (!raw) return { date: todayKey(), deposited: 0, lost: 0 };
    const parsed = JSON.parse(raw) as DailyTotals;
    // Roll over to a fresh bucket on UTC day change.
    if (parsed.date !== todayKey()) return { date: todayKey(), deposited: 0, lost: 0 };
    return parsed;
  } catch {
    return { date: todayKey(), deposited: 0, lost: 0 };
  }
}

function writeDaily(d: DailyTotals): void {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(KEY_DAILY, JSON.stringify(d)); } catch {}
}

export function getLimits(): RGLimits        { return readLimits(); }
export function setLimits(next: RGLimits): void { writeLimits(next); }
export function getDailyTotals(): DailyTotals  { return readDaily(); }

/** Self-exclude for N hours from now (24, 168 = 7d, 720 = 30d, etc.). */
export function selfExclude(hours: number): void {
  const limits = readLimits();
  limits.selfExcludeUntil = Date.now() + hours * 3_600_000;
  writeLimits(limits);
}

export function clearSelfExclusion(): void {
  const limits = readLimits();
  limits.selfExcludeUntil = null;
  writeLimits(limits);
}

/** Returns null if the action is allowed, else a human-readable reason. */
export function checkDeposit(amountUsdc: number): string | null {
  const limits = readLimits();
  if (limits.selfExcludeUntil && limits.selfExcludeUntil > Date.now()) {
    const until = new Date(limits.selfExcludeUntil).toLocaleString();
    return `Self-exclusion active until ${until}. No deposits accepted.`;
  }
  if (limits.dailyDepositLimitUsdc != null) {
    const daily = readDaily();
    if (daily.deposited + amountUsdc > limits.dailyDepositLimitUsdc) {
      const remaining = Math.max(0, limits.dailyDepositLimitUsdc - daily.deposited);
      return `Daily deposit limit reached. You can deposit $${remaining.toFixed(2)} more today.`;
    }
  }
  return null;
}

export function checkSpin(): string | null {
  const limits = readLimits();
  if (limits.selfExcludeUntil && limits.selfExcludeUntil > Date.now()) {
    const until = new Date(limits.selfExcludeUntil).toLocaleString();
    return `Self-exclusion active until ${until}. Take a break.`;
  }
  if (limits.dailyLossLimitUsdc != null) {
    const daily = readDaily();
    if (daily.lost >= limits.dailyLossLimitUsdc) {
      return `Daily loss limit of $${limits.dailyLossLimitUsdc.toFixed(0)} reached. Come back tomorrow.`;
    }
  }
  return null;
}

export function recordDeposit(amountUsdc: number): void {
  const daily = readDaily();
  daily.deposited += amountUsdc;
  writeDaily(daily);
}

/** Net loss = bet - payout. Positive numbers add to the daily total. */
export function recordSpin(netLossUsdc: number): void {
  if (netLossUsdc <= 0) return;
  const daily = readDaily();
  daily.lost += netLossUsdc;
  writeDaily(daily);
}
