"use client";

import { useEffect, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { fetchKPIs, fetchChart, fetchJackpots, fmtUsd, fmtNum } from "@/lib/api";
import StatCard from "@/components/StatCard";

type ChartRow = { hour: string; spins: number; ggr_usdc: number; jackpot_paid: number };
type Jackpot  = { id: number; mint: string; winner_wallet: string; usdc_units: number; paid_at: string };

export default function CasinoPage() {
  const [days, setDays]         = useState(30);
  const [kpis, setKpis]         = useState<Record<string, unknown> | null>(null);
  const [chart, setChart]       = useState<ChartRow[]>([]);
  const [jackpots, setJackpots] = useState<Jackpot[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchKPIs(days), fetchChart("casino", days), fetchJackpots(20)])
      .then(([k, c, j]) => { setKpis(k); setChart(c); setJackpots(j); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [days]);

  if (loading) return <div className="text-zinc-500 text-sm">Loading…</div>;
  if (!kpis) return null;

  const ca = kpis.casino as Record<string, number>;

  const chartData = chart.map((r) => ({
    hour:   new Date(r.hour).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    spins:  Number(r.spins ?? 0),
    ggr:    Number(r.ggr_usdc ?? 0) / 1e6,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Casino</h1>
        <div className="flex gap-2">
          {[7, 30, 90].map((d) => (
            <button key={d} onClick={() => setDays(d)}
              className={`px-3 py-1 rounded text-xs ${days === d ? "bg-violet-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-zinc-100"}`}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <StatCard label="Total Spins" value={fmtNum(ca.spins)} sub={`${days}d`} />
        <StatCard label="Gross Gaming Revenue" value={fmtUsd(ca.ggrUsdc / 1e6)} sub="USDC" />
        <StatCard label="Jackpots Paid" value={fmtUsd(ca.jackpotPaid / 1e6)} />
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <p className="text-xs text-zinc-500 uppercase tracking-wide mb-4">Daily GGR (USDC)</p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis dataKey="hour" tick={{ fill: "#71717a", fontSize: 10 }} />
            <YAxis tick={{ fill: "#71717a", fontSize: 10 }} tickFormatter={(v) => `$${v.toFixed(0)}`} />
            <Tooltip
              contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8 }}
              formatter={(v: number) => [fmtUsd(v), "GGR"]}
            />
            <Line type="monotone" dataKey="ggr" stroke="#10B981" strokeWidth={2} dot={false} name="GGR" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <p className="text-xs text-zinc-500 uppercase tracking-wide mb-3">Recent Jackpot Payouts</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-zinc-500 text-xs border-b border-zinc-800">
                <th className="pb-2 pr-4">Date</th>
                <th className="pb-2 pr-4">Winner</th>
                <th className="pb-2 pr-4">Mint</th>
                <th className="pb-2">Amount</th>
              </tr>
            </thead>
            <tbody>
              {jackpots.map((j) => (
                <tr key={j.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                  <td className="py-2 pr-4 text-xs text-zinc-400">{new Date(j.paid_at).toLocaleDateString()}</td>
                  <td className="py-2 pr-4 font-mono text-xs text-zinc-400">{j.winner_wallet.slice(0, 10)}…</td>
                  <td className="py-2 pr-4 font-mono text-xs text-zinc-400">{j.mint.slice(0, 10)}…</td>
                  <td className="py-2 text-emerald-400 font-medium">{fmtUsd(Number(j.usdc_units) / 1e6)}</td>
                </tr>
              ))}
              {jackpots.length === 0 && (
                <tr><td colSpan={4} className="py-4 text-center text-zinc-600 text-xs">No jackpots paid yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
