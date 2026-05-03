"use client";

import { useEffect, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { fetchKPIs, fetchChart, fmtUsd, fmtNum } from "@/lib/api";
import StatCard from "@/components/StatCard";

type KPIs = Awaited<ReturnType<typeof fetchKPIs>>;
type ChartRow = { hour: string; trade_vol_usd: number; spins: number; ggr_usdc: number };

const DAYS_OPTIONS = [7, 30, 90];

export default function OverviewPage() {
  const [days, setDays]       = useState(30);
  const [kpis, setKpis]       = useState<KPIs | null>(null);
  const [chart, setChart]     = useState<ChartRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchKPIs(days), fetchChart("launchpad", days)])
      .then(([k, c]) => { setKpis(k); setChart(c); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [days]);

  if (loading) return <div className="text-zinc-500 text-sm">Loading…</div>;
  if (error) return <div className="text-red-400 text-sm">{error}</div>;
  if (!kpis) return null;

  const chartData = chart.map((r) => ({
    hour:   new Date(r.hour).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    volUsd: Number(r.trade_vol_usd ?? 0),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Overview</h1>
        <div className="flex gap-2">
          {DAYS_OPTIONS.map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1 rounded text-xs ${days === d ? "bg-violet-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-zinc-100"}`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Tokens Launched" value={fmtNum(kpis.launchpad.tokensLaunched)} sub={`${days}d`} />
        <StatCard label="Graduated" value={fmtNum(kpis.launchpad.tokensGraduated)} />
        <StatCard label="Launchpad Volume" value={fmtUsd(kpis.launchpad.volumeUsd)} />
        <StatCard label="Unique Traders" value={fmtNum(kpis.uniqueTraders)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <StatCard label="Casino Spins" value={fmtNum(kpis.casino.spins)} />
        <StatCard label="GGR (House Edge)" value={fmtUsd(kpis.casino.ggrUsdc / 1e6)} sub="USDC" />
        <StatCard label="Jackpot Paid" value={fmtUsd(kpis.casino.jackpotPaid / 1e6)} />
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <p className="text-xs text-zinc-500 uppercase tracking-wide mb-4">Launchpad Daily Volume (USD)</p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis dataKey="hour" tick={{ fill: "#71717a", fontSize: 10 }} />
            <YAxis tick={{ fill: "#71717a", fontSize: 10 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8 }}
              formatter={(v: number) => [fmtUsd(v), "Volume"]}
            />
            <Line type="monotone" dataKey="volUsd" stroke="#7C3AED" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
