/**
 * Referral Program — Supabase-backed, fully audited.
 *
 * Points schema:
 *   first_buy         200 pts  — referee's first on-chain buy (≥ 0.1 SOL)
 *   token_launch      500 pts  — referee launches a token
 *   graduation      2,000 pts  — referee's token graduates
 *   volume_tier       100 pts  — per 10 SOL of referee's buy volume (capped 2,000 pts/referee)
 *   milestone_5       500 pts  — referrer reaches 5 active referrals
 *   milestone_10    1,500 pts  — referrer reaches 10 active referrals
 *   milestone_25    5,000 pts  — referrer reaches 25 active referrals
 *   milestone_50   15,000 pts  — referrer reaches 50 active referrals
 *   casino_first_spin 150 pts  — referee's first casino spin (future)
 *   casino_wager_100   50 pts  — per 100 USDC wagered by referee (future, capped 1,500)
 *
 * Anti-abuse:
 *   • Self-referral: DB check constraint + application check
 *   • One referrer per referee: unique constraint on referee_wallet
 *   • Points only after qualifying action (pending → active on first real event)
 *   • Per-referee points cap: 5,000 total from any single referee
 *   • Volume cap: 2,000 pts from volume events per referee
 *   • IP rate limit: > 10 new referrals per IP hash per 24h → auto-flag
 *   • Minimum 0.1 SOL per trade for volume events
 *   • Duplicate-event guards for one-time events (first_buy, launch, graduation)
 */

import crypto from "crypto";
import { supabase } from "./supabase";

// ── Constants ─────────────────────────────────────────────────────────────────

const POINTS = {
  first_buy:          200,
  token_launch:       500,
  graduation:       2_000,
  volume_per_10sol:   100,
  milestone_5:        500,
  milestone_10:     1_500,
  milestone_25:     5_000,
  milestone_50:    15_000,
  casino_first_spin:  150,
  casino_per_100usdc:  50,
} as const;

const PER_REFEREE_TOTAL_CAP   = 5_000;  // max pts referrer earns from one referee (all events combined)
const PER_REFEREE_VOLUME_CAP  = 2_000;  // subset of above: volume_tier pts only
const IP_24H_LIMIT            = 10;     // max pending referrals per IP hash per 24 h before flagging
const MIN_VOLUME_SOL          = 0.1;    // minimum SOL per trade to count for volume pts

const MILESTONES: Array<{ threshold: number; event: string; pts: number }> = [
  { threshold:  5, event: "milestone_5",  pts: POINTS.milestone_5  },
  { threshold: 10, event: "milestone_10", pts: POINTS.milestone_10 },
  { threshold: 25, event: "milestone_25", pts: POINTS.milestone_25 },
  { threshold: 50, event: "milestone_50", pts: POINTS.milestone_50 },
];

export const TIER_THRESHOLDS = [
  { name: "royale",  min: 50_000, emoji: "👑", label: "Royale"  },
  { name: "diamond", min: 20_000, emoji: "💎", label: "Diamond" },
  { name: "gold",    min:  5_000, emoji: "🥇", label: "Gold"    },
  { name: "silver",  min:  1_000, emoji: "🥈", label: "Silver"  },
  { name: "bronze",  min:      0, emoji: "🥉", label: "Bronze"  },
] as const;

export type TierName = "bronze" | "silver" | "gold" | "diamond" | "royale";
export interface TierInfo { name: TierName; emoji: string; label: string; nextMin: number | null }

// Unused event types stored for future use
export const POINT_VALUES = { ...POINTS, PER_REFEREE_TOTAL_CAP, PER_REFEREE_VOLUME_CAP };

// ── Helpers ───────────────────────────────────────────────────────────────────

// Unambiguous charset: no 0/O, 1/I confusion
const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function generateCode(): string {
  return Array.from({ length: 8 }, () =>
    CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)],
  ).join("");
}

function hashIp(ip: string): string {
  return crypto.createHash("sha256").update(`rb:${ip}`).digest("hex").slice(0, 16);
}

export function tierForPoints(pts: number): TierInfo {
  for (let i = 0; i < TIER_THRESHOLDS.length; i++) {
    const t = TIER_THRESHOLDS[i];
    if (pts >= t.min) {
      return {
        name:    t.name as TierName,
        emoji:   t.emoji,
        label:   t.label,
        nextMin: i > 0 ? TIER_THRESHOLDS[i - 1].min : null,
      };
    }
  }
  const last = TIER_THRESHOLDS[TIER_THRESHOLDS.length - 1];
  return { name: "bronze", emoji: last.emoji, label: last.label, nextMin: 1_000 };
}

// ── Public API — code management ──────────────────────────────────────────────

/** Returns existing code or generates a new one. Idempotent. */
export async function getOrCreateCode(wallet: string): Promise<string> {
  const { data } = await supabase
    .from("referral_codes")
    .select("code")
    .eq("wallet", wallet)
    .maybeSingle();
  if (data?.code) return data.code;

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode();
    const { error } = await supabase.from("referral_codes").insert({ wallet, code });
    if (!error) return code;
    if (!error.message.includes("unique")) throw error;
  }
  throw new Error("[referral] code generation failed after 5 attempts");
}

/** Resolve a code string to its owner wallet. */
export async function resolveCode(code: string): Promise<string | null> {
  const { data } = await supabase
    .from("referral_codes")
    .select("wallet")
    .eq("code", code.toUpperCase().trim())
    .maybeSingle();
  return data?.wallet ?? null;
}

// ── Public API — referral registration ────────────────────────────────────────

export async function registerReferral(
  referee: string,
  code:    string,
  source:  "launchpad" | "casino",
  ip:      string,
): Promise<{ ok: boolean; error?: string }> {
  const referrer = await resolveCode(code);
  if (!referrer)           return { ok: false, error: "invalid_code" };
  if (referrer === referee) return { ok: false, error: "self_referral" };

  // Already referred? (unique constraint catches race conditions)
  const { data: existing } = await supabase
    .from("referrals")
    .select("id, status")
    .eq("referee_wallet", referee)
    .maybeSingle();
  if (existing) return { ok: false, error: "already_referred" };

  // IP abuse check — flag if this IP has too many pending referrals today
  const ipHash = hashIp(ip);
  const dayAgo = new Date(Date.now() - 86_400_000).toISOString();
  const { count: ipCount } = await supabase
    .from("referrals")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("created_at", dayAgo);
  const flagged = (ipCount ?? 0) >= IP_24H_LIMIT;

  const { error } = await supabase.from("referrals").insert({
    referrer_wallet: referrer,
    referee_wallet:  referee,
    status:          flagged ? "flagged" : "pending",
    source,
    ip_hash:         ipHash,
  });

  // Unique violation means race condition — another request beat us
  if (error?.message.includes("unique")) return { ok: false, error: "already_referred" };
  if (error) return { ok: false, error: error.message };

  // Ensure referrer has a referral_points row (no points yet, just total_referrals++)
  if (!flagged) await recomputePoints(referrer);

  return { ok: true };
}

// ── Internal — points engine ──────────────────────────────────────────────────

async function getReferral(referee: string) {
  const { data } = await supabase
    .from("referrals")
    .select("referrer_wallet, status, source")
    .eq("referee_wallet", referee)
    .maybeSingle();
  return data;
}

async function hasEvent(referrer: string, referee: string, eventType: string): Promise<boolean> {
  const { data } = await supabase
    .from("referral_events")
    .select("id")
    .eq("referrer_wallet", referrer)
    .eq("referee_wallet", referee)
    .eq("event_type", eventType)
    .maybeSingle();
  return !!data;
}

async function totalEarnedFromReferee(referrer: string, referee: string): Promise<number> {
  const { data } = await supabase
    .from("referral_events")
    .select("points")
    .eq("referrer_wallet", referrer)
    .eq("referee_wallet", referee);
  return (data ?? []).reduce((s: number, r: { points: number }) => s + r.points, 0);
}

async function volumePtsFromReferee(referrer: string, referee: string): Promise<number> {
  const { data } = await supabase
    .from("referral_events")
    .select("points")
    .eq("referrer_wallet", referrer)
    .eq("referee_wallet", referee)
    .eq("event_type", "volume_tier");
  return (data ?? []).reduce((s: number, r: { points: number }) => s + r.points, 0);
}

/** Insert an event row and refresh the aggregate cache. */
async function insertEvent(
  referrer:  string,
  referee:   string,
  eventType: string,
  points:    number,
  source:    "launchpad" | "casino",
  metadata:  Record<string, unknown>,
): Promise<void> {
  // Enforce per-referee total cap
  const alreadyEarned = await totalEarnedFromReferee(referrer, referee);
  const capped = Math.min(points, Math.max(0, PER_REFEREE_TOTAL_CAP - alreadyEarned));
  if (capped <= 0) return;

  const { error } = await supabase.from("referral_events").insert({
    referrer_wallet: referrer,
    referee_wallet:  referee,
    event_type:      eventType,
    points:          capped,
    source,
    metadata,
  });
  if (error) {
    console.error("[referral] insertEvent failed:", error.message);
    return;
  }

  await recomputePoints(referrer);
  console.log(`[referral] +${capped} pts → ${referrer.slice(0, 8)} (${eventType} by ${referee.slice(0, 8)})`);
}

/** Activate a pending referral and check for milestone bonuses. */
async function activateReferral(referrer: string, referee: string): Promise<void> {
  await supabase
    .from("referrals")
    .update({ status: "active", activated_at: new Date().toISOString() })
    .eq("referee_wallet", referee);

  await recomputePoints(referrer);

  // Check milestone thresholds (exact match — avoids double-award on restart)
  const { count: activeCount } = await supabase
    .from("referrals")
    .select("id", { count: "exact", head: true })
    .eq("referrer_wallet", referrer)
    .eq("status", "active");

  const active = activeCount ?? 0;

  for (const { threshold, event, pts } of MILESTONES) {
    if (active === threshold) {
      // Guard: only award once
      const { data: prev } = await supabase
        .from("referral_events")
        .select("id")
        .eq("referrer_wallet", referrer)
        .eq("event_type", event)
        .maybeSingle();
      if (prev) continue;

      await supabase.from("referral_events").insert({
        referrer_wallet: referrer,
        referee_wallet:  "MILESTONE",
        event_type:      event,
        points:          pts,
        source:          "launchpad",
        metadata:        { active_referrals: active },
      });
      console.log(`[referral] milestone ${event} → ${referrer.slice(0, 8)} +${pts} pts`);
    }
  }

  await recomputePoints(referrer);
}

/** Recompute the referral_points aggregate from source tables. */
async function recomputePoints(referrer: string): Promise<void> {
  const [eventsRes, activeRes, totalRes] = await Promise.all([
    supabase.from("referral_events").select("points, source").eq("referrer_wallet", referrer),
    supabase.from("referrals").select("id", { count: "exact", head: true })
      .eq("referrer_wallet", referrer).eq("status", "active"),
    supabase.from("referrals").select("id", { count: "exact", head: true })
      .eq("referrer_wallet", referrer).neq("status", "flagged"),
  ]);

  type EventRow = { points: number; source: string };
  const events: EventRow[] = eventsRes.data ?? [];
  const total  = events.reduce((s, e) => s + e.points, 0);
  const launch = events.filter((e) => e.source === "launchpad").reduce((s, e) => s + e.points, 0);
  const casino = events.filter((e) => e.source === "casino").reduce((s, e) => s + e.points, 0);

  await supabase.from("referral_points").upsert({
    wallet:           referrer,
    total_points:     total,
    launchpad_points: launch,
    casino_points:    casino,
    active_referrals: activeRes.count ?? 0,
    total_referrals:  totalRes.count ?? 0,
    updated_at:       new Date().toISOString(),
  }, { onConflict: "wallet" });
}

// ── Public API — event hooks ──────────────────────────────────────────────────

/**
 * Call from the Helius webhook's buy-event handler.
 * Awards first_buy + volume_tier points to the referrer.
 */
export async function onTrade(
  buyer:     string,
  mint:      string,
  solAmount: number,
  txSig:     string,
): Promise<void> {
  try {
    const ref = await getReferral(buyer);
    if (!ref || ref.status === "flagged") return;

    // Activate pending referral on first qualifying buy
    if (ref.status === "pending" && solAmount >= MIN_VOLUME_SOL) {
      await activateReferral(ref.referrer_wallet, buyer);
      if (!await hasEvent(ref.referrer_wallet, buyer, "first_buy")) {
        await insertEvent(ref.referrer_wallet, buyer, "first_buy", POINTS.first_buy,
          ref.source as "launchpad" | "casino", { mint, txSig, solAmount });
      }
      // Reload status after activation
      ref.status = "active";
    }

    // Volume-tier points (per 10 SOL traded, capped per referee)
    if (ref.status === "active" && solAmount >= MIN_VOLUME_SOL) {
      const rawVolPts = Math.floor(solAmount / 10) * POINTS.volume_per_10sol;
      if (rawVolPts > 0) {
        const alreadyVolPts = await volumePtsFromReferee(ref.referrer_wallet, buyer);
        const cappedVol     = Math.min(rawVolPts, PER_REFEREE_VOLUME_CAP - alreadyVolPts);
        if (cappedVol > 0) {
          await insertEvent(ref.referrer_wallet, buyer, "volume_tier", cappedVol,
            ref.source as "launchpad" | "casino", { mint, txSig, solAmount });
        }
      }
    }
  } catch (err) {
    console.error("[referral] onTrade error:", err);
  }
}

/**
 * Call from POST /themes/register when a creator launches a token.
 */
export async function onTokenLaunch(creator: string, mint: string): Promise<void> {
  try {
    const ref = await getReferral(creator);
    if (!ref || ref.status === "flagged") return;

    if (ref.status === "pending") await activateReferral(ref.referrer_wallet, creator);
    if (await hasEvent(ref.referrer_wallet, creator, "token_launch")) return;

    await insertEvent(ref.referrer_wallet, creator, "token_launch", POINTS.token_launch,
      ref.source as "launchpad" | "casino", { mint });
  } catch (err) {
    console.error("[referral] onTokenLaunch error:", err);
  }
}

/**
 * Call from the graduation handler in the webhook.
 */
export async function onGraduation(creator: string, mint: string): Promise<void> {
  try {
    const ref = await getReferral(creator);
    if (!ref || ref.status === "flagged") return;

    if (await hasEvent(ref.referrer_wallet, creator, "graduation")) return;

    await insertEvent(ref.referrer_wallet, creator, "graduation", POINTS.graduation,
      ref.source as "launchpad" | "casino", { mint });
  } catch (err) {
    console.error("[referral] onGraduation error:", err);
  }
}

/** Casino hook — first spin by a referred user. */
export async function onCasinoFirstSpin(player: string): Promise<void> {
  try {
    const ref = await getReferral(player);
    if (!ref || ref.status === "flagged") return;

    if (ref.status === "pending") await activateReferral(ref.referrer_wallet, player);
    if (await hasEvent(ref.referrer_wallet, player, "casino_first_spin")) return;

    await insertEvent(ref.referrer_wallet, player, "casino_first_spin",
      POINTS.casino_first_spin, "casino", {});
  } catch (err) {
    console.error("[referral] onCasinoFirstSpin error:", err);
  }
}

// ── Public API — read ─────────────────────────────────────────────────────────

export async function getReferrerStats(wallet: string) {
  const [codeRes, statsRes, eventsRes] = await Promise.all([
    supabase.from("referral_codes").select("code").eq("wallet", wallet).maybeSingle(),
    supabase.from("referral_points").select("*").eq("wallet", wallet).maybeSingle(),
    supabase.from("referral_events").select("*")
      .eq("referrer_wallet", wallet)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const pts = statsRes.data?.total_points ?? 0;
  const { count: rankAbove } = await supabase
    .from("referral_points")
    .select("wallet", { count: "exact", head: true })
    .gt("total_points", pts);

  return {
    wallet,
    code:            codeRes.data?.code ?? null,
    totalPoints:     pts,
    launchpadPoints: statsRes.data?.launchpad_points ?? 0,
    casinoPoints:    statsRes.data?.casino_points ?? 0,
    activeReferrals: statsRes.data?.active_referrals ?? 0,
    totalReferrals:  statsRes.data?.total_referrals ?? 0,
    rank:            (rankAbove ?? 0) + 1,
    tier:            tierForPoints(pts),
    recentEvents:    eventsRes.data ?? [],
  };
}

export async function getLeaderboard(limit = 50) {
  const { data } = await supabase
    .from("referral_points")
    .select("wallet, total_points, launchpad_points, casino_points, active_referrals, total_referrals")
    .order("total_points", { ascending: false })
    .limit(limit);

  type LbRow = { wallet: string; total_points: number; launchpad_points: number; casino_points: number; active_referrals: number; total_referrals: number };
  return (data as LbRow[] ?? []).map((row, i) => ({
    rank:            i + 1,
    wallet:          row.wallet,
    totalPoints:     row.total_points,
    launchpadPoints: row.launchpad_points,
    casinoPoints:    row.casino_points,
    activeReferrals: row.active_referrals,
    totalReferrals:  row.total_referrals,
    tier:            tierForPoints(row.total_points),
  }));
}
