/**
 * Supabase-backed analytics store.
 * All writes are fire-and-forget (errors logged, never thrown) so they never
 * block the hot path of the webhook or game-server callbacks.
 */

import { supabase } from "./supabase";

// ── Helpers ───────────────────────────────────────────────────────────────────

function hourBucket(ts: Date = new Date()): string {
  const d = new Date(ts);
  d.setUTCMinutes(0, 0, 0);
  return d.toISOString();
}

async function incrementHourly(
  platform: "launchpad" | "casino",
  delta: Partial<{
    tokens_launched: number;
    tokens_graduated: number;
    trade_count: number;
    trade_vol_sol: number;
    trade_vol_usd: number;
    new_wallets: number;
    spins: number;
    ggr_usdc: number;
    jackpot_paid: number;
    fees_distributed_usd: number;
  }>,
  ts?: Date,
): Promise<void> {
  const hour = hourBucket(ts);

  // Upsert the row, adding delta to existing columns
  const sets = Object.entries(delta)
    .map(([k, v]) => `${k} = COALESCE(analytics_hourly.${k}, 0) + ${Number(v)}`)
    .join(", ");

  const { error } = await supabase.rpc("analytics_increment", {
    p_hour:     hour,
    p_platform: platform,
    p_delta:    delta,
  });

  if (error) {
    // Fall back to manual upsert if the RPC isn't deployed yet
    const existing = await supabase
      .from("analytics_hourly")
      .select("id")
      .eq("hour", hour)
      .eq("platform", platform)
      .maybeSingle();

    if (existing.data) {
      const updateData: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(delta)) {
        updateData[k] = (existing.data as Record<string, number>)[k]
          ? (existing.data as Record<string, number>)[k] + Number(v)
          : Number(v);
      }
      await supabase
        .from("analytics_hourly")
        .update(updateData)
        .eq("id", (existing.data as { id: number }).id);
    } else {
      await supabase
        .from("analytics_hourly")
        .insert({ hour, platform, ...delta });
    }
  }
}

// ── Public API ─────────────────────────────────────────────────────────────────

export async function upsertToken(params: {
  mint: string;
  creator: string;
  name?: string;
  symbol?: string;
  slotModel?: string;
}): Promise<void> {
  const { error } = await supabase.from("tokens").upsert(
    {
      mint:       params.mint,
      creator:    params.creator,
      name:       params.name ?? null,
      symbol:     params.symbol ?? null,
      slot_model: params.slotModel ?? null,
      created_at: new Date().toISOString(),
    },
    { onConflict: "mint", ignoreDuplicates: true },
  );
  if (error) console.error("[analytics] upsertToken:", error.message);
}

export async function markTokenGraduated(mint: string): Promise<void> {
  const { error } = await supabase
    .from("tokens")
    .update({ is_graduated: true, graduated_at: new Date().toISOString() })
    .eq("mint", mint);
  if (error) console.error("[analytics] markTokenGraduated:", error.message);
}

export async function logTrade(trade: {
  txSig:       string;
  mint:        string;
  type:        "buy" | "sell";
  wallet:      string;
  solAmount:   number;
  tokenAmount: number;
  usdValue:    number;
  timestamp:   number;
}): Promise<void> {
  const { error } = await supabase.from("trades").insert({
    tx_sig:       trade.txSig,
    mint:         trade.mint,
    trade_type:   trade.type,
    wallet:       trade.wallet,
    sol_amount:   trade.solAmount,
    token_amount: trade.tokenAmount,
    usd_value:    trade.usdValue,
    traded_at:    new Date(trade.timestamp).toISOString(),
  });

  if (error) {
    if (error.code === "23505") {
      // 23505 = duplicate tx_sig — Helius retry of an already-recorded trade.
      // Return WITHOUT incrementing the hourly bucket below; doing so would
      // double-count volume on every webhook retry.
      return;
    }
    console.error("[analytics] logTrade:", error.message);
    // Don't increment if the insert failed for any other reason either —
    // a failed insert means we don't have authoritative data, so polluting
    // the hourly aggregate would skew dashboards without a recoverable trail.
    return;
  }

  // Insert succeeded — safe to bump the aggregate.
  incrementHourly("launchpad", {
    trade_count:   1,
    trade_vol_sol: trade.solAmount,
    trade_vol_usd: trade.usdValue,
  }, new Date(trade.timestamp)).catch((err) =>
    console.warn("[analytics] hourly bucket bump failed:", err.message),
  );
}

export async function logGraduation(mint: string): Promise<void> {
  await markTokenGraduated(mint);
  incrementHourly("launchpad", { tokens_graduated: 1 }).catch(() => {});
}

export async function logTokenLaunched(mint: string, creator: string): Promise<void> {
  await upsertToken({ mint, creator });
  incrementHourly("launchpad", { tokens_launched: 1 }).catch(() => {});
}

export async function logJackpotPayout(params: {
  txSig:        string;
  mint:         string;
  winnerWallet: string;
  usdcUnits:    number;
}): Promise<void> {
  const { error } = await supabase.from("jackpot_payouts").insert({
    tx_sig:        params.txSig,
    mint:          params.mint,
    winner_wallet: params.winnerWallet,
    usdc_units:    params.usdcUnits,
  });
  if (error) console.error("[analytics] logJackpotPayout:", error.message);

  incrementHourly("casino", { jackpot_paid: params.usdcUnits }).catch(() => {});
}

export async function logCasinoSpin(usdcUnits: number): Promise<void> {
  incrementHourly("casino", {
    spins:    1,
    ggr_usdc: usdcUnits,
  }).catch(() => {});
}

export async function logFeeDistribution(params: {
  mint:           string;
  source:         "trading_fee" | "lp_harvest" | "ggr";
  totalAmount:    number;
  platformAmount: number;
  creatorAmount:  number;
  jackpotAmount:  number;
  legalAmount:    number;
  dividendAmount: number;
}): Promise<void> {
  const { error } = await supabase.from("fee_distributions").insert({
    mint:             params.mint,
    source:           params.source,
    total_amount:     params.totalAmount,
    platform_amount:  params.platformAmount,
    creator_amount:   params.creatorAmount,
    jackpot_amount:   params.jackpotAmount,
    legal_amount:     params.legalAmount,
    dividend_amount:  params.dividendAmount,
  });
  if (error) console.error("[analytics] logFeeDistribution:", error.message);
}

export async function logAdminAction(params: {
  action: string;
  params?: Record<string, unknown>;
  txSig?: string;
}): Promise<void> {
  const { error } = await supabase.from("admin_actions").insert({
    action:      params.action,
    params:      params.params ?? null,
    tx_sig:      params.txSig ?? null,
  });
  if (error) console.error("[analytics] logAdminAction:", error.message);
}

// ── Dashboard query helpers ───────────────────────────────────────────────────

export async function getKPIs(days = 30) {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();

  const [launchpad, casino, tokens, recentTrades] = await Promise.all([
    supabase
      .from("analytics_hourly")
      .select("*")
      .eq("platform", "launchpad")
      .gte("hour", since),
    supabase
      .from("analytics_hourly")
      .select("*")
      .eq("platform", "casino")
      .gte("hour", since),
    supabase
      .from("tokens")
      .select("mint, is_graduated, created_at")
      .gte("created_at", since),
    supabase
      .from("trades")
      .select("wallet")
      .gte("traded_at", since),
  ]);

  const lp = launchpad.data ?? [];
  const ca = casino.data ?? [];

  return {
    launchpad: {
      tokensLaunched:    lp.reduce((s: number, r: Record<string, number>) => s + (r.tokens_launched ?? 0), 0),
      tokensGraduated:   lp.reduce((s: number, r: Record<string, number>) => s + (r.tokens_graduated ?? 0), 0),
      tradeCount:        lp.reduce((s: number, r: Record<string, number>) => s + (r.trade_count ?? 0), 0),
      volumeSol:         lp.reduce((s: number, r: Record<string, number>) => s + Number(r.trade_vol_sol ?? 0), 0),
      volumeUsd:         lp.reduce((s: number, r: Record<string, number>) => s + Number(r.trade_vol_usd ?? 0), 0),
    },
    casino: {
      spins:       ca.reduce((s: number, r: Record<string, number>) => s + (r.spins ?? 0), 0),
      ggrUsdc:     ca.reduce((s: number, r: Record<string, number>) => s + Number(r.ggr_usdc ?? 0), 0),
      jackpotPaid: ca.reduce((s: number, r: Record<string, number>) => s + Number(r.jackpot_paid ?? 0), 0),
    },
    uniqueTraders: new Set((recentTrades.data ?? []).map((r: { wallet: string }) => r.wallet)).size,
    totalTokens:   (tokens.data ?? []).length,
    graduatedTokens: (tokens.data ?? []).filter((t: { is_graduated: boolean }) => t.is_graduated).length,
    days,
  };
}

export async function getHourlyChart(platform: "launchpad" | "casino", days = 7) {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const { data, error } = await supabase
    .from("analytics_hourly")
    .select("hour, trade_vol_usd, trade_count, spins, ggr_usdc, tokens_launched, tokens_graduated")
    .eq("platform", platform)
    .gte("hour", since)
    .order("hour", { ascending: true });

  if (error) console.error("[analytics] getHourlyChart:", error.message);
  return data ?? [];
}

export async function getTopTokens(limit = 10) {
  const { data, error } = await supabase
    .from("trades")
    .select("mint, trade_vol_usd:usd_value.sum(), trade_count:id.count()")
    .order("trade_vol_usd", { ascending: false })
    .limit(limit);

  if (error) console.error("[analytics] getTopTokens:", error.message);
  return data ?? [];
}

export async function getRecentJackpots(limit = 20) {
  const { data, error } = await supabase
    .from("jackpot_payouts")
    .select("*")
    .order("paid_at", { ascending: false })
    .limit(limit);

  if (error) console.error("[analytics] getRecentJackpots:", error.message);
  return data ?? [];
}
