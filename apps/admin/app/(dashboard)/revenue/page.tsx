"use client";

import { useEffect, useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { fetchKPIs, fetchChart, fmtUsd, fmtNum } from "@/lib/api";
import StatCard from "@/components/StatCard";

type ChartRow = {
  hour: string;
  trade_vol_usd: number;
  ggr_usdc: number;
  fees_distributed_usd: number;
};

// Fee split constants mirroring distribution program
const FEE_SPLIT = {
  platform:   0.20,
  creator:    0.25,
  jackpot:    0.25,
  legal:      0.10,
  dividend:   0.10,
  license:    0.10,
};

export default function RevenuePage() {
  const [days, setDays]   = useState(30);
  const [kpis, setKpis]   = useState<Record<string, unknown> | null>(null);
  const [lpChart, setLpChart] = useState<ChartRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchKPIs(days), fetchChart("launchpad", days)])
      .then(([k, c]) => { setKpis(k); setLpChart(c); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [days]);

  if (loading) return <div className="text-zinc-500 text-sm">Loading…</div>;
  if (!kpis) return null;

  const lp = kpis.launchpad as Record<string, number>;
  const ca = kpis.casino as Record<string, number>;

  // Rough platform revenue estimate from trading volume (launchpad fees ~1.5% avg)
  const estTradingRevUsd = lp.volumeUsd * 0.015;
  const estPlatformCut  = estTradingRevUsd * FEE_SPLIT.platform;
  const ggrUsd          = ca.ggrUsdc / 1e6;

  const chartData = lpChart.map((r) => ({
    hour:   new Date(r.hour).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    vol:    Number(r.trade_vol_usd ?? 0),
    fees:   Number(r.trade_vol_usd ?? 0) * 0.015,
    platform: Number(r.trade_vol_usd ?? 0) * 0.015 * FEE_SPLIT.platform,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Revenue</h1>
        <div className="flex gap-2">
          {[7, 30, 90].map((d) => (
            <button key={d} onClick={() => setDays(d)}
              className={`px-3 py-1 rounded text-xs ${days === d ? "bg-violet-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-zinc-100"}`}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Trading Volume" value={fmtUsd(lp.volumeUsd)} sub={`${days}d`} />
        <StatCard label="Est. Trading Fees" value={fmtUsd(estTradingRevUsd)} sub="~1.5% avg" />
        <StatCard label="Platform Cut (20%)" value={fmtUsd(estPlatformCut)} />
        <StatCard label="Casino GGR" value={fmtUsd(ggrUsd)} />
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <p className="text-xs text-zinc-500 uppercase tracking-wide mb-4">Daily Revenue Breakdown</p>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="gVol" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gFees" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis dataKey="hour" tick={{ fill: "#71717a", fontSize: 10 }} />
            <YAxis tick={{ fill: "#71717a", fontSize: 10 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8 }}
              formatter={(v: number) => fmtUsd(v)}
            />
            <Legend />
            <Area type="monotone" dataKey="vol"   stroke="#7C3AED" fill="url(#gVol)"  strokeWidth={1.5} name="Volume" />
            <Area type="monotone" dataKey="fees"  stroke="#10B981" fill="url(#gFees)" strokeWidth={1.5} name="Fees" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <p className="text-xs text-zinc-500 uppercase tracking-wide mb-3">Fee Split (per 100 USD in fees)</p>
        <div className="space-y-2">
          {Object.entries(FEE_SPLIT).map(([key, pct]) => (
            <div key={key} className="flex items-center gap-3">
              <span className="w-24 text-xs text-zinc-400 capitalize">{key}</span>
              <div className="flex-1 bg-zinc-800 rounded-full h-2">
                <div className="bg-violet-500 h-2 rounded-full" style={{ width: `${pct * 100}%` }} />
              </div>
              <span className="text-xs text-zinc-300 w-10 text-right">{(pct * 100).toFixed(0)}%</span>
              <span className="text-xs text-zinc-500 w-16 text-right">{fmtUsd(estTradingRevUsd * pct)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
