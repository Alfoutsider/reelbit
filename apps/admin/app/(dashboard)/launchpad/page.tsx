"use client";

import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { fetchKPIs, fetchChart, fetchTopTokens, fmtUsd, fmtNum } from "@/lib/api";
import StatCard from "@/components/StatCard";

type ChartRow = { hour: string; trade_vol_usd: number; tokens_launched: number; tokens_graduated: number; trade_count: number };
type Token    = { mint: string; trade_vol_usd: number; trade_count: number };

export default function LaunchpadPage() {
  const [days, setDays]         = useState(30);
  const [kpis, setKpis]         = useState<Record<string, unknown> | null>(null);
  const [chart, setChart]       = useState<ChartRow[]>([]);
  const [topTokens, setTopTokens] = useState<Token[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchKPIs(days), fetchChart("launchpad", days), fetchTopTokens(10)])
      .then(([k, c, t]) => { setKpis(k); setChart(c); setTopTokens(t); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [days]);

  if (loading) return <div className="text-zinc-500 text-sm">Loading…</div>;
  if (!kpis) return null;

  const lp = kpis.launchpad as Record<string, number>;

  const chartData = chart.map((r) => ({
    hour:     new Date(r.hour).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    volUsd:   Number(r.trade_vol_usd ?? 0),
    launched: Number(r.tokens_launched ?? 0),
    trades:   Number(r.trade_count ?? 0),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Launchpad</h1>
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
        <StatCard label="Tokens Launched" value={fmtNum(lp.tokensLaunched)} />
        <StatCard label="Graduated" value={fmtNum(lp.tokensGraduated)} sub={`${((lp.tokensGraduated / (lp.tokensLaunched || 1)) * 100).toFixed(1)}% rate`} />
        <StatCard label="Trade Volume" value={fmtUsd(lp.volumeUsd)} />
        <StatCard label="Total Trades" value={fmtNum(lp.tradeCount)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wide mb-4">Daily Volume (USD)</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="hour" tick={{ fill: "#71717a", fontSize: 10 }} />
              <YAxis tick={{ fill: "#71717a", fontSize: 10 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8 }} formatter={(v: number) => [fmtUsd(v), "Volume"]} />
              <Bar dataKey="volUsd" fill="#7C3AED" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wide mb-4">Tokens Launched per Day</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="hour" tick={{ fill: "#71717a", fontSize: 10 }} />
              <YAxis tick={{ fill: "#71717a", fontSize: 10 }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8 }} />
              <Bar dataKey="launched" fill="#10B981" radius={[2, 2, 0, 0]} name="Launched" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <p className="text-xs text-zinc-500 uppercase tracking-wide mb-3">Top Tokens by Volume</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-zinc-500 text-xs border-b border-zinc-800">
                <th className="pb-2 pr-4">Mint</th>
                <th className="pb-2 pr-4">Volume (USD)</th>
                <th className="pb-2">Trades</th>
              </tr>
            </thead>
            <tbody>
              {topTokens.map((t) => (
                <tr key={t.mint} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                  <td className="py-2 pr-4 font-mono text-xs text-zinc-400">{t.mint.slice(0, 12)}…</td>
                  <td className="py-2 pr-4">{fmtUsd(Number(t.trade_vol_usd ?? 0))}</td>
                  <td className="py-2">{fmtNum(Number(t.trade_count ?? 0))}</td>
                </tr>
              ))}
              {topTokens.length === 0 && (
                <tr><td colSpan={3} className="py-4 text-center text-zinc-600 text-xs">No data yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
